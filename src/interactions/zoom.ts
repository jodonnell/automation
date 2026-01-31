import { Graphics } from "pixi.js"
import {
  DOUBLE_CLICK_MS,
  ZOOM_IN_DURATION,
  ZOOM_OUT_DURATION,
} from "../constants"
import { computeOuterAlpha } from "../core/sceneMath"
import type { NodeManager } from "../nodeManager"
import type { Bounds, NodeSpec } from "../core/types"
import type { BoxContainer } from "../renderer/types"

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

type ZoomDeps = {
  camera: {
    addChild: (child: unknown) => void
    removeChild: (child: unknown) => void
    removeChildren: () => void
    position: { x: number; y: number }
    scale: { x: number; y: number }
  }
  nodeManager: NodeManager
  cameraController: CameraController
  getNodeSize: () => { width: number; height: number }
  getCenteredTransform: (
    bounds: Bounds,
    scale: number,
  ) => { x: number; y: number; scale: number }
  worldBoundsToCameraLocal: (bounds: Bounds) => Bounds
  resolveSpecForBox: (box: BoxContainer) => NodeSpec | null
  onRebindBoxes: () => void
  onClearDrag: () => void
}

export const createZoomInteractions = ({
  camera,
  nodeManager,
  cameraController,
  getNodeSize,
  getCenteredTransform,
  worldBoundsToCameraLocal,
  resolveSpecForBox,
  onRebindBoxes,
  onClearDrag,
}: ZoomDeps) => {
  const handleDoubleClickBox = (box: BoxContainer) => {
    onClearDrag()
    const spec = resolveSpecForBox(box)
    if (!spec || !spec.children || spec.children.length === 0) return
    const nextSize = getNodeSize()
    const nextNode = nodeManager.getOrCreateNode(
      spec,
      nextSize.width,
      nextSize.height,
    )
    nextNode.alpha = 1

    const bounds = box.getBounds()
    const localBounds = worldBoundsToCameraLocal(bounds)

    const startScale = Math.min(
      localBounds.width / nextNode.nodeWidth,
      localBounds.height / nextNode.nodeHeight,
    )
    const target = {
      x: -localBounds.x * (1 / startScale),
      y: -localBounds.y * (1 / startScale),
      scale: 1 / startScale,
    }
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

        const bakedX = camera.position.x + nextNode.position.x * camera.scale.x
        const bakedY = camera.position.y + nextNode.position.y * camera.scale.y
        const bakedScale = nextNode.scale.x * camera.scale.x
        nextNode.position.set(bakedX, bakedY)
        nextNode.scale.set(bakedScale)

        camera.removeChild(previous)
        camera.removeChild(mask)
        nextNode.mask = null
        nodeManager.current = nextNode
        nodeManager.current.alpha = 1

        cameraController.reset()
        onRebindBoxes()
      },
      fadeOuterLayer,
    )
  }

  let lastRightClickTime = 0

  const attachStageHandlers = (stage: {
    on: (event: string, handler: (event: unknown) => void) => void
  }) => {
    stage.on("pointerdown", (event) => {
      const button = (event as { button?: number }).button
      if (button !== 2 || cameraController.isTweening) return
      const now = performance.now()
      if (now - lastRightClickTime < DOUBLE_CLICK_MS) {
        lastRightClickTime = 0
        onClearDrag()
        const previous = nodeManager.pop()
        if (!previous) return

        const bounds = nodeManager.current.getBounds()
        const target = getCenteredTransform(bounds, 0.6)

        cameraController.startTween(target, ZOOM_OUT_DURATION, () => {
          camera.removeChildren()
          nodeManager.current = previous
          camera.addChild(nodeManager.current)
          nodeManager.positionCurrent()
          nodeManager.current.alpha = 1
          cameraController.reset()
          onRebindBoxes()
        })
        return
      }
      lastRightClickTime = now
    })
  }

  return { handleDoubleClickBox, attachStageHandlers }
}
