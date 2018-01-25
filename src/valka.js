import Koa from 'koa'
import os from 'os'
import koaStatic from 'koa-static'
import koaStaticCache from 'koa-static-cache'
import { initServices } from './services'
import { initControllers } from './controllers'
import { initModels } from './models'
import jwt from 'koa-jwt'
import jsonwebtoken from 'jsonwebtoken'
import bodyParser from 'koa-bodyparser'
import template from 'art-template'

/**
 * Default configuration
 */
const defaultConfig = {
  port: 3000,
  baseDir: '.',
  templateEngine: 'handlebars',
  secrect: 'jwt',
  enableAuth: false
}

/**
 * Bootstrap
 */
export const Valka = async (config) => {
  config = Object.assign({}, defaultConfig, config)
  const app = new Koa()
  await initModels(config)
  await initServices(config)
  const routes = await initControllers(config)
  /* Parse Post data */
  app.use(bodyParser({
    formLimit: '50mb',
    jsonLimit: '50mb',
    textLimit: '50mb'
  }))
  /* 用户认证 */
  if (config.enableAuth) {
    app.use(jwt({
      secret: config.secrect,
      passthrough: true,
      cookie: 'token' // 从 cookie 中设置和获取 token
    }))
  }
  app.use(async (...args) => {
    const ctx = args[0]
    /* Error handling */
    try {
      if (ctx.query.jwtToken) {
        const user = jsonwebtoken.decode(ctx.query.jwtToken)
        ctx.state.user = user
        const exp = new Date(user.exp * 1000)
        if (exp < new Date()) {
          ctx.state.user = null
        } else {
          ctx.state.user = user
        }
      }
      await routes(...args)
    } catch (e) {
      try {
        console.log('************ERROR URL**************', ctx.req.method, ctx.req.url, ctx.request.body, e)
      } catch (e) { ; }
      if (e.status) {
        ctx.status = e.status
      } else if (e.name === 'CastError') {
        ctx.status = 404
        e.message = '该页面不存在'
      } else {
        ctx.status = 500
      }
      ctx.errorMessage = e.message
      if (ctx.isPage) {
        errorHandle(ctx)
      } else {
        ctx.body = {
          success: false,
          message: e.message
        }
      }
    }
    /* 更新 token */
    if (config.enableAuth) {
      await refreshToken(config.secrect, ...args)
    }
  })
  /* 静态文件服务 */
  if (process.env.NODE_ENV === 'production') {
    app.use(errorHandle(koaStaticCache(`${config.baseDir}/static`, {
      maxAge: 60 * 60 * 24 * 365,
      dynamic: true
    })))
  } else {
    app.use(errorHandle(koaStatic(`${config.baseDir}/static`)))
  }
  function errorHandle (wrapper) {
    const handler = (ctx) => {
      if (ctx.status !== 200) {
        ctx.body = template('error.html', {
          status: ctx.status,
          message: ctx.errorMessage || ctx.message
        })
      }
    }
    if (typeof wrapper === 'function') {
      return async (ctx, ...rest) => {
        await wrapper(ctx, ...rest)
        if (ctx.message === 'Not Found') {
          ctx.errorMessage = '该页面不存在'
        }
        await handler(ctx)
      }
    } else {
      return handler(wrapper)
    }
  }
  app.listen(config.port, () => {
    console.log('Server started at port ' + config.port)
  })
}

const refreshToken = async (secrect, ctx) => {
  if (ctx.state.user) {
    const user = Object.assign({}, ctx.state.user)
    delete user.exp
    delete user.iat
    const token = jsonwebtoken.sign(user, secrect, { expiresIn: '14d' })
    ctx.set('jwt-token', token)
    ctx.cookies.set('token', token)
  } else {
    ctx.set('jwt-token', '')
    ctx.cookies.set('token', '') // logout
  }
}
