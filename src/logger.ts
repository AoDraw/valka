const getLogger = () => {
  let silent = false
  const log = (...args: any[]): void => {
    if (!silent) {
      console.log(...args)
    }
  }
  const keepSilent = () => silent = true
  return { log, keepSilent }
}

export default getLogger()
