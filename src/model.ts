import type { ConnectionPath, NodeLayout, NodeSpec, PointData } from "./types"

export type GameModel = {
  getLayout: (spec: NodeSpec, width: number, height: number) => NodeLayout
  getConnections: (specId: string) => ConnectionPath[]
  addConnection: (specId: string, connection: ConnectionPath) => void
}

const hashString = (value: string) => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createSeededRandom = (seed: number) => {
  let state = seed || 1
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const computeLayout = (
  spec: NodeSpec,
  width: number,
  height: number,
): NodeLayout => {
  const base = Math.min(width, height)
  const gap = base * 0.08
  const boxSize = (base - gap * 4) / 3
  const padding = gap
  const minX = padding
  const minY = padding
  const maxX = width - padding - boxSize
  const maxY = height - padding - boxSize

  const positions = new Map<string, PointData>()
  const placed: PointData[] = []
  const overlaps = (x: number, y: number) =>
    placed.some((p) => {
      return (
        x < p.x + boxSize &&
        x + boxSize > p.x &&
        y < p.y + boxSize &&
        y + boxSize > p.y
      )
    })

  const rng = createSeededRandom(hashString(`${spec.id}-${width}x${height}`))
  const pickSpot = () => {
    const maxAttempts = 200
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const x = minX + rng() * (maxX - minX)
      const y = minY + rng() * (maxY - minY)
      if (!overlaps(x, y)) return { x, y }
    }
    return null
  }

  const children = spec.children ?? []
  children.forEach((child, index) => {
    const spot = pickSpot()
    if (spot) {
      placed.push(spot)
      positions.set(child.id, { x: spot.x, y: spot.y })
    } else {
      const fallbackX = gap + index * (boxSize + gap)
      const fallbackY = (height - boxSize) / 2
      placed.push({ x: fallbackX, y: fallbackY })
      positions.set(child.id, { x: fallbackX, y: fallbackY })
    }
  })

  return { boxSize, positions }
}

export const createGameModel = (): GameModel => {
  const layouts = new Map<string, NodeLayout>()
  const connections = new Map<string, ConnectionPath[]>()

  const getLayout = (spec: NodeSpec, width: number, height: number) => {
    const key = `${spec.id}-${width}x${height}`
    const cached = layouts.get(key)
    if (cached) return cached
    const layout = computeLayout(spec, width, height)
    layouts.set(key, layout)
    return layout
  }

  const getConnections = (specId: string) => connections.get(specId) ?? []

  const addConnection = (specId: string, connection: ConnectionPath) => {
    const list = connections.get(specId) ?? []
    list.push(connection)
    connections.set(specId, list)
  }

  return {
    getLayout,
    getConnections,
    addConnection,
  }
}
