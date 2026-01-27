import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPixiMock } from "./helpers/pixiMock"

vi.mock("pixi.js", () => createPixiMock())

import { createNode } from "../src/node"

const nonOverlapping = (a: { x: number; y: number; size: number }, b: { x: number; y: number; size: number }) => {
  return !(
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  )
}

describe("createNode", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("creates three boxes within bounds without overlap", () => {
    const sequence = [0.0326, 0.0326, 0.5217, 0.5217, 0.9565, 0.0326]
    let idx = 0
    vi.spyOn(Math, "random").mockImplementation(() => {
      const value = sequence[idx] ?? 0.5
      idx += 1
      return value
    })

    const size = 300
    const node = createNode(size)
    expect(node.children.length).toBe(3)

    const gap = size * 0.08
    const boxSize = (size - gap * 4) / 3
    const min = gap
    const max = size - gap - boxSize

    const positions = node.children.map((child: any) => ({
      x: child.position.x,
      y: child.position.y,
      size: boxSize,
    }))

    positions.forEach((pos) => {
      expect(pos.x).toBeGreaterThanOrEqual(min)
      expect(pos.y).toBeGreaterThanOrEqual(min)
      expect(pos.x).toBeLessThanOrEqual(max)
      expect(pos.y).toBeLessThanOrEqual(max)
    })

    expect(nonOverlapping(positions[0], positions[1])).toBe(true)
    expect(nonOverlapping(positions[0], positions[2])).toBe(true)
    expect(nonOverlapping(positions[1], positions[2])).toBe(true)
  })
})
