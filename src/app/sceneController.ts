import { Container, Point } from "pixi.js"
import { createCameraController } from "../renderer/cameraController"
import { setupInteractions } from "../renderer/interactions"
import { createNodeManager } from "../nodeManager"
import { centerBoundsAtScale, worldBoundsToLocal } from "../core/sceneMath"
import { createGameModel } from "../core/model"
import { setupDebug } from "../debug"
import { renderConnections } from "../renderer/connectionRenderer"
import { createPlaceableManager } from "../features/placeables/manager"
import type { Bounds, NodeSpec } from "../core/types"
import type { Application } from "pixi.js"

type SceneControllerDeps = {
  app: Application
  rootSpec: NodeSpec
  isDev: boolean
  window: Window
}

export const createSceneController = ({
  app,
  rootSpec,
  isDev,
  window,
}: SceneControllerDeps) => {
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
    rootSpec,
    model,
  )
  model.onGraphChanged((specId) => {
    const current = nodeManager.current
    if (current.specId !== specId) return
    renderConnections(
      current,
      model.getConnections(specId),
      model.getIncomingStubs(specId),
      (connection) => model.removeConnectionWithStub(specId, connection),
    )
  })
  const cameraController = createCameraController(camera)

  if (isDev) {
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
  indexSpecs(rootSpec)

  const getCenteredTransform = (bounds: Bounds, scale: number) =>
    centerBoundsAtScale(bounds, app.renderer.width, app.renderer.height, scale)

  const worldBoundsToCameraLocal = (bounds: Bounds) =>
    worldBoundsToLocal(bounds, (x, y) =>
      camera.worldTransform.applyInverse(new Point(x, y)),
    )

  let rebindBoxes: () => void = () => {}
  const placeableManager = createPlaceableManager({
    stage: app.stage,
    window,
    nodeManager,
    model,
    onRebindBoxes: () => rebindBoxes(),
  })

  const interactions = setupInteractions({
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
    isDeleteableBox: placeableManager.isDeleteableBox,
    onDeleteBox: placeableManager.deleteBox,
  })
  rebindBoxes = interactions.rebindBoxes

  app.ticker.add((ticker) => {
    cameraController.tick()
    nodeManager.current.updateFlows?.(ticker.deltaMS)
  })

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

  const start = () => {
    app.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault()
    })

    placeableManager.attach()
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

  return { start, refreshLayout }
}
