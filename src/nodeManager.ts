import type { Container } from "pixi.js"
import { createNode } from "./node"
import type { NodeContainer } from "./types"

export type NodeManager = {
  current: NodeContainer
  push: () => void
  pop: () => NodeContainer | undefined
  positionCurrent: () => void
}

export const createNodeManager = (
  camera: Container,
  getNodeSize: () => { width: number; height: number },
  getViewSize: () => { width: number; height: number },
): NodeManager => {
  const positionNode = (node: NodeContainer) => {
    const { width, height } = getViewSize()
    const x = (width - node.nodeWidth) / 2
    const y = (height - node.nodeHeight) / 2
    node.position.set(x, y)
  }

  const initialSize = getNodeSize()
  let currentNode = createNode(initialSize.width, initialSize.height)
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
  }
}
