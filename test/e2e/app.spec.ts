import { expect, test } from "@playwright/test"
import {
  dragBetween,
  getConnectionCount,
  getBoxCenters,
  getRenderCounts,
  waitForCurrentSpec,
  waitForConnection,
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
  expect(renderedCounts.flows).toBe(0)
})
