import { describe, expect, it } from "vitest"
import { easeInOutCubic } from "../src/easing"

describe("easeInOutCubic", () => {
  it("returns 0 at t=0", () => {
    expect(easeInOutCubic(0)).toBe(0)
  })

  it("returns 1 at t=1", () => {
    expect(easeInOutCubic(1)).toBe(1)
  })

  it("is symmetric at midpoint", () => {
    expect(easeInOutCubic(0.5)).toBe(0.5)
  })
})
