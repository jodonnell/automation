import { Application, Container, Point } from "pixi.js"
import { createCameraController } from "./cameraController"
import { setupInteractions } from "./interactions"
import { createNodeManager } from "./nodeManager"
import { NODE_TREE } from "./nodeSpec"
import { centerBoundsAtScale, worldBoundsToLocal } from "./sceneMath"
import type { Bounds, NodeSpec } from "./types"
import { createGameModel } from "./model"
import { setupDebug } from "./debug"

export const init = async (): Promise<void> => {
  const app = new Application()
  await app.init({ background: "#ffffff", resizeTo: window, antialias: true })
  document.body.appendChild(app.canvas)

  app.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault()
  })

  const camera = new Container()
  app.stage.addChild(camera)

  const getNodeSize = () => ({
    width: app.renderer.width,
    height: app.renderer.height,
  })
  const getViewSize = () => ({
    width: app.renderer.width,
    height: app.renderer.height,
  })

  const model = createGameModel()
  const nodeManager = createNodeManager(
    camera,
    getNodeSize,
    getViewSize,
    NODE_TREE,
    model,
  )
  const cameraController = createCameraController(camera)

  if (import.meta.env.DEV) {
    setupDebug({
      app,
      camera,
      model,
      nodeManager,
      cameraController,
    })
  }

  const nodeSpecIndex = new Map<string, NodeSpec>()
  const indexSpecs = (spec: NodeSpec) => {
    nodeSpecIndex.set(spec.id, spec)
    spec.children?.forEach(indexSpecs)
  }
  indexSpecs(NODE_TREE)

  const getCenteredTransform = (bounds: Bounds, scale: number) =>
    centerBoundsAtScale(bounds, app.renderer.width, app.renderer.height, scale)

  const worldBoundsToCameraLocal = (bounds: Bounds) =>
    worldBoundsToLocal(bounds, (x, y) =>
      camera.worldTransform.applyInverse(new Point(x, y)),
    )

  const { rebindBoxes } = setupInteractions({
    camera,
    stage: app.stage,
    screen: app.screen,
    nodeManager,
    model,
    cameraController,
    getNodeSize,
    getCenteredTransform,
    worldBoundsToCameraLocal,
    resolveSpecForBox: (box) => nodeSpecIndex.get(box.name ?? "") ?? null,
  })

  app.ticker.add(cameraController.tick)

  const refreshLayout = () => {
    const { width, height } = getNodeSize()
    const currentSpec = nodeSpecIndex.get(nodeManager.current.specId)
    if (currentSpec) {
      const nextNode = nodeManager.getOrCreateNode(currentSpec, width, height)
      if (nextNode !== nodeManager.current) {
        camera.removeChild(nodeManager.current)
        nodeManager.current = nextNode
        camera.addChild(nextNode)
        rebindBoxes()
      }
    }
    nodeManager.positionCurrent()
  }

  window.addEventListener("resize", refreshLayout)
  const raf =
    typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame
      : (callback: FrameRequestCallback) => {
          if (typeof globalThis.setTimeout === "function") {
            return globalThis.setTimeout(() => callback(0), 0)
          }
          callback(0)
          return 0
        }
  raf(refreshLayout)
}

export const test = init
