import { Graphics } from "pixi.js"
import { DOUBLE_CLICK_MS, ZOOM_IN_DURATION, ZOOM_OUT_DURATION } from "./constants"
import { createNode } from "./node"
import { computeOuterAlpha } from "./sceneMath"
import type { NodeManager } from "./nodeManager"
import type { Bounds, BoxContainer, NodeContainer } from "./types"

type CameraController = {
  readonly isTweening: boolean
  startTween: (
    to: { x: number; y: number; scale: number },
    duration: number,
    onComplete?: () => void,
    onUpdate?: (eased: number) => void,
  ) => void
  reset: () => void
}

type InteractionDeps = {
  camera: { addChild: (child: unknown) => void; removeChild: (child: unknown) => void; removeChildren: () => void }
  stage: { eventMode?: string; hitArea?: unknown; on: (event: string, handler: (event: unknown) => void) => void }
  screen: unknown
  nodeManager: NodeManager
  cameraController: CameraController
  getNodeSize: () => number
  getCenteredTransform: (bounds: Bounds, scale: number) => { x: number; y: number; scale: number }
  getFocusedTransform: (bounds: Bounds) => { x: number; y: number; scale: number }
  worldBoundsToCameraLocal: (bounds: Bounds) => Bounds
}

export const setupInteractions = ({
  camera,
  stage,
  screen,
  nodeManager,
  cameraController,
  getNodeSize,
  getCenteredTransform,
  getFocusedTransform,
  worldBoundsToCameraLocal,
}: InteractionDeps) => {
  const bindBoxHandlers = (node: NodeContainer) => {
    node.children.forEach((child) => {
      const box = child as BoxContainer
      box.removeAllListeners("pointerdown")
      box.on("pointerdown", (event) => {
        const button = (event as { button?: number }).button
        if (button !== 0 || cameraController.isTweening) return
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
    mask.rect(localBounds.x, localBounds.y, localBounds.width, localBounds.height)
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

  stage.eventMode = "static"
  stage.hitArea = screen
  stage.on("pointerdown", (event) => {
    const button = (event as { button?: number }).button
    if (button !== 2 || cameraController.isTweening) return
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
}
