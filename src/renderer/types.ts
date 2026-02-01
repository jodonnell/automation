import type { Container, Text } from "pixi.js"

export type BoxContainer = Container & {
  boxSize: number
  isResourceNode?: boolean
  labelText?: Text
  countText?: Text
}
export type NodeContainer = Container & {
  nodeWidth: number
  nodeHeight: number
  connectionLayer: Container
  flowLayer: Container
  incomingLayer: Container
  specId: string
  boxLabels: Map<string, string>
  resourceNodeIds: Set<string>
  updateFlows?: (deltaMs: number) => void
}
