import { Graphics } from "pixi.js"
import { CONNECTION_STYLE } from "./constants"
import { drawSmoothPath } from "./path"
import type { ConnectionPath, NodeContainer } from "./types"

export const renderConnections = (
  node: NodeContainer,
  connections: ConnectionPath[],
) => {
  node.connectionLayer.removeChildren()
  connections.forEach((connection) => {
    if (connection.points.length < 2) return
    const line = new Graphics()
    drawSmoothPath(line, connection.points, CONNECTION_STYLE)
    node.connectionLayer.addChild(line)
  })
}
