import type { Container } from "pixi.js"
import { renderConnections } from "./renderer/connectionRenderer"
import { createOutboundCapacityResolver } from "./core/flowLabel"
import { createNode } from "./renderer/nodeRenderer"
import type { GameModel } from "./core/model"
import type { IncomingStub, NodeSpec } from "./core/types"
import { syncIncomingStubLabels } from "./core/incomingStubLabels"
import type { NodeContainer } from "./renderer/types"

export type IncomingStubHandlerRef = {
  current?: (stub: IncomingStub, event: unknown) => void
}

export type NodeManager = {
  current: NodeContainer
  push: () => void
  pop: () => NodeContainer | undefined
  positionCurrent: () => void
  refreshCurrent: () => void
  getOrCreateNode: (spec: NodeSpec, width: number, height: number) => NodeContainer
}

export const createNodeManager = (
  camera: Container,
  getNodeSize: () => { width: number; height: number },
  getViewSize: () => { width: number; height: number },
  rootSpec: NodeSpec,
  model: GameModel,
  incomingStubHandlerRef?: IncomingStubHandlerRef,
): NodeManager => {
  const positionNode = (node: NodeContainer) => {
    const { width, height } = getViewSize()
    const x = (width - node.nodeWidth) / 2
    const y = (height - node.nodeHeight) / 2
    node.position.set(x, y)
  }

  const initialSize = getNodeSize()
  const nodeCache = new Map<string, NodeContainer>()
  const outboundCapacityResolver = createOutboundCapacityResolver(
    model.getOutboundCapacityBoost,
  )
  const refreshNode = (node: NodeContainer) => {
    syncIncomingStubLabels(node.boxLabels, model.getIncomingStubs(node.specId))
    renderConnections(
      node,
      model.getConnections(node.specId),
      model.getIncomingStubs(node.specId),
      model.getOutgoingStubs(node.specId),
      (connection) => model.removeConnectionWithStub(node.specId, connection),
      incomingStubHandlerRef?.current,
      (stub) => model.removeOutgoingStub(node.specId, stub),
      outboundCapacityResolver,
    )
  }
  const getOrCreateNode = (
    spec: NodeSpec,
    width: number,
    height: number,
  ) => {
    const cached = nodeCache.get(spec.id)
    if (cached && cached.nodeWidth === width && cached.nodeHeight === height) {
      refreshNode(cached)
      return cached
    }
    const layout = model.getLayout(spec, width, height)
    const nextNode = createNode(spec, width, height, layout)
    refreshNode(nextNode)
    nodeCache.set(spec.id, nextNode)
    return nextNode
  }
  let currentNode = getOrCreateNode(rootSpec, initialSize.width, initialSize.height)
  positionNode(currentNode)
  camera.addChild(currentNode)

  const nodeStack: NodeContainer[] = []

  return {
    get current() {
      return currentNode
    },
    set current(node: NodeContainer) {
      currentNode = node
    },
    push() {
      nodeStack.push(currentNode)
    },
    pop() {
      return nodeStack.pop()
    },
    positionCurrent() {
      positionNode(currentNode)
    },
    refreshCurrent() {
      refreshNode(currentNode)
    },
    getOrCreateNode,
  }
}
