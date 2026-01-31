import type { BoxContainer } from "../../renderer/types"

export type PlaceableDefinition = {
  key: string
  idPrefix: string
  label: string
  scale: number
  minSize: number
  clearance: number
  deletable: boolean
  render: (size: number, label: string, id: string) => BoxContainer
}
