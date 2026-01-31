export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export type PointData = {
  x: number
  y: number
}

export type ConnectionPath = {
  fromId: string
  toId: string
  points: PointData[]
}

export type IncomingStub = {
  start: PointData
  end: PointData
}

export type NodeLayout = {
  boxSize: number
  positions: Map<string, PointData>
}

export type NodeSpec = {
  id: string
  label: string
  children?: NodeSpec[]
}

export type Tween = {
  start: number
  duration: number
  from: { x: number; y: number; scale: number }
  to: { x: number; y: number; scale: number }
  onUpdate?: (eased: number) => void
  onComplete?: () => void
}
