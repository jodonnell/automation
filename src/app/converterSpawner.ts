import { Point } from "pixi.js"
import { createConverter } from "../renderer/converterRenderer"
import {
  CONNECTION_STYLE,
  CONVERTER_CLEARANCE,
  CONVERTER_LABEL,
  CONVERTER_MIN_SIZE,
  CONVERTER_SCALE,
} from "../constants"
import type { GameModel } from "../core/model"
import type { ConnectionPath, IncomingStub, PointData } from "../core/types"
import type { NodeManager } from "../nodeManager"
import type { BoxContainer, NodeContainer } from "../renderer/types"

type ConverterSpawnerDeps = {
  stage: {
    on: (event: string, handler: (event: unknown) => void) => void
  }
  window: Window
  nodeManager: NodeManager
  model: GameModel
  onRebindBoxes: () => void
}

const getBaseBoxSize = (node: NodeContainer) => {
  const box = node.children.find(
    (child) => (child as BoxContainer).boxSize !== undefined,
  ) as BoxContainer | undefined
  return box?.boxSize ?? Math.min(node.nodeWidth, node.nodeHeight) * 0.2
}

export const createConverterSpawner = ({
  stage,
  window,
  nodeManager,
  model,
  onRebindBoxes,
}: ConverterSpawnerDeps) => {
  let lastPointer = { x: 0, y: 0 }
  let counter = 0

  const updatePointer = (event: unknown) => {
    const global = (event as { global?: { x: number; y: number } }).global
    if (!global) return
    lastPointer = { x: global.x, y: global.y }
  }

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

  const hasCollision = (
    node: NodeContainer,
    center: PointData,
    radius: number,
    connections: ConnectionPath[],
    incoming: IncomingStub[],
  ) => {
    const padding = CONVERTER_CLEARANCE
    const inflatedRadius = radius + padding

    const boxes = node.children.filter(
      (child) => (child as BoxContainer).boxSize !== undefined,
    ) as BoxContainer[]

    if (boxes.some((box) => circleIntersectsBox(center, inflatedRadius, box))) {
      return true
    }

    const strokePadding = CONNECTION_STYLE.width / 2 + padding
    const pathRadius = radius + strokePadding
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

  const spawn = () => {
    const node = nodeManager.current
    const size = Math.max(
      CONVERTER_MIN_SIZE,
      getBaseBoxSize(node) * CONVERTER_SCALE,
    )
    const local = node.toLocal(new Point(lastPointer.x, lastPointer.y))
    const center = { x: local.x, y: local.y }
    const radius = size / 2
    const connections = model.getConnections(node.specId)
    const incoming = model.getIncomingStubs(node.specId)
    if (hasCollision(node, center, radius, connections, incoming)) {
      return false
    }
    const id = `converter-${counter}`
    counter += 1
    const converter = createConverter(size, CONVERTER_LABEL, id)
    converter.position.set(local.x - size / 2, local.y - size / 2)
    node.addChild(converter)
    node.boxLabels.set(id, CONVERTER_LABEL)
    onRebindBoxes()
    return true
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "1") return
    spawn()
  }

  const attach = () => {
    stage.on("pointermove", updatePointer)
    window.addEventListener("keydown", handleKeydown)
  }

  return { attach, spawn }
}
