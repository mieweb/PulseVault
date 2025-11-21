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
   * Generate token for a media path
   */
  function generateTokenForPath(videoId, mediaPath, expiresIn = 300) {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
    const message = `${videoId}:${mediaPath}:${expiresAt}`
    const signature = crypto
      .createHmac('sha256', fastify.config.hmacSecret)
      .update(message)
      .digest('hex')
    return `${expiresAt}.${signature}`
  }

  /**
   * Rewrite master.m3u8 to include tokens in all URLs
   */
  async function rewriteMasterPlaylist(videoId, masterContent, baseUrl) {
    const lines = masterContent.split('\n')
    const rewritten = []
    const expiresIn = fastify.config.tokenExpirySeconds || 300

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // If this is a rendition playlist line (not a tag)
      if (line && !line.startsWith('#') && line.trim()) {
        const renditionPath = line.trim()
        const fullPath = `hls/${renditionPath}`
        const token = generateTokenForPath(videoId, fullPath, expiresIn)
        rewritten.push(`${baseUrl}/media/videos/${videoId}/${fullPath}?token=${token}`)
      } else {
        rewritten.push(line)
      }
    }

    return rewritten.join('\n')
  }

  /**
   * Rewrite rendition playlist (.m3u8) to include tokens in segment URLs
   */
  async function rewriteRenditionPlaylist(videoId, renditionPath, playlistContent, baseUrl) {
    const lines = playlistContent.split('\n')
    const rewritten = []
    const expiresIn = fastify.config.tokenExpirySeconds || 300
    
    // Extract rendition name from path (e.g., "hls/240p.m3u8" -> "240p")
    const renditionName = path.basename(renditionPath, '.m3u8')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // If this is a segment file line (.ts)
      if (line && !line.startsWith('#') && line.trim() && line.includes('.ts')) {
        const segmentName = line.trim()
        // Segment files are in the same directory as the playlist (hls/)
        const segmentPath = `hls/${segmentName}`
        const token = generateTokenForPath(videoId, segmentPath, expiresIn)
        rewritten.push(`${baseUrl}/media/videos/${videoId}/${segmentPath}?token=${token}`)
      } else {
        rewritten.push(line)
      }
    }

    return rewritten.join('\n')
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
      fastify.log.warn({ videoId, mediaPath, reason: tokenCheck.reason }, 'Token verification failed')
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

    // Log access (non-blocking - don't await to avoid closing stream prematurely)
    fastify.auditLogger.logAccess(videoId, userId, ip, userAgent).catch(err => {
      fastify.log.error({ err }, 'Failed to log access')
    })

    // Get base URL for rewriting playlists
    const protocol = request.headers['x-forwarded-proto'] || (request.protocol || 'http')
    const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    // Handle master.m3u8 - rewrite URLs to include tokens
    if (mediaPath === 'hls/master.m3u8') {
      const masterContent = await fs.promises.readFile(filePath, 'utf8')
      const rewritten = await rewriteMasterPlaylist(videoId, masterContent, baseUrl)
      
      reply
        .header('Content-Type', 'application/vnd.apple.mpegurl')
        .header('Cache-Control', 'private, max-age=60') // Short cache for dynamic content
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Range')
        .send(rewritten)
      return
    }

    // Handle rendition playlists (.m3u8 files in hls directory)
    if (mediaPath.startsWith('hls/') && mediaPath.endsWith('.m3u8') && mediaPath !== 'hls/master.m3u8') {
      const playlistContent = await fs.promises.readFile(filePath, 'utf8')
      const rewritten = await rewriteRenditionPlaylist(videoId, mediaPath, playlistContent, baseUrl)
      
      reply
        .header('Content-Type', 'application/vnd.apple.mpegurl')
        .header('Cache-Control', 'private, max-age=60') // Short cache for dynamic content
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Range')
        .send(rewritten)
      return
    }

    // Handle range requests (for video seeking) - for .ts segments and other files
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

      // Use streams for range requests (original approach)
      try {
        const stream = fs.createReadStream(filePath, { start, end })
        return reply
          .status(206)
          .header('Content-Range', `bytes ${start}-${end}/${fileSize}`)
          .header('Content-Length', chunkSize)
          .header('Accept-Ranges', 'bytes')
          .header('Content-Type', getContentType(filePath))
          .header('Cache-Control', 'private, max-age=3600')
          .header('Access-Control-Allow-Origin', '*')
          .header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
          .header('Access-Control-Allow-Headers', 'Range')
          .send(stream)
      } catch (err) {
        fastify.log.error({ err, filePath }, 'Error reading file chunk')
        return reply.internalServerError('Failed to read media file')
      }
    } else {
      // Send entire file using streams (original approach)
      try {
        const stream = fs.createReadStream(filePath)
        return reply
          .header('Content-Type', getContentType(filePath))
          .header('Content-Length', fileSize)
          .header('Accept-Ranges', 'bytes')
          .header('Cache-Control', 'private, max-age=3600')
          .header('Access-Control-Allow-Origin', '*')
          .header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
          .header('Access-Control-Allow-Headers', 'Range')
          .send(stream)
      } catch (err) {
        fastify.log.error({ err, filePath }, 'Error reading file')
        return reply.internalServerError('Failed to read media file')
      }
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
