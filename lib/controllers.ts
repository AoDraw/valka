import { IValkaConfig, IContext } from "./valka"
import KoaRouter, { IMiddleware } from "koa-router"
import { scanModules } from "./utils"
import fs from "fs"

enum HttpMethod {
  GET = "get",
  POST = "post",
  PUT = "put",
  DELETE = "delete",
}

interface IControllerHandler extends Function {
  isHandler: boolean,
  path: string,
  method: HttpMethod,
  template?: string,
}

interface IController extends Function {
  prefix?: string,
}

type ITemplateEngine = (ret: any) => string

const controllers: IController[] = []

let templateEngine: any = null
let templateBasePath: string = ""

export const initControllers = async (config: IValkaConfig) => {
  await initTemplateEngine(config.templateEngine, `${config.baseDir}/templates`)
  await scanControllers(`${config.baseDir}/controllers`)
  return processControllers(controllers)
}

const initTemplateEngine = (templateEngineName: string, templatePath: string) => {
  templateBasePath = templatePath
  templateEngine = require(templateEngineName)
}

const scanControllers = async (dir: string) => {
  await scanModules(dir)
}

const processControllers = (theControllers: IController[]): IMiddleware => {
  const router = new KoaRouter()
  theControllers.forEach((controller) => {
    const proto = controller.prototype
    Reflect.ownKeys(proto).forEach((key) => {
      const handler = proto[key] as IControllerHandler
      if (!handler || !handler.isHandler) { return }
      const routePath = `${controller.prefix}${handler.path}`
      const route = router[handler.method].bind(router)
      route(routePath, wrapHandler(handler))
    })
  })
  return router.routes()
}

const wrapHandler = (handler: IControllerHandler): IMiddleware => async (ctx: IContext) => {
  const template = handler.template
  const requestHandler = handler.bind(ctx) as IControllerHandler
  ctx.render = renderTemplate
  ctx.isPage = !!template
  const ret = await requestHandler(...Object.values(ctx.params), ctx)
  if (ctx.body) { return }
  if (template) {
    ctx.body = renderTemplate(template, ret)
  } else {
    if (ret && ret.raw) {
      ctx.body = ret.raw
    } else {
      ctx.body = {
        success: true,
        data: ret,
      }
    }
  }
}

const compiledTemplates = new Map<string, ITemplateEngine>()

const renderTemplate = (templatePath: string, ret: any): string => {
  templatePath = `${templateBasePath}/${templatePath}`
  let template = compiledTemplates.get(templatePath) as ITemplateEngine
  if (!template || process.env.NODE_ENV !== "production") {
    const fileContent = fs.readFileSync(templatePath, "utf-8")
    template = templateEngine.compile(fileContent)
    compiledTemplates.set(templatePath, template)
  }
  return template(ret)
}

export const Controller = (prefix: string = "") => {
  return (ControllerClass: IController) => {
    ControllerClass.prefix = prefix
    controllers.push(ControllerClass)
  }
}

export const Request = (method: HttpMethod) =>
  (path: string, template?: string) =>
    (_: any, __: any, descriptor: PropertyDescriptor) => {
      const handler = descriptor.value as IControllerHandler
      handler.path = path
      handler.isHandler = true
      handler.method = method
      handler.template = template
    }

export const Get = Request(HttpMethod.GET)
export const Post = Request(HttpMethod.POST)
export const Put = Request(HttpMethod.PUT)
export const Delete = Request(HttpMethod.DELETE)
