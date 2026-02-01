import { describe, expect, it } from "vitest"
import { NODE_TREE } from "../src/nodeSpec"
import type { NodeSpec } from "../src/core/types"

const findSpecById = (spec: NodeSpec, id: string): NodeSpec | null => {
  if (spec.id === id) return spec
  for (const child of spec.children ?? []) {
    const match = findSpecById(child, id)
    if (match) return match
  }
  return null
}

describe("NODE_TREE", () => {
  it("adds three A children under the C -> B node", () => {
    const bNode = findSpecById(NODE_TREE, "C-B")
    expect(bNode).toBeTruthy()
    expect(bNode?.children?.map((child) => child.label)).toEqual([
      "A",
      "A",
      "A",
    ])
  })
})
