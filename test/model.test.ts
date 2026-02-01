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

  it("removes outgoing stubs when deleting a source box", () => {
    const model = createGameModel()
    const specId = "root"
    const stub = {
      id: "outgoing-0",
      label: "B",
      sourceId: "box-b",
      start: { x: 10, y: 10 },
      end: { x: 30, y: 10 },
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 10 },
      ],
    }

    model.addOutgoingStub(specId, stub)
    model.removeConnectionsForBox(specId, "box-b")

    expect(model.getOutgoingStubs(specId)).toHaveLength(0)
  })

  it("removes one outgoing stub when a connection is removed", () => {
    const model = createGameModel()
    const specId = "root"
    const connection = {
      fromId: "node-a",
      toId: "node-b",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    }
    model.addConnection(specId, connection)
    model.addOutgoingStub(specId, {
      id: "outgoing-0",
      label: "B",
      sourceId: "node-a",
      start: { x: 10, y: 10 },
      end: { x: 30, y: 10 },
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 10 },
      ],
    })

    model.removeConnection(specId, connection)

    expect(model.getOutgoingStubs(specId)).toHaveLength(1)
  })

  it("removes outgoing stubs when incoming stub connections are removed", () => {
    const model = createGameModel()
    const specId = "root"
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
      toId: "root-B",
      points: [
        { x: 20, y: 10 },
        { x: 40, y: 10 },
      ],
    })
    model.addOutgoingStub(specId, {
      id: "outgoing-0",
      label: "B",
      sourceId: "root-B",
      start: { x: 10, y: 10 },
      end: { x: 30, y: 10 },
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 10 },
      ],
    })

    model.removeIncomingStub(specId, stub)

    expect(model.getConnections(specId)).toHaveLength(0)
    expect(model.getOutgoingStubs(specId)).toHaveLength(0)
  })

  it("removes multiple outgoing stubs when requested", () => {
    const model = createGameModel()
    const specId = "root"
    model.addOutgoingStub(specId, {
      id: "outgoing-0",
      label: "B",
      sourceId: "node-a",
      start: { x: 10, y: 10 },
      end: { x: 30, y: 10 },
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 10 },
      ],
    })
    model.addOutgoingStub(specId, {
      id: "outgoing-1",
      label: "B",
      sourceId: "node-a",
      start: { x: 20, y: 20 },
      end: { x: 40, y: 20 },
      points: [
        { x: 20, y: 20 },
        { x: 40, y: 20 },
      ],
    })

    model.removeOutgoingStubs(specId, 1)
    expect(model.getOutgoingStubs(specId)).toHaveLength(1)

    model.removeOutgoingStubs(specId, 2)
    expect(model.getOutgoingStubs(specId)).toHaveLength(0)
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
      resourceNodeIds: new Set(),
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
      resourceNodeIds: new Set(),
    })

    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(model.getConnections(specId)).toHaveLength(1)
  })

  it("blocks outbound connections when resource node capacity is zero", () => {
    const model = createGameModel()
    const specId = "root"
    const boxLabels = new Map<string, string>([
      ["node-a", "A"],
      ["node-b", "B"],
    ])

    const allowed = canAddConnection({
      connection: {
        fromId: "node-b",
        toId: "node-a",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      },
      connections: model.getConnections(specId),
      boxLabels,
      resourceNodeIds: new Set(["node-a", "node-b"]),
    })

    expect(allowed).toBe(false)
  })

  it("allows outbound connections when capacity is boosted", () => {
    const model = createGameModel()
    const specId = "root"
    const boxLabels = new Map<string, string>([
      ["node-c", "C"],
      ["node-a", "A"],
    ])

    model.addOutgoingStub("node-c", {
      id: "outgoing-0",
      label: "C",
      sourceId: "node-c",
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    })

    const allowed = canAddConnection({
      connection: {
        fromId: "node-c",
        toId: "node-a",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      },
      connections: model.getConnections(specId),
      boxLabels,
      resourceNodeIds: new Set(["node-a", "node-c"]),
      getOutboundCapacityForNode: (nodeId, label) =>
        (label.trim().toUpperCase() === "A" ? 3 : 0) +
        model.getOutboundCapacityBoost(nodeId),
    })

    expect(allowed).toBe(true)
  })

  it("limits resource node outbound connections by label capacity", () => {
    const model = createGameModel()
    const specId = "root"
    const boxLabels = new Map<string, string>([["node-a", "A"]])

    const connections = model.getConnections(specId)
    const connection = (toId: string) => ({
      fromId: "node-a",
      toId,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    })

    expect(
      canAddConnection({
        connection: connection("node-b"),
        connections,
        boxLabels,
        resourceNodeIds: new Set(["node-a"]),
      }),
    ).toBe(true)
    model.addConnection(specId, connection("node-b"))

    expect(
      canAddConnection({
        connection: connection("node-c"),
        connections: model.getConnections(specId),
        boxLabels,
        resourceNodeIds: new Set(["node-a"]),
      }),
    ).toBe(true)
    model.addConnection(specId, connection("node-c"))

    expect(
      canAddConnection({
        connection: connection("node-d"),
        connections: model.getConnections(specId),
        boxLabels,
        resourceNodeIds: new Set(["node-a"]),
      }),
    ).toBe(true)
    model.addConnection(specId, connection("node-d"))

    expect(
      canAddConnection({
        connection: connection("node-e"),
        connections: model.getConnections(specId),
        boxLabels,
        resourceNodeIds: new Set(["node-a"]),
      }),
    ).toBe(false)
  })

  it("does not enforce capacity when fromId is not a resource node", () => {
    const model = createGameModel()
    const specId = "root"
    const boxLabels = new Map<string, string>([
      ["converter-0", "A"],
      ["node-a", "A"],
    ])

    const allowed = canAddConnection({
      connection: {
        fromId: "converter-0",
        toId: "node-a",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      },
      connections: model.getConnections(specId),
      boxLabels,
      resourceNodeIds: new Set(["node-a"]),
    })

    expect(allowed).toBe(true)
  })
})
