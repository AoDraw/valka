import path from "path"
import { IValkaMiddleware, IContext } from "./controllers"
import logger from "./logger"

const { walk } = require("fs-walk")

const isScriptFile = (file: string) => /\.(js|ts)$/i.test(file)

export const scanModules = async (dir: string) => new Promise((resolve, reject) => {
  walk(dir, (baseDir: string, filename: string, state: any, next: () => void) => {
    if (!state.isFile() || !isScriptFile(filename)) {
      next()
    } else {
      const modulePath = path.resolve(baseDir, filename)
      logger.log("Scanning module:", modulePath)
      require(modulePath)
      next()
    }
  }, (error: Error) => {
    error ? reject(error) : resolve()
  })
})

export const beforeHandler = (fn: IValkaMiddleware) =>
  (target: any, name: string, descriptor: PropertyDescriptor) => {
    const handler = descriptor.value as IValkaMiddleware
    descriptor.value = async (ctx: IContext) => {
      const ret = await fn.call(target, ctx)
      if (!ctx.stop) {
        return await handler.call(target, ctx, ret)
      } else {
        return ret
      }
    }
  }

export const afterHandler = (fn: IValkaMiddleware) =>
  (target: any, name: string, descriptor: PropertyDescriptor) => {
    const handler = descriptor.value as IValkaMiddleware
    descriptor.value = async (ctx: IContext) => {
      const ret = await handler.call(target, ctx)
      if (!ctx.stop) {
        return await fn.call(target, ctx, ret)
      } else {
        return ret
      }
    }
  }

export const RequireAdmin = () => beforeHandler((ctx: IContext) => {
  if (!ctx.state.user || !ctx.state.user.isAdmin) {
    ctx.stop = true
    ctx.throw(401)
  }
})

export const RequireLogin = () => beforeHandler((ctx: IContext) => {
  if (!ctx.state.user) {
    ctx.stop = true
    ctx.throw(401)
  }
})
