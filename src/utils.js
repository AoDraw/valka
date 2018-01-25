import { walk } from 'fs-walk'
import path from 'path'

const noop = () => {}

export const scanModules = async (dir, callback = noop) => new Promise((resolve, reject) => {
  walk(dir, (baseDir, filename, state, next) => {
    if (!state.isFile() || !isJSFile(filename)) return next()
    const modulePath = path.resolve(`${baseDir}/${filename}`)
    console.log('Scanning module:', modulePath)
    callback(require(modulePath))
    next()
  }, (err) => {
    if (err) return reject(err)
    resolve()
  })
})

export const beforeHandler = (fn) => (target, name, descriptor) => {
  let handler = descriptor.value
  descriptor.value = async function (...args) {
    await fn.call(this, this)
    if (this.stop) return;
    return handler.call(this, ...args)
  }
}

export const afterHandler = (fn) => (target, name, descriptor) => {
  let handler = descriptor.value
  descriptor.value = async function (...args) {
    const ret = await handler.call(this, ...args)
    if (this.stop) return;
    return await fn.call(this, this, ret)
  }
}

export const isJSFile = (file) => /\.js$/.test(file)
