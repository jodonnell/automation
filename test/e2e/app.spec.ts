import { expect, test } from "@playwright/test"
import {
  dragBetween,
  getConnectionCount,
  getBoxCenters,
  getBoxScreenCenter,
  getBoxes,
  getCanvasOrigin,
  getFlowTextsNearConnection,
  getIncomingStubEnds,
  getIncomingStubScreenPoint,
  getNodeSize,
  getRenderCounts,
  tickFlows,
  waitForCurrentSpec,
  waitForConnection,
  waitForBoxWithPrefix,
  waitForGameReady,
} from "./helpers"

test("loads the app shell", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle(/Game Name/i)
})

test("renders the Pixi canvas", async ({ page }) => {
  await page.goto("/")

  const canvas = page.locator("canvas")
  await expect(canvas).toHaveCount(1)
})

test("connects A to C and renders a connection line", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto("/?debug=1")

  const canvas = page.locator("canvas")
  await expect(canvas).toHaveCount(1)

  await waitForGameReady(page)

  const centers = await getBoxCenters(page, ["root-A", "root-C"])
  await dragBetween(page, centers["root-A"], centers["root-C"])
  await waitForConnection(page)

  const renderedCounts = await getRenderCounts(page)

  expect(renderedCounts.connections).toBeGreaterThan(0)
  expect(renderedCounts.flows).toBeGreaterThan(0)
})

test("zooming into a node clears connection rendering", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto("/?debug=1")

  const canvas = page.locator("canvas")
  await expect(canvas).toHaveCount(1)

  await waitForGameReady(page)

  const centers = await getBoxCenters(page, ["root-A", "root-C"])
  await dragBetween(page, centers["root-A"], centers["root-C"])
  await waitForConnection(page)

  await page.mouse.dblclick(centers["root-C"].x, centers["root-C"].y)
  await waitForCurrentSpec(page, "root-C")

  const connectionCount = await getConnectionCount(page)
  expect(connectionCount).toBe(0)

  const renderedCounts = await getRenderCounts(page)
  expect(renderedCounts.connections).toBe(0)
  expect(renderedCounts.flows).toBeGreaterThan(0)
})

test("incoming stubs can extend into a converter inside zoomed context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto("/?debug=1")

  const canvas = page.locator("canvas")
  await expect(canvas).toHaveCount(1)

  await waitForGameReady(page)

  const centers = await getBoxCenters(page, ["root-A", "root-C"])
  await dragBetween(page, centers["root-A"], centers["root-C"])
  await waitForConnection(page)

  await page.mouse.dblclick(centers["root-C"].x, centers["root-C"].y)
  await waitForCurrentSpec(page, "root-C")

  const incomingStubs = await getIncomingStubEnds(page)
  expect(incomingStubs.length).toBeGreaterThan(0)
  const stub = incomingStubs[0]
  const stubPoint = await getIncomingStubScreenPoint(page)
  expect(stubPoint).toBeTruthy()

  const boxes = await getBoxes(page)
  const nodeSize = await getNodeSize(page)
  const origin = await getCanvasOrigin(page)
  const maxX = Math.max(...boxes.map((box) => box.x + box.size), 0)
  const maxY = Math.max(...boxes.map((box) => box.y + box.size), 0)
  const nodePoint = {
    x: Math.min(nodeSize.width - 60, Math.max(60, maxX + 80)),
    y: Math.min(nodeSize.height - 60, Math.max(60, maxY + 80)),
  }
  const screenPoint = {
    x: origin.x + nodePoint.x,
    y: origin.y + nodePoint.y,
  }

  await page.mouse.move(screenPoint.x, screenPoint.y)
  await page.keyboard.press("1")
  await waitForBoxWithPrefix(page, "converter-")

  const updatedBoxes = await getBoxes(page)
  const converter = updatedBoxes.find((box) => box.id.startsWith("converter-"))
  expect(converter).toBeTruthy()
  const converterCenter = await getBoxScreenCenter(page, converter?.id ?? "")
  expect(converterCenter).toBeTruthy()
  const converterCenterScreen = {
    x: origin.x + (converterCenter?.x ?? screenPoint.x),
    y: origin.y + (converterCenter?.y ?? screenPoint.y),
  }
  const stubPointScreen = {
    x: origin.x + (stubPoint?.x ?? converterCenterScreen.x),
    y: origin.y + (stubPoint?.y ?? converterCenterScreen.y),
  }

  await page.mouse.move(stubPointScreen.x, stubPointScreen.y)
  await page.evaluate(
    (point) => {
      const game = (
        window as {
          game?: {
            nodeManager?: {
              current?: { incomingLayer?: { children?: unknown[] } }
            }
          }
        }
      ).game
      const line = game?.nodeManager?.current?.incomingLayer?.children?.[0] as
        | { emit?: (event: string, payload: unknown) => void }
        | undefined
      line?.emit?.("pointerdown", {
        button: 0,
        global: { x: point.x, y: point.y },
        stopPropagation() {},
        preventDefault() {},
      })
    },
    stubPoint ?? { x: 0, y: 0 },
  )
  await page.mouse.move(converterCenterScreen.x, converterCenterScreen.y, {
    steps: 12,
  })
  await page.mouse.up()
  await page.waitForFunction(() => {
    const game = (
      window as {
        game?: {
          nodeManager?: { current?: { specId?: string } }
          model?: { getConnections?: (id: string) => unknown[] }
        }
      }
    ).game
    const specId = game?.nodeManager?.current?.specId ?? ""
    const connections = game?.model?.getConnections?.(specId) ?? []
    return connections.length === 1
  })

  await tickFlows(page)
  const flowTexts = await getFlowTextsNearConnection(
    page,
    stub.id,
    converter?.id ?? "",
  )
  expect(flowTexts.length).toBeGreaterThan(0)
  expect(flowTexts).toContain("a")
})

