// ecosystem.config.js
module.exports = {
    apps: [{
      name: "BS Gold Frontend",
      script: "serve",
      env: {
        PM2_SERVE_PATH: './build',
        PM2_SERVE_PORT: 1341,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html'
      }
    }]
  }