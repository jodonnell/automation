import { Application, Container, Graphics, Point } from "pixi.js"
import { DOUBLE_CLICK_MS, ZOOM_IN_DURATION, ZOOM_OUT_DURATION } from "./constants"
import { easeInOutCubic } from "./easing"
import { createNode } from "./node"
import type { Bounds, BoxContainer, NodeContainer, Tween } from "./types"

export const test = async (): Promise<void> => {
  const app = new Application()
  await app.init({ background: "#ffffff", resizeTo: window, antialias: true })
  document.body.appendChild(app.canvas)

  app.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault()
  })

  const camera = new Container()
  app.stage.addChild(camera)

  const getNodeSize = () => Math.min(app.renderer.width, app.renderer.height)

  const positionNode = (node: NodeContainer) => {
    const x = (app.renderer.width - node.nodeSize) / 2
    const y = (app.renderer.height - node.nodeSize) / 2
    node.position.set(x, y)
  }

  let currentNode = createNode(getNodeSize())
  positionNode(currentNode)
  camera.addChild(currentNode)

  const nodeStack: NodeContainer[] = []
  let activeTween: Tween | null = null

  const setCameraTransform = (x: number, y: number, scale: number) => {
    camera.position.set(x, y)
    camera.scale.set(scale)
  }

  const centerBoundsAtScale = (bounds: Bounds, scale: number) => {
    const viewWidth = app.renderer.width
    const viewHeight = app.renderer.height
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    return {
      x: viewWidth / 2 - centerX * scale,
      y: viewHeight / 2 - centerY * scale,
      scale,
    }
  }

  const focusBounds = (bounds: Bounds) => {
    const viewWidth = app.renderer.width
    const viewHeight = app.renderer.height
    const scale = Math.min(viewWidth / bounds.width, viewHeight / bounds.height)
    return centerBoundsAtScale(bounds, scale)
  }

  const startTween = (
    to: { x: number; y: number; scale: number },
    duration: number,
    onComplete?: () => void,
    onUpdate?: (eased: number) => void,
  ) => {
    activeTween = {
      start: performance.now(),
      duration,
      from: { x: camera.position.x, y: camera.position.y, scale: camera.scale.x },
      to,
      onComplete,
      onUpdate,
    }
  }

  const resetCamera = () => {
    setCameraTransform(0, 0, 1)
  }

  const bindBoxHandlers = (node: NodeContainer) => {
    node.children.forEach((child) => {
      const box = child as BoxContainer
      box.removeAllListeners("pointerdown")
      box.on("pointerdown", (event) => {
        if (event.button !== 0 || activeTween) return
        const now = performance.now()
        if (lastClickTarget === box && now - lastClickTime < DOUBLE_CLICK_MS) {
          lastClickTime = 0
          lastClickTarget = null
          handleDoubleClickBox(box)
          return
        }
        lastClickTime = now
        lastClickTarget = box
      })
    })
  }

  const worldBoundsToCameraLocal = (bounds: Bounds) => {
    const topLeft = camera.worldTransform.applyInverse(new Point(bounds.x, bounds.y))
    const bottomRight = camera.worldTransform.applyInverse(
      new Point(bounds.x + bounds.width, bounds.y + bounds.height),
    )
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    }
  }

  const handleDoubleClickBox = (box: BoxContainer) => {
    const nextNode = createNode(getNodeSize())
    nextNode.alpha = 1

    const bounds = box.getBounds()
    const target = focusBounds(bounds)
    const localBounds = worldBoundsToCameraLocal(bounds)

    const startScale = localBounds.width / nextNode.nodeSize
    nextNode.scale.set(startScale)
    nextNode.position.set(localBounds.x, localBounds.y)

    const mask = new Graphics()
    mask.rect(localBounds.x, localBounds.y, localBounds.width, localBounds.height)
    mask.fill(0xffffff)
    camera.addChild(mask)
    nextNode.mask = mask
    camera.addChild(nextNode)

    const fadeOuterLayer = (eased: number) => {
      const minAlpha = 0
      const fade = Math.min(1, eased / 0.5)
      currentNode.alpha = 1 - (1 - minAlpha) * fade
    }

    startTween(
      target,
      ZOOM_IN_DURATION,
      () => {
      const previous = currentNode
      nodeStack.push(previous)

      camera.removeChild(previous)
      camera.removeChild(mask)
      nextNode.mask = null
      currentNode = nextNode
      currentNode.scale.set(1)
      positionNode(currentNode)
      currentNode.alpha = 1

      resetCamera()
      bindBoxHandlers(currentNode)
      },
      fadeOuterLayer,
    )
  }

  let lastClickTime = 0
  let lastClickTarget: BoxContainer | null = null
  let lastRightClickTime = 0

  bindBoxHandlers(currentNode)

  app.stage.eventMode = "static"
  app.stage.hitArea = app.screen
  app.stage.on("pointerdown", (event) => {
    if (event.button !== 2 || activeTween) return
    const now = performance.now()
    if (now - lastRightClickTime < DOUBLE_CLICK_MS) {
      lastRightClickTime = 0
      const previous = nodeStack.pop()
      if (!previous) return

      const bounds = currentNode.getBounds()
      const target = centerBoundsAtScale(bounds, 0.6)

      startTween(target, ZOOM_OUT_DURATION, () => {
        camera.removeChildren()
        currentNode = previous
        camera.addChild(currentNode)
        positionNode(currentNode)
        resetCamera()
        bindBoxHandlers(currentNode)
      })
      return
    }
    lastRightClickTime = now
  })

  app.ticker.add(() => {
    if (!activeTween) return
    const now = performance.now()
    const t = Math.min(1, (now - activeTween.start) / activeTween.duration)
    const eased = easeInOutCubic(t)
    const nextX = activeTween.from.x + (activeTween.to.x - activeTween.from.x) * eased
    const nextY = activeTween.from.y + (activeTween.to.y - activeTween.from.y) * eased
    const nextScale = activeTween.from.scale + (activeTween.to.scale - activeTween.from.scale) * eased
    setCameraTransform(nextX, nextY, nextScale)
    activeTween.onUpdate?.(eased)
    if (t >= 1) {
      const done = activeTween.onComplete
      activeTween = null
      done?.()
    }
  })

  window.addEventListener("resize", () => {
    positionNode(currentNode)
  })
}
