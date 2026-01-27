import { Application, Container, Graphics, Point } from "pixi.js"
import {
  DOUBLE_CLICK_MS,
  ZOOM_IN_DURATION,
  ZOOM_OUT_DURATION,
} from "./constants"
import { createCameraController } from "./cameraController"
import { createNode } from "./node"
import { createNodeManager } from "./nodeManager"
import {
  centerBoundsAtScale,
  computeOuterAlpha,
  focusBounds,
  worldBoundsToLocal,
} from "./sceneMath"
import type { Bounds, BoxContainer, NodeContainer } from "./types"

export const test = async (): Promise<void> => {
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

  const bindBoxHandlers = (node: NodeContainer) => {
    node.children.forEach((child) => {
      const box = child as BoxContainer
      box.removeAllListeners("pointerdown")
      box.on("pointerdown", (event) => {
        if (event.button !== 0 || cameraController.isTweening) return
        const now = performance.now()
        if (lastClickTarget === box && now - lastClickTime < DOUBLE_CLICK_MS) {
          lastClickTime = 0
          lastClickTarget = null
          handleDoubleClickBox(box)
          return
        }
        lastClickTime = now
        lastClickTarget = box
      })
    })
  }

  const handleDoubleClickBox = (box: BoxContainer) => {
    const nextNode = createNode(getNodeSize())
    nextNode.alpha = 1

    const bounds = box.getBounds()
    const target = getFocusedTransform(bounds)
    const localBounds = worldBoundsToCameraLocal(bounds)

    const startScale = localBounds.width / nextNode.nodeSize
    nextNode.scale.set(startScale)
    nextNode.position.set(localBounds.x, localBounds.y)

    const mask = new Graphics()
    mask.rect(
      localBounds.x,
      localBounds.y,
      localBounds.width,
      localBounds.height,
    )
    mask.fill(0xffffff)
    camera.addChild(mask)
    nextNode.mask = mask
    camera.addChild(nextNode)

    const fadeOuterLayer = (eased: number) => {
      nodeManager.current.alpha = computeOuterAlpha(eased, 0, 0.5)
    }

    cameraController.startTween(
      target,
      ZOOM_IN_DURATION,
      () => {
        const previous = nodeManager.current
        nodeManager.push()

        camera.removeChild(previous)
        camera.removeChild(mask)
        nextNode.mask = null
        nodeManager.current = nextNode
        nodeManager.current.scale.set(1)
        nodeManager.positionCurrent()
        nodeManager.current.alpha = 1

        cameraController.reset()
        bindBoxHandlers(nodeManager.current)
      },
      fadeOuterLayer,
    )
  }

  let lastClickTime = 0
  let lastClickTarget: BoxContainer | null = null
  let lastRightClickTime = 0

  bindBoxHandlers(nodeManager.current)

  app.stage.eventMode = "static"
  app.stage.hitArea = app.screen
  app.stage.on("pointerdown", (event) => {
    if (event.button !== 2 || cameraController.isTweening) return
    const now = performance.now()
    if (now - lastRightClickTime < DOUBLE_CLICK_MS) {
      lastRightClickTime = 0
      const previous = nodeManager.pop()
      if (!previous) return

      const bounds = nodeManager.current.getBounds()
      const target = getCenteredTransform(bounds, 0.6)

      cameraController.startTween(target, ZOOM_OUT_DURATION, () => {
        camera.removeChildren()
        nodeManager.current = previous
        camera.addChild(nodeManager.current)
        nodeManager.positionCurrent()
        cameraController.reset()
        bindBoxHandlers(nodeManager.current)
      })
      return
    }
    lastRightClickTime = now
  })

  app.ticker.add(cameraController.tick)

  window.addEventListener("resize", () => {
    nodeManager.positionCurrent()
  })
}
