import { describe, expect, it, vi } from "vitest"
import { createPixiMock } from "./helpers/pixiMock"

vi.mock("pixi.js", () => createPixiMock())

import { Container } from "pixi.js"
import { computeLayout } from "../src/core/layout"
import { createGameModel } from "../src/core/model"
import {
  canAddConnection,
  resolveFlowLabel,
} from "../src/core/flowLabel"
import { createNode } from "../src/renderer/nodeRenderer"
import { createCombiner } from "../src/renderer/combinerRenderer"
import { createPlaceableManager } from "../src/features/placeables/manager"
import { renderConnections } from "../src/renderer/connectionRenderer"
import { INCOMING_STUB_PREFIX } from "../src/constants"
import type { NodeManager } from "../src/nodeManager"
import type { NodeSpec } from "../src/core/types"

const makeStub = (
  id: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  label = "",
  sourceId = "",
) => ({
  id: id.startsWith(INCOMING_STUB_PREFIX) ? id : `${INCOMING_STUB_PREFIX}${id}`,
  label,
  sourceId,
  start,
  end,
})

const buildNode = (labels: string[]) => {
  const spec: NodeSpec = {
    id: "root",
    label: "",
    children: labels.map((label, index) => ({
      id: `root-${index}`,
      label,
    })),
  }
  const width = 800
  const height = 600
  const layout = computeLayout(spec, width, height)
  return createNode(spec, width, height, layout)
}

describe("createCombiner", () => {
  it("renders a circular combiner with text", () => {
    const combiner = createCombiner(40, "+", "combiner-1")
    const [shape, label] = combiner.children as [
      { lastCircle?: { x: number; y: number; radius: number } },
      { text?: string },
    ]

    expect(combiner.boxSize).toBe(40)
    expect(combiner.name).toBe("combiner-1")
    expect(shape.lastCircle).toEqual({ x: 20, y: 20, radius: 20 })
    expect(label.text).toBe("+")
  })
})

describe("combiner placeable", () => {
  it("adds a smaller combiner at the pointer position on key 2", () => {
    const stage = new Container()
    const node = buildNode(["A"])
    const baseBox = node.children.find((child: any) => "boxSize" in child) as
      | { boxSize: number; position: { x: number; y: number } }
      | undefined

    const listeners: Record<string, (event: any) => void> = {}
    const windowStub = {
      addEventListener: vi.fn((event: string, handler: (event: any) => void) => {
        listeners[event] = handler
      }),
    }
    const rebindBoxes = vi.fn()
    const model = createGameModel()
    const nodeManager = { current: node } as NodeManager

    const manager = createPlaceableManager({
      stage,
      window: windowStub as unknown as Window,
      nodeManager,
      model,
      onRebindBoxes: rebindBoxes,
    })
    manager.attach()

    const pointerMove = (stage as unknown as { _listeners: Record<string, any> })
      ._listeners.pointermove
    const safeX = baseBox
      ? Math.min(
          node.nodeWidth - baseBox.boxSize,
          Math.max(0, baseBox.position.x + baseBox.boxSize + 120),
        )
      : 300
    const safeY = baseBox
      ? Math.min(
          node.nodeHeight - baseBox.boxSize,
          Math.max(0, baseBox.position.y + baseBox.boxSize + 120),
        )
      : 220
    pointerMove({ global: { x: safeX, y: safeY } })

    listeners.keydown({ key: "2" })

    const boxes = node.children.filter((child: any) => "boxSize" in child) as
      | Array<{ name?: string; boxSize: number; position: { x: number; y: number } }>
    const combiner = boxes.find((child) => child.name?.startsWith("combiner"))

    expect(combiner).toBeTruthy()
    expect(combiner?.boxSize).toBeLessThan(baseBox?.boxSize ?? 0)
    expect(combiner?.position.x).toBeCloseTo(
      safeX - combiner!.boxSize / 2,
      4,
    )
    expect(combiner?.position.y).toBeCloseTo(
      safeY - combiner!.boxSize / 2,
      4,
    )
    expect(rebindBoxes).toHaveBeenCalled()
  })
})

