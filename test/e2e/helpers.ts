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
        nodeWidth?: number
        nodeHeight?: number
        children?: Array<{
          boxSize?: number
          name?: string
          position?: { x: number; y: number }
          connectionLayer?: { children?: unknown[] }
          flowLayer?: { children?: unknown[] }
          incomingLayer?: { children?: unknown[] }
        }>
      }
    }
    model?: {
      getConnections?: (specId: string) => unknown[]
      getIncomingStubs?: (specId: string) => unknown[]
    }
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

export const getBoxScreenCenter = async (
  page: Page,
  id: string,
): Promise<{ x: number; y: number } | null> =>
  page.evaluate((boxId) => {
    const game = (window as GameWindow).game
    const node = game?.nodeManager?.current
    const child = node?.children?.find(
      (item) => (item as { name?: string })?.name === boxId,
    ) as
      | {
          getBounds?: () => {
            x?: number
            y?: number
            width?: number
            height?: number
          }
        }
      | undefined
    const bounds = child?.getBounds?.()
    if (!bounds) return null
    const x = (bounds.x ?? 0) + (bounds.width ?? 0) / 2
    const y = (bounds.y ?? 0) + (bounds.height ?? 0) / 2
    return { x, y }
  }, id)

export const getNodeSize = async (page: Page) =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const current = game?.nodeManager?.current
    return {
      width: current?.nodeWidth ?? 0,
      height: current?.nodeHeight ?? 0,
    }
  })

export const getCanvasOrigin = async (page: Page) => {
  const canvas = page.locator("canvas")
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).toBeTruthy()
  return { x: canvasBox?.x ?? 0, y: canvasBox?.y ?? 0 }
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

export const waitForBoxWithPrefix = async (page: Page, prefix: string) => {
  await page.waitForFunction((boxPrefix) => {
    const game = (window as GameWindow).game
    const node = game?.nodeManager?.current
    const boxes = node?.children ?? []
    return boxes.some(
      (child) =>
        typeof child.boxSize === "number" &&
        String(child.name ?? "").startsWith(boxPrefix),
    )
  }, prefix)
}

export const waitForCurrentSpec = async (page: Page, specId: string) => {
  await page.waitForFunction((id) => {
    const game = (window as GameWindow).game
    return game?.nodeManager?.current?.specId === id
  }, specId)
}

export const getConnectionCount = async (page: Page): Promise<number> =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const specId = game?.nodeManager?.current?.specId ?? ""
    const connections = game?.model?.getConnections?.(specId) ?? []
    return connections.length
  })

export const getIncomingStubEnds = async (
  page: Page,
): Promise<Array<{ id: string; x: number; y: number }>> =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const specId = game?.nodeManager?.current?.specId ?? ""
    const stubs = game?.model?.getIncomingStubs?.(specId) ?? []
    return stubs
      .map((stub) => {
        if (!stub || typeof stub !== "object") return null
        const candidate = stub as {
          id?: unknown
          end?: { x?: unknown; y?: unknown }
        }
        const id = typeof candidate.id === "string" ? candidate.id : ""
        const x = candidate.end?.x
        const y = candidate.end?.y
        if (typeof x !== "number" || typeof y !== "number") return null
        return { id, x, y }
      })
      .filter((item): item is { id: string; x: number; y: number } =>
        Boolean(item),
      )
  })

export const getIncomingStubScreenPoint = async (
  page: Page,
): Promise<{ x: number; y: number } | null> =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const node = game?.nodeManager?.current
    const line = node?.incomingLayer?.children?.[0] as
      | {
          getBounds?: () => {
            x?: number
            y?: number
            width?: number
            height?: number
          }
        }
      | undefined
    const bounds = line?.getBounds?.()
    if (!bounds) return null
    const x = (bounds.x ?? 0) + (bounds.width ?? 0) / 2
    const y = (bounds.y ?? 0) + (bounds.height ?? 0) / 2
    return { x, y }
  })

export const getRenderCounts = async (page: Page) =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const current = game?.nodeManager?.current
    return {
      connections: current?.connectionLayer?.children?.length ?? 0,
      flows: current?.flowLayer?.children?.length ?? 0,
    }
  })

export const tickFlows = async (page: Page, deltaMs = 16) =>
  page.evaluate((delta) => {
    const game = (window as GameWindow).game
    const current = game?.nodeManager?.current
    current?.updateFlows?.(delta)
  }, deltaMs)

export const getFlowTexts = async (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const game = (window as GameWindow).game
    const current = game?.nodeManager?.current
    const flows = current?.flowLayer?.children ?? []
    return flows.map((child) =>
      typeof child.text === "string" ? child.text : "",
    )
  })

export const getFlowTextsNearConnection = async (
  page: Page,
  fromId: string,
  toId: string,
  maxDistance = 10,
): Promise<string[]> =>
  page.evaluate(
    ({ fromId: from, toId: to, maxDistance: maxDist }) => {
      const game = (window as GameWindow).game
      const current = game?.nodeManager?.current
      const specId = current?.specId ?? ""
      type Connection = { fromId: string; toId: string; points: PointData[] }
      type PointData = { x: number; y: number }
      const connections = game?.model?.getConnections?.(specId) ?? []
      const connection = connections.find((item): item is Connection => {
        if (!item || typeof item !== "object") return false
        const candidate = item as Connection
        return (
          candidate.fromId === from &&
          candidate.toId === to &&
          Array.isArray(candidate.points)
        )
      })
      if (!connection) return []
      const points = connection.points
      if (points.length < 2) return []

      const segmentDistance = (
        point: PointData,
        a: PointData,
        b: PointData,
      ) => {
        const vx = b.x - a.x
        const vy = b.y - a.y
        const wx = point.x - a.x
        const wy = point.y - a.y
        const len2 = vx * vx + vy * vy
        const t =
          len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2))
        const proj = { x: a.x + t * vx, y: a.y + t * vy }
        return Math.hypot(point.x - proj.x, point.y - proj.y)
      }

      const distanceToPath = (point: PointData) => {
        let min = Number.POSITIVE_INFINITY
        for (let i = 1; i < points.length; i += 1) {
          const dist = segmentDistance(point, points[i - 1], points[i])
          if (dist < min) min = dist
        }
        return min
      }

      const flows = current?.flowLayer?.children ?? []
      const texts = new Set<string>()
      flows.forEach((child) => {
        if (!child || typeof child !== "object") return
        const candidate = child as {
          text?: unknown
          position?: { x?: unknown; y?: unknown }
        }
        if (typeof candidate.text !== "string") return
        const x = candidate.position?.x
        const y = candidate.position?.y
        if (typeof x !== "number" || typeof y !== "number") return
        const distance = distanceToPath({ x, y })
        if (distance <= maxDist) {
          texts.add(candidate.text)
        }
      })
      return Array.from(texts)
    },
    { fromId, toId, maxDistance },
  )
