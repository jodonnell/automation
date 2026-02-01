import { describe, expect, it, vi } from "vitest"
import { createPixiMock } from "./helpers/pixiMock"

vi.mock("pixi.js", () => createPixiMock())

import { Container } from "pixi.js"
import { computeLayout } from "../src/core/layout"
import { createGameModel } from "../src/core/model"
import { canAddConnection } from "../src/core/flowLabel"
import { convertLabel } from "../src/core/converter"
import { createNode } from "../src/renderer/nodeRenderer"
import { createConverter } from "../src/renderer/converterRenderer"
import { createPlaceableManager } from "../src/features/placeables/manager"
import { createDragInteractions } from "../src/renderer/interactions/drag"
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

const buildNode = () => {
  const spec: NodeSpec = {
    id: "root",
    label: "",
    children: [{ id: "root-A", label: "A" }],
  }
  const width = 800
  const height = 600
  const layout = computeLayout(spec, width, height)
  return createNode(spec, width, height, layout)
}

describe("convertLabel", () => {
  it("multiplies multi-letter labels into a number", () => {
    expect(convertLabel("bb")).toBe("4")
    expect(convertLabel("aaa")).toBe("1")
    expect(convertLabel("abc")).toBe("6")
    expect(convertLabel("Az")).toBe("26")
  })
})

describe("createConverter", () => {
  it("renders a circular converter with text", () => {
    const converter = createConverter(40, "1/a", "converter-1")
    const [shape, label] = converter.children as [
      { lastCircle?: { x: number; y: number; radius: number } },
      { text?: string },
    ]

    expect(converter.boxSize).toBe(40)
    expect(converter.name).toBe("converter-1")
    expect(shape.lastCircle).toEqual({ x: 20, y: 20, radius: 20 })
    expect(label.text).toBe("1/a")
  })
})

describe("placeable manager", () => {
  it("adds a smaller converter at the pointer position on key 1", () => {
    const stage = new Container()
    const node = buildNode()
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

    listeners.keydown({ key: "1" })

    const boxes = node.children.filter((child: any) => "boxSize" in child) as
      | Array<{ name?: string; boxSize: number; position: { x: number; y: number } }>
    const converter = boxes.find((child) => child.name?.startsWith("converter"))

    expect(converter).toBeTruthy()
    expect(converter?.boxSize).toBeLessThan(baseBox?.boxSize ?? 0)
    expect(converter?.position.x).toBeCloseTo(
      safeX - converter!.boxSize / 2,
      4,
    )
    expect(converter?.position.y).toBeCloseTo(
      safeY - converter!.boxSize / 2,
      4,
    )
    expect(rebindBoxes).toHaveBeenCalled()
  })

  it("blocks placement when colliding with a box or connection", () => {
    const stage = new Container()
    const node = buildNode()
    const model = createGameModel()
    const box = node.children.find((child: any) => "boxSize" in child) as
      | { position: { x: number; y: number }; boxSize: number }
      | undefined

    const listeners: Record<string, (event: any) => void> = {}
    const windowStub = {
      addEventListener: vi.fn((event: string, handler: (event: any) => void) => {
        listeners[event] = handler
      }),
    }
    const nodeManager = { current: node } as NodeManager

    const manager = createPlaceableManager({
      stage,
      window: windowStub as unknown as Window,
      nodeManager,
      model,
      onRebindBoxes: vi.fn(),
    })
    manager.attach()

    const pointerMove = (stage as unknown as { _listeners: Record<string, any> })
      ._listeners.pointermove

    const boxCenter = {
      x: (box?.position.x ?? 0) + (box?.boxSize ?? 0) / 2,
      y: (box?.position.y ?? 0) + (box?.boxSize ?? 0) / 2,
    }
    pointerMove({ global: boxCenter })
    listeners.keydown({ key: "1" })

    const boxesAfterBoxCollision = node.children.filter(
      (child: any) => "boxSize" in child,
    )
    expect(
      boxesAfterBoxCollision.some((child: any) =>
        String(child.name ?? "").startsWith("converter"),
      ),
    ).toBe(false)

    const connectionPoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ]
    model.addConnection(node.specId, {
      fromId: "root-A",
      toId: "root-A",
      points: connectionPoints,
      incomingStub: makeStub(
        "incoming-0",
        connectionPoints[1],
        { x: 330, y: 100 },
        "A",
        "root-A",
      ),
    })

    pointerMove({ global: { x: 200, y: 100 } })
    listeners.keydown({ key: "1" })

    const boxesAfterConnection = node.children.filter(
      (child: any) => "boxSize" in child,
    )
    expect(
      boxesAfterConnection.some((child: any) =>
        String(child.name ?? "").startsWith("converter"),
      ),
    ).toBe(false)
  })

  it("removes a converter on right click", () => {
    const node = buildNode()
    const model = createGameModel()
    const nodeManager = { current: node } as NodeManager
    const manager = createPlaceableManager({
      stage: new Container(),
      window: { addEventListener: vi.fn() } as unknown as Window,
      nodeManager,
      model,
      onRebindBoxes: vi.fn(),
    })
    const converter = createConverter(40, "1/a", "converter-0")
    converter.position.set(120, 120)
    node.addChild(converter)
    node.boxLabels.set("converter-0", "1/a")

    model.addConnection(node.specId, {
      fromId: "converter-0",
      toId: "root-A",
      points: [
        { x: 130, y: 130 },
        { x: 200, y: 200 },
      ],
      incomingStub: makeStub(
        "incoming-1",
        { x: 200, y: 200 },
        { x: 230, y: 200 },
        "1",
        "converter-0",
      ),
    })

    const drag = createDragInteractions({
      nodeManager,
      model,
      cameraController: { isTweening: false },
      resolveSpecForBox: () => null,
      onDoubleClick: vi.fn(),
      isDeleteableBox: manager.isDeleteableBox,
      onDeleteBox: manager.deleteBox,
    })

    drag.bindBoxHandlers(node)
    const event = {
      button: 2,
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    }
    ;(converter as unknown as { _listeners: Record<string, any> })._listeners
      .pointerdown(event)

    const remaining = node.children.filter(
      (child: any) => "boxSize" in child,
    )
    expect(
      remaining.some((child: any) =>
        String(child.name ?? "").startsWith("converter"),
      ),
    ).toBe(false)
    expect(model.getConnections(node.specId)).toHaveLength(0)
  })
})

