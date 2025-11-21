'use strict'

const fp = require('fastify-plugin')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(async function (fastify, opts) {
  // Register CORS plugin globally
  await fastify.register(require('@fastify/cors'), {
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'X-Upload-Token'],
    exposedHeaders: ['Content-Range', 'Content-Length', 'Upload-Offset', 'Upload-Length'],
    credentials: false
  })

  fastify.decorate('someSupport', function () {
    return 'hugs'
  })
})
