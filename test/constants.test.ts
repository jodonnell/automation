import { describe, expect, it } from "vitest"
import { DOUBLE_CLICK_MS, ZOOM_IN_DURATION, ZOOM_OUT_DURATION } from "../src/constants"

describe("constants", () => {
  it("exports timing constants", () => {
    expect(DOUBLE_CLICK_MS).toBe(350)
    expect(ZOOM_IN_DURATION).toBe(480)
    expect(ZOOM_OUT_DURATION).toBe(360)
  })
})