describe("combiner connections", () => {
  it("limits combiners to two incoming connections and one outgoing", () => {
    const model = createGameModel()
    const specId = "root"
    const combinerId = "combiner-0"
    const boxLabels = new Map<string, string>([
      ["root-0", "1"],
      ["root-1", "2"],
      ["root-2", "3"],
      ["converter-0", "1"],
      ["converter-1", "2"],
      ["converter-2", "3"],
    ])

    const tryAdd = (connection: {
      fromId: string
      toId: string
      points: { x: number; y: number }[]
      incomingStub: ReturnType<typeof makeStub>
    }) => {
      const allowed = canAddConnection({
        connection,
        connections: model.getConnections(specId),
        boxLabels,
        resourceNodeIds: new Set(["root-0", "root-1", "root-2"]),
      })
      if (!allowed) return false
      return model.addConnection(specId, connection)
    }

    const firstIncoming = tryAdd({
      fromId: "converter-0",
      toId: combinerId,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      incomingStub: makeStub(
        "incoming-0",
        { x: 20, y: 20 },
        { x: 30, y: 20 },
        "1",
        "converter-0",
      ),
    })
    const secondIncoming = tryAdd({
      fromId: "converter-1",
      toId: combinerId,
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 40 },
      ],
      incomingStub: makeStub(
        "incoming-1",
        { x: 40, y: 40 },
        { x: 50, y: 40 },
        "2",
        "converter-1",
      ),
    })
    const thirdIncoming = tryAdd({
      fromId: "converter-2",
      toId: combinerId,
      points: [
        { x: 50, y: 50 },
        { x: 60, y: 60 },
      ],
      incomingStub: makeStub(
        "incoming-2",
        { x: 60, y: 60 },
        { x: 70, y: 60 },
        "3",
        "converter-2",
      ),
    })
    const firstOutgoing = tryAdd({
      fromId: combinerId,
      toId: "root-0",
      points: [
        { x: 70, y: 70 },
        { x: 80, y: 80 },
      ],
      incomingStub: makeStub(
        "incoming-3",
        { x: 80, y: 80 },
        { x: 90, y: 80 },
        "12",
        combinerId,
      ),
    })
    const secondOutgoing = tryAdd({
      fromId: combinerId,
      toId: "root-1",
      points: [
        { x: 90, y: 90 },
        { x: 100, y: 100 },
      ],
      incomingStub: makeStub(
        "incoming-4",
        { x: 100, y: 100 },
        { x: 110, y: 100 },
        "12",
        combinerId,
      ),
    })

    expect(firstIncoming).toBe(true)
    expect(secondIncoming).toBe(true)
    expect(thirdIncoming).toBe(false)
    expect(firstOutgoing).toBe(true)
    expect(secondOutgoing).toBe(false)
    expect(model.getConnections(specId)).toHaveLength(3)
  })

  it("blocks mixed-type incoming connections on a combiner", () => {
    const node = buildNode(["1", "a"])
    const model = createGameModel()
    const connections = model.getConnections(node.specId)
    const combinerId = "combiner-0"
    node.boxLabels.set(combinerId, "+")
    node.boxLabels.set("converter-0", "1")
    node.boxLabels.set("converter-1", "a")

    connections.push({
      fromId: "converter-0",
      toId: combinerId,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      incomingStub: makeStub(
        "incoming-5",
        { x: 20, y: 20 },
        { x: 30, y: 20 },
        "1",
        "converter-0",
      ),
    })

    const allowMixed = canAddConnection({
      connection: {
        fromId: "converter-1",
        toId: combinerId,
        points: [
          { x: 40, y: 40 },
          { x: 50, y: 50 },
        ],
        incomingStub: makeStub(
          "incoming-6",
          { x: 50, y: 50 },
          { x: 60, y: 50 },
          "a",
          "converter-1",
        ),
      },
      connections,
      boxLabels: node.boxLabels,
      resourceNodeIds: new Set(["root-0", "root-1"]),
    })

    expect(allowMixed).toBe(false)
  })
})

