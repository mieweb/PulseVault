'use strict'

const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const MetadataWriter = require('../lib/metadata-writer')

module.exports = async function (fastify, opts) {
  /**
   * Generate HMAC-signed URL for media access
   */
  fastify.post('/media/sign', {
    schema: {
      body: {
        type: 'object',
        required: ['videoId', 'path'],
        properties: {
          videoId: { type: 'string' },
          path: { type: 'string' },
          expiresIn: { type: 'number' }
        }
      }
    }
  }, async (request, reply) => {
    const { videoId, path: mediaPath, expiresIn } = request.body
    const expiry = expiresIn || fastify.config.tokenExpirySeconds
    const expiresAt = Math.floor(Date.now() / 1000) + expiry

    // Create HMAC signature
    const message = `${videoId}:${mediaPath}:${expiresAt}`
    const signature = crypto
      .createHmac('sha256', fastify.config.hmacSecret)
      .update(message)
      .digest('hex')

    const token = `${expiresAt}.${signature}`

    return {
      url: `/media/videos/${videoId}/${mediaPath}?token=${token}`,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      expiresIn: expiry
    }
  })

  /**
   * Verify HMAC token
   */
  function verifyToken(videoId, mediaPath, token) {
    if (!token) {
      return { valid: false, reason: 'No token provided' }
    }

    const [expiresAtStr, signature] = token.split('.')
    if (!expiresAtStr || !signature) {
      return { valid: false, reason: 'Invalid token format' }
    }

    const expiresAt = parseInt(expiresAtStr, 10)
    const now = Math.floor(Date.now() / 1000)

    if (now > expiresAt) {
      return { valid: false, reason: 'Token expired' }
    }

    // Verify signature
    const message = `${videoId}:${mediaPath}:${expiresAt}`
    const expectedSignature = crypto
      .createHmac('sha256', fastify.config.hmacSecret)
      .update(message)
      .digest('hex')

    if (signature !== expectedSignature) {
      return { valid: false, reason: 'Invalid signature' }
    }

    return { valid: true }
  }

  /**
   * Serve media files with range request support
   */
  fastify.get('/media/videos/:videoId/*', async (request, reply) => {
    const { videoId } = request.params
    const mediaPath = request.params['*']
    const { token } = request.query

    // Verify token
    const tokenCheck = verifyToken(videoId, mediaPath, token)
    if (!tokenCheck.valid) {
      return reply.unauthorized(tokenCheck.reason)
    }

    // Construct file path
    const videoDir = path.join(fastify.config.videoDir, videoId)
    const filePath = path.join(videoDir, mediaPath)

    // Security: prevent path traversal
    if (!filePath.startsWith(videoDir)) {
      return reply.forbidden('Invalid path')
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return reply.notFound('Media file not found')
    }

    const stats = await fs.promises.stat(filePath)
    const fileSize = stats.size

    // Get user info for audit log
    const userId = request.headers['x-user-id'] || 'anonymous'
    const ip = request.ip
    const userAgent = request.headers['user-agent']

    // Log access
    await fastify.auditLogger.logAccess(videoId, userId, ip, userAgent)

    // Handle range requests (for video seeking)
    const range = request.headers.range

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = (end - start) + 1

      if (start >= fileSize || end >= fileSize) {
        reply.status(416).header('Content-Range', `bytes */${fileSize}`)
        return reply.send()
      }

      const stream = fs.createReadStream(filePath, { start, end })

      reply
        .status(206)
        .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        .header('Accept-Ranges', 'bytes')
        .header('Content-Length', chunkSize)
        .header('Content-Type', getContentType(filePath))
        .header('Cache-Control', 'private, max-age=3600')
        .send(stream)
    } else {
      // Send entire file
      const stream = fs.createReadStream(filePath)

      reply
        .header('Content-Length', fileSize)
        .header('Content-Type', getContentType(filePath))
        .header('Accept-Ranges', 'bytes')
        .header('Cache-Control', 'private, max-age=3600')
        .send(stream)
    }
  })

  /**
   * Get video metadata
   */
  fastify.get('/media/videos/:videoId/metadata', async (request, reply) => {
    const { videoId } = request.params
    const { token } = request.query

    // Verify token
    const tokenCheck = verifyToken(videoId, 'metadata', token)
    if (!tokenCheck.valid) {
      return reply.unauthorized(tokenCheck.reason)
    }

    // Try cache first
    let metadata = await fastify.queue.getCachedMetadata(videoId)

    if (!metadata) {
      // Read from disk
      const videoDir = path.join(fastify.config.videoDir, videoId)
      try {
        metadata = await MetadataWriter.readMetadata(videoDir)
        // Cache for future requests
        await fastify.queue.cacheMetadata(videoId, metadata)
      } catch (err) {
        return reply.notFound('Video metadata not found')
      }
    }

    // Remove sensitive fields
    const { checksum, ...publicMetadata } = metadata

    return publicMetadata
  })

  /**
   * List available renditions for a video
   */
  fastify.get('/media/videos/:videoId/renditions', async (request, reply) => {
    const { videoId } = request.params
    const { token } = request.query

    // Verify token
    const tokenCheck = verifyToken(videoId, 'renditions', token)
    if (!tokenCheck.valid) {
      return reply.unauthorized(tokenCheck.reason)
    }

    const videoDir = path.join(fastify.config.videoDir, videoId)
    const hlsDir = path.join(videoDir, 'hls')

    if (!fs.existsSync(hlsDir)) {
      return { renditions: [], status: 'pending' }
    }

    // List available renditions
    const files = await fs.promises.readdir(hlsDir)
    const renditions = files
      .filter(f => f.endsWith('.m3u8') && f !== 'master.m3u8')
      .map(f => f.replace('.m3u8', ''))

    return {
      renditions,
      status: renditions.length > 0 ? 'ready' : 'processing',
      masterPlaylist: renditions.length > 0 ? 'hls/master.m3u8' : null
    }
  })
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const contentTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t',
    '.mpd': 'application/dash+xml',
    '.m4s': 'video/iso.segment',
    '.json': 'application/json'
  }
  return contentTypes[ext] || 'application/octet-stream'
}
