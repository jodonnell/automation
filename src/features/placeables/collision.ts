import type { IncomingStub, PointData, ConnectionPath } from "../../core/types"
import type { BoxContainer, NodeContainer } from "../../renderer/types"

const distanceToSegment = (point: PointData, a: PointData, b: PointData) => {
  const abX = b.x - a.x
  const abY = b.y - a.y
  const apX = point.x - a.x
  const apY = point.y - a.y
  const abLenSq = abX * abX + abY * abY
  if (abLenSq <= 1e-6) {
    return Math.hypot(apX, apY)
  }
  const t = Math.max(0, Math.min(1, (apX * abX + apY * abY) / abLenSq))
  const closestX = a.x + abX * t
  const closestY = a.y + abY * t
  return Math.hypot(point.x - closestX, point.y - closestY)
}

const circleIntersectsBox = (
  center: PointData,
  radius: number,
  box: BoxContainer,
) => {
  const minX = box.position.x
  const minY = box.position.y
  const maxX = box.position.x + box.boxSize
  const maxY = box.position.y + box.boxSize
  const closestX = Math.max(minX, Math.min(center.x, maxX))
  const closestY = Math.max(minY, Math.min(center.y, maxY))
  return Math.hypot(center.x - closestX, center.y - closestY) <= radius
}

const circleIntersectsPath = (
  center: PointData,
  radius: number,
  path: PointData[],
) => {
  for (let i = 1; i < path.length; i += 1) {
    const distance = distanceToSegment(center, path[i - 1], path[i])
    if (distance <= radius) return true
  }
  return false
}

export const hasPlacementCollision = (params: {
  node: NodeContainer
  center: PointData
  radius: number
  clearance: number
  strokeWidth: number
  connections: ConnectionPath[]
  incoming: IncomingStub[]
}) => {
  const { node, center, radius, clearance, strokeWidth, connections, incoming } =
    params
  const inflatedRadius = radius + clearance

  const boxes = node.children.filter(
    (child) => (child as BoxContainer).boxSize !== undefined,
  ) as BoxContainer[]

  if (boxes.some((box) => circleIntersectsBox(center, inflatedRadius, box))) {
    return true
  }

  const pathRadius = radius + strokeWidth / 2 + clearance
  if (
    connections.some((connection) =>
      circleIntersectsPath(center, pathRadius, connection.points),
    )
  ) {
    return true
  }

  if (
    incoming.some((stub) =>
      circleIntersectsPath(center, pathRadius, [stub.start, stub.end]),
    )
  ) {
    return true
  }

  return false
}
