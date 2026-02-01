import type {
  ConnectionPath,
  IncomingStub,
  OutgoingStub,
  NodeLayout,
  NodeSpec,
} from "./types"
import { computeLayout } from "./layout"
import { INCOMING_STUB_PREFIX, OUTGOING_STUB_PREFIX } from "../constants"

export type GameModel = {
  getLayout: (spec: NodeSpec, width: number, height: number) => NodeLayout
  getConnections: (specId: string) => ConnectionPath[]
  addConnection: (specId: string, connection: ConnectionPath) => boolean
  removeConnection: (specId: string, connection: ConnectionPath) => void
  removeConnectionsForBox: (specId: string, boxId: string) => void
  getIncomingStubs: (specId: string) => IncomingStub[]
  addIncomingStub: (specId: string, stub: IncomingStub) => void
  removeIncomingStub: (specId: string, stub: IncomingStub) => void
  getOutgoingStubs: (specId: string) => OutgoingStub[]
  addOutgoingStub: (specId: string, stub: OutgoingStub) => void
  removeOutgoingStub: (specId: string, stub: OutgoingStub) => void
  removeOutgoingStubs: (specId: string, count: number) => void
  removeOutgoingStubsForSource: (specId: string, sourceId: string) => void
  removeConnectionWithStub: (specId: string, connection: ConnectionPath) => void
  createIncomingStubId: () => string
  createOutgoingStubId: () => string
  getOutboundCapacityBoost: (nodeId: string) => number
  onGraphChanged: (listener: (specId: string) => void) => () => void
}

export const createGameModel = (): GameModel => {
  const layouts = new Map<string, NodeLayout>()
  const connections = new Map<string, ConnectionPath[]>()
  const incomingStubs = new Map<string, IncomingStub[]>()
  const outgoingStubs = new Map<string, OutgoingStub[]>()
  const graphListeners = new Set<(specId: string) => void>()
  let incomingStubCounter = 0
  let outgoingStubCounter = 0

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
    return true
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

  const removeConnectionsForBox = (specId: string, boxId: string) => {
    const list = connections.get(specId) ?? []
    const remaining: ConnectionPath[] = []
    let removed = false
    let removedCount = 0
    list.forEach((connection) => {
      if (connection.fromId === boxId || connection.toId === boxId) {
        removed = true
        removedCount += 1
        if (connection.incomingStub) {
          const stubs = incomingStubs.get(connection.toId)
          if (stubs) {
            const nextStubs = stubs.filter(
              (stub) => stub !== connection.incomingStub,
            )
            if (nextStubs.length > 0) {
              incomingStubs.set(connection.toId, nextStubs)
            } else {
              incomingStubs.delete(connection.toId)
            }
          }
        }
      } else {
        remaining.push(connection)
      }
    })
    if (removed) {
      if (remaining.length > 0) {
        connections.set(specId, remaining)
      } else {
        connections.delete(specId)
      }
    }
    const outgoing = outgoingStubs.get(specId)
    if (outgoing) {
      const nextOutgoing = outgoing.filter((stub) => stub.sourceId !== boxId)
      let trimmed = nextOutgoing
      if (removedCount > 0 && trimmed.length > 0) {
        const removeCount = Math.min(removedCount, trimmed.length)
        trimmed = trimmed.slice(0, trimmed.length - removeCount)
      }
      if (trimmed.length > 0) {
        outgoingStubs.set(specId, trimmed)
      } else if (outgoing.length > 0 || nextOutgoing.length > 0) {
        outgoingStubs.delete(specId)
      }
    }
    if (removed || (outgoing && outgoing.length > 0)) {
      graphListeners.forEach((listener) => listener(specId))
    }
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
    const changed = true
    if (next.length > 0) {
      incomingStubs.set(specId, next)
    } else {
      incomingStubs.delete(specId)
    }

    const currentConnections = connections.get(specId)
    if (currentConnections) {
      const removedCount = currentConnections.filter(
        (connection) => connection.fromId === stub.id,
      ).length
      const remaining = currentConnections.filter(
        (connection) => connection.fromId !== stub.id,
      )
      if (remaining.length !== currentConnections.length) {
        if (remaining.length > 0) {
          connections.set(specId, remaining)
        } else {
          connections.delete(specId)
        }
      }
      if (removedCount > 0) {
        const outgoing = outgoingStubs.get(specId)
        if (outgoing && outgoing.length > 0) {
          const trimmed =
            removedCount >= outgoing.length
              ? []
              : outgoing.slice(0, outgoing.length - removedCount)
          if (trimmed.length > 0) {
            outgoingStubs.set(specId, trimmed)
          } else {
            outgoingStubs.delete(specId)
          }
        }
      }
    }

    if (changed) {
      graphListeners.forEach((listener) => listener(specId))
    }
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

  const getOutgoingStubs = (specId: string) => outgoingStubs.get(specId) ?? []

  const addOutgoingStub = (specId: string, stub: OutgoingStub) => {
    const list = outgoingStubs.get(specId) ?? []
    list.push(stub)
    outgoingStubs.set(specId, list)
    graphListeners.forEach((listener) => listener(specId))
  }

  const removeOutgoingStub = (specId: string, stub: OutgoingStub) => {
    const list = outgoingStubs.get(specId)
    if (!list) return
    const next = list.filter((item) => item !== stub)
    if (next.length === list.length) return
    if (next.length > 0) {
      outgoingStubs.set(specId, next)
    } else {
      outgoingStubs.delete(specId)
    }
    graphListeners.forEach((listener) => listener(specId))
  }

  const removeOutgoingStubs = (specId: string, count: number) => {
    if (count <= 0) return
    const list = outgoingStubs.get(specId)
    if (!list || list.length === 0) return
    const next = count >= list.length ? [] : list.slice(0, list.length - count)
    if (next.length > 0) {
      outgoingStubs.set(specId, next)
    } else {
      outgoingStubs.delete(specId)
    }
    graphListeners.forEach((listener) => listener(specId))
  }

  const removeOutgoingStubsForSource = (specId: string, sourceId: string) => {
    const list = outgoingStubs.get(specId)
    if (!list) return
    const next = list.filter((stub) => stub.sourceId !== sourceId)
    if (next.length === list.length) return
    if (next.length > 0) {
      outgoingStubs.set(specId, next)
    } else {
      outgoingStubs.delete(specId)
    }
    graphListeners.forEach((listener) => listener(specId))
  }

  return {
    getLayout,
    getConnections,
    addConnection,
    removeConnection,
    removeConnectionsForBox,
    getIncomingStubs,
    addIncomingStub,
    removeIncomingStub,
    removeConnectionWithStub,
    createIncomingStubId: () => {
      const nextId = `${INCOMING_STUB_PREFIX}${incomingStubCounter}`
      incomingStubCounter += 1
      return nextId
    },
    createOutgoingStubId: () => {
      const nextId = `${OUTGOING_STUB_PREFIX}${outgoingStubCounter}`
      outgoingStubCounter += 1
      return nextId
    },
    getOutgoingStubs,
    addOutgoingStub,
    removeOutgoingStub,
    removeOutgoingStubs,
    removeOutgoingStubsForSource,
    getOutboundCapacityBoost: (nodeId: string) =>
      outgoingStubs.get(nodeId)?.length ?? 0,
    onGraphChanged: (listener) => {
      graphListeners.add(listener)
      return () => graphListeners.delete(listener)
    },
  }
}
