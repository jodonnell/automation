import { describe, expect, it } from "vitest"
import {
  centerBoundsAtScale,
  computeOuterAlpha,
  focusBounds,
  lerpCameraTransform,
  worldBoundsToLocal,
} from "../src/sceneMath"

const bounds = { x: 10, y: 20, width: 100, height: 200 }

describe("sceneMath", () => {
  it("centers bounds at scale", () => {
    const result = centerBoundsAtScale(bounds, 800, 600, 2)
    expect(result.scale).toBe(2)
    expect(result.x).toBe(400 - (10 + 50) * 2)
    expect(result.y).toBe(300 - (20 + 100) * 2)
  })

  it("focuses bounds based on view", () => {
    const result = focusBounds(bounds, 800, 600)
    const expectedScale = Math.min(800 / 100, 600 / 200)
    expect(result.scale).toBe(expectedScale)
  })

  it("converts world bounds to local using inverse transform", () => {
    const result = worldBoundsToLocal(bounds, (x, y) => ({ x: x / 2, y: y / 2 }))
    expect(result).toEqual({
      x: 5,
      y: 10,
      width: 50,
      height: 100,
    })
  })

  it("computes outer alpha to hit zero at cutoff", () => {
    expect(computeOuterAlpha(0, 0, 0.5)).toBe(1)
    expect(computeOuterAlpha(0.5, 0, 0.5)).toBe(0)
    expect(computeOuterAlpha(1, 0, 0.5)).toBe(0)
  })

  it("lerps camera transform with eased progress", () => {
    const result = lerpCameraTransform(
      { x: 0, y: 10, scale: 1 },
      { x: 100, y: -10, scale: 3 },
      0.25,
    )
    expect(result).toEqual({ x: 25, y: 5, scale: 1.5 })
  })
})
