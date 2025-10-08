'use strict'

const path = require('node:path')
const fs = require('node:fs')
const { Server } = require('@tus/server')
const { FileStore } = require('@tus/file-store')
const { v4: uuidv4 } = require('uuid')
const MetadataWriter = require('../lib/metadata-writer')

module.exports = async function (fastify, opts) {
  // Initialize tus server for resumable uploads
  const tusServer = new Server({
    path: '/uploads',
    datastore: new FileStore({ directory: fastify.config.uploadDir }),
    namingFunction: (req) => {
      // Use UUID for upload file names
      return uuidv4()
    },
    onUploadFinish: async (req, res, upload) => {
      fastify.log.info({ uploadId: upload.id, size: upload.size }, 'Upload completed')
    }
  })

  // Handle all tus protocol methods
  fastify.all('/uploads', async (request, reply) => {
    return tusServer.handle(request.raw, reply.raw)
  })

  fastify.all('/uploads/*', async (request, reply) => {
    return tusServer.handle(request.raw, reply.raw)
  })

  /**
   * Finalize upload: move to permanent storage and enqueue transcoding
   */
  fastify.post('/uploads/finalize', {
    schema: {
      body: {
        type: 'object',
        required: ['uploadId', 'filename'],
        properties: {
          uploadId: { type: 'string' },
          filename: { type: 'string' },
          userId: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const { uploadId, filename, userId, metadata = {} } = request.body

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
      userId: userId || 'anonymous',
      originalSize: fileSize,
      originalChecksum: checksum,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      ...metadata
    }

    // Write metadata atomically
    await MetadataWriter.writeMetadata(videoDir, videoMetadata)

    // Cache metadata in Redis
    await fastify.queue.cacheMetadata(videoId, videoMetadata)

    // Log upload event
    const auditLogger = fastify.auditLogger
    await auditLogger.logUpload(videoId, userId, fileSize, checksum)

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

  /**
   * Get upload status
   */
  fastify.get('/uploads/status/:uploadId', async (request, reply) => {
    const { uploadId } = request.params
    const uploadPath = path.join(fastify.config.uploadDir, uploadId)

    if (!fs.existsSync(uploadPath)) {
      return reply.notFound('Upload not found')
    }

    const stats = await fs.promises.stat(uploadPath)

    return {
      uploadId,
      size: stats.size,
      exists: true
    }
  })
}
