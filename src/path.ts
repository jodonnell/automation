import type { Graphics } from "pixi.js"
import type { PointData } from "./core/types"

export type StrokeStyle = {
  width: number
  color: number
  alpha?: number
}

const chaikinSmooth = (input: PointData[]) => {
  const output: PointData[] = [input[0]]
  for (let i = 0; i < input.length - 1; i += 1) {
    const p0 = input[i]
    const p1 = input[i + 1]
    const q = {
      x: 0.75 * p0.x + 0.25 * p1.x,
      y: 0.75 * p0.y + 0.25 * p1.y,
    }
    const r = {
      x: 0.25 * p0.x + 0.75 * p1.x,
      y: 0.25 * p0.y + 0.75 * p1.y,
    }
    output.push(q, r)
  }
  output.push(input[input.length - 1])
  return output
}

export const smoothPath = (points: PointData[], iterations = 2) => {
  if (points.length <= 2) return points
  let smoothed = points
  for (let i = 0; i < iterations; i += 1) {
    smoothed = chaikinSmooth(smoothed)
  }
  return smoothed
}

export const drawSmoothPath = (
  line: Graphics,
  points: PointData[],
  style: StrokeStyle,
) => {
  line.clear()
  if (points.length === 0) return
  const toDraw = smoothPath(points)
  line.moveTo(toDraw[0].x, toDraw[0].y)
  for (let i = 1; i < toDraw.length; i += 1) {
    line.lineTo(toDraw[i].x, toDraw[i].y)
  }
  line.stroke(style)
}
