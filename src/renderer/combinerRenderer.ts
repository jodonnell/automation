import { Container, Graphics, Rectangle, Text } from "pixi.js"
import type { BoxContainer } from "./types"

export const createCombiner = (
  size: number,
  label: string,
  id: string,
): BoxContainer => {
  const combiner = new Container() as BoxContainer
  combiner.boxSize = size
  combiner.name = id

  const shape = new Graphics()
  shape.circle(size / 2, size / 2, size / 2)
  shape.fill(0xfff7eb)
  shape.stroke({ width: 3, color: 0x1f1b16 })
  combiner.addChild(shape)

  const text = new Text({
    text: label,
    style: {
      fontFamily: "Georgia, serif",
      fontSize: Math.max(18, Math.floor(size * 0.35)),
      fill: 0x1f1b16,
    },
  })
  text.anchor.set(0.5)
  text.position.set(size / 2, size / 2)
  combiner.addChild(text)

  combiner.eventMode = "static"
  combiner.cursor = "pointer"
  combiner.hitArea = new Rectangle(0, 0, size, size)

  return combiner
}
