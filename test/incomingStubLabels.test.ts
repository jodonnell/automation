import { describe, expect, it } from "vitest"
import { syncIncomingStubLabels } from "../src/core/incomingStubLabels"
import { INCOMING_STUB_PREFIX } from "../src/constants"
import type { IncomingStub } from "../src/core/types"

const makeStub = (id: string, label: string): IncomingStub => ({
  id: id.startsWith(INCOMING_STUB_PREFIX) ? id : `${INCOMING_STUB_PREFIX}${id}`,
  label,
  sourceId: "root-A",
  start: { x: 0, y: 0 },
  end: { x: 10, y: 0 },
})

describe("syncIncomingStubLabels", () => {
  it("replaces incoming stub labels while preserving normal labels", () => {
    const boxLabels = new Map<string, string>([
      ["root-A", "A"],
      [`${INCOMING_STUB_PREFIX}old`, "old"],
    ])
    const incoming = [makeStub("new", "B")]

    syncIncomingStubLabels(boxLabels, incoming)

    expect(boxLabels.get("root-A")).toBe("A")
    expect(boxLabels.get(`${INCOMING_STUB_PREFIX}old`)).toBeUndefined()
    expect(boxLabels.get(`${INCOMING_STUB_PREFIX}new`)).toBe("B")
  })
})
