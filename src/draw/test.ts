import { Application, Container, Graphics, Point, Rectangle, Text } from "pixi.js"

type BoxContainer = Container & { boxSize: number }
type NodeContainer = Container & { nodeSize: number }

type Tween = {
  start: number
  duration: number
  from: { x: number; y: number; scale: number }
  to: { x: number; y: number; scale: number }
  onUpdate?: (eased: number) => void
  onComplete?: () => void
}

const LETTERS = ["C", "A", "A"]
const DOUBLE_CLICK_MS = 350
const ZOOM_IN_DURATION = 480
const ZOOM_OUT_DURATION = 360

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const createBox = (size: number, label: string): BoxContainer => {
  const box = new Container() as BoxContainer
  box.boxSize = size

  const shape = new Graphics()
  shape.rect(0, 0, size, size)
  shape.stroke({ width: 3, color: 0x111111 })
  box.addChild(shape)

  const text = new Text({
    text: label,
    style: {
      fontFamily: "Georgia, serif",
      fontSize: Math.max(28, Math.floor(size * 0.4)),
      fill: 0x111111,
    },
  })
  text.anchor.set(0.5)
  text.position.set(size / 2, size / 2)
  box.addChild(text)

  box.eventMode = "static"
  box.cursor = "pointer"
  box.hitArea = new Rectangle(0, 0, size, size)

  return box
}

const createNode = (size: number): NodeContainer => {
  const node = new Container() as NodeContainer
  node.nodeSize = size

  const gap = size * 0.08
  const boxSize = (size - gap * 4) / 3
  const padding = gap
  const min = padding
  const max = size - padding - boxSize

  const placed: { x: number; y: number }[] = []
  const overlaps = (x: number, y: number) =>
    placed.some((p) => {
      return (
        x < p.x + boxSize &&
        x + boxSize > p.x &&
        y < p.y + boxSize &&
        y + boxSize > p.y
      )
    })

  const pickSpot = () => {
    const maxAttempts = 200
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const x = min + Math.random() * (max - min)
      const y = min + Math.random() * (max - min)
      if (!overlaps(x, y)) return { x, y }
    }
    return null
  }

  LETTERS.forEach((label, index) => {
    const box = createBox(boxSize, label)
    const spot = pickSpot()
    if (spot) {
      placed.push(spot)
      box.position.set(spot.x, spot.y)
    } else {
      const fallbackX = gap + index * (boxSize + gap)
      const fallbackY = (size - boxSize) / 2
      placed.push({ x: fallbackX, y: fallbackY })
      box.position.set(fallbackX, fallbackY)
    }
    node.addChild(box)
  })

  return node
}

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

  const centerBoundsAtScale = (bounds: {
    x: number
    y: number
    width: number
    height: number
  }, scale: number) => {
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

  const focusBounds = (bounds: {
    x: number
    y: number
    width: number
    height: number
  }) => {
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

  const worldBoundsToCameraLocal = (bounds: {
    x: number
    y: number
    width: number
    height: number
  }) => {
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
