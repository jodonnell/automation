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

const collectLabels = (spec: NodeSpec): string[] => {
  const labels = [spec.label]
  for (const child of spec.children ?? []) {
    labels.push(...collectLabels(child))
  }
  return labels
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

  it("adds multiple A nodes under the T subtree across deeper levels", () => {
    const tNode = findSpecById(NODE_TREE, "root-T")
    expect(tNode).toBeTruthy()
    const labels = collectLabels(tNode as NodeSpec)
    const aCount = labels.filter((label) => label === "A").length
    expect(aCount).toBe(17)
    expect(findSpecById(NODE_TREE, "T-D-A")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-D-B")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-D-G")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-C-A")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-C-B")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-C-F")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-H-E")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-H-F")).toBeTruthy()
    expect(findSpecById(NODE_TREE, "T-H-G")).toBeTruthy()
  })
})
