import { IValkaConfig } from "./valka"
import { scanModules } from "./utils"

const services = new Map<string, any>()

export const Service = (target: any) => {
  target.isService = true
  const service = Reflect.construct(target, [])
  services.set(target.name, service)
  return service
}

const scanServices = async (dir: string) => {
  await scanModules(dir)
}

export const initServices = async (config: IValkaConfig) => {
  await scanServices(`${config.baseDir}/services`)
}

export const AutowiredService = (serviceName: string) => (target: any, name: string) => {
  setTimeout(() => {
    target[name] = services.get(serviceName)
  }, 0)
}
