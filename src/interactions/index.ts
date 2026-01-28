import { createDragInteractions } from "./drag"
import { createZoomInteractions } from "./zoom"
import type { GameModel } from "../model"
import type { NodeManager } from "../nodeManager"
import type { Bounds, BoxContainer, NodeSpec } from "../types"

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
  camera: {
    addChild: (child: unknown) => void
    removeChild: (child: unknown) => void
    removeChildren: () => void
    position: { x: number; y: number }
    scale: { x: number; y: number }
  }
  stage: {
    eventMode?: string
    hitArea?: unknown
    on: (event: string, handler: (event: unknown) => void) => void
  }
  screen: unknown
  nodeManager: NodeManager
  model: GameModel
  cameraController: CameraController
  getNodeSize: () => { width: number; height: number }
  getCenteredTransform: (
    bounds: Bounds,
    scale: number,
  ) => { x: number; y: number; scale: number }
  getFocusedTransform: (bounds: Bounds) => {
    x: number
    y: number
    scale: number
  }
  worldBoundsToCameraLocal: (bounds: Bounds) => Bounds
  resolveSpecForBox: (box: BoxContainer) => NodeSpec | null
}

export const setupInteractions = ({
  camera,
  stage,
  screen,
  nodeManager,
  model,
  cameraController,
  getNodeSize,
  getCenteredTransform,
  getFocusedTransform,
  worldBoundsToCameraLocal,
  resolveSpecForBox,
}: InteractionDeps) => {
  let handleDoubleClickBox: (box: BoxContainer) => void = () => {}
  const drag = createDragInteractions({
    nodeManager,
    model,
    cameraController,
    resolveSpecForBox,
    onDoubleClick: (box) => handleDoubleClickBox(box),
  })

  const zoom = createZoomInteractions({
    camera,
    nodeManager,
    cameraController,
    getNodeSize,
    getCenteredTransform,
    getFocusedTransform,
    worldBoundsToCameraLocal,
    resolveSpecForBox,
    onRebindBoxes: () => drag.bindBoxHandlers(nodeManager.current),
    onClearDrag: drag.clearDrag,
  })
  handleDoubleClickBox = zoom.handleDoubleClickBox

  drag.bindBoxHandlers(nodeManager.current)

  stage.eventMode = "static"
  stage.hitArea = screen
  drag.attachStageHandlers(stage)
  zoom.attachStageHandlers(stage)
}
