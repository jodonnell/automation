import type { Container } from "pixi.js"

export type BoxContainer = Container & { boxSize: number }
export type NodeContainer = Container & {
  nodeWidth: number
  nodeHeight: number
  connectionLayer: Container
  flowLayer: Container
  incomingLayer: Container
  specId: string
  boxLabels: Map<string, string>
  updateFlows?: (deltaMs: number) => void
}
