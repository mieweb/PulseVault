'use strict'

const fp = require('fastify-plugin')
const Redis = require('ioredis')

/**
 * Redis plugin for job queue and caching
 */
module.exports = fp(async function (fastify, opts) {
  const { redis: redisConfig } = fastify.config

  // Skip Redis in test mode if not available
  if (process.env.NODE_ENV === 'test' && !process.env.REDIS_HOST) {
    fastify.log.info('Redis disabled for testing')
    
    // Mock Redis for tests
    fastify.decorate('redis', {
      incr: async () => {},
      get: async () => null,
      setex: async () => {},
      quit: async () => {}
    })
    
    fastify.decorate('queue', {
      enqueueTranscode: async () => ({ id: 'test-job' }),
      dequeueTranscode: async () => null,
      getQueueLength: async () => 0,
      cacheMetadata: async () => {},
      getCachedMetadata: async () => null,
      incrementMetric: async () => {},
      getMetric: async () => 0
    })
    
    return
  }

  const redisClient = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    }
  })

  redisClient.on('error', (err) => {
    fastify.log.error({ err }, 'Redis connection error')
  })

  redisClient.on('connect', () => {
    fastify.log.info('Redis connected')
  })

  // Queue helper methods
  const queue = {
    /**
     * Enqueue a transcode job
     */
    async enqueueTranscode(videoId, metadata) {
      const job = {
        id: `transcode-${videoId}-${Date.now()}`,
        type: 'transcode',
        videoId,
        metadata,
        enqueuedAt: new Date().toISOString()
      }
      
      await redisClient.lpush('queue:transcode', JSON.stringify(job))
      await redisClient.incr('metrics:jobs:enqueued')
      
      fastify.log.info({ videoId, jobId: job.id }, 'Transcode job enqueued')
      return job
    },

    /**
     * Dequeue a job (blocking wait)
     */
    async dequeueTranscode(timeout = 5) {
      const result = await redisClient.brpop('queue:transcode', timeout)
      if (!result) return null
      
      const [, jobData] = result
      const job = JSON.parse(jobData)
      await redisClient.incr('metrics:jobs:dequeued')
      
      return job
    },

    /**
     * Get queue length
     */
    async getQueueLength(queueName = 'transcode') {
      return await redisClient.llen(`queue:${queueName}`)
    },

    /**
     * Cache video metadata
     */
    async cacheMetadata(videoId, metadata, ttl = 3600) {
      await redisClient.setex(
        `metadata:${videoId}`,
        ttl,
        JSON.stringify(metadata)
      )
    },

    /**
     * Get cached metadata
     */
    async getCachedMetadata(videoId) {
      const data = await redisClient.get(`metadata:${videoId}`)
      return data ? JSON.parse(data) : null
    },

    /**
     * Increment metrics counter
     */
    async incrementMetric(metric) {
      await redisClient.incr(`metrics:${metric}`)
    },

    /**
     * Get metric value
     */
    async getMetric(metric) {
      const value = await redisClient.get(`metrics:${metric}`)
      return value ? parseInt(value, 10) : 0
    }
  }

  fastify.decorate('redis', redisClient)
  fastify.decorate('queue', queue)

  // Graceful shutdown
  fastify.addHook('onClose', async (instance) => {
    await redisClient.quit()
    instance.log.info('Redis connection closed')
  })
})
