import Koa from "koa"
import { initServices } from "./services"
import { initControllers } from "./controllers"
import koaStatic from "koa-static"
import koaStaticCache from "koa-static-cache"
import bodyParser from "koa-bodyparser"
import jwt from "koa-jwt"
import jsonwebtoken from "jsonwebtoken"
import { IRouterContext } from "koa-router"
import { COOKIE_TOKEN, JWT_TOKEN } from "./constraints"

const template = require("art-template")

export interface IValkaContext extends IRouterContext {
  render?: (templatePath: string, ret: any) => string
  isPage?: boolean,
  errorMessage?: string,
  stop?: boolean,
}

export interface IValkaStateUser {
  exp: number,
  iat: number,
  [key: string]: any,
}

export interface IValkaConfig {
  port: number,
  baseDir: string,
  templateEngine: string,
  secrect: string,
  enableAuth: boolean,
}

export interface IValkaOptionalConfig {
  port?: number,
  baseDir?: string,
  templateEngine?: string,
  secrect?: string,
  enableAuth?: boolean,
}

const defaultConfig: IValkaConfig = {
  port: 3000,
  baseDir: ".",
  templateEngine: "art-template",
  secrect: "jwt",
  enableAuth: false,
}

export const Valka = async (options: IValkaOptionalConfig) => {
  const config: IValkaConfig = Object.assign({}, defaultConfig, options)

  const app = new Koa()
  await initServices(config)
  const routes = await initControllers(config)

  app.use(bodyParser({
    jsonLimit: "50mb",
    formLimit: "50mb",
  }))

  if (config.enableAuth) {
    app.use(jwt({
      secret: config.secrect,
      passthrough: true,
      cookie: COOKIE_TOKEN,
    }))
  }

  app.use(async (ctx: IValkaContext, ...args: any[]) => {
    try {
      if (ctx.query.jwtToken) {
        const user = jsonwebtoken.decode(ctx.query.jwtToken) as IValkaStateUser
        ctx.state.user = user
        const exp = new Date(user.exp * 1000)
        if (exp < new Date()) {
          ctx.state.user = null
        } else {
          ctx.state.user = user
        }
      }
      await routes.apply(null, [ctx, ...args])
    } catch (e) {
      try {
        console.log("************ERROR URL**************", ctx.req.method, ctx.req.url, ctx.request.body, e)
      } catch (e) { /* ignored */ }
      ctx.status = e.status || 500
      ctx.errorMessage = e.message
      if (ctx.isPage) {
        errorHandle(ctx)
      } else {
        ctx.body = {
          success: false,
          message: e.message,
        }
      }
    }
    if (config.enableAuth) {
      await refreshToken(config.secrect, ctx)
    }
  })
  /* 静态文件服务 */
  if (process.env.NODE_ENV === "production") {
    app.use(errorHandle(koaStaticCache(`${config.baseDir}/static`, {
      maxAge: 60 * 60 * 24 * 365,
      dynamic: true,
    })))
  } else {
    app.use(errorHandle(koaStatic(`${config.baseDir}/static`)))
  }
  function errorHandle(wrapper: any): any {
    const handler = (ctx: IValkaContext) => {
      if (ctx.status !== 200) {
        ctx.body = template("error.html", {
          status: ctx.status,
          message: ctx.errorMessage || ctx.message,
        })
      }
    }
    if (typeof wrapper === "function") {
      return async (ctx: IValkaContext, ...rest: any[]) => {
        await wrapper(ctx, ...rest)
        if (ctx.message === "Not Found") {
          ctx.errorMessage = "该页面不存在"
        }
        await handler(ctx)
      }
    } else {
      return handler(wrapper)
    }
  }
  app.listen(config.port, () => {
    console.log("Server started at port " + config.port)
  })
}

const refreshToken = async (secrect: string, ctx: IValkaContext) => {
  if (ctx.state.user) {
    const user = Object.assign({}, ctx.state.user) as IValkaStateUser
    delete user.exp
    delete user.iat
    const token = jsonwebtoken.sign(user, secrect, { expiresIn: "14d" })
    ctx.set(JWT_TOKEN, token)
    ctx.cookies.set(COOKIE_TOKEN, token)
  } else {
    ctx.set(JWT_TOKEN, "")
    ctx.cookies.set(COOKIE_TOKEN, "")
  }
}
