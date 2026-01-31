import type { Application, Container } from "pixi.js"
import type { GameModel } from "./model"
import type { NodeManager } from "./nodeManager"

type DebugDeps = {
  app: Application
  camera: Container
  model: GameModel
  nodeManager: NodeManager
  cameraController: unknown
}

const createDebugPanel = () => {
  const panel = document.createElement("div")
  panel.id = "debug-panel"
  panel.style.position = "fixed"
  panel.style.top = "12px"
  panel.style.left = "12px"
  panel.style.zIndex = "9999"
  panel.style.maxWidth = "360px"
  panel.style.maxHeight = "70vh"
  panel.style.overflow = "auto"
  panel.style.padding = "10px 12px"
  panel.style.border = "1px solid #111111"
  panel.style.background = "rgba(255, 255, 255, 0.92)"
  panel.style.fontFamily = "Menlo, Monaco, Consolas, monospace"
  panel.style.fontSize = "12px"
  panel.style.whiteSpace = "pre"
  panel.style.pointerEvents = "auto"
  panel.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)"
  document.body.appendChild(panel)
  return panel
}

export const setupDebug = ({
  app,
  camera,
  model,
  nodeManager,
  cameraController,
}: DebugDeps) => {
  if (typeof document?.createElement !== "function") return

  ;(window as typeof window & { game?: unknown }).game = {
    app,
    camera,
    model,
    nodeManager,
    cameraController,
  }

  const debugPanel = createDebugPanel()
  const params = new URLSearchParams(window.location.search)
  debugPanel.style.display = params.get("debug") === "1" ? "block" : "none"
  const formatNumber = (value: number) => Math.round(value * 100) / 100
  const updateDebugPanel = () => {
    const current = nodeManager.current
    const connections = model.getConnections(current.specId)
    const incoming = model.getIncomingStubs(current.specId)
    const boxes = current.children
      .filter((child) => "boxSize" in (child as { boxSize?: number }))
      .map((child) => {
        const box = child as {
          name?: string
          position: { x: number; y: number }
          boxSize: number
        }
        return {
          id: box.name ?? "",
          x: formatNumber(box.position.x),
          y: formatNumber(box.position.y),
          size: formatNumber(box.boxSize),
        }
      })

    const lines = [
      `node: ${current.specId}`,
      `nodeSize: ${formatNumber(current.nodeWidth)} x ${formatNumber(
        current.nodeHeight,
      )}`,
      `camera: x=${formatNumber(camera.position.x)} y=${formatNumber(
        camera.position.y,
      )} scale=${formatNumber(camera.scale.x)}`,
      `boxes: ${boxes.length}`,
      `${JSON.stringify(boxes, null, 2)}`,
      `connections: ${connections.length}`,
      `${JSON.stringify(connections, null, 2)}`,
      `incomingStubs: ${incoming.length}`,
      `${JSON.stringify(incoming, null, 2)}`,
    ]
    debugPanel.textContent = lines.join("\n")
  }
  updateDebugPanel()
  const debugInterval = window.setInterval(updateDebugPanel, 250)
  window.addEventListener("beforeunload", () => {
    window.clearInterval(debugInterval)
  })

  const toggleDebugPanel = () => {
    debugPanel.style.display =
      debugPanel.style.display === "none" ? "block" : "none"
  }
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "d") toggleDebugPanel()
  })
  ;(window as typeof window & { toggleDebugPanel?: () => void }).toggleDebugPanel =
    toggleDebugPanel
}
