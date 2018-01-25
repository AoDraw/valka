import { scanModules } from './utils'

/**
 * @Service decorator
 */
const services = new Map()

export const Service = (target, name, descriptor) => {
  target.isService = true
  const service = Reflect.construct(target, [])
  services.set(target.name, service)
  return service
}

export const initServices = async (config) => {
  await scanServices(`${config.baseDir}/services`)
}

/* auto wire service to static property */
export const AutowiredService = (serviceName) => (target, name, descriptor) => {
  setTimeout(() => target[name] = services.get(serviceName))
}

const scanServices = async (dir) => {
  await scanModules(dir)
}
