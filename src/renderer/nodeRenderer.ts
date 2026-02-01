import { Container, Graphics, Rectangle, Text } from "pixi.js"
import type { ConnectionPath, NodeLayout, NodeSpec } from "../core/types"
import { getOutboundCapacityForLabel } from "../core/flowLabel"
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
  box.isResourceNode = true

  const shape = new Graphics()
  shape.rect(0, 0, size, size)
  shape.fill(0xfff7eb)
  shape.stroke({ width: 3, color: 0x1f1b16 })
  box.addChild(shape)

  const labelText = new Text({
    text: label,
    style: {
      fontFamily: "Georgia, serif",
      fontSize: Math.max(26, Math.floor(size * 0.38)),
      fill: 0x1f1b16,
    },
  })
  labelText.anchor.set(0.5)
  labelText.position.set(size / 2, size * 0.42)
  box.addChild(labelText)
  box.labelText = labelText

  const countText = new Text({
    text: String(getOutboundCapacityForLabel(label)),
    style: {
      fontFamily: "Georgia, serif",
      fontSize: Math.max(14, Math.floor(size * 0.22)),
      fill: 0x1f1b16,
    },
  })
  countText.anchor.set(0.5)
  countText.position.set(size / 2, size * 0.7)
  box.addChild(countText)
  box.countText = countText

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
  node.resourceNodeIds = new Set()

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
    node.resourceNodeIds.add(child.id)
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

export const updateResourceNodeOutboundCounts = (
  node: NodeContainer,
  connections: ConnectionPath[],
) => {
  const outboundCount = new Map<string, number>()
  connections.forEach((connection) => {
    const current = outboundCount.get(connection.fromId) ?? 0
    outboundCount.set(connection.fromId, current + 1)
  })

  node.children.forEach((child) => {
    const box = child as BoxContainer
    if (!box.isResourceNode || !box.countText) return
    const id = typeof box.name === "string" ? box.name : ""
    const label = node.boxLabels.get(id) ?? ""
    const capacity = getOutboundCapacityForLabel(label)
    const used = outboundCount.get(id) ?? 0
    const remaining = Math.max(0, capacity - used)
    box.countText.text = String(remaining)
  })
}
