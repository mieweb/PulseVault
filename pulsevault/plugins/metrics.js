'use strict'

const fp = require('fastify-plugin')
const promClient = require('prom-client')

/**
 * Prometheus metrics plugin
 */
module.exports = fp(async function (fastify, opts) {
  if (!fastify.config.metrics.enabled) {
    fastify.log.info('Metrics collection disabled')
    return
  }

  // Create a Registry to register the metrics
  const register = new promClient.Registry()

  // Add default metrics
  promClient.collectDefaultMetrics({ register })

  // Custom metrics
  const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  })

  const uploadCounter = new promClient.Counter({
    name: 'pulsevault_uploads_total',
    help: 'Total number of uploads',
    labelNames: ['status'],
    registers: [register]
  })

  const uploadSize = new promClient.Histogram({
    name: 'pulsevault_upload_size_bytes',
    help: 'Size of uploaded files in bytes',
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824],
    registers: [register]
  })

  const transcodeCounter = new promClient.Counter({
    name: 'pulsevault_transcodes_total',
    help: 'Total number of transcoding jobs',
    labelNames: ['status'],
    registers: [register]
  })

  const transcodeDuration = new promClient.Histogram({
    name: 'pulsevault_transcode_duration_seconds',
    help: 'Duration of transcoding jobs in seconds',
    labelNames: ['rendition'],
    registers: [register]
  })

  const queueLength = new promClient.Gauge({
    name: 'pulsevault_queue_length',
    help: 'Number of jobs in transcode queue',
    registers: [register]
  })

  const mediaRequests = new promClient.Counter({
    name: 'pulsevault_media_requests_total',
    help: 'Total number of media requests',
    labelNames: ['type', 'status'],
    registers: [register]
  })

  // Hook to track request duration
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now()
  })

  fastify.addHook('onResponse', async (request, reply) => {
    if (request.startTime) {
      const duration = (Date.now() - request.startTime) / 1000
      httpRequestDuration
        .labels(request.method, request.routeOptions.url || request.url, reply.statusCode)
        .observe(duration)
    }
  })

  // Expose metrics
  const metrics = {
    register,
    httpRequestDuration,
    uploadCounter,
    uploadSize,
    transcodeCounter,
    transcodeDuration,
    queueLength,
    mediaRequests
  }

  fastify.decorate('metrics', metrics)

  // Metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType)
    return register.metrics()
  })

  // Periodically update queue length metric
  const updateQueueMetrics = async () => {
    try {
      const length = await fastify.queue.getQueueLength()
      queueLength.set(length)
    } catch (err) {
      fastify.log.error({ err }, 'Failed to update queue metrics')
    }
  }

  const metricsInterval = setInterval(updateQueueMetrics, 10000)

  fastify.addHook('onClose', async () => {
    clearInterval(metricsInterval)
  })

  fastify.log.info('Prometheus metrics enabled on /metrics')
})
