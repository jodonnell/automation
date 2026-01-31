import type {
  ConnectionPath,
  IncomingStub,
  NodeLayout,
  NodeSpec,
} from "./types"
import { computeLayout } from "./layout"

export type GameModel = {
  getLayout: (spec: NodeSpec, width: number, height: number) => NodeLayout
  getConnections: (specId: string) => ConnectionPath[]
  addConnection: (specId: string, connection: ConnectionPath) => void
  removeConnection: (specId: string, connection: ConnectionPath) => void
  getIncomingStubs: (specId: string) => IncomingStub[]
  addIncomingStub: (specId: string, stub: IncomingStub) => void
  removeIncomingStub: (specId: string, stub: IncomingStub) => void
  removeConnectionWithStub: (specId: string, connection: ConnectionPath) => void
  onGraphChanged: (listener: (specId: string) => void) => () => void
}

export const createGameModel = (): GameModel => {
  const layouts = new Map<string, NodeLayout>()
  const connections = new Map<string, ConnectionPath[]>()
  const incomingStubs = new Map<string, IncomingStub[]>()
  const graphListeners = new Set<(specId: string) => void>()

  const getLayout = (spec: NodeSpec, width: number, height: number) => {
    const key = `${spec.id}-${width}x${height}`
    const cached = layouts.get(key)
    if (cached) return cached
    const layout = computeLayout(spec, width, height)
    layouts.set(key, layout)
    return layout
  }

  const getConnections = (specId: string) => connections.get(specId) ?? []

  const addConnection = (specId: string, connection: ConnectionPath) => {
    const list = connections.get(specId) ?? []
    list.push(connection)
    connections.set(specId, list)
    graphListeners.forEach((listener) => listener(specId))
  }

  const removeConnection = (specId: string, connection: ConnectionPath) => {
    const list = connections.get(specId)
    if (!list) return
    const next = list.filter((item) => item !== connection)
    if (next.length === list.length) return
    if (next.length > 0) {
      connections.set(specId, next)
    } else {
      connections.delete(specId)
    }
    graphListeners.forEach((listener) => listener(specId))
  }

  const getIncomingStubs = (specId: string) => incomingStubs.get(specId) ?? []

  const addIncomingStub = (specId: string, stub: IncomingStub) => {
    const list = incomingStubs.get(specId) ?? []
    list.push(stub)
    incomingStubs.set(specId, list)
    graphListeners.forEach((listener) => listener(specId))
  }

  const removeIncomingStub = (specId: string, stub: IncomingStub) => {
    const list = incomingStubs.get(specId)
    if (!list) return
    const next = list.filter((item) => item !== stub)
    if (next.length === list.length) return
    if (next.length > 0) {
      incomingStubs.set(specId, next)
    } else {
      incomingStubs.delete(specId)
    }
    graphListeners.forEach((listener) => listener(specId))
  }

  const removeConnectionWithStub = (
    specId: string,
    connection: ConnectionPath,
  ) => {
    removeConnection(specId, connection)
    if (connection.incomingStub) {
      removeIncomingStub(connection.toId, connection.incomingStub)
    }
  }

  return {
    getLayout,
    getConnections,
    addConnection,
    removeConnection,
    getIncomingStubs,
    addIncomingStub,
    removeIncomingStub,
    removeConnectionWithStub,
    onGraphChanged: (listener) => {
      graphListeners.add(listener)
      return () => graphListeners.delete(listener)
    },
  }
}
