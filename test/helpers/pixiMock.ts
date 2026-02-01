import { vi } from "vitest"

export const createPixiMock = () => {
  class Point {
    x: number
    y: number

    constructor(x = 0, y = 0) {
      this.x = x
      this.y = y
    }
  }

  class Container {
    children: unknown[] = []
    position = {
      x: 0,
      y: 0,
      set: (x: number, y: number) => {
        this.position.x = x
        this.position.y = y
      },
    }
    scale = {
      x: 1,
      y: 1,
      set: (x: number, y: number = x) => {
        this.scale.x = x
        this.scale.y = y
      },
    }
    alpha = 1
    eventMode?: string
    cursor?: string
    hitArea?: unknown
    mask?: unknown
    _bounds?: { x: number; y: number; width: number; height: number }
    _listeners: Record<string, (event: unknown) => void> = {}
    worldTransform = {
      applyInverse: (point: Point) => new Point(point.x, point.y),
    }

    toLocal(point: Point): Point {
      return new Point(point.x - this.position.x, point.y - this.position.y)
    }

    addChild<T>(child: T): T {
      this.children.push(child)
      return child
    }

    removeChild(child: unknown): void {
      this.children = this.children.filter((item) => item !== child)
    }

    removeChildren(): void {
      this.children = []
    }

    on(event: string, handler: (event: unknown) => void): this {
      this._listeners[event] = handler
      return this
    }

    removeAllListeners(event?: string): void {
      if (!event) {
        this._listeners = {}
        return
      }
      delete this._listeners[event]
    }

    getBounds(): { x: number; y: number; width: number; height: number } {
      if (this._bounds) return this._bounds
      return { x: this.position.x, y: this.position.y, width: 10, height: 10 }
    }
  }

  class Graphics extends Container {
    lastRect?: { x: number; y: number; width: number; height: number }
    lastCircle?: { x: number; y: number; radius: number }
    lastStroke?: unknown
    lastFill?: unknown
    lastMove?: { x: number; y: number }
    lastLineTo?: { x: number; y: number }[]

    rect(x: number, y: number, width: number, height: number): void {
      this.lastRect = { x, y, width, height }
    }

    circle(x: number, y: number, radius: number): void {
      this.lastCircle = { x, y, radius }
    }

    clear(): void {
      this.lastMove = undefined
      this.lastLineTo = undefined
    }

    moveTo(x: number, y: number): void {
      this.lastMove = { x, y }
      this.lastLineTo = []
    }

    lineTo(x: number, y: number): void {
      if (!this.lastLineTo) this.lastLineTo = []
      this.lastLineTo.push({ x, y })
    }

    stroke(style: unknown): void {
      this.lastStroke = style
    }

    fill(style: unknown): void {
      this.lastFill = style
    }
  }

  class Rectangle {
    x: number
    y: number
    width: number
    height: number

    constructor(x: number, y: number, width: number, height: number) {
      this.x = x
      this.y = y
      this.width = width
      this.height = height
    }
  }

  class Text extends Container {
    text: string
    style: Record<string, unknown>
    anchor = {
      x: 0,
      y: 0,
      set: (x: number, y: number = x) => {
        this.anchor.x = x
        this.anchor.y = y
      },
    }

    constructor({
      text,
      style,
    }: {
      text: string
      style: Record<string, unknown>
    }) {
      super()
      this.text = text
      this.style = style
    }
  }

  class Application {
    static lastInstance: Application | null = null
    canvas = { addEventListener: vi.fn() }
    renderer = { width: 800, height: 600 }
    stage = new Container()
    screen = new Rectangle(0, 0, 800, 600)
    ticker = { add: vi.fn() }
    initOptions?: Record<string, unknown>

    constructor() {
      Application.lastInstance = this
    }

    async init(options: Record<string, unknown>): Promise<void> {
      this.initOptions = options
    }
  }

  return {
    __esModule: true,
    Application,
    Container,
    Graphics,
    Point,
    Rectangle,
    Text,
  }
}
