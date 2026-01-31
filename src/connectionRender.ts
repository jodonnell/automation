import { Graphics } from "pixi.js"
import { CONNECTION_STYLE } from "./constants"
import { drawSmoothPath } from "./path"
import type { ConnectionPath, IncomingStub, NodeContainer } from "./types"

export const renderConnections = (
  node: NodeContainer,
  connections: ConnectionPath[],
  incoming: IncomingStub[],
) => {
  node.connectionLayer.removeChildren()
  node.incomingLayer.removeChildren()
  connections.forEach((connection) => {
    if (connection.points.length < 2) return
    const line = new Graphics()
    drawSmoothPath(line, connection.points, CONNECTION_STYLE)
    node.connectionLayer.addChild(line)
  })
  incoming.forEach((stub) => {
    const line = new Graphics()
    drawSmoothPath(line, [stub.start, stub.end], CONNECTION_STYLE)
    node.incomingLayer.addChild(line)
  })
}
