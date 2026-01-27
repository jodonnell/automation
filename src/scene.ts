import { Application, Container, Point } from "pixi.js"
import { createCameraController } from "./cameraController"
import { setupInteractions } from "./interactions"
import { createNodeManager } from "./nodeManager"
import {
  centerBoundsAtScale,
  focusBounds,
  worldBoundsToLocal,
} from "./sceneMath"
import type { Bounds } from "./types"

export const init = async (): Promise<void> => {
  const app = new Application()
  await app.init({ background: "#ffffff", resizeTo: window, antialias: true })
  document.body.appendChild(app.canvas)

  app.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault()
  })

  const camera = new Container()
  app.stage.addChild(camera)

  const getNodeSize = () => Math.min(app.renderer.width, app.renderer.height)
  const getViewSize = () => ({
    width: app.renderer.width,
    height: app.renderer.height,
  })

  const nodeManager = createNodeManager(camera, getNodeSize, getViewSize)
  const cameraController = createCameraController(camera)

  const getCenteredTransform = (bounds: Bounds, scale: number) =>
    centerBoundsAtScale(bounds, app.renderer.width, app.renderer.height, scale)

  const getFocusedTransform = (bounds: Bounds) =>
    focusBounds(bounds, app.renderer.width, app.renderer.height)

  const worldBoundsToCameraLocal = (bounds: Bounds) =>
    worldBoundsToLocal(bounds, (x, y) =>
      camera.worldTransform.applyInverse(new Point(x, y)),
    )

  setupInteractions({
    camera,
    stage: app.stage,
    screen: app.screen,
    nodeManager,
    cameraController,
    getNodeSize,
    getCenteredTransform,
    getFocusedTransform,
    worldBoundsToCameraLocal,
  })

  app.ticker.add(cameraController.tick)

  window.addEventListener("resize", () => {
    nodeManager.positionCurrent()
  })
}

export const test = init
