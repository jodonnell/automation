import { Container, Graphics, Rectangle, Text } from "pixi.js"
import { LETTERS } from "./constants"
import type { BoxContainer, NodeContainer } from "./types"

const createBox = (size: number, label: string): BoxContainer => {
  const box = new Container() as BoxContainer
  box.boxSize = size

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
  box.cursor = "pointer"
  box.hitArea = new Rectangle(0, 0, size, size)

  return box
}

export const createNode = (width: number, height: number): NodeContainer => {
  const node = new Container() as NodeContainer
  node.nodeWidth = width
  node.nodeHeight = height

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

  const pickSpot = () => {
    const maxAttempts = 200
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const x = minX + Math.random() * (maxX - minX)
      const y = minY + Math.random() * (maxY - minY)
      if (!overlaps(x, y)) return { x, y }
    }
    return null
  }

  LETTERS.forEach((label, index) => {
    const box = createBox(boxSize, label)
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
