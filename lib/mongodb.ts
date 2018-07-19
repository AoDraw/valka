import mongoose, { Connection, SchemaDefinition, Schema } from "mongoose"
import { isFunction } from "util"
import { Database } from "./database"

export interface IMongoDBConfig {
  url: string,
  name: string,
}

export class MongoDB extends Database {
  private connection: Connection | null = null

  constructor() {
    super()
    mongoose.Promise = Promise
  }

  public async connect(config: IMongoDBConfig) {
    if (!this.connection) {
      this.connection = mongoose.createConnection(config.url, { useMongoClient: true })
    }
  }

  public instaniate(modelName: string, definition: SchemaDefinition, target: any) {
    const schema = new mongoose.Schema(definition, { timestamps: true })

    Reflect.ownKeys(target).forEach((key) => {
      const fn = target[key]
      if (isFunction(fn)) {
        schema.statics[key] = fn
      }
    })

    const proto = target.prototype
    Reflect.ownKeys(proto).forEach((key) => {
      const fn = target[key]
      if (isFunction(fn) &&  key !== "constructor") {
        schema.methods[key] = fn
      }
    })

    const model = (this.connection as Connection).model(modelName, schema)
    this.models.set(modelName, model)
  }
}
