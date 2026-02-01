import { describe, expect, it } from "vitest"
import { createDragStateMachine } from "../src/core/interactionState"
import type { BoxInfo } from "../src/core/interactionState"

const makeBox = (overrides: Partial<BoxInfo>): BoxInfo => ({
  id: "box",
  x: 0,
  y: 0,
  size: 20,
  hasChildren: false,
  canStartConnection: true,
  ...overrides,
})

describe("createDragStateMachine", () => {
  it("blocks connections when the start box cannot initiate them", () => {
    const state = createDragStateMachine({ dragThreshold: 0, pointSpacing: 2 })
    const startBox = makeBox({ id: "root-C", canStartConnection: false })
    const targetBox = makeBox({ id: "root-A", x: 40 })

    state.startDrag(startBox, { x: 10, y: 10 })
    state.moveDrag({ x: 45, y: 10 }, [startBox, targetBox])
    const actions = state.endDrag(
      { x: 45, y: 10 },
      [startBox, targetBox],
      0,
      { width: 200, height: 200 },
    )

    expect(actions.some((action) => action.type === "connection-added")).toBe(
      false,
    )
  })

  it("allows connections when the start box permits them", () => {
    const state = createDragStateMachine({ dragThreshold: 0, pointSpacing: 2 })
    const startBox = makeBox({ id: "root-A", canStartConnection: true })
    const targetBox = makeBox({ id: "root-C", x: 40 })

    state.startDrag(startBox, { x: 10, y: 10 })
    state.moveDrag({ x: 45, y: 10 }, [startBox, targetBox])
    const actions = state.endDrag(
      { x: 45, y: 10 },
      [startBox, targetBox],
      0,
      { width: 200, height: 200 },
    )

    expect(actions.some((action) => action.type === "connection-added")).toBe(
      true,
    )
  })
})
