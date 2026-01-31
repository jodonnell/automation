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
  getIncomingStubs: (specId: string) => IncomingStub[]
  addIncomingStub: (specId: string, stub: IncomingStub) => void
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

  const getIncomingStubs = (specId: string) => incomingStubs.get(specId) ?? []

  const addIncomingStub = (specId: string, stub: IncomingStub) => {
    const list = incomingStubs.get(specId) ?? []
    list.push(stub)
    incomingStubs.set(specId, list)
    graphListeners.forEach((listener) => listener(specId))
  }

  return {
    getLayout,
    getConnections,
    addConnection,
    getIncomingStubs,
    addIncomingStub,
    onGraphChanged: (listener) => {
      graphListeners.add(listener)
      return () => graphListeners.delete(listener)
    },
  }
}
