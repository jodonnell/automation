import { Container, Graphics, Rectangle, Text } from "pixi.js"
import type { BoxContainer, NodeContainer, NodeSpec } from "./types"

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
  shape.stroke({ width: 3, color: 0x111111 })
  box.addChild(shape)

  const text = new Text({
    text: label,
    style: {
      fontFamily: "Georgia, serif",
      fontSize: Math.max(28, Math.floor(size * 0.4)),
      fill: 0x111111,
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

const hashString = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createSeededRandom = (seed: number) => {
  let state = seed || 1
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const createNode = (
  spec: NodeSpec,
  width: number,
  height: number,
): NodeContainer => {
  const node = new Container() as NodeContainer
  node.nodeWidth = width
  node.nodeHeight = height
  node.connectionLayer = new Container()

  const base = Math.min(width, height)
  const gap = base * 0.08
  const boxSize = (base - gap * 4) / 3
  const padding = gap
  const minX = padding
  const minY = padding
  const maxX = width - padding - boxSize
  const maxY = height - padding - boxSize

  const placed: { x: number; y: number }[] = []
  const overlaps = (x: number, y: number) =>
    placed.some((p) => {
      return (
        x < p.x + boxSize &&
        x + boxSize > p.x &&
        y < p.y + boxSize &&
        y + boxSize > p.y
      )
    })

  const rng = createSeededRandom(hashString(`${spec.id}-${width}x${height}`))
  const pickSpot = () => {
    const maxAttempts = 200
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const x = minX + rng() * (maxX - minX)
      const y = minY + rng() * (maxY - minY)
      if (!overlaps(x, y)) return { x, y }
    }
    return null
  }

  node.addChild(node.connectionLayer)

  const children = getChildren(spec)
  children.forEach((child, index) => {
    const box = createBox(
      boxSize,
      child.label,
      child.id,
      getChildren(child).length > 0,
    )
    const spot = pickSpot()
    if (spot) {
      placed.push(spot)
      box.position.set(spot.x, spot.y)
    } else {
      const fallbackX = gap + index * (boxSize + gap)
      const fallbackY = (height - boxSize) / 2
      placed.push({ x: fallbackX, y: fallbackY })
      box.position.set(fallbackX, fallbackY)
    }
    node.addChild(box)
  })

  return node
}
