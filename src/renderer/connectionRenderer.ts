import { Graphics, Text } from "pixi.js"
import {
  CONNECTION_STYLE,
  FLOW_SPEED_PX_PER_SEC,
  FLOW_SPACING_PX,
  FLOW_TEXT_STYLE,
} from "../constants"
import { drawSmoothPath, smoothPath } from "./path"
import type { ConnectionPath, IncomingStub } from "../core/types"
import type { NodeContainer } from "./types"

type PathSample = {
  points: { x: number; y: number }[]
  distances: number[]
  length: number
}

type FlowAnimation = {
  path: PathSample
  glyphs: Text[]
  spacing: number
  speed: number
  offset: number
}

const buildPathSample = (points: { x: number; y: number }[]): PathSample => {
  const smoothed = smoothPath(points)
  const distances: number[] = [0]
  let total = 0
  for (let i = 1; i < smoothed.length; i += 1) {
    const dx = smoothed[i].x - smoothed[i - 1].x
    const dy = smoothed[i].y - smoothed[i - 1].y
    total += Math.hypot(dx, dy)
    distances.push(total)
  }
  return { points: smoothed, distances, length: total }
}

const getPointAtDistance = (path: PathSample, distance: number) => {
  if (path.length === 0) return path.points[0]
  const target = Math.max(0, Math.min(path.length, distance))
  let index = 1
  while (index < path.distances.length && path.distances[index] < target) {
    index += 1
  }
  if (index >= path.points.length) return path.points[path.points.length - 1]
  const prev = path.points[index - 1]
  const next = path.points[index]
  const segStart = path.distances[index - 1]
  const segEnd = path.distances[index]
  const segLength = Math.max(1e-3, segEnd - segStart)
  const t = (target - segStart) / segLength
  return {
    x: prev.x + (next.x - prev.x) * t,
    y: prev.y + (next.y - prev.y) * t,
  }
}

export const renderConnections = (
  node: NodeContainer,
  connections: ConnectionPath[],
  incoming: IncomingStub[],
) => {
  node.connectionLayer.removeChildren()
  node.flowLayer.removeChildren()
  node.incomingLayer.removeChildren()
  node.updateFlows = undefined

  const flows: FlowAnimation[] = []
  connections.forEach((connection) => {
    if (connection.points.length < 2) return
    const line = new Graphics()
    drawSmoothPath(line, connection.points, CONNECTION_STYLE)
    node.connectionLayer.addChild(line)

    const label = node.boxLabels.get(connection.fromId)
    if (!label) return
    const path = buildPathSample(connection.points)
    if (path.length <= 1) return
    const glyphCount = Math.max(1, Math.floor(path.length / FLOW_SPACING_PX))
    const glyphs: Text[] = []
    for (let i = 0; i < glyphCount; i += 1) {
      const glyph = new Text({
        text: label.toLowerCase(),
        style: FLOW_TEXT_STYLE,
      })
      glyph.anchor.set(0.5)
      glyph.alpha = 0.95
      node.flowLayer.addChild(glyph)
      glyphs.push(glyph)
    }
    flows.push({
      path,
      glyphs,
      spacing: FLOW_SPACING_PX,
      speed: FLOW_SPEED_PX_PER_SEC,
      offset: Math.random() * FLOW_SPACING_PX,
    })
  })

  incoming.forEach((stub) => {
    const line = new Graphics()
    drawSmoothPath(line, [stub.start, stub.end], CONNECTION_STYLE)
    node.incomingLayer.addChild(line)
  })

  if (flows.length > 0) {
    node.updateFlows = (deltaMs: number) => {
      flows.forEach((flow) => {
        if (flow.path.length <= 0) return
        const advance = (deltaMs / 1000) * flow.speed
        flow.offset = (flow.offset + advance) % flow.path.length
        flow.glyphs.forEach((glyph, index) => {
          const distance = (index * flow.spacing + flow.offset) % flow.path.length
          const point = getPointAtDistance(flow.path, distance)
          glyph.position.set(point.x, point.y)
        })
      })
    }
  }
}
