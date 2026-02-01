import { Point } from "pixi.js"
import { CONNECTION_STYLE } from "../../constants"
import { getDefinitionForId, getDefinitionForKey } from "./definitions"
import { hasPlacementCollision } from "./collision"
import type { GameModel } from "../../core/model"
import type { NodeManager } from "../../nodeManager"
import type { BoxContainer, NodeContainer } from "../../renderer/types"

type PlaceableManagerDeps = {
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

export const createPlaceableManager = ({
  stage,
  window,
  nodeManager,
  model,
  onRebindBoxes,
}: PlaceableManagerDeps) => {
  let lastPointer = { x: 0, y: 0 }
  const counters = new Map<string, number>()

  const updatePointer = (event: unknown) => {
    const global = (event as { global?: { x: number; y: number } }).global
    if (!global) return
    lastPointer = { x: global.x, y: global.y }
  }

  const spawnForKey = (key: string) => {
    const definition = getDefinitionForKey(key)
    if (!definition) return false
    const node = nodeManager.current
    const size = Math.max(
      definition.minSize,
      getBaseBoxSize(node) * definition.scale,
    )
    const local = node.toLocal(new Point(lastPointer.x, lastPointer.y))
    const center = { x: local.x, y: local.y }
    const radius = size / 2
    if (
      hasPlacementCollision({
        node,
        center,
        radius,
        clearance: definition.clearance,
        strokeWidth: CONNECTION_STYLE.width,
        connections: model.getConnections(node.specId),
        incoming: model.getIncomingStubs(node.specId),
      })
    ) {
      return false
    }

    const count = counters.get(definition.idPrefix) ?? 0
    counters.set(definition.idPrefix, count + 1)
    const id = `${definition.idPrefix}${count}`
    const placeable = definition.render(size, definition.label, id)
    placeable.position.set(local.x - size / 2, local.y - size / 2)
    node.addChild(placeable)
    node.boxLabels.set(id, definition.label)
    onRebindBoxes()
    return true
  }

  const isDeleteableBox = (box: BoxContainer) => {
    const id = typeof box.name === "string" ? box.name : ""
    const definition = getDefinitionForId(id)
    return Boolean(definition?.deletable)
  }

  const deleteBox = (box: BoxContainer) => {
    if (!isDeleteableBox(box)) return false
    const id = box.name ?? ""
    model.removeConnectionsForBox(nodeManager.current.specId, id)
    model.removeOutgoingStubsForSource(nodeManager.current.specId, id)
    nodeManager.current.boxLabels.delete(id)
    nodeManager.current.removeChild(box)
    onRebindBoxes()
    return true
  }

  const handleKeydown = (event: KeyboardEvent) => {
    spawnForKey(event.key)
  }

  const attach = () => {
    stage.on("pointermove", updatePointer)
    window.addEventListener("keydown", handleKeydown)
  }

  return { attach, spawnForKey, isDeleteableBox, deleteBox }
}
