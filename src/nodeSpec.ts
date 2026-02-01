import type { NodeSpec } from "./core/types"

export const NODE_TREE: NodeSpec = {
  id: "root",
  label: "",
  children: [
    {
      id: "root-C",
      label: "C",
      children: [
        {
          id: "C-B",
          label: "B",
          children: [
            { id: "C-B-A1", label: "A" },
            { id: "C-B-A2", label: "A" },
            { id: "C-B-A3", label: "A" },
          ],
        },
      ],
    },
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
