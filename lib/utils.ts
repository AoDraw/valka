import path from "path"
import { IContext } from "./valka"
const { walk } = require("fs-walk")

const noop = () => undefined

type IAnyFunction = (...args: any[]) => void

export const isJSFile = (file: string): boolean => /\.(js|ts)$/i.test(file)

export const scanModules = async (dir: string, callback: IAnyFunction = noop) => new Promise((resolve, reject) => {
  walk(dir, (baseDir: string, filename: string, state: any, next: IAnyFunction) => {
    if (!state.isFile() || !isJSFile(filename)) { return next() }
    const modulePath = path.resolve(`${baseDir}/${filename}`)
    console.log("Scanning module:", modulePath)
    callback(require(modulePath))
    next()
  }, (error: Error) => {
    error ? reject(error) : resolve()
  })
})

export const beforeHandler = (fn: IAnyFunction) =>
  (target: any, name: string, descriptor: PropertyDescriptor) => {
    const handler = descriptor.value as IAnyFunction
    descriptor.value = async function(this: IContext, ...args: any[]) {
      await fn.call(this, this)
      if (this.stop) { return }
      return handler.call(this, ...args)
    }
  }

export const afterHandler = (fn: IAnyFunction) =>
  (target: any, name: string, descriptor: PropertyDescriptor) => {
    const handler = descriptor.value as IAnyFunction
    descriptor.value = async function(this: IContext, ...args: any[]) {
      const ret = await handler.call(this, ...args)
      if (this.stop) { return }
      return await fn.call(this, this, ret)
    }
  }
