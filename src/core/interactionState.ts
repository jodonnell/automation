import type { IncomingStub, PointData } from "./types"

export type BoxInfo = {
  id: string
  x: number
  y: number
  size: number
  hasChildren: boolean
}

export type DragAction =
  | { type: "drag-draw"; points: PointData[] }
  | { type: "drag-clear" }
  | {
      type: "connection-added"
      fromId: string
      toId: string
      points: PointData[]
      incomingStub: IncomingStub
    }
  | { type: "double-click"; boxId: string }

export type DragStateMachine = {
  startDrag: (box: BoxInfo, point: PointData) => DragAction[]
  moveDrag: (point: PointData, boxes: BoxInfo[]) => DragAction[]
  endDrag: (
    point: PointData,
    boxes: BoxInfo[],
    now: number,
    viewSize: { width: number; height: number },
  ) => DragAction[]
  clear: () => DragAction[]
}

type DragState = {
  startBox: BoxInfo
  moved: boolean
  startLocal: PointData
  points: PointData[]
  lastOutsidePoint: PointData | null
  startAnchor: PointData | null
  lineActive: boolean
}

const getBoxAtPoint = (point: PointData, boxes: BoxInfo[]) => {
  for (const box of boxes) {
    const minX = box.x
    const minY = box.y
    const maxX = minX + box.size
    const maxY = minY + box.size
    if (
      point.x >= minX &&
      point.x <= maxX &&
      point.y >= minY &&
      point.y <= maxY
    ) {
      return box
    }
  }
  return null
}

const isPointInBox = (point: PointData, box: BoxInfo) =>
  point.x >= box.x &&
  point.x <= box.x + box.size &&
  point.y >= box.y &&
  point.y <= box.y + box.size

const getBoxCenter = (box: BoxInfo) => ({
  x: box.x + box.size / 2,
  y: box.y + box.size / 2,
})

const getBoxEdgePoint = (box: BoxInfo, toward: PointData) => {
  const center = getBoxCenter(box)
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  const half = box.size / 2
  if (dx === 0 && dy === 0) {
    return { x: center.x + half, y: center.y }
  }
  const scale = half / Math.max(Math.abs(dx), Math.abs(dy))
  return { x: center.x + dx * scale, y: center.y + dy * scale }
}

const updatePathPoints = (
  points: PointData[],
  point: PointData,
  minDistance: number,
) => {
  const lastPoint = points[points.length - 1]
  const distance = lastPoint
    ? Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y)
    : Infinity
  if (distance > minDistance) {
    points.push({ x: point.x, y: point.y })
  } else if (points.length > 0) {
    points[points.length - 1] = { x: point.x, y: point.y }
  } else {
    points.push({ x: point.x, y: point.y })
  }
}

const buildIncomingStub = (
  box: BoxInfo,
  edgePoint: PointData,
  viewSize: { width: number; height: number },
): IncomingStub => {
  const localX = edgePoint.x - box.x
  const localY = edgePoint.y - box.y
  const half = box.size / 2
  const dx = half - localX
  const dy = half - localY
  const length = Math.hypot(dx, dy) || 1
  const dirX = dx / length
  const dirY = dy / length
  const { width: viewWidth, height: viewHeight } = viewSize
  const start = {
    x: (localX / box.size) * viewWidth,
    y: (localY / box.size) * viewHeight,
  }
  const stubLength = Math.min(viewWidth, viewHeight) * 0.12
  return {
    start,
    end: {
      x: start.x + dirX * stubLength,
      y: start.y + dirY * stubLength,
    },
  }
}

