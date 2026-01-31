import type { Bounds } from "./core/types"

export const centerBoundsAtScale = (
  bounds: Bounds,
  viewWidth: number,
  viewHeight: number,
  scale: number,
) => {
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  return {
    x: viewWidth / 2 - centerX * scale,
    y: viewHeight / 2 - centerY * scale,
    scale,
  }
}

export const worldBoundsToLocal = (
  bounds: Bounds,
  applyInverse: (x: number, y: number) => { x: number; y: number },
) => {
  const topLeft = applyInverse(bounds.x, bounds.y)
  const bottomRight = applyInverse(
    bounds.x + bounds.width,
    bounds.y + bounds.height,
  )
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  }
}

export const computeOuterAlpha = (
  eased: number,
  minAlpha = 0,
  fadeCutoff = 0.5,
) => {
  const fade = Math.min(1, eased / fadeCutoff)
  return 1 - (1 - minAlpha) * fade
}

export const lerpCameraTransform = (
  from: { x: number; y: number; scale: number },
  to: { x: number; y: number; scale: number },
  eased: number,
) => {
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    scale: from.scale + (to.scale - from.scale) * eased,
  }
}
