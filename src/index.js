function exportFrom (module) {
  const data = require(module)
  Object.keys(data).forEach(key => {
    if (key !== 'default' && key !== '__esmodule') {
      Object.defineProperty(exports, key, {
        enumerable: true,
        get: () => data[key]
      })
    }
  })
}
exportFrom('./services')
exportFrom('./controllers')
exportFrom('./models')
exportFrom('./users')
exportFrom('./utils')
exportFrom('./valka')