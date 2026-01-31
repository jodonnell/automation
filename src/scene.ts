import { Application } from "pixi.js"
import { createSceneController } from "./app/sceneController"
import { NODE_TREE } from "./nodeSpec"

export const init = async (): Promise<void> => {
  const app = new Application()
  await app.init({ background: "#ffffff", resizeTo: window, antialias: true })
  document.body.appendChild(app.canvas)

  const controller = createSceneController({
    app,
    rootSpec: NODE_TREE,
    isDev: import.meta.env.DEV,
    window,
  })
  controller.start()
}

export const test = init
