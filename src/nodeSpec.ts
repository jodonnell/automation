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
        {
          id: "T-D",
          label: "D",
          children: [
            {
              id: "T-D-A",
              label: "A",
            },
            {
              id: "T-D-B",
              label: "B",
              children: [
                { id: "T-D-B-AA", label: "A" },
                { id: "T-D-B-AB", label: "A" },
              ],
            },
            {
              id: "T-D-G",
              label: "G",
              children: [
                { id: "T-D-G-AA", label: "A" },
                { id: "T-D-G-AB", label: "A" },
              ],
            },
          ],
        },
        {
          id: "T-C",
          label: "C",
          children: [
            {
              id: "T-C-F",
              label: "F",
              children: [
                {
                  id: "T-C-F-AA",
                  label: "A",
                },
                {
                  id: "T-C-F-AB",
                  label: "A",
                },
              ],
            },
            {
              id: "T-C-A",
              label: "A",
            },
            {
              id: "T-C-B",
              label: "B",
              children: [
                { id: "T-C-G-AA", label: "A" },
              ],
            },
          ],
        },
        {
            id: "T-H",
            label: "H",
            children: [
                { id: "T-H-AA", label: "A" },
                { id: "T-H-AB", label: "A" },
                {
                    id: "T-H-E",
                    label: "E",
                    children: [
                        { id: "T-H-E-AA", label: "A" },
                        { id: "T-H-E-AB", label: "A" },
                    ],
                },
                {
              id: "T-H-F",
              label: "F",
              children: [
                { id: "T-H-F-AA", label: "A" },
                { id: "T-H-F-AB", label: "A" },
              ],
            },
            {
              id: "T-H-G",
              label: "G",
              children: [
                { id: "T-H-G-AA", label: "A" },
                { id: "T-H-G-AB", label: "A" },
              ],
            },
          ],
        },
      ],
    },
  ],
}
