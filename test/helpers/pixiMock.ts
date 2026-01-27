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
    children: any[] = []
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
    hitArea?: any
    mask?: any
    _listeners: Record<string, (event: any) => void> = {}
    worldTransform = {
      applyInverse: (point: Point) => new Point(point.x, point.y),
    }

    addChild<T>(child: T): T {
      this.children.push(child)
      return child
    }

    removeChild(child: any): void {
      this.children = this.children.filter((item) => item !== child)
    }

    removeChildren(): void {
      this.children = []
    }

    on(event: string, handler: (event: any) => void): this {
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
      if ((this as any)._bounds) return (this as any)._bounds
      return { x: this.position.x, y: this.position.y, width: 10, height: 10 }
    }
  }

  class Graphics extends Container {
    rect(_x: number, _y: number, _width: number, _height: number): void {}
    stroke(_style: any): void {}
    fill(_style: any): void {}
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
    style: any
    anchor = {
      x: 0,
      y: 0,
      set: (x: number, y: number = x) => {
        this.anchor.x = x
        this.anchor.y = y
      },
    }

    constructor({ text, style }: { text: string; style: any }) {
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

    constructor() {
      Application.lastInstance = this
    }

    async init(_options: any): Promise<void> {}
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
