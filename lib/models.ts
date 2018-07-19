import { IValkaConfig, IValkaDBConfig } from "./valka"
import { scanModules } from "./utils"
import { MongoDB } from "./mongodb"
import { Database } from "./database"

const databases = new Map<string, Database>()

export const initModels = async (config: IValkaConfig) => {
  if (!config.database) { return }
  await initDatabaseAdaptor(config.database)
  await scanModels(`${config.baseDir}/models`)
}

export const initDatabaseAdaptor = async (config: IValkaDBConfig) => {
  const database = new MongoDB()
  await database.connect(config.mongodb)
  databases.set(config.mongodb.name, database)
}

export const DBModel = (dbname: string) => (target: any) => {
  const database = databases.get(dbname)
  if (database) {
    database.instaniate(target.name, target.value, target)
  }
  target.isModel = true
}

export const Model = (target: any) => {
  return DBModel("mongodb")(target)
}

export const scanModels = async (dir: string) => {
  await scanModules(dir)
}

export const AutowiredModel = (modelName: string) => (target: any, name: string) => {
  setTimeout(() => {
    const database = databases.get("mongodb") as MongoDB
    target[name] = database.getModel(modelName)
  }, 0)
}
