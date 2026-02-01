import { COMBINER_ID_PREFIX } from "./combiner"
import { convertLabel, CONVERTER_ID_PREFIX } from "./converter"
import type { ConnectionPath } from "./types"

export type LabelType = "number" | "text" | null

export type ResolveFlowLabel = (
  boxId: string,
  boxLabels: Map<string, string>,
  connections: ConnectionPath[],
  visited?: Set<string>,
) => string | undefined

export type ResolveLabelArgs = {
  boxId: string
  boxLabels: Map<string, string>
  connections: ConnectionPath[]
  resolveLabel: ResolveFlowLabel
  visited: Set<string>
}

export type CanAcceptIncomingArgs = {
  toId: string
  fromId: string
  boxLabels: Map<string, string>
  connections: ConnectionPath[]
}

export type PlaceableBehavior = {
  idPrefix: string
  maxIncoming?: number
  maxOutgoing?: number
  resolveLabel?: (args: ResolveLabelArgs) => string | undefined
  canAcceptIncoming?: (args: CanAcceptIncomingArgs) => boolean
}

export const getLabelType = (label?: string): LabelType => {
  const trimmed = label?.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return "number"
  return "text"
}

export const combineLabels = (labels: string[]): string | null => {
  const cleaned = labels.map((label) => label.trim()).filter(Boolean)
  if (cleaned.length === 0) return null
  if (cleaned.length === 1) return cleaned[0]
  const [first, second] = cleaned
  const firstType = getLabelType(first)
  const secondType = getLabelType(second)
  if (!firstType || firstType !== secondType) return null
  if (firstType === "number") {
    return String(Number(first) + Number(second))
  }
  return `${first}${second}`
}

export const PLACEABLE_BEHAVIORS: PlaceableBehavior[] = [
  {
    idPrefix: CONVERTER_ID_PREFIX,
    maxIncoming: 1,
    maxOutgoing: 1,
    resolveLabel: ({
      boxId,
      boxLabels,
      connections,
      resolveLabel,
      visited,
    }) => {
      const incoming = connections.find(
        (connection) => connection.toId === boxId,
      )
      if (!incoming) return boxLabels.get(boxId)
      const upstream = resolveLabel(
        incoming.fromId,
        boxLabels,
        connections,
        visited,
      )
      if (!upstream) return boxLabels.get(boxId)
      return convertLabel(upstream)
    },
  },
  {
    idPrefix: COMBINER_ID_PREFIX,
    maxIncoming: 2,
    maxOutgoing: 1,
    resolveLabel: ({
      boxId,
      boxLabels,
      connections,
      resolveLabel,
      visited,
    }) => {
      const incoming = connections.filter(
        (connection) => connection.toId === boxId,
      )
      if (incoming.length === 0) return boxLabels.get(boxId)
      const labels = incoming
        .map((connection) =>
          resolveLabel(
            connection.fromId,
            boxLabels,
            connections,
            new Set(visited),
          ),
        )
        .filter((label): label is string => Boolean(label))
      const combined = combineLabels(labels)
      return combined ?? boxLabels.get(boxId)
    },
    canAcceptIncoming: ({ toId, fromId, boxLabels, connections }) => {
      const incoming = connections.filter(
        (connection) => connection.toId === toId,
      )
      if (incoming.length === 0) return true
      if (incoming.length >= 2) return false
      const existingLabel = resolveFlowLabel(
        incoming[0].fromId,
        boxLabels,
        connections,
      )
      const newLabel = resolveFlowLabel(fromId, boxLabels, connections)
      const existingType = getLabelType(existingLabel)
      const newType = getLabelType(newLabel)
      if (!existingType || !newType) return false
      return existingType === newType
    },
  },
]

export const getBehaviorForId = (id: string) =>
  PLACEABLE_BEHAVIORS.find((behavior) => id.startsWith(behavior.idPrefix)) ??
  null

export const resolveFlowLabel: ResolveFlowLabel = (
  boxId,
  boxLabels,
  connections,
  visited = new Set<string>(),
) => {
  const directLabel = boxLabels.get(boxId)
  const behavior = getBehaviorForId(boxId)
  if (!behavior?.resolveLabel) return directLabel
  if (visited.has(boxId)) return directLabel
  visited.add(boxId)
  return (
    behavior.resolveLabel({
      boxId,
      boxLabels,
      connections,
      resolveLabel: resolveFlowLabel,
      visited,
    }) ?? directLabel
  )
}

export const canAddConnection = (params: {
  connection: ConnectionPath
  connections: ConnectionPath[]
  boxLabels: Map<string, string>
}) => {
  const { connection, connections, boxLabels } = params
  const fromBehavior = getBehaviorForId(connection.fromId)
  const toBehavior = getBehaviorForId(connection.toId)
  if (fromBehavior?.maxOutgoing !== undefined) {
    const count = connections.filter(
      (item) => item.fromId === connection.fromId,
    ).length
    if (count >= fromBehavior.maxOutgoing) return false
  }
  if (toBehavior?.maxIncoming !== undefined) {
    const count = connections.filter(
      (item) => item.toId === connection.toId,
    ).length
    if (count >= toBehavior.maxIncoming) return false
  }
  if (toBehavior?.canAcceptIncoming) {
    return toBehavior.canAcceptIncoming({
      toId: connection.toId,
      fromId: connection.fromId,
      boxLabels,
      connections,
    })
  }
  return true
}
