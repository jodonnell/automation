import type { Container } from "pixi.js"

export type BoxContainer = Container & { boxSize: number }
export type NodeContainer = Container & { nodeSize: number }

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export type Tween = {
  start: number
  duration: number
  from: { x: number; y: number; scale: number }
  to: { x: number; y: number; scale: number }
  onUpdate?: (eased: number) => void
  onComplete?: () => void
}
