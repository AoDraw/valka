import { beforeHandler, afterHandler } from './utils'

export const RequireAdmin = beforeHandler(async (ctx) => {
  if (!ctx.state.user || !ctx.state.user.isAdmin) {
    ctx.stop = true
    ctx.throw(401)
  }
})

export const RequireLogin = beforeHandler(async (ctx) => {
  if (!ctx.state.user) {
    ctx.stop = true
    ctx.throw(401)
  }
})
