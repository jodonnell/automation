import { expect, type Page } from "@playwright/test"

type BoxInfo = {
  id: string
  x: number
  y: number
  size: number
}

type GameWindow = typeof window & {
  game?: {
    nodeManager?: {
      current?: {
        specId?: string
        children?: Array<{
          boxSize?: number
          name?: string
          position?: { x: number; y: number }
          connectionLayer?: { children?: unknown[] }
          flowLayer?: { children?: unknown[] }
        }>
      }
    }
    model?: { getConnections?: (specId: string) => unknown[] }
  }
}

export const waitForGameReady = async (page: Page) => {
  await page.waitForFunction(() => {
    const game = (window as GameWindow).game
    return Boolean(game?.nodeManager?.current && game?.model)
  })
}

export const getBoxes = async (page: Page): Promise<BoxInfo[]> =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const node = game?.nodeManager?.current
    if (!node?.children) return []
    return node.children
      .filter((child) => typeof child.boxSize === "number")
      .map((child) => ({
        id: child.name ?? "",
        x: child.position?.x ?? 0,
        y: child.position?.y ?? 0,
        size: child.boxSize ?? 0,
      }))
  })

export const getBoxCenters = async (
  page: Page,
  ids: string[],
): Promise<Record<string, { x: number; y: number }>> => {
  const boxes = await getBoxes(page)
  const canvas = page.locator("canvas")
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).toBeTruthy()
  const originX = canvasBox?.x ?? 0
  const originY = canvasBox?.y ?? 0
  return ids.reduce<Record<string, { x: number; y: number }>>((acc, id) => {
    const box = boxes.find((item) => item.id === id)
    expect(box).toBeTruthy()
    const size = box?.size ?? 0
    const x = originX + (box?.x ?? 0) + size / 2
    const y = originY + (box?.y ?? 0) + size / 2
    acc[id] = { x, y }
    return acc
  }, {})
}

export const dragBetween = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

export const waitForConnection = async (page: Page) => {
  await page.waitForFunction(() => {
    const game = (window as GameWindow).game
    const specId = game?.nodeManager?.current?.specId ?? ""
    const connections = game?.model?.getConnections?.(specId) ?? []
    return connections.length > 0
  })
}

export const getRenderCounts = async (page: Page) =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const current = game?.nodeManager?.current
    return {
      connections: current?.connectionLayer?.children?.length ?? 0,
      flows: current?.flowLayer?.children?.length ?? 0,
    }
  })
