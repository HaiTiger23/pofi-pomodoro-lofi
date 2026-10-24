const { defineConfig } = require('@vue/cli-service')
const { registerSearchRoute } = require('./electron/youtube-search')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    setupMiddlewares(middlewares, server) {
      registerSearchRoute(server.app)
      return middlewares
    }
  }
})
