'use strict'

const fp = require('fastify-plugin')
const AuditLogger = require('../lib/audit-logger')

/**
 * Audit logging plugin
 */
module.exports = fp(async function (fastify, opts) {
  const auditLogger = new AuditLogger(fastify.config.auditDir)

  fastify.decorate('auditLogger', auditLogger)

  fastify.log.info('Audit logger initialized')
})
