import mongoose from 'mongoose'
import { scanModules } from './utils'

mongoose.Promise = Promise

/**
 * @Model decorator
 */
const models = new Map()
let db = null

export const Model = (target, name, descriptor) => {
  target.isModel = true
  const schema = new mongoose.Schema(
    target.schema, { timestamps: true }
  )
  /* set static methods */
  Reflect.ownKeys(target).forEach((key) => {
    const fn = target[key]
    if (typeof fn !== 'function') return
    schema.statics[key] = fn
  })
  /* normal methods */
  const proto = target.prototype
  Reflect.ownKeys(proto).forEach((key) => {
    const fn = proto[key]
    if (typeof fn !== 'function' || key === 'constructor') return
    schema.methods[key] = fn
  })
  const model = mongoose.model(target.name, schema)
  models.set(target.name, model)
  return model
}

export const initModels = async (config) => {
  if (!config.database) return
  connectDatabase(config)
  await scanModels(`${config.baseDir}/models`)
}

/* auto wire model to static property */
export const AutowiredModel = (modelName) => (target, name, descriptor) => {
  setTimeout(() => target[name] = models.get(modelName))
}

const connectDatabase = (config) => {
  db = mongoose.connect(
    config.database.mongodb.url,
    { useMongoClient: true }
  )
}

const scanModels = async (dir) => {
  await scanModules(dir)
}

export const Types = mongoose.Schema.Types
