import Koa from "koa"
import { IValkaTemplate, ValkaArtTemplate } from "./template"
import { scanControllers, IContext, IValkaMiddleware } from "./controllers"
import bodyParser from "koa-bodyparser"
import jwt from "koa-jwt"
import koaStaticCache from "koa-static-cache"
import koaStatic from "koa-static"
import jsonwebtoken from "jsonwebtoken"
import path from "path"

export interface IValkaConfig {
  port: number,               /* 监听端口 */
  baseDir: string,            /* 项目扫描根目录 */
  enableAuth: boolean,        /* 是否开启用户授权，开启后会自动设置 cookie */
  jwtSecret: string,          /* 若开启用户授权，将用此字符串作为秘钥加密 jwt */
  jwtCookie: string,          /* 若开启用户授权，将会在 cookie 中设置加密串 */
  jwtHeader: string,          /* 若开启用户授权，将会在 header 中设置返回字段 */
  template: IValkaTemplate,   /* 页面渲染模板引擎 */
}

/* IValkaConfig 参数可选版本 */
export interface IValkaOptionalConfig {
  port?: number,               /* 监听端口 */
  baseDir?: string,            /* 项目扫描根目录 */
  enableAuth?: boolean,        /* 是否开启用户授权，开启后会自动设置 cookie */
  jwtSecret?: string,          /* 若开启用户授权，将用此字符串作为秘钥加密 jwt */
  jwtCookie?: string,          /* 若开启用户授权，将会在 cookie 中设置加密串 */
  jwtHeader?: string,          /* 若开启用户授权，将会在 header 中设置返回字段 */
  template?: IValkaTemplate,   /* 页面渲染模板引擎 */
}

const DEFAULT_CONFIG: IValkaConfig = {
  port: 3000,
  baseDir: ".",
  enableAuth: false,
  jwtSecret: "jwt",
  jwtCookie: "token",
  jwtHeader: "jwt-token",
  template: new ValkaArtTemplate(),
}

export interface IValkaStateUser {
  exp: number,
  iat: number,
  [key: string]: any,
}

export async function Valka(options: IValkaOptionalConfig) {
  const config: IValkaConfig = Object.assign({}, DEFAULT_CONFIG, options)

  const app = new Koa()

  /* 初始化模板引擎 */
  const templateEngine = config.template
  templateEngine.config(config)

  const route: IValkaMiddleware = await scanControllers(config)

  app.use(bodyParser({
    jsonLimit: "50mb",
    formLimit: "50mb",
  }))

  if (config.enableAuth) {
    app.use(jwt({
      secret: config.jwtSecret,
      cookie: config.jwtCookie,
      passthrough: true,
    }))
  }

  const mainMiddleware = addTokenHandler(route, config)
  app.use(addErrorHandler(mainMiddleware, config))

  const staticDir = path.resolve(config.baseDir, "static")
  const staticMiddleware = process.env.NODE_ENV === "production"
    ? koaStaticCache(staticDir, { maxAge: 60 * 60 * 24 * 365, dynamic: true })
    : koaStatic(staticDir)

  app.use(addErrorHandler(staticMiddleware, config))

  app.listen(config.port, () => {
    console.log(`Server started at port ${config.port}`)
  })

  return app
}

const addTokenHandler = (route: IValkaMiddleware, config: IValkaConfig) =>
  async (ctx: IContext, ...args: any[]) => {
    if (config.enableAuth) {
      deserializeToken(ctx)
      await route.apply(null, [ctx, ...args])
      serializeToken(ctx, config)
    } else {
      await route.apply(null, [ctx, ...args])
    }
  }

const addErrorHandler = (route: IValkaMiddleware, config: IValkaConfig) =>
  async (ctx: IContext, ...args: any[]) => {
    try {
      await route.apply(null, [ctx, ...args])
    } catch (e) {
      try {
        console.log("************ERROR URL**************", ctx.req.method, ctx.req.url, ctx.request.body, e)
      } catch (err) {
        /* ignored */
      }

      const templateEngine = config.template
      const errorMessage = e.message

      ctx.status = e.status || 500
      if (ctx.isPage) {
        ctx.body = templateEngine.render("error.html", {
          status: ctx.status,
          message: errorMessage,
        })
      } else {
        ctx.body = {
          success: false,
          message: errorMessage,
        }
      }
    }
  }

const isExpired = (user: IValkaStateUser): boolean => {
  const exp = new Date(user.exp * 1000)
  const now = new Date()
  return exp < now
}

const deserializeToken = (ctx: IContext) => {
  const jwtToken: string = ctx.query.jwtToken || ""
  if (jwtToken) {
    const user = jsonwebtoken.decode(jwtToken) as IValkaStateUser
    if (user && !isExpired(user)) {
      ctx.state.user = user
    } else {
      ctx.state.user = null
    }
  }
}

const serializeToken = (ctx: IContext, config: IValkaConfig) => {
  let token: string = ""
  if (ctx.state.user) {
    const user = Object.assign({}, ctx.state.user) as IValkaStateUser
    delete user.exp
    delete user.iat
    token = jsonwebtoken.sign(user, config.jwtSecret, { expiresIn: "14d" })
  }
  ctx.set(config.jwtHeader, token)
  ctx.cookies.set(config.jwtCookie, token)
}