describe("combiner flows", () => {
  it("combines letter inputs in order", () => {
    const node = buildNode(["c", "a", "t"])
    const combiner = createCombiner(40, "+", "combiner-0")
    combiner.position.set(200, 200)
    node.addChild(combiner)
    node.boxLabels.set("combiner-0", "+")

    const connections = [
      {
        fromId: "root-0",
        toId: "combiner-0",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        incomingStub: makeStub(
          "incoming-7",
          { x: 10, y: 0 },
          { x: 15, y: 0 },
          "c",
          "root-0",
        ),
      },
      {
        fromId: "root-1",
        toId: "combiner-0",
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 10 },
        ],
        incomingStub: makeStub(
          "incoming-8",
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          "a",
          "root-1",
        ),
      },
      {
        fromId: "combiner-0",
        toId: "root-2",
        points: [
          { x: 0, y: 20 },
          { x: 10, y: 20 },
        ],
        incomingStub: makeStub(
          "incoming-9",
          { x: 10, y: 20 },
          { x: 15, y: 20 },
          "ca",
          "combiner-0",
        ),
      },
    ]

    renderConnections(node, connections, [])

    const glyphs = node.flowLayer.children as Array<{ text: string }>
    expect(glyphs[0].text).toBe("c")
    expect(glyphs[1].text).toBe("a")
    expect(glyphs[2].text).toBe("ca")
  })

  it("adds numeric inputs and passes through a single input", () => {
    const node = buildNode(["1", "2", "3"])
    const combiner = createCombiner(40, "+", "combiner-0")
    combiner.position.set(200, 200)
    node.addChild(combiner)
    node.boxLabels.set("combiner-0", "+")

    const connections = [
      {
        fromId: "root-0",
        toId: "combiner-0",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        incomingStub: makeStub(
          "incoming-10",
          { x: 10, y: 0 },
          { x: 15, y: 0 },
          "1",
          "root-0",
        ),
      },
      {
        fromId: "combiner-0",
        toId: "root-2",
        points: [
          { x: 0, y: 20 },
          { x: 10, y: 20 },
        ],
        incomingStub: makeStub(
          "incoming-11",
          { x: 10, y: 20 },
          { x: 15, y: 20 },
          "1",
          "combiner-0",
        ),
      },
    ]

    renderConnections(node, connections, [])

    const glyphs = node.flowLayer.children as Array<{ text: string }>
    expect(glyphs[0].text).toBe("1")
    expect(glyphs[1].text).toBe("1")

    const combined = resolveFlowLabel(
      "combiner-0",
      node.boxLabels,
      [
        ...connections,
        {
          fromId: "root-1",
          toId: "combiner-0",
          points: [
            { x: 0, y: 30 },
            { x: 10, y: 30 },
          ],
          incomingStub: makeStub(
            "incoming-12",
            { x: 10, y: 30 },
            { x: 15, y: 30 },
            "2",
            "root-1",
          ),
        },
      ],
    )
    expect(combined).toBe("3")
  })

  it("skips flow when the combiner has no input", () => {
    const node = buildNode(["1", "2"])
    const combiner = createCombiner(40, "+", "combiner-0")
    combiner.position.set(200, 200)
    node.addChild(combiner)
    node.boxLabels.set("combiner-0", "+")

    const connections = [
      {
        fromId: "combiner-0",
        toId: "root-0",
        points: [
          { x: 0, y: 20 },
          { x: 10, y: 20 },
        ],
        incomingStub: makeStub(
          "incoming-13",
          { x: 10, y: 20 },
          { x: 15, y: 20 },
          "1",
          "combiner-0",
        ),
      },
    ]

    renderConnections(node, connections, [])

    expect(node.flowLayer.children).toHaveLength(0)
  })
})
