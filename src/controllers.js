import fs from 'fs'
import KoaRouter from 'koa-router'
import { scanModules } from './utils'

/**
 * Controller decorator
 * @param {String|Class} prefix 
 */
export const Controller = (prefix) => {
  const decorateController = (prefix) => (Controller) => {
    Controller.prefix = prefix || ''
    controllers.push(Controller)
  }
  return typeof prefix === 'string'
    ? decorateController(prefix)
    : decorateController('')(prefix) // path is Controller actually
}

export const Request = (method) => (path, template) => (_, __, descriptor) => {
  const handler = descriptor.value
  handler.path = path
  handler.isHandler = true
  handler.method = method
  handler.template = template
}

/**
 * Using @Request decorator to create different methods' docorators
 */
export const Get = Request('get')
export const Post = Request('post')
export const Put = Request('put')
export const Delete = Request('delete')

/**
 * Make a request handler async
 * @param {Funciton} handler 
 */
const wrapHandler = (handler) => async (ctx) => {
  const template = handler.template
  const requestHandler = handler.bind(ctx)
  ctx.render = renderTemplate
  ctx.isPage = !!template
  const ret = await requestHandler(...Object.values(ctx.params), ctx)
  if (ctx.body) return;
  if (template) { // rendering template
    ctx.body = renderTemplate(template, ret)
  } else { // ajax api
    if (ret && ret.raw) {
      ctx.body = ret.raw
    } else {
      ctx.body = {
        success: true,
        data: ret
      }
    }
  }
}

const renderTemplate = (templatePath, ret) => {
  templatePath = `${templateBasePath}/${templatePath}`
  let template = compiledTemplates.get(templatePath)
  if (!template || process.env.NODE_ENV !== 'production') {
    const fileContent = fs.readFileSync(templatePath, 'utf-8')
    template = templateEngine.compile(fileContent)
    compiledTemplates.set(templatePath, template)
  }
  return template(ret)
}

/**
 * Store all controllers in array waiting to be processed
 */
const controllers = []

/**
 * Template engine
 */
let templateEngine = null
let templateBasePath = ''

/**
 * Compiled templates
 */
let compiledTemplates = new Map()

/**
 * init all the controllers
 */
export const initControllers = async (config) => {
  await initTemplateEngine(config.templateEngine, `${config.baseDir}/templates`)
  await scanControllers(`${config.baseDir}/controllers`)
  return processControllers(controllers)
}

const initTemplateEngine = (templateEngineName, templatePath) => {
  templateBasePath = templatePath
  templateEngine = require(templateEngineName)
}

const scanControllers = async (dir) => {
  await scanModules(dir)
}

/**
 * Process every candidate controller and make a router
 * to listen to every request method inside the controller.
 * @param {Array} controllers 
 */
const processControllers = (controllers) => {
  const router = new KoaRouter()
  controllers.forEach((Controller) => {
    const proto = Controller.prototype
    Reflect.ownKeys(proto).forEach((key) => {
      const handler = proto[key]
      if (!handler || !handler.isHandler) return
      const routePath = `${Controller.prefix}${handler.path}`
      router[handler.method](routePath, wrapHandler(handler))
    })
  })
  return router.routes()
}