describe("converter connections", () => {
  it("limits converters to one incoming and one outgoing connection", () => {
    const model = createGameModel()
    const specId = "root"
    const converterId = "converter-0"
    const boxLabels = new Map<string, string>([
      ["root-A", "A"],
      ["root-B", "B"],
      ["root-C", "C"],
    ])
    const resourceNodeIds = new Set(["root-A", "root-B", "root-C"])

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
        resourceNodeIds,
      })
      if (!allowed) return false
      return model.addConnection(specId, connection)
    }

    const firstIncoming = tryAdd({
      fromId: "root-A",
      toId: converterId,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      incomingStub: makeStub(
        "incoming-2",
        { x: 20, y: 20 },
        { x: 30, y: 20 },
        "A",
        "root-A",
      ),
    })
    const secondIncoming = tryAdd({
      fromId: "root-B",
      toId: converterId,
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 40 },
      ],
      incomingStub: makeStub(
        "incoming-3",
        { x: 40, y: 40 },
        { x: 50, y: 40 },
        "B",
        "root-B",
      ),
    })
    const firstOutgoing = tryAdd({
      fromId: converterId,
      toId: "root-A",
      points: [
        { x: 50, y: 50 },
        { x: 60, y: 60 },
      ],
      incomingStub: makeStub(
        "incoming-4",
        { x: 60, y: 60 },
        { x: 70, y: 60 },
        "1",
        converterId,
      ),
    })
    const secondOutgoing = tryAdd({
      fromId: converterId,
      toId: "root-C",
      points: [
        { x: 70, y: 70 },
        { x: 80, y: 80 },
      ],
      incomingStub: makeStub(
        "incoming-5",
        { x: 80, y: 80 },
        { x: 90, y: 80 },
        "1",
        converterId,
      ),
    })

    expect(firstIncoming).toBe(true)
    expect(secondIncoming).toBe(false)
    expect(firstOutgoing).toBe(true)
    expect(secondOutgoing).toBe(false)
    expect(model.getConnections(specId)).toHaveLength(2)
  })
})

describe("converter flows", () => {
  it("converts letters to numbers for outgoing connections", () => {
    const node = buildNode()
    const converter = createConverter(40, "1/a", "converter-0")
    converter.position.set(200, 200)
    node.addChild(converter)
    node.boxLabels.set("converter-0", "1/a")

    const connections = [
      {
        fromId: "root-A",
        toId: "converter-0",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        incomingStub: makeStub(
          "incoming-6",
          { x: 10, y: 0 },
          { x: 15, y: 0 },
          "A",
          "root-A",
        ),
      },
      {
        fromId: "converter-0",
        toId: "root-A",
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 10 },
        ],
        incomingStub: makeStub(
          "incoming-7",
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          "1",
          "converter-0",
        ),
      },
    ]

    renderConnections(node, connections, [], [], undefined, undefined, undefined)

    const glyphs = node.flowLayer.children as Array<{ text: string }>
    expect(glyphs[0].text).toBe("a")
    expect(glyphs[1].text).toBe("1")
  })

  it("skips flow when the converter has no input", () => {
    const node = buildNode()
    const converter = createConverter(40, "1/a", "converter-0")
    converter.position.set(200, 200)
    node.addChild(converter)
    node.boxLabels.set("converter-0", "1/a")

    const connections = [
      {
        fromId: "converter-0",
        toId: "root-A",
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 10 },
        ],
        incomingStub: makeStub(
          "incoming-8",
          { x: 10, y: 10 },
          { x: 15, y: 10 },
          "1",
          "converter-0",
        ),
      },
    ]

    renderConnections(node, connections, [], [], undefined, undefined, undefined)

    expect(node.flowLayer.children).toHaveLength(0)
  })
})

