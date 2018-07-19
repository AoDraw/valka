import { beforeHandler } from "./utils"
import { IContext } from "./valka"

export const RequireAdmin = beforeHandler(async (ctx: IContext) => {
  if (!ctx.state.user || !ctx.state.user.isAdmin) {
    ctx.stop = true
    ctx.throw(401)
  }
})

export const RequireLogin = beforeHandler(async (ctx: IContext) => {
  if (!ctx.state.user) {
    ctx.stop = true
    ctx.throw(401)
  }
})
