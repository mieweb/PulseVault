'use strict'

const fp = require('fastify-plugin')
const path = require('node:path')
const fs = require('node:fs')

/**
 * Configuration plugin for PulseVault
 * Loads and validates environment variables
 */
module.exports = fp(async function (fastify, opts) {
  // Load .env file if it exists (for development)
  if (process.env.NODE_ENV !== 'production') {
    const envPath = path.join(__dirname, '..', '.env')
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath })
    }
  }

  const config = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',

    // Storage paths
    mediaRoot: process.env.MEDIA_ROOT || '/mnt/media',
    uploadDir: process.env.UPLOAD_DIR || '/mnt/media/uploads',
    videoDir: process.env.VIDEO_DIR || '/mnt/media/videos',
    auditDir: process.env.AUDIT_DIR || '/mnt/media/audit',

    // Security
    hmacSecret: process.env.HMAC_SECRET || 'change-me-in-production',
    tokenExpirySeconds: parseInt(process.env.TOKEN_EXPIRY_SECONDS || '300', 10),

    // Redis
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    },

    // Optional Database
    metadataDsn: process.env.METADATA_DSN || null,

    // Transcoding
    transcoding: {
      enabled: process.env.TRANSCODE_ENABLED !== 'false',
      ffmpegThreads: parseInt(process.env.FFMPEG_THREADS || '0', 10),
      renditions: (process.env.RENDITIONS || '240p,360p,480p,720p,1080p').split(','),
      enableHevc: process.env.ENABLE_HEVC === 'true',
      enableAv1: process.env.ENABLE_AV1 === 'true'
    },

    // Observability
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      port: parseInt(process.env.METRICS_PORT || '9090', 10)
    },
    logLevel: process.env.LOG_LEVEL || 'info',

    // MinIO (optional)
    minio: {
      enabled: process.env.MINIO_ENABLED === 'true',
      endpoint: process.env.MINIO_ENDPOINT || '',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
      bucket: process.env.MINIO_BUCKET || 'pulsevault-audit'
    }
  }

  // Warn if using default HMAC secret in production
  if (config.nodeEnv === 'production' && config.hmacSecret === 'change-me-in-production') {
    fastify.log.warn('⚠️  Using default HMAC_SECRET in production! Please set a secure secret.')
  }

  // Ensure storage directories exist
  const dirs = [config.mediaRoot, config.uploadDir, config.videoDir, config.auditDir]
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o750 })
        fastify.log.info(`Created directory: ${dir}`)
      }
    } catch (err) {
      // In test environments, we may not have permission to create /mnt/media
      // Use a temp directory instead
      if (err.code === 'EACCES' && config.nodeEnv !== 'production') {
        const tempBase = path.join('/tmp', 'pulsevault-test')
        config.mediaRoot = tempBase
        config.uploadDir = path.join(tempBase, 'uploads')
        config.videoDir = path.join(tempBase, 'videos')
        config.auditDir = path.join(tempBase, 'audit')
        
        // Create temp directories
        for (const tempDir of [config.mediaRoot, config.uploadDir, config.videoDir, config.auditDir]) {
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true, mode: 0o750 })
          }
        }
        fastify.log.info(`Using temporary directory: ${tempBase}`)
        break
      } else {
        throw err
      }
    }
  }

  // Decorate fastify instance with config
  fastify.decorate('config', config)

  fastify.log.info(`PulseVault configuration loaded (env: ${config.nodeEnv})`)
})