export const createDragStateMachine = (params?: {
  doubleClickMs?: number
  dragThreshold?: number
  pointSpacing?: number
}): DragStateMachine => {
  const doubleClickMs = params?.doubleClickMs ?? 350
  const dragThreshold = params?.dragThreshold ?? 6
  const pointSpacing = params?.pointSpacing ?? 6

  let dragState: DragState | null = null
  let lastClickTime = 0
  let lastClickTarget: string | null = null

  const startDrag = (box: BoxInfo, point: PointData): DragAction[] => {
    dragState = {
      startBox: box,
      moved: false,
      startLocal: point,
      points: [],
      lastOutsidePoint: null,
      startAnchor: null,
      lineActive: false,
    }
    return []
  }

  const moveDrag = (point: PointData, boxes: BoxInfo[]): DragAction[] => {
    if (!dragState) return []
    const actions: DragAction[] = []
    const dx = point.x - dragState.startLocal.x
    const dy = point.y - dragState.startLocal.y
    if (!dragState.moved && Math.hypot(dx, dy) > dragThreshold) {
      dragState.moved = true
    }

    if (isPointInBox(point, dragState.startBox)) {
      dragState.points = []
      dragState.lastOutsidePoint = null
      dragState.startAnchor = null
      if (dragState.lineActive) {
        actions.push({ type: "drag-clear" })
        dragState.lineActive = false
      }
      return actions
    }

    if (!dragState.startAnchor) {
      dragState.startAnchor = getBoxEdgePoint(dragState.startBox, point)
    }
    const startAnchor = dragState.startAnchor
    const targetBox = getBoxAtPoint(point, boxes)
    const isInsideTarget =
      targetBox !== null && targetBox.id !== dragState.startBox.id

    if (!isInsideTarget) {
      updatePathPoints(dragState.points, point, pointSpacing)
      dragState.lastOutsidePoint = { x: point.x, y: point.y }
    }

    const endAnchor = isInsideTarget
      ? getBoxEdgePoint(targetBox, dragState.lastOutsidePoint ?? startAnchor)
      : null
    const drawPoints = endAnchor
      ? dragState.points.map((item, index, array) =>
          index === array.length - 1 ? endAnchor : item,
        )
      : dragState.points
    const pointsToDraw = [startAnchor, ...drawPoints]
    dragState.lineActive = true
    actions.push({ type: "drag-draw", points: pointsToDraw })
    return actions
  }

  const endDrag = (
    point: PointData,
    boxes: BoxInfo[],
    now: number,
    viewSize: { width: number; height: number },
  ): DragAction[] => {
    if (!dragState) return []
    const actions: DragAction[] = []
    const state = dragState
    const targetBox = getBoxAtPoint(point, boxes)
    const droppedOnOther = targetBox && targetBox.id !== state.startBox.id
    const moved = (state.moved && state.lineActive) || Boolean(droppedOnOther)
    const startAnchor =
      state.startAnchor ?? getBoxEdgePoint(state.startBox, point)

    if (droppedOnOther && targetBox) {
      const endAnchor = getBoxEdgePoint(
        targetBox,
        state.lastOutsidePoint ?? point,
      )
      const points =
        state.points.length > 0
          ? state.points.map((item, index, array) =>
              index === array.length - 1 ? endAnchor : item,
            )
          : [endAnchor]
      const connectionPoints = [startAnchor, ...points]
      actions.push({
        type: "connection-added",
        fromId: state.startBox.id,
        toId: targetBox.id,
        points: connectionPoints,
        incomingStub: buildIncomingStub(targetBox, endAnchor, viewSize),
      })
      dragState = null
      return actions
    }

    if (state.lineActive) {
      actions.push({ type: "drag-clear" })
    }

    if (!moved && state.startBox.hasChildren) {
      if (
        lastClickTarget === state.startBox.id &&
        now - lastClickTime < doubleClickMs
      ) {
        lastClickTime = 0
        lastClickTarget = null
        actions.push({ type: "double-click", boxId: state.startBox.id })
        dragState = null
        return actions
      }
      lastClickTime = now
      lastClickTarget = state.startBox.id
    }

    dragState = null
    return actions
  }

  const clear = (): DragAction[] => {
    if (!dragState) return []
    dragState = null
    return [{ type: "drag-clear" }]
  }

  return {
    startDrag,
    moveDrag,
    endDrag,
    clear,
  }
}
