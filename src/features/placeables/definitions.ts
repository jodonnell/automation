import { createConverter } from "../../renderer/converterRenderer"
import type { PlaceableDefinition } from "./types"

export const PLACEABLE_DEFINITIONS: PlaceableDefinition[] = [
  {
    key: "1",
    idPrefix: "converter-",
    label: "1/a",
    scale: 0.5,
    minSize: 24,
    clearance: 6,
    deletable: true,
    render: createConverter,
  },
]

export const getDefinitionForKey = (key: string) =>
  PLACEABLE_DEFINITIONS.find((definition) => definition.key === key) ?? null

export const getDefinitionForId = (id: string) =>
  PLACEABLE_DEFINITIONS.find((definition) =>
    id.startsWith(definition.idPrefix),
  ) ?? null
