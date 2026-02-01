import { createDragInteractions } from "./drag"
import { createZoomInteractions } from "./zoom"
import type { GameModel } from "../../core/model"
import type { NodeManager } from "../../nodeManager"
import type { Bounds, NodeSpec } from "../../core/types"
import type { BoxContainer } from "../types"

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
  worldBoundsToCameraLocal: (bounds: Bounds) => Bounds
  resolveSpecForBox: (box: BoxContainer) => NodeSpec | null
  isDeleteableBox?: (box: BoxContainer) => boolean
  onDeleteBox?: (box: BoxContainer) => void
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
  worldBoundsToCameraLocal,
  resolveSpecForBox,
  isDeleteableBox,
  onDeleteBox,
}: InteractionDeps) => {
  let handleDoubleClickBox: (box: BoxContainer) => void = () => {}
  const drag = createDragInteractions({
    nodeManager,
    model,
    cameraController,
    resolveSpecForBox,
    onDoubleClick: (box) => handleDoubleClickBox(box),
    isDeleteableBox,
    onDeleteBox,
  })

  const zoom = createZoomInteractions({
    camera,
    nodeManager,
    cameraController,
    getNodeSize,
    getCenteredTransform,
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

  return {
    rebindBoxes: () => drag.bindBoxHandlers(nodeManager.current),
    incomingStubPointerDown: drag.handleIncomingStubPointerDown,
  }
}
