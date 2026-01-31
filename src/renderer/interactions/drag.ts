import { Graphics, Point } from "pixi.js"
import { CONNECTION_STYLE, DOUBLE_CLICK_MS } from "../../constants"
import { createDragStateMachine } from "../../core/interactionState"
import type { BoxInfo, DragAction } from "../../core/interactionState"
import type { GameModel } from "../../core/model"
import type { NodeSpec, PointData } from "../../core/types"
import { drawSmoothPath } from "../path"
import type { NodeManager } from "../../nodeManager"
import type { BoxContainer, NodeContainer } from "../types"

type CameraController = {
  readonly isTweening: boolean
}

type DragDeps = {
  nodeManager: NodeManager
  model: GameModel
  cameraController: CameraController
  resolveSpecForBox: (box: BoxContainer) => NodeSpec | null
  onDoubleClick: (box: BoxContainer) => void
}

type DragLineState = {
  line: Graphics | null
}

export const createDragInteractions = ({
  nodeManager,
  model,
  cameraController,
  resolveSpecForBox,
  onDoubleClick,
}: DragDeps) => {
  const state = createDragStateMachine({ doubleClickMs: DOUBLE_CLICK_MS })
  const lineState: DragLineState = { line: null }

  const ensureLine = () => {
    if (lineState.line) return lineState.line
    const line = new Graphics()
    lineState.line = line
    nodeManager.current.connectionLayer.addChild(line)
    return line
  }

  const clearLine = () => {
    if (!lineState.line) return
    lineState.line.parent?.removeChild(lineState.line)
    lineState.line.destroy()
    lineState.line = null
  }

  const drawConnection = (line: Graphics, points: PointData[]) => {
    drawSmoothPath(line, points, CONNECTION_STYLE)
  }

  const getLocalPointFromEvent = (event: unknown) => {
    const global = (event as { global?: { x: number; y: number } }).global
    if (!global) return { x: 0, y: 0 }
    const local = nodeManager.current.toLocal(new Point(global.x, global.y))
    return { x: local.x, y: local.y }
  }

  const getBoxInfo = (box: BoxContainer): BoxInfo => {
    const spec = resolveSpecForBox(box)
    return {
      id: box.name ?? "",
      x: box.position.x,
      y: box.position.y,
      size: box.boxSize,
      hasChildren: Boolean(spec?.children && spec.children.length > 0),
    }
  }

  const getBoxList = (node: NodeContainer) =>
    node.children
      .filter((child) => "boxSize" in (child as { boxSize?: number }))
      .map((child) => getBoxInfo(child as BoxContainer))

  const applyActions = (actions: DragAction[]) => {
    actions.forEach((action) => {
      switch (action.type) {
        case "drag-draw": {
          const line = ensureLine()
          drawConnection(line, action.points)
          break
        }
        case "drag-clear": {
          clearLine()
          break
        }
        case "connection-added": {
          const line = ensureLine()
          drawConnection(line, action.points)
          model.addConnection(nodeManager.current.specId, {
            fromId: action.fromId,
            toId: action.toId,
            points: action.points,
          })
          const targetBox = nodeManager.current.children.find((child) => {
            const candidate = child as BoxContainer
            return candidate.name === action.toId
          }) as BoxContainer | undefined
          const targetSpec = targetBox ? resolveSpecForBox(targetBox) : null
          if (targetSpec) {
            model.addIncomingStub(targetSpec.id, action.incomingStub)
          }
          lineState.line = null
          break
        }
        case "double-click": {
          const box = nodeManager.current.children.find((child) => {
            const candidate = child as BoxContainer
            return candidate.name === action.boxId
          }) as BoxContainer | undefined
          if (box) onDoubleClick(box)
          break
        }
      }
    })
  }

  const clearDrag = () => {
    applyActions(state.clear())
  }

  const bindBoxHandlers = (node: NodeContainer) => {
    node.children.forEach((child) => {
      const box = child as BoxContainer
      if (typeof box.boxSize !== "number") return
      box.removeAllListeners("pointerdown")
      box.cursor = "pointer"
      box.on("pointerdown", (event) => {
        const button = (event as { button?: number }).button
        if (button !== 0 || cameraController.isTweening) return
        clearDrag()
        const localPoint = getLocalPointFromEvent(event)
        applyActions(state.startDrag(getBoxInfo(box), localPoint))
      })
    })
  }

  const handlePointerMove = (event: unknown) => {
    if (cameraController.isTweening) return
    const localPoint = getLocalPointFromEvent(event)
    const actions = state.moveDrag(localPoint, getBoxList(nodeManager.current))
    applyActions(actions)
  }

  const handlePointerUp = (event: unknown) => {
    const localPoint = getLocalPointFromEvent(event)
    const now = performance.now()
    const actions = state.endDrag(
      localPoint,
      getBoxList(nodeManager.current),
      now,
      { width: nodeManager.current.nodeWidth, height: nodeManager.current.nodeHeight },
    )
    applyActions(actions)
  }

  const attachStageHandlers = (stage: {
    on: (event: string, handler: (event: unknown) => void) => void
  }) => {
    stage.on("pointermove", handlePointerMove)
    stage.on("pointerup", handlePointerUp)
    stage.on("pointerupoutside", handlePointerUp)
  }

  return { bindBoxHandlers, attachStageHandlers, clearDrag }
}
