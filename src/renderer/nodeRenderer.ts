import { Container, Graphics, Rectangle, Text } from "pixi.js"
import type { NodeLayout, NodeSpec } from "../core/types"
import type { BoxContainer, NodeContainer } from "./types"

const createBox = (
  size: number,
  label: string,
  nodeId: string,
  hasChildren: boolean,
): BoxContainer => {
  const box = new Container() as BoxContainer
  box.boxSize = size
  box.name = nodeId

  const shape = new Graphics()
  shape.rect(0, 0, size, size)
  shape.fill(0xfff7eb)
  shape.stroke({ width: 3, color: 0x1f1b16 })
  box.addChild(shape)

  const text = new Text({
    text: label,
    style: {
      fontFamily: "Georgia, serif",
      fontSize: Math.max(28, Math.floor(size * 0.4)),
      fill: 0x1f1b16,
    },
  })
  text.anchor.set(0.5)
  text.position.set(size / 2, size / 2)
  box.addChild(text)

  box.eventMode = "static"
  box.cursor = hasChildren ? "pointer" : "default"
  box.hitArea = new Rectangle(0, 0, size, size)

  return box
}

const getChildren = (spec: NodeSpec) => spec.children ?? []

export const createNode = (
  spec: NodeSpec,
  width: number,
  height: number,
  layout: NodeLayout,
): NodeContainer => {
  const node = new Container() as NodeContainer
  node.nodeWidth = width
  node.nodeHeight = height
  node.connectionLayer = new Container()
  node.flowLayer = new Container()
  node.incomingLayer = new Container()
  node.specId = spec.id
  node.boxLabels = new Map()

  const base = Math.min(width, height)
  const gap = base * 0.08
  const boxSize = layout.boxSize

  node.addChild(node.connectionLayer)
  node.addChild(node.flowLayer)
  node.addChild(node.incomingLayer)

  const children = getChildren(spec)
  children.forEach((child, index) => {
    const box = createBox(
      boxSize,
      child.label,
      child.id,
      getChildren(child).length > 0,
    )
    node.boxLabels.set(child.id, child.label)
    const stored = layout.positions.get(child.id)
    if (stored) {
      box.position.set(stored.x, stored.y)
    } else {
      const fallbackX = gap + index * (boxSize + gap)
      const fallbackY = (height - boxSize) / 2
      box.position.set(fallbackX, fallbackY)
    }
    node.addChild(box)
  })

  return node
}