test("converter accepts one in/out and converts A to 1 for C", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto("/?debug=1")

  const canvas = page.locator("canvas")
  await expect(canvas).toHaveCount(1)

  await waitForGameReady(page)

  const boxes = await getBoxes(page)
  const nodeSize = await getNodeSize(page)
  const origin = await getCanvasOrigin(page)
  const maxX = Math.max(...boxes.map((box) => box.x + box.size), 0)
  const maxY = Math.max(...boxes.map((box) => box.y + box.size), 0)
  const nodePoint = {
    x: Math.min(nodeSize.width - 60, Math.max(60, maxX + 80)),
    y: Math.min(nodeSize.height - 60, Math.max(60, maxY + 80)),
  }
  const screenPoint = {
    x: origin.x + nodePoint.x,
    y: origin.y + nodePoint.y,
  }

  await page.mouse.move(screenPoint.x, screenPoint.y)
  await page.keyboard.press("1")
  await waitForBoxWithPrefix(page, "converter-")

  const centers = await getBoxCenters(page, ["root-A", "root-C", "root-T"])
  const updatedBoxes = await getBoxes(page)
  const converter = updatedBoxes.find((box) => box.id.startsWith("converter-"))
  expect(converter).toBeTruthy()
  const converterCenter = {
    x: origin.x + (converter?.x ?? 0) + (converter?.size ?? 0) / 2,
    y: origin.y + (converter?.y ?? 0) + (converter?.size ?? 0) / 2,
  }

  await dragBetween(page, centers["root-A"], converterCenter)
  await waitForConnection(page)
  await dragBetween(page, converterCenter, centers["root-C"])
  await page.waitForFunction(() => {
    const game = (
      window as {
        game?: {
          nodeManager?: { current?: { specId?: string } }
          model?: { getConnections?: (id: string) => unknown[] }
        }
      }
    ).game
    const specId = game?.nodeManager?.current?.specId ?? ""
    const connections = game?.model?.getConnections?.(specId) ?? []
    return connections.length === 2
  })

  await tickFlows(page)
  const flowTexts = await getFlowTextsNearConnection(
    page,
    converter?.id ?? "",
    "root-C",
  )
  expect(flowTexts.length).toBeGreaterThan(0)
  expect(flowTexts).toContain("1")

  const beforeCount = await getConnectionCount(page)
  await dragBetween(page, centers["root-T"], converterCenter)
  const afterIncoming = await getConnectionCount(page)
  expect(afterIncoming).toBe(beforeCount)

  await dragBetween(page, converterCenter, centers["root-A"])
  const afterOutgoing = await getConnectionCount(page)
  expect(afterOutgoing).toBe(beforeCount)
})

test("combiner combines two letter inputs in order", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto("/?debug=1")

  const canvas = page.locator("canvas")
  await expect(canvas).toHaveCount(1)

  await waitForGameReady(page)

  const boxes = await getBoxes(page)
  const nodeSize = await getNodeSize(page)
  const origin = await getCanvasOrigin(page)
  const maxX = Math.max(...boxes.map((box) => box.x + box.size), 0)
  const maxY = Math.max(...boxes.map((box) => box.y + box.size), 0)
  const nodePoint = {
    x: Math.min(nodeSize.width - 60, Math.max(60, maxX + 80)),
    y: Math.min(nodeSize.height - 60, Math.max(60, maxY + 80)),
  }
  const screenPoint = {
    x: origin.x + nodePoint.x,
    y: origin.y + nodePoint.y,
  }

  await page.mouse.move(screenPoint.x, screenPoint.y)
  await page.keyboard.press("2")
  await waitForBoxWithPrefix(page, "combiner-")

  const centers = await getBoxCenters(page, ["root-C", "root-A", "root-T"])
  const updatedBoxes = await getBoxes(page)
  const combiner = updatedBoxes.find((box) => box.id.startsWith("combiner-"))
  expect(combiner).toBeTruthy()
  const combinerCenter = {
    x: origin.x + (combiner?.x ?? 0) + (combiner?.size ?? 0) / 2,
    y: origin.y + (combiner?.y ?? 0) + (combiner?.size ?? 0) / 2,
  }

  await dragBetween(page, centers["root-C"], combinerCenter)
  await waitForConnection(page)
  await dragBetween(page, centers["root-A"], combinerCenter)
  await waitForConnection(page)
  await dragBetween(page, combinerCenter, centers["root-T"])
  await page.waitForFunction(() => {
    const game = (
      window as {
        game?: {
          nodeManager?: { current?: { specId?: string } }
          model?: { getConnections?: (id: string) => unknown[] }
        }
      }
    ).game
    const specId = game?.nodeManager?.current?.specId ?? ""
    const connections = game?.model?.getConnections?.(specId) ?? []
    return connections.length === 3
  })

  await tickFlows(page)
  const flowTexts = await getFlowTextsNearConnection(
    page,
    combiner?.id ?? "",
    "root-T",
  )
  expect(flowTexts.length).toBeGreaterThan(0)
  expect(flowTexts).toContain("ca")
})
