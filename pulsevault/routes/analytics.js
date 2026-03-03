'use strict'

const { PrismaClient } = require('@prisma/client')

// Lazy singleton — shared across requests, instantiated on first use
let prisma

function getPrisma () {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

module.exports = async function (fastify, opts) {
  /**
   * Admin guard — checks X-Admin-Secret header against HMAC secret
   */
  async function requireAdmin (request, reply) {
    const provided = request.headers['x-admin-secret']
    if (!provided || provided !== fastify.config.hmacSecret) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  }

  /**
   * Track a video analytics event
   */
  fastify.post('/analytics', {
    schema: {
      body: {
        type: 'object',
        required: ['videoId', 'event', 'ts', 'userId'],
        properties: {
          videoId: { type: 'string' },
          event:   { type: 'string' },
          ts:      { type: 'number' },
          userId:  { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { videoId, event, ts, userId } = request.body

    request.log.info({ videoId, event, userId, ts }, '[analytics] received event')

    if (event !== 'watched_50_percent') {
      request.log.warn({ videoId, event, userId }, '[analytics] unsupported event type')
      return reply.code(400).send({ error: 'Unsupported event type' })
    }

    // Always queue analytics events (no dedupe), so repeated watches are counted.
    const queueLengthAfterPush = await fastify.redis.lpush('queue:analytics', JSON.stringify(request.body))

    request.log.info(
      { videoId, userId, queue: 'queue:analytics', queueLengthAfterPush },
      '[analytics] event queued successfully'
    )

    return reply.code(200).send({ status: 'queued' })
  })

  /**
   * Top videos by watched_50_percent count — admin only
   */
  fastify.get('/admin/analytics/top', {
    preHandler: requireAdmin
  }, async (request, reply) => {
    const rows = await getPrisma().videoMetric.findMany({
      orderBy: { watched50Count: 'desc' },
      take: 20,
      select: { videoId: true, watched50Count: true }
    })
    return reply.send(rows)
  })
}
