'use strict'

const path = require('node:path')
const fs = require('node:fs')
const { spawn } = require('node:child_process')
const Redis = require('ioredis')
const MetadataWriter = require('../lib/metadata-writer')
const AuditLogger = require('../lib/audit-logger')

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

/**
 * Transcoding worker using FFmpeg and Shaka Packager
 */
class TranscodeWorker {
  constructor(config) {
    this.config = config
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db
    })
    this.auditLogger = new AuditLogger(config.auditDir)
    this.running = true
  }

  /**
   * Start the worker
   */
  async start() {
    console.log('🎬 Transcode worker starting...')

    while (this.running) {
      try {
        // Dequeue job with blocking wait
        const result = await this.redis.brpop('queue:transcode', 5)
        
        if (!result) {
          continue
        }

        const [, jobData] = result
        const job = JSON.parse(jobData)

        console.log(`Processing job: ${job.id}`)
        await this.processJob(job)
      } catch (err) {
        console.error('Worker error:', err)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  /**
   * Process a transcode job
   */
  async processJob(job) {
    const { videoId, metadata } = job
    const startTime = Date.now()

    try {
      const videoDir = path.join(this.config.videoDir, videoId)
      const originalPath = path.join(videoDir, 'original.mp4')
      const hlsDir = path.join(videoDir, 'hls')

      // Create HLS directory
      fs.mkdirSync(hlsDir, { recursive: true })

      // Get video info first
      const videoInfo = await this.getVideoInfo(originalPath)
      console.log(`Video info: ${videoInfo.duration}s, ${videoInfo.width}x${videoInfo.height}`)

      // Transcode to multiple renditions
      const renditions = await this.transcodeRenditions(originalPath, hlsDir, videoInfo)

      // Create master playlist
      await this.createMasterPlaylist(hlsDir, renditions)

      // Update metadata
      const duration = (Date.now() - startTime) / 1000
      await MetadataWriter.updateMetadata(videoDir, {
        status: 'transcoded',
        transcodedAt: new Date().toISOString(),
        transcodeDuration: duration,
        duration: videoInfo.duration,
        width: videoInfo.width,
        height: videoInfo.height,
        renditions: renditions.map(r => r.name)
      })

      // Log success
      await this.auditLogger.logTranscode(videoId, 'success', duration, renditions.length)
      await this.redis.incr('metrics:transcode:success')

      console.log(`✅ Job ${job.id} completed in ${duration.toFixed(2)}s`)
    } catch (err) {
      console.error(`❌ Job ${job.id} failed:`, err)
      
      // Update metadata with error
      try {
        const videoDir = path.join(this.config.videoDir, videoId)
        await MetadataWriter.updateMetadata(videoDir, {
          status: 'transcode_failed',
          transcodeError: err.message
        })
      } catch (metaErr) {
        console.error('Failed to update metadata:', metaErr)
      }

      await this.auditLogger.logTranscode(videoId, 'failed', 0, 0)
      await this.redis.incr('metrics:transcode:failed')
    }
  }

  /**
   * Get video information using ffprobe
   */
  async getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ])

      let output = ''
      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`ffprobe exited with code ${code}`))
        }

        try {
          const info = JSON.parse(output)
          const videoStream = info.streams.find(s => s.codec_type === 'video')
          
          resolve({
            duration: parseFloat(info.format.duration),
            width: videoStream.width,
            height: videoStream.height,
            codec: videoStream.codec_name,
            bitrate: parseInt(info.format.bit_rate)
          })
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  /**
   * Transcode to multiple renditions
   */
  async transcodeRenditions(inputPath, outputDir, videoInfo) {
    const renditions = this.getRenditionConfigs(videoInfo)
    const results = []

    for (const rendition of renditions) {
      console.log(`Transcoding ${rendition.name}...`)
      await this.transcodeRendition(inputPath, outputDir, rendition)
      results.push(rendition)
    }

    return results
  }

  /**
   * Get rendition configurations based on source video
   */
  getRenditionConfigs(videoInfo) {
    const sourceHeight = videoInfo.height
    const renditions = []

    const configs = {
      '240p': { height: 240, bitrate: '400k', audioBitrate: '64k' },
      '360p': { height: 360, bitrate: '800k', audioBitrate: '96k' },
      '480p': { height: 480, bitrate: '1400k', audioBitrate: '128k' },
      '720p': { height: 720, bitrate: '2800k', audioBitrate: '128k' },
      '1080p': { height: 1080, bitrate: '5000k', audioBitrate: '192k' }
    }

    // Only create renditions that make sense for the source
    for (const [name, config] of Object.entries(configs)) {
      if (config.height <= sourceHeight) {
        renditions.push({ name, ...config })
      }
    }

    // Ensure at least one rendition
    if (renditions.length === 0) {
      renditions.push({ name: '240p', ...configs['240p'] })
    }

    return renditions
  }

  /**
   * Transcode a single rendition to HLS
   */
  async transcodeRendition(inputPath, outputDir, rendition) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(outputDir, `${rendition.name}.m3u8`)
      
      const ffmpegArgs = [
        '-i', inputPath,
        '-vf', `scale=-2:${rendition.height}`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-b:v', rendition.bitrate,
        '-maxrate', rendition.bitrate,
        '-bufsize', `${parseInt(rendition.bitrate) * 2}`,
        '-c:a', 'aac',
        '-b:a', rendition.audioBitrate,
        '-ac', '2',
        '-hls_time', '6',
        '-hls_list_size', '0',
        '-hls_segment_filename', path.join(outputDir, `${rendition.name}_%03d.ts`),
        '-f', 'hls',
        outputPath
      ]

      const ffmpeg = spawn('ffmpeg', ffmpegArgs)

      let stderr = ''
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          console.error(`FFmpeg stderr: ${stderr}`)
          return reject(new Error(`FFmpeg exited with code ${code}`))
        }
        resolve()
      })
    })
  }

  /**
   * Create HLS master playlist
   */
  async createMasterPlaylist(hlsDir, renditions) {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n'

    for (const rendition of renditions) {
      const bandwidth = parseInt(rendition.bitrate) * 1000
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=x${rendition.height}\n`
      playlist += `${rendition.name}.m3u8\n\n`
    }

    const masterPath = path.join(hlsDir, 'master.m3u8')
    await fs.promises.writeFile(masterPath, playlist)
  }

  /**
   * Stop the worker
   */
  async stop() {
    this.running = false
    await this.redis.quit()
    console.log('Worker stopped')
  }
}

// Run worker if executed directly
if (require.main === module) {
  const config = {
    videoDir: process.env.VIDEO_DIR || '/mnt/media/videos',
    auditDir: process.env.AUDIT_DIR || '/mnt/media/audit',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    }
  }

  const worker = new TranscodeWorker(config)

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down...')
    await worker.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...')
    await worker.stop()
    process.exit(0)
  })

  worker.start().catch((err) => {
    console.error('Worker fatal error:', err)
    process.exit(1)
  })
}

module.exports = TranscodeWorker