describe("incoming stub interactions", () => {
  it("extends an incoming stub into a converter connection", () => {
    const node = buildNode()
    const converter = createConverter(40, "1/a", "converter-0")
    converter.position.set(200, 200)
    node.addChild(converter)
    node.boxLabels.set("converter-0", "1/a")

    const model = createGameModel()
    const nodeManager = { current: node } as NodeManager
    const stage = new Container()

    const drag = createDragInteractions({
      nodeManager,
      model,
      cameraController: { isTweening: false },
      resolveSpecForBox: () => null,
      onDoubleClick: vi.fn(),
    })
    drag.attachStageHandlers(stage)

    const stub = makeStub(
      "incoming-8",
      { x: 30, y: 20 },
      { x: 60, y: 20 },
      "A",
      "root-A",
    )
    model.addIncomingStub(node.specId, stub)

    renderConnections(
      node,
      [],
      [stub],
      [],
      undefined,
      drag.handleIncomingStubPointerDown,
      undefined,
    )

    const line = node.incomingLayer.children[0] as {
      _listeners?: Record<string, (event: any) => void>
    }
    line._listeners?.pointerdown?.({
      button: 0,
      global: { x: stub.end.x, y: stub.end.y },
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    })
    ;(stage as unknown as { _listeners: Record<string, any> })._listeners
      .pointermove({ global: { x: 220, y: 220 } })
    ;(stage as unknown as { _listeners: Record<string, any> })._listeners
      .pointerup({ global: { x: 220, y: 220 } })

    const connections = model.getConnections(node.specId)
    expect(connections).toHaveLength(1)
    expect(connections[0].fromId).toBe(stub.id)
    expect(connections[0].toId).toBe("converter-0")
    expect(node.boxLabels.get(stub.id)).toBe("A")
  })
})

describe("edge export interactions", () => {
  it("increments outbound capacity when dragging a matching label to the edge", () => {
    const spec: NodeSpec = {
      id: "root-C",
      label: "C",
      children: [{ id: "root-C-C", label: "C" }],
    }
    const width = 400
    const height = 300
    const layout = computeLayout(spec, width, height)
    const node = createNode(spec, width, height, layout)
    const model = createGameModel()
    const nodeManager = { current: node } as NodeManager
    const stage = new Container()

    const drag = createDragInteractions({
      nodeManager,
      model,
      cameraController: { isTweening: false },
      resolveSpecForBox: () => null,
      getCurrentSpec: () => spec,
      onDoubleClick: vi.fn(),
    })

    drag.bindBoxHandlers(node)
    drag.attachStageHandlers(stage)

    const box = node.children.find((child: any) => "boxSize" in child) as
      | { position: { x: number; y: number }; boxSize: number; _listeners?: Record<string, any> }
      | undefined
    const center = {
      x: (box?.position.x ?? 0) + (box?.boxSize ?? 0) / 2,
      y: (box?.position.y ?? 0) + (box?.boxSize ?? 0) / 2,
    }

    box?._listeners?.pointerdown?.({
      button: 0,
      global: center,
    })
    ;(stage as unknown as { _listeners: Record<string, any> })._listeners
      .pointermove({ global: { x: 2, y: height / 2 } })
    ;(stage as unknown as { _listeners: Record<string, any> })._listeners
      .pointerup({ global: { x: 2, y: height / 2 } })

    expect(model.getOutboundCapacityBoost(spec.id)).toBe(1)
  })

  it("increments outbound capacity on pointerupoutside", () => {
    const spec: NodeSpec = {
      id: "root-B",
      label: "B",
      children: [{ id: "root-B-B", label: "B" }],
    }
    const width = 400
    const height = 300
    const layout = computeLayout(spec, width, height)
    const node = createNode(spec, width, height, layout)
    const model = createGameModel()
    const nodeManager = { current: node } as NodeManager
    const stage = new Container()

    const drag = createDragInteractions({
      nodeManager,
      model,
      cameraController: { isTweening: false },
      resolveSpecForBox: () => null,
      getCurrentSpec: () => spec,
      onDoubleClick: vi.fn(),
    })

    drag.bindBoxHandlers(node)
    drag.attachStageHandlers(stage)

    const box = node.children.find((child: any) => "boxSize" in child) as
      | {
          position: { x: number; y: number }
          boxSize: number
          _listeners?: Record<string, any>
        }
      | undefined
    const center = {
      x: (box?.position.x ?? 0) + (box?.boxSize ?? 0) / 2,
      y: (box?.position.y ?? 0) + (box?.boxSize ?? 0) / 2,
    }

    box?._listeners?.pointerdown?.({
      button: 0,
      global: center,
    })
    ;(stage as unknown as { _listeners: Record<string, any> })._listeners
      .pointermove({ global: { x: 2, y: height / 2 } })
    ;(stage as unknown as { _listeners: Record<string, any> })._listeners
      .pointerupoutside({ type: "pointerupoutside" })

    expect(model.getOutboundCapacityBoost(spec.id)).toBe(1)
  })
})
