'use strict'

const path = require('node:path')
const Redis = require('ioredis')
const { PrismaClient } = require('@prisma/client')

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

/**
 * Analytics worker — consumes queue:analytics and writes to PostgreSQL via Prisma
 */
class AnalyticsWorker {
  constructor(config) {
    this.config = config
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db
    })
    this.prisma = new PrismaClient()
    this.running = true
  }

  /**
   * Start the worker loop
   */
  async start() {
    console.log('[analytics-worker] starting...')
    console.log('[analytics-worker] listening on Redis list: queue:analytics')

    while (this.running) {
      try {
        // Blocking dequeue with 5-second timeout
        const result = await this.redis.brpop('queue:analytics', 5)

        if (!result) {
          console.log('[analytics-worker] no job in queue (timeout)')
          continue
        }

        console.log('[analytics-worker] dequeued raw payload:', result[1])
        const event = JSON.parse(result[1])

        // Insert raw event
        await this.prisma.videoEvent.create({
          data: {
            videoId: event.videoId,
            event:   event.event,
            userId:  event.userId,
            ts:      new Date(event.ts)
          }
        })
        console.log('[analytics-worker] inserted videoEvent row')

        // Upsert aggregate metric
        await this.prisma.videoMetric.upsert({
          where:  { videoId: event.videoId },
          update: { watched50Count: { increment: 1 } },
          create: { videoId: event.videoId, watched50Count: 1 }
        })
        console.log('[analytics-worker] upserted videoMetric row')

        console.log(`[analytics-worker] processed ${event.event} for video ${event.videoId}`)
      } catch (err) {
        console.error('[analytics-worker] error:', err)
        // Brief back-off before retrying to avoid tight error loops
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async stop() {
    this.running = false
    await this.prisma.$disconnect()
    this.redis.disconnect()
  }
}

// Run when executed directly
if (require.main === module) {
  const config = {
    redis: {
      host:     process.env.REDIS_HOST     || 'pulsevault-redis',
      port:     parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db:       parseInt(process.env.REDIS_DB   || '0', 10)
    }
  }

  const worker = new AnalyticsWorker(config)

  process.on('SIGTERM', async () => {
    console.log('[analytics-worker] received SIGTERM, shutting down...')
    await worker.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('[analytics-worker] received SIGINT, shutting down...')
    await worker.stop()
    process.exit(0)
  })

  worker.start().catch((err) => {
    console.error('[analytics-worker] fatal error:', err)
    process.exit(1)
  })
}

module.exports = AnalyticsWorker
