import { Graphics, Point } from "pixi.js"
import { CONNECTION_STYLE, DOUBLE_CLICK_MS } from "../constants"
import { drawSmoothPath } from "../path"
import type { GameModel } from "../model"
import type { NodeManager } from "../nodeManager"
import type { BoxContainer, NodeContainer, NodeSpec, PointData } from "../types"

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

type DragState = {
  startBox: BoxContainer
  line: Graphics | null
  moved: boolean
  startLocal: { x: number; y: number }
  points: { x: number; y: number }[]
  lastOutsidePoint: { x: number; y: number } | null
  startAnchor: { x: number; y: number } | null
}

export const createDragInteractions = ({
  nodeManager,
  model,
  cameraController,
  resolveSpecForBox,
  onDoubleClick,
}: DragDeps) => {
  const getBoxAtLocalPoint = (point: { x: number; y: number }) => {
    const children = nodeManager.current.children
    for (const child of children) {
      const boxCandidate = child as BoxContainer
      if (typeof boxCandidate.boxSize !== "number") continue
      const minX = boxCandidate.position.x
      const minY = boxCandidate.position.y
      const maxX = minX + boxCandidate.boxSize
      const maxY = minY + boxCandidate.boxSize
      if (
        point.x >= minX &&
        point.x <= maxX &&
        point.y >= minY &&
        point.y <= maxY
      ) {
        return boxCandidate
      }
    }
    return null
  }

  const getBoxCenter = (box: BoxContainer) => ({
    x: box.position.x + box.boxSize / 2,
    y: box.position.y + box.boxSize / 2,
  })

  const isPointInBox = (point: { x: number; y: number }, box: BoxContainer) =>
    point.x >= box.position.x &&
    point.x <= box.position.x + box.boxSize &&
    point.y >= box.position.y &&
    point.y <= box.position.y + box.boxSize

  const ensureDragLine = (state: DragState) => {
    if (state.line) return state.line
    const line = new Graphics()
    state.line = line
    nodeManager.current.connectionLayer.addChild(line)
    return line
  }

  const updatePathPoints = (state: DragState, point: { x: number; y: number }) => {
    const lastPoint = state.points[state.points.length - 1]
    const distance = lastPoint
      ? Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y)
      : Infinity
    if (distance > 6) {
      state.points.push({ x: point.x, y: point.y })
    } else if (state.points.length > 0) {
      state.points[state.points.length - 1] = { x: point.x, y: point.y }
    } else {
      state.points.push({ x: point.x, y: point.y })
    }
  }

  const buildDrawPoints = (
    state: DragState,
    endAnchor: { x: number; y: number } | null,
  ) => {
    if (endAnchor && state.points.length === 0) return [endAnchor]
    if (!endAnchor) return state.points
    return state.points.map((point, index, array) =>
      index === array.length - 1 ? endAnchor : point,
    )
  }

  const getBoxEdgePoint = (box: BoxContainer, toward: { x: number; y: number }) => {
    const center = getBoxCenter(box)
    const dx = toward.x - center.x
    const dy = toward.y - center.y
    const half = box.boxSize / 2
    if (dx === 0 && dy === 0) {
      return { x: center.x + half, y: center.y }
    }
    const scale = half / Math.max(Math.abs(dx), Math.abs(dy))
    return { x: center.x + dx * scale, y: center.y + dy * scale }
  }

  const getLocalPointFromEvent = (event: unknown) => {
    const global = (event as { global?: { x: number; y: number } }).global
    if (!global) return { x: 0, y: 0 }
    const local = nodeManager.current.toLocal(new Point(global.x, global.y))
    return { x: local.x, y: local.y }
  }

  let dragState: DragState | null = null
  let lastClickTime = 0
  let lastClickTarget: BoxContainer | null = null

  const drawConnection = (line: Graphics, points: PointData[]) => {
    drawSmoothPath(line, points, CONNECTION_STYLE)
  }

  const clearDrag = () => {
    if (!dragState) return
    const { line } = dragState
    if (line) {
      line.parent?.removeChild(line)
      line.destroy()
    }
    dragState = null
  }

  const handlePointerMove = (event: unknown) => {
    if (!dragState || cameraController.isTweening) return
    const localPoint = getLocalPointFromEvent(event)
    const dx = localPoint.x - dragState.startLocal.x
    const dy = localPoint.y - dragState.startLocal.y
    if (!dragState.moved && Math.hypot(dx, dy) > 6) {
      dragState.moved = true
    }
    const isInsideStart = isPointInBox(localPoint, dragState.startBox)
    if (isInsideStart) {
      if (dragState.line) {
        dragState.line.clear()
      }
      dragState.points = []
      dragState.lastOutsidePoint = null
      dragState.startAnchor = null
      return
    }
    const line = ensureDragLine(dragState)
    if (!dragState.startAnchor) {
      dragState.startAnchor = getBoxEdgePoint(dragState.startBox, localPoint)
    }
    const startAnchor = dragState.startAnchor
    const targetBox = getBoxAtLocalPoint(localPoint)
    const isInsideTarget =
      targetBox !== null && targetBox !== dragState.startBox
    if (!isInsideTarget) {
      updatePathPoints(dragState, localPoint)
      dragState.lastOutsidePoint = { x: localPoint.x, y: localPoint.y }
    }
    const endAnchor = isInsideTarget
      ? getBoxEdgePoint(targetBox, dragState.lastOutsidePoint ?? startAnchor)
      : null
    const pointsToDraw = buildDrawPoints(dragState, endAnchor)
    drawConnection(line, [startAnchor, ...pointsToDraw])
  }

  const handlePointerUp = (event: unknown) => {
    if (!dragState) return
    const state = dragState
    const localPoint = getLocalPointFromEvent(event)
    const targetBox = getBoxAtLocalPoint(localPoint)
    const startBox = state.startBox
    const droppedOnOther = targetBox && targetBox !== startBox
    const moved = (state.moved && Boolean(state.line)) || Boolean(droppedOnOther)
    const startAnchor =
      state.startAnchor ?? getBoxEdgePoint(startBox, localPoint)
    if (droppedOnOther) {
      const endAnchor = getBoxEdgePoint(
        targetBox,
        state.lastOutsidePoint ?? localPoint,
      )
      const line = ensureDragLine(state)
      const points =
        state.points.length > 0
          ? state.points.map((point, index, array) =>
              index === array.length - 1 ? endAnchor : point,
            )
          : [endAnchor]
      const connectionPoints = [startAnchor, ...points]
      drawConnection(line, connectionPoints)
      const fromId = startBox.name ?? ""
      const toId = targetBox.name ?? ""
      if (fromId && toId) {
        model.addConnection(nodeManager.current.specId, {
          fromId,
          toId,
          points: connectionPoints,
        })
      }
      dragState = null
    } else {
      clearDrag()
    }
    if (!moved) {
      const now = performance.now()
      const spec = resolveSpecForBox(startBox)
      const isZoomable = Boolean(spec?.children && spec.children.length > 0)
      if (
        isZoomable &&
        lastClickTarget === startBox &&
        now - lastClickTime < DOUBLE_CLICK_MS
      ) {
        lastClickTime = 0
        lastClickTarget = null
        onDoubleClick(startBox)
        return
      }
      if (isZoomable) {
        lastClickTime = now
        lastClickTarget = startBox
      }
    }
    dragState = null
  }

  const bindBoxHandlers = (node: NodeContainer) => {
    node.children.forEach((child) => {
      const box = child as BoxContainer
      if (typeof box.boxSize !== "number") return
      box.removeAllListeners("pointerdown")
      const spec = resolveSpecForBox(box)
      const isZoomable = Boolean(spec?.children && spec.children.length > 0)
      box.cursor = "pointer"
      box.on("pointerdown", (event) => {
        const button = (event as { button?: number }).button
        if (button !== 0 || cameraController.isTweening) return
        if (dragState) clearDrag()
        const localPoint = getLocalPointFromEvent(event)
        dragState = {
          startBox: box,
          line: null,
          moved: false,
          startLocal: localPoint,
          points: [],
          lastOutsidePoint: null,
          startAnchor: null,
        }
        if (!isZoomable) return
      })
    })
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
