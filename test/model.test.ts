import { describe, expect, it } from "vitest"
import { createGameModel } from "../src/core/model"
import { INCOMING_STUB_PREFIX } from "../src/constants"

describe("createGameModel", () => {
  it("generates unique incoming stub ids with prefix", () => {
    const model = createGameModel()
    const first = model.createIncomingStubId()
    const second = model.createIncomingStubId()

    expect(first).toMatch(new RegExp(`^${INCOMING_STUB_PREFIX}`))
    expect(second).toMatch(new RegExp(`^${INCOMING_STUB_PREFIX}`))
    expect(first).not.toBe(second)
  })
})
