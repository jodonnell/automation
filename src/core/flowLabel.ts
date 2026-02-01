import { convertLabel, isConverterId } from "./converter"
import { isCombinerId } from "./combiner"
import type { ConnectionPath } from "./types"

export type LabelType = "number" | "text" | null

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

export const resolveFlowLabel = (
  boxId: string,
  boxLabels: Map<string, string>,
  connections: ConnectionPath[],
  visited = new Set<string>(),
): string | undefined => {
  const directLabel = boxLabels.get(boxId)
  const isConverter = isConverterId(boxId)
  const isCombiner = isCombinerId(boxId)
  if (!isConverter && !isCombiner) return directLabel
  if (visited.has(boxId)) return directLabel
  visited.add(boxId)

  if (isConverter) {
    const incoming = connections.find((connection) => connection.toId === boxId)
    if (!incoming) return directLabel
    const upstream = resolveFlowLabel(
      incoming.fromId,
      boxLabels,
      connections,
      visited,
    )
    if (!upstream) return directLabel
    return convertLabel(upstream)
  }

  const incoming = connections.filter((connection) => connection.toId === boxId)
  if (incoming.length === 0) return directLabel
  const labels = incoming
    .map((connection) =>
      resolveFlowLabel(
        connection.fromId,
        boxLabels,
        connections,
        new Set(visited),
      ),
    )
    .filter((label): label is string => Boolean(label))
  const combined = combineLabels(labels)
  return combined ?? directLabel
}

export const canAcceptCombinerIncoming = (params: {
  combinerId: string
  fromId: string
  connections: ConnectionPath[]
  boxLabels: Map<string, string>
}) => {
  const incoming = params.connections.filter(
    (connection) => connection.toId === params.combinerId,
  )
  if (incoming.length >= 2) return false
  if (incoming.length === 0) return true
  const existingLabel = resolveFlowLabel(
    incoming[0].fromId,
    params.boxLabels,
    params.connections,
  )
  const newLabel = resolveFlowLabel(
    params.fromId,
    params.boxLabels,
    params.connections,
  )
  const existingType = getLabelType(existingLabel)
  const newType = getLabelType(newLabel)
  if (!existingType || !newType) return false
  return existingType === newType
}
