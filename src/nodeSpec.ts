import type { NodeSpec } from "./types"

export const NODE_TREE: NodeSpec = {
  id: "root",
  label: "",
  children: [
    { id: "root-C", label: "C", children: [{ id: "C-B", label: "B" }] },
    { id: "root-A", label: "A" },
    {
      id: "root-T",
      label: "T",
      children: [
        { id: "T-D", label: "D" },
        { id: "T-C", label: "C" },
        { id: "T-H", label: "H" },
      ],
    },
  ],
}
