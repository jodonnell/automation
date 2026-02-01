import { INCOMING_STUB_PREFIX } from "../constants"
import type { IncomingStub } from "./types"

export const syncIncomingStubLabels = (
  boxLabels: Map<string, string>,
  incoming: IncomingStub[],
) => {
  Array.from(boxLabels.keys())
    .filter((key) => key.startsWith(INCOMING_STUB_PREFIX))
    .forEach((key) => boxLabels.delete(key))

  incoming.forEach((stub) => {
    boxLabels.set(stub.id, stub.label)
  })
}
