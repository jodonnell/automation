import type { Container } from "pixi.js"
import type { Tween } from "./types"
import { easeInOutCubic } from "./easing"
import { lerpCameraTransform } from "./sceneMath"

export const createCameraController = (
  camera: Container,
  onUpdate?: (eased: number) => void,
) => {
  let activeTween: Tween | null = null

  const setCameraTransform = (x: number, y: number, scale: number) => {
    camera.position.set(x, y)
    camera.scale.set(scale)
  }

  const startTween = (
    to: { x: number; y: number; scale: number },
    duration: number,
    onComplete?: () => void,
    onTweenUpdate?: (eased: number) => void,
  ) => {
    activeTween = {
      start: performance.now(),
      duration,
      from: {
        x: camera.position.x,
        y: camera.position.y,
        scale: camera.scale.x,
      },
      to,
      onComplete,
      onUpdate: onTweenUpdate,
    }
  }

  const reset = () => {
    setCameraTransform(0, 0, 1)
  }

  const tick = () => {
    if (!activeTween) return
    const now = performance.now()
    const t = Math.min(1, (now - activeTween.start) / activeTween.duration)
    const eased = easeInOutCubic(t)
    const { x, y, scale } = lerpCameraTransform(
      activeTween.from,
      activeTween.to,
      eased,
    )
    setCameraTransform(x, y, scale)
    onUpdate?.(eased)
    activeTween.onUpdate?.(eased)
    if (t >= 1) {
      const done = activeTween.onComplete
      activeTween = null
      done?.()
    }
  }

  return {
    get isTweening() {
      return Boolean(activeTween)
    },
    startTween,
    reset,
    tick,
    setTransform: setCameraTransform,
  }
}
