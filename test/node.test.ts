import { describe, expect, it } from "vitest"
import { createPixiMock } from "./helpers/pixiMock"

vi.mock("pixi.js", () => createPixiMock())

import { createNode } from "../src/renderer/nodeRenderer"
import { computeLayout } from "../src/core/layout"
import type { NodeSpec } from "../src/core/types"

const nonOverlapping = (a: { x: number; y: number; size: number }, b: { x: number; y: number; size: number }) => {
  return !(
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  )
}

describe("createNode", () => {
  it("creates three boxes within bounds without overlap", () => {
    const width = 400
    const height = 300
    const spec: NodeSpec = {
      id: "root",
      label: "",
      children: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
    }
    const layout = computeLayout(spec, width, height)
    const node = createNode(spec, width, height, layout)
    const boxes = node.children.filter((child: any) => "boxSize" in child)
    expect(boxes.length).toBe(3)

    const base = Math.min(width, height)
    const gap = base * 0.08
    const boxSize = (base - gap * 4) / 3
    const minX = gap
    const minY = gap
    const maxX = width - gap - boxSize
    const maxY = height - gap - boxSize

    const positions = boxes.map((child: any) => ({
      x: child.position.x,
      y: child.position.y,
      size: boxSize,
    }))

    positions.forEach((pos) => {
      expect(pos.x).toBeGreaterThanOrEqual(minX)
      expect(pos.y).toBeGreaterThanOrEqual(minY)
      expect(pos.x).toBeLessThanOrEqual(maxX)
      expect(pos.y).toBeLessThanOrEqual(maxY)
    })

    expect(nonOverlapping(positions[0], positions[1])).toBe(true)
    expect(nonOverlapping(positions[0], positions[2])).toBe(true)
    expect(nonOverlapping(positions[1], positions[2])).toBe(true)
  })

  it("is deterministic for the same spec and size", () => {
    const width = 500
    const height = 320
    const spec: NodeSpec = {
      id: "root",
      label: "",
      children: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
    }

    const layout = computeLayout(spec, width, height)
    const first = createNode(spec, width, height, layout)
    const second = createNode(spec, width, height, layout)

    const firstBoxes = first.children.filter((child: any) => "boxSize" in child)
    const secondBoxes = second.children.filter((child: any) => "boxSize" in child)
    firstBoxes.forEach((child: any, index: number) => {
      const firstPos = (child as { position: { x: number; y: number } }).position
      const secondPos = (secondBoxes[index] as { position: { x: number; y: number } }).position
      expect(firstPos.x).toBeCloseTo(secondPos.x, 6)
      expect(firstPos.y).toBeCloseTo(secondPos.y, 6)
    })
  })
})
