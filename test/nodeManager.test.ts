import { describe, expect, it, vi } from "vitest"
import { createPixiMock } from "./helpers/pixiMock"

vi.mock("pixi.js", () => createPixiMock())

import { Container } from "pixi.js"
import { createGameModel } from "../src/core/model"
import { createNodeManager } from "../src/nodeManager"
import type { NodeSpec } from "../src/core/types"

describe("nodeManager refresh", () => {
  it("updates resource node counts after adding outgoing stubs", () => {
    const spec: NodeSpec = {
      id: "root",
      label: "",
      children: [{ id: "root-B", label: "B" }],
    }
    const model = createGameModel()
    const camera = new Container()
    const nodeManager = createNodeManager(
      camera,
      () => ({ width: 800, height: 600 }),
      () => ({ width: 800, height: 600 }),
      spec,
      model,
    )

    model.addOutgoingStub("root-B", {
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

    nodeManager.refreshCurrent()

    const box = nodeManager.current.children.find(
      (child: any) => child.name === "root-B",
    ) as { countText?: { text?: string } } | undefined

    expect(box?.countText?.text).toBe("1")
  })
})
