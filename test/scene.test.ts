import { describe, expect, it, vi } from "vitest"
import { createPixiMock } from "./helpers/pixiMock"

vi.mock("pixi.js", () => createPixiMock())

import { Application } from "pixi.js"
import { test as runScene } from "../src/scene"

describe("scene", () => {
  it("initializes the app and binds basic handlers", async () => {
    const appendChild = vi.fn()
    const addEventListener = vi.fn()

    vi.stubGlobal("document", {
      body: { appendChild },
    })
    vi.stubGlobal("window", {
      addEventListener,
    })
    vi.stubGlobal("performance", {
      now: () => 0,
    })

    await runScene()

    const instance = Application.lastInstance
    expect(instance).toBeTruthy()
    expect(appendChild).toHaveBeenCalledWith(instance?.canvas)
    expect(instance?.canvas.addEventListener).toHaveBeenCalledWith(
      "contextmenu",
      expect.any(Function),
    )
    expect(instance?.stage.hitArea).toBe(instance?.screen)
    expect(instance?.stage.children.length).toBe(1)

    vi.unstubAllGlobals()
  })
})
