import { IValkaConfig } from "./valka"
import path from "path"
const artTemplate = require("art-template")

export interface IValkaTemplate {
  config(config: IValkaConfig): void,
  render(templatePath: string, data: any): string,
}

export class ValkaArtTemplate implements IValkaTemplate {

  public config(config: IValkaConfig) {
    artTemplate.defaults.extname = ".html"
    artTemplate.defaults.root = path.resolve(config.baseDir, "templates")
  }

  public render(templatePath: string, data: any) {
    try {
      return artTemplate(templatePath, data)
    } catch (e) {
      return e.message
    }
  }
}
