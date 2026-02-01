import { describe, expect, it, vi } from "vitest"
import { createPixiMock } from "./helpers/pixiMock"

vi.mock("pixi.js", () => createPixiMock())

import { Container } from "pixi.js"
import { computeLayout } from "../src/core/layout"
import { createGameModel } from "../src/core/model"
import { createNode } from "../src/renderer/nodeRenderer"
import { createConverter } from "../src/renderer/converterRenderer"
import { createPlaceableManager } from "../src/features/placeables/manager"
import { createDragInteractions } from "../src/renderer/interactions/drag"
import { renderConnections } from "../src/renderer/connectionRenderer"
import type { NodeManager } from "../src/nodeManager"
import type { NodeSpec } from "../src/core/types"

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
      incomingStub: { start: connectionPoints[1], end: { x: 330, y: 100 } },
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
      incomingStub: { start: { x: 200, y: 200 }, end: { x: 230, y: 200 } },
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

    const firstIncoming = model.addConnection(specId, {
      fromId: "root-A",
      toId: converterId,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      incomingStub: { start: { x: 20, y: 20 }, end: { x: 30, y: 20 } },
    })
    const secondIncoming = model.addConnection(specId, {
      fromId: "root-B",
      toId: converterId,
      points: [
        { x: 30, y: 30 },
        { x: 40, y: 40 },
      ],
      incomingStub: { start: { x: 40, y: 40 }, end: { x: 50, y: 40 } },
    })
    const firstOutgoing = model.addConnection(specId, {
      fromId: converterId,
      toId: "root-A",
      points: [
        { x: 50, y: 50 },
        { x: 60, y: 60 },
      ],
      incomingStub: { start: { x: 60, y: 60 }, end: { x: 70, y: 60 } },
    })
    const secondOutgoing = model.addConnection(specId, {
      fromId: converterId,
      toId: "root-C",
      points: [
        { x: 70, y: 70 },
        { x: 80, y: 80 },
      ],
      incomingStub: { start: { x: 80, y: 80 }, end: { x: 90, y: 80 } },
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
        incomingStub: { start: { x: 10, y: 0 }, end: { x: 15, y: 0 } },
      },
      {
        fromId: "converter-0",
        toId: "root-A",
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 10 },
        ],
        incomingStub: { start: { x: 10, y: 10 }, end: { x: 15, y: 10 } },
      },
    ]

    renderConnections(node, connections, [])

    const glyphs = node.flowLayer.children as Array<{ text: string }>
    expect(glyphs[0].text).toBe("a")
    expect(glyphs[1].text).toBe("1")
  })
})
