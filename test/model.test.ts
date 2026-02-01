import { describe, expect, it } from "vitest"
import { createGameModel } from "../src/core/model"
import { canAddConnection } from "../src/core/flowLabel"
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

  it("removes extended connections when an incoming stub is removed", () => {
    const model = createGameModel()
    const specId = "child"
    const stubId = `${INCOMING_STUB_PREFIX}0`
    const stub = {
      id: stubId,
      label: "A",
      sourceId: "root-A",
      start: { x: 10, y: 10 },
      end: { x: 20, y: 10 },
    }

    model.addIncomingStub(specId, stub)
    model.addConnection(specId, {
      fromId: stubId,
      toId: "child-X",
      points: [
        { x: 20, y: 10 },
        { x: 40, y: 10 },
      ],
    })

    model.removeIncomingStub(specId, stub)

    expect(model.getConnections(specId)).toHaveLength(0)
    expect(model.getIncomingStubs(specId)).toHaveLength(0)
  })

  it("limits incoming stubs to one outgoing connection", () => {
    const model = createGameModel()
    const specId = "child"
    const stubId = `${INCOMING_STUB_PREFIX}0`
    const boxLabels = new Map<string, string>([[stubId, "A"]])

    const first = canAddConnection({
      connection: {
        fromId: stubId,
        toId: "child-A",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      },
      connections: model.getConnections(specId),
      boxLabels,
    })
    if (first) {
      model.addConnection(specId, {
        fromId: stubId,
        toId: "child-A",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      })
    }

    const second = canAddConnection({
      connection: {
        fromId: stubId,
        toId: "child-B",
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 10 },
        ],
      },
      connections: model.getConnections(specId),
      boxLabels,
    })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(model.getConnections(specId)).toHaveLength(1)
  })
})
