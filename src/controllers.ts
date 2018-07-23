import { IValkaConfig } from "./valka"
import KoaRouter, { IMiddleware, IRouterContext } from "koa-router"
import { scanModules } from "./utils"
import path from "path"

export interface IContext extends IRouterContext {
  stop?: boolean,
  isPage?: boolean,
  [key: string]: any,
}

export interface IValkaController extends Function {
  prefix?: string
  new (): any
}

export const enum ValkaHttpMethod {
  GET = "get",
  PUT = "put",
  POST = "post",
  DELETE = "delete",
}

export interface IValkaMiddleware extends IMiddleware {
  method?: ValkaHttpMethod,
  isHandler?: boolean,
  template?: string,
  urlPath?: string,
}

const ControllerClasses: IValkaController[] = []

export const scanControllers = async (config: IValkaConfig): Promise<IValkaMiddleware> => {
  const router = new KoaRouter()

  /* 先扫描文件夹，找到所有需要初始化的类 */
  const controllersDir = path.resolve(config.baseDir, "controllers")
  await scanModules(controllersDir)

  /* 实例化类，并且将指定方法注册到路由器上 */
  ControllerClasses.forEach((ControllerClass: IValkaController) => {
    const proto = ControllerClass.prototype

    Reflect.ownKeys(proto).forEach((key) => {
      const handler = proto[key]
      if (handler && handler.isHandler) {
        const method = handler.method as ValkaHttpMethod
        const routePath = `${ControllerClass.prefix}${handler.urlPath}`
        const addRoute = router[method].bind(router)
        addRoute(routePath, wrapperHandler(ControllerClass, handler, config))
      }
    })
  })
  return router.routes()
}

export const wrapperHandler = (
  ControllerClass: IValkaController,
  handler: IValkaMiddleware,
  config: IValkaConfig,
): IMiddleware =>
  async  (ctx: IContext) => {
    /* 先初始化实例，跟上下文绑定 */
    const instance = new ControllerClass()

    /* 正式执行当前实例的方法 */
    const ret = await handler.call(instance, ctx)

    const templateFile = handler.template
    const templateEngine = config.template

    ctx.isPage = !!templateFile

    /* 只处理没有设置内容，已经设置的不需要处理 */
    if (ctx.body) {
      return
    }
    /* 如果指定返回页面，那么自动渲染并且返回 */
    if (templateFile) {
      ctx.body = templateEngine.render(templateFile, ret)
    } else {
      /* 强制不处理数据的情况下，直接返回 */
      if (ret && ret.raw) {
        ctx.body = ret.raw
      } else {
        /* 没有指定页面，默认返回 json */
        ctx.body = {
          success: true,
          data: ret,
        }
      }
    }
  }

export const Controller = (prefix?: string) => {
  return (ControllerClass: IValkaController) => {
    ControllerClass.prefix = prefix || ""
    ControllerClasses.push(ControllerClass)
  }
}

export const Request = (method: ValkaHttpMethod) =>
  (urlPath: string, template?: string) =>
    (target: any, name: string, descriptor: PropertyDescriptor) => {
      const handler: IValkaMiddleware = descriptor.value
      handler.isHandler = true
      handler.method = method
      handler.template = template
      handler.urlPath = urlPath
    }

export const Get = Request(ValkaHttpMethod.GET)
export const Post = Request(ValkaHttpMethod.POST)
export const Put = Request(ValkaHttpMethod.PUT)
export const Delete = Request(ValkaHttpMethod.DELETE)
