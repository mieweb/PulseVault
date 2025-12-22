'use strict'

const path = require('node:path')
const fs = require('node:fs')
const { Server } = require('@tus/server')
const { FileStore } = require('@tus/file-store')
const { v4: uuidv4 } = require('uuid')
const MetadataWriter = require('../lib/metadata-writer')

module.exports = async function (fastify, opts) {
  fastify.addContentTypeParser('application/offset+octet-stream', (request, payload, done) => {
    done(null)
  })

  // Initialize tus server for resumable uploads
  const tusServer = new Server({
    path: '/uploads',
    datastore: new FileStore({ directory: fastify.config.uploadDir }),
    namingFunction: (req) => {
      // Use UUID for upload file names
      return uuidv4()
    },
    onUploadFinish: async (req, res, upload) => {
      if (upload && upload.id) {
        fastify.log.info({ uploadId: upload.id, size: upload.size }, 'Upload completed')
      } else {
        fastify.log.warn('Upload finished but upload object is missing or invalid')
      }
    }
  })

  // Handle all tus protocol methods
  fastify.all('/uploads', async (request, reply) => {
    reply.hijack()
    await tusServer.handle(request.raw, reply.raw)
  })

  fastify.all('/uploads/*', async (request, reply) => {
    reply.hijack()
    await tusServer.handle(request.raw, reply.raw)
  })

  /**
   * Finalize upload: move to permanent storage and enqueue transcoding
   */
  /**
   * Verify upload token (reuse from qr.js logic)
   */
  function verifyUploadToken(token) {
    if (!token) {
      return { valid: false, reason: 'No token provided' }
    }
    
    try {
      const crypto = require('node:crypto')
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
      const { signature, ...payload } = decoded

      // Check expiry
      if (payload.expiresAt && payload.expiresAt < Math.floor(Date.now() / 1000)) {
        return { valid: false, reason: 'Token expired' }
      }

      // Verify signature
      const message = JSON.stringify(payload)
      const expectedSignature = crypto
        .createHmac('sha256', fastify.config.hmacSecret)
        .update(message)
        .digest('hex')

      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid signature' }
      }

      return { valid: true, payload }
    } catch (err) {
      return { valid: false, reason: 'Invalid token format' }
    }
  }

  fastify.post('/uploads/finalize', {
    schema: {
      body: {
        type: 'object',
        required: ['uploadId', 'filename'],
        properties: {
          uploadId: { type: 'string' },
          filename: { type: 'string' },
          userId: { type: 'string' },
          uploadToken: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const { uploadId, filename, userId, uploadToken, metadata = {} } = request.body
    
    // Get token from body or header (header takes precedence)
    const token = uploadToken || request.headers['x-upload-token']
    
    // Require upload token (unless disabled in config for development)
    if (fastify.config.requireUploadToken && !token) {
      fastify.log.warn({ uploadId }, 'Upload rejected: token required')
      return reply.code(401).send({
        error: 'Upload token required',
        reason: 'Only authenticated uploads are allowed. Please scan a QR code to get an upload token.'
      })
    }
    
    // Validate upload token
    let tokenPayload = null
    if (token) {
      const tokenVerification = verifyUploadToken(token)
      if (!tokenVerification.valid) {
        fastify.log.warn({ uploadId, reason: tokenVerification.reason }, 'Invalid upload token')
        return reply.code(401).send({
          error: 'Invalid upload token',
          reason: tokenVerification.reason
        })
      }
      tokenPayload = tokenVerification.payload
      fastify.log.info({ uploadId, tokenId: tokenPayload.tokenId, userId: tokenPayload.userId }, 'Upload token validated')
    } else if (!fastify.config.requireUploadToken) {
      fastify.log.warn({ uploadId }, 'Upload finalized without token (token requirement disabled)')
    }
    
    // Use userId from token if available, otherwise use provided userId or default
    const finalUserId = tokenPayload?.userId || userId || 'anonymous'
    const organizationId = tokenPayload?.organizationId || null

    // Generate UUID for video
    const videoId = uuidv4()
    const videoDir = path.join(fastify.config.videoDir, videoId)
    const uploadPath = path.join(fastify.config.uploadDir, uploadId)

    // Verify upload exists
    if (!fs.existsSync(uploadPath)) {
      return reply.notFound('Upload not found')
    }

    // Create video directory
    fs.mkdirSync(videoDir, { recursive: true, mode: 0o750 })

    // Move uploaded file to permanent storage
    const originalPath = path.join(videoDir, 'original.mp4')
    await fs.promises.rename(uploadPath, originalPath)

    // Get file stats
    const stats = await fs.promises.stat(originalPath)
    const fileSize = stats.size

    // Compute checksum
    const checksum = await MetadataWriter.computeFileChecksum(originalPath)

    // Create metadata
    const videoMetadata = {
      videoId,
      filename,
      userId: finalUserId,
      organizationId,
      originalSize: fileSize,
      originalChecksum: checksum,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      // Security metadata
      authenticated: !!tokenPayload,
      tokenId: tokenPayload?.tokenId || null,
      ...metadata
    }

    // Write metadata atomically
    await MetadataWriter.writeMetadata(videoDir, videoMetadata)

    // Cache metadata in Redis
    await fastify.queue.cacheMetadata(videoId, videoMetadata)

    // Log upload event
    const auditLogger = fastify.auditLogger
    await auditLogger.logUpload(videoId, finalUserId, fileSize, checksum, {
      authenticated: !!tokenPayload,
      organizationId
    })

    // Enqueue transcoding job if enabled
    if (fastify.config.transcoding.enabled) {
      await fastify.queue.enqueueTranscode(videoId, videoMetadata)
    }

    // Increment metrics
    await fastify.redis.incr('metrics:uploads:completed')

    fastify.log.info({ videoId, uploadId, size: fileSize }, 'Upload finalized successfully')

    return {
      videoId,
      status: 'uploaded',
      size: fileSize,
      checksum,
      transcoding: fastify.config.transcoding.enabled ? 'queued' : 'disabled'
    }
  })

}
