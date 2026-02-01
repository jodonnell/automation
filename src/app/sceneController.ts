import { Container, Point } from "pixi.js"
import { createCameraController } from "../renderer/cameraController"
import { setupInteractions } from "../renderer/interactions"
import { createNodeManager } from "../nodeManager"
import { centerBoundsAtScale, worldBoundsToLocal } from "../core/sceneMath"
import { createGameModel } from "../core/model"
import { createOutboundCapacityResolver } from "../core/flowLabel"
import { setupDebug } from "../debug"
import { renderConnections } from "../renderer/connectionRenderer"
import { createPlaceableManager } from "../features/placeables/manager"
import { syncIncomingStubLabels } from "../core/incomingStubLabels"
import type { Bounds, IncomingStub, NodeSpec } from "../core/types"
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
  const incomingStubHandlerRef: {
    current?: (stub: IncomingStub, event: unknown) => void
  } = {}
  const nodeManager = createNodeManager(
    camera,
    getNodeSize,
    getViewSize,
    rootSpec,
    model,
    incomingStubHandlerRef,
  )
  const outboundCapacityResolver = createOutboundCapacityResolver(
    model.getOutboundCapacityBoost,
  )
  const nodeSpecIndex = new Map<string, NodeSpec>()
  const parentSpecIndex = new Map<string, string>()
  const indexSpecs = (spec: NodeSpec) => {
    nodeSpecIndex.set(spec.id, spec)
    spec.children?.forEach((child) => {
      parentSpecIndex.set(child.id, spec.id)
      indexSpecs(child)
    })
  }
  indexSpecs(rootSpec)

  const connectionCounts = new Map<string, number>()

  model.onGraphChanged((specId) => {
    const currentCount = model.getConnections(specId).length
    const previousCount = connectionCounts.get(specId) ?? 0
    const delta = currentCount - previousCount
    connectionCounts.set(specId, currentCount)
    if (delta < 0) {
      model.removeOutgoingStubs(specId, Math.abs(delta))
      const parentId = parentSpecIndex.get(specId)
      if (parentId) {
        const childSpec = nodeSpecIndex.get(specId)
        const capacity = outboundCapacityResolver(
          specId,
          childSpec?.label ?? "",
        )
        const parentConnections = model.getConnections(parentId)
        const fromChild = parentConnections.filter(
          (connection) => connection.fromId === specId,
        )
        const excess = fromChild.length - capacity
        if (excess > 0) {
          fromChild.slice(0, excess).forEach((connection) => {
            model.removeConnection(parentId, connection)
          })
        }
      }
    }
    const current = nodeManager.current
    if (current.specId !== specId) return
    syncIncomingStubLabels(current.boxLabels, model.getIncomingStubs(specId))
    renderConnections(
      current,
      model.getConnections(specId),
      model.getIncomingStubs(specId),
      model.getOutgoingStubs(specId),
      (connection) => model.removeConnectionWithStub(specId, connection),
      incomingStubHandlerRef.current,
      (stub) => model.removeOutgoingStub(specId, stub),
      outboundCapacityResolver,
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
    getCurrentSpec: () => nodeSpecIndex.get(nodeManager.current.specId) ?? null,
    isDeleteableBox: placeableManager.isDeleteableBox,
    onDeleteBox: placeableManager.deleteBox,
  })
  rebindBoxes = interactions.rebindBoxes
  incomingStubHandlerRef.current = interactions.incomingStubPointerDown
  syncIncomingStubLabels(
    nodeManager.current.boxLabels,
    model.getIncomingStubs(nodeManager.current.specId),
  )
  renderConnections(
    nodeManager.current,
    model.getConnections(nodeManager.current.specId),
    model.getIncomingStubs(nodeManager.current.specId),
    model.getOutgoingStubs(nodeManager.current.specId),
    (connection) =>
      model.removeConnectionWithStub(nodeManager.current.specId, connection),
    incomingStubHandlerRef.current,
    (stub) => model.removeOutgoingStub(nodeManager.current.specId, stub),
    outboundCapacityResolver,
  )

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
