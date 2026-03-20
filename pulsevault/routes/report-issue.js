'use strict'

const path = require('node:path')
const fs = require('node:fs')
const { v4: uuidv4 } = require('uuid')

const ZIP_MAGIC_HEADERS = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]), // local file header
  Buffer.from([0x50, 0x4b, 0x05, 0x06]), // empty archive
  Buffer.from([0x50, 0x4b, 0x07, 0x08])  // spanned archive
]

module.exports = async function (fastify, opts) {
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      files: 1,
      fileSize: fastify.config.reportIssue.maxZipBytes,
      parts: 8,
      fields: 4
    }
  })

  fastify.post('/api/report_issue', {
    schema: {
      consumes: ['multipart/form-data'],
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            issueNumber: { type: 'number' },
            issueUrl: { type: 'string' },
            uploadId: { type: ['string', 'null'] },
            downloadUrl: { type: ['string', 'null'] }
          }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.badRequest('Content-Type must be multipart/form-data')
    }
    console.log(" MULTIPART :::::",request.isMultipart())

    if (!fastify.config.reportIssue.githubToken || !fastify.config.reportIssue.githubRepoOwner || !fastify.config.reportIssue.githubRepoName) {
      fastify.log.error('Report issue endpoint is not configured: missing GitHub environment variables')
      return reply.code(503).send({ error: 'Service unavailable' })
    }
    
    const fields = {}
    let uploadedZip = null

    try {
      for await (const part of request.parts()) {
        console.log("part.type :::: ", part.type)
        if (part.type === 'file') {
          console.log("part.fieldname :::: ", part.fieldname)
          if (part.fieldname !== 'zip') {
            await consumeStream(part.file)
            return reply.badRequest('Only the optional "zip" file field is supported')
          }

          if (uploadedZip) {
            await consumeStream(part.file)
            return reply.badRequest('Only one zip file is allowed')
          }
          
          uploadedZip = await storeZipFile(part, fastify)
          console.log(" uploadedZip ::::", uploadedZip)
        } else {
          fields[part.fieldname] = part.value
        }
      }
    } catch (err) {
      if (uploadedZip) {
        await cleanupUpload(fastify.config.reportIssue.uploadDir, uploadedZip.uploadId)
      }

      if (err && err.statusCode) {
        return reply.code(err.statusCode).send({ error: err.message })
      }

      fastify.log.error({ err }, 'Failed to parse report issue request')
      return reply.internalServerError('Failed to process report issue request')
    }

    const summary = typeof fields.summary === 'string' ? fields.summary.trim() : ''
    const description = typeof fields.description === 'string' ? fields.description.trim() : ''

    if (!summary || summary.length > 200) {
      if (uploadedZip) {
        await cleanupUpload(fastify.config.reportIssue.uploadDir, uploadedZip.uploadId)
      }
      return reply.badRequest('summary is required and must be 1-200 characters')
    }

    if (!description || description.length > 10000) {
      if (uploadedZip) {
        await cleanupUpload(fastify.config.reportIssue.uploadDir, uploadedZip.uploadId)
      }
      return reply.badRequest('description is required and must be 1-10000 characters')
    }

    const downloadUrl = uploadedZip ? `${getServerBaseUrl(request, fastify.config)}/api/report_issue/download/${uploadedZip.uploadId}` : null
    console.log(" downloadUrl ::::", downloadUrl)
    const downloadLinkMarkdown = downloadUrl ? `[Download diagnostic zip](${downloadUrl})` : null
    const issueBody = uploadedZip
      ? `${description}\n\n---\nAttached diagnostic zip:\n${downloadLinkMarkdown}`
      : description
    console.log(" issueBody ::::", issueBody)
    const payload = {
      title: summary,
      body: issueBody
    }

    const issueEndpoint = `https://api.github.com/repos/${encodeURIComponent(fastify.config.reportIssue.githubRepoOwner)}/${encodeURIComponent(fastify.config.reportIssue.githubRepoName)}/issues`

    let ghResponse
    let ghBody
    try {
      ghResponse = await fetchWithTimeout(issueEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${fastify.config.reportIssue.githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }, fastify.config.reportIssue.githubTimeoutMs)

      ghBody = await ghResponse.json().catch(() => ({}))
    } catch (err) {
      if (uploadedZip) {
        await cleanupUpload(fastify.config.reportIssue.uploadDir, uploadedZip.uploadId)
      }
      fastify.log.error({ err }, 'GitHub issue creation request failed')
      return reply.code(502).send({ error: 'Failed to create GitHub issue' })
    }

    if (!ghResponse.ok) {
      if (uploadedZip) {
        await cleanupUpload(fastify.config.reportIssue.uploadDir, uploadedZip.uploadId)
      }
      fastify.log.warn({ status: ghResponse.status, githubError: ghBody?.message }, 'GitHub issue creation rejected')
      return reply.code(502).send({ error: 'GitHub issue creation failed' })
    }

    return reply.code(201).send({
      success: true,
      issueNumber: ghBody.number,
      issueUrl: ghBody.html_url,
      uploadId: uploadedZip ? uploadedZip.uploadId : null,
      downloadUrl
    })
  })

  fastify.get('/api/report_issue/download/:uuid', {
    schema: {
      params: {
        type: 'object',
        required: ['uuid'],
        properties: {
          uuid: {
            type: 'string',
            pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
          }
        }
      }
    }
  }, async (request, reply) => {
    const { uuid } = request.params
    const baseDir = path.resolve(fastify.config.reportIssue.uploadDir)
    const reportPath = path.resolve(baseDir, uuid, 'report.zip')

    if (!reportPath.startsWith(`${baseDir}${path.sep}`)) {
      return reply.forbidden('Invalid path')
    }

    if (!fs.existsSync(reportPath)) {
      return reply.notFound('Report zip not found')
    }

    const zipBuffer = await fs.promises.readFile(reportPath)

    reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', 'attachment; filename="report.zip"')
      .send(zipBuffer)
  })
}

async function storeZipFile(part, fastify) {
  const uploadId = uuidv4()
  const targetDir = path.join(fastify.config.reportIssue.uploadDir, uploadId)
  const targetFile = path.join(targetDir, 'report.zip')

  const filename = (part.filename || '').toLowerCase()
  const mimetype = (part.mimetype || '').toLowerCase()
  const allowedMime = ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip']

  if (!filename.endsWith('.zip')) {
    await consumeStream(part.file)
    throw createHttpError(400, 'Only .zip files are allowed')
  }

  if (mimetype && !allowedMime.includes(mimetype)) {
    await consumeStream(part.file)
    throw createHttpError(400, 'Invalid zip content type')
  }

  await fs.promises.mkdir(targetDir, { recursive: true, mode: 0o750 })

  try {
    const chunks = []
    let totalSize = 0
    let header = Buffer.alloc(0)

    for await (const chunk of part.file) {
      totalSize += chunk.length
      if (totalSize > fastify.config.reportIssue.maxZipBytes) {
        throw createHttpError(413, 'Zip file exceeds maximum allowed size')
      }

      if (header.length < 4) {
        header = Buffer.concat([header, chunk]).slice(0, 4)
      }

      chunks.push(chunk)
    }

    if (totalSize === 0) {
      throw createHttpError(400, 'Zip file is empty')
    }

    if (!isValidZipHeader(header)) {
      throw createHttpError(400, 'Uploaded file is not a valid zip archive')
    }

    const fileBuffer = Buffer.concat(chunks)
    await fs.promises.writeFile(targetFile, fileBuffer, { mode: 0o640 })

    return {
      uploadId,
      filePath: targetFile
    }
  } catch (err) {
    await cleanupUpload(fastify.config.reportIssue.uploadDir, uploadId)
    throw err
  }
}

function isValidZipHeader(header) {
  return ZIP_MAGIC_HEADERS.some((magic) => header.equals(magic))
}

function getServerBaseUrl(request, config) {
  const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'http'
  const host = request.headers['x-forwarded-host'] || request.headers.host || `${config.host}:${config.port}`
  return `${protocol}://${host}`
}

function createHttpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function consumeStream(stream) {
  for await (const _chunk of stream) {
  }
}

async function cleanupUpload(uploadBaseDir, uploadId) {
  const dir = path.join(uploadBaseDir, uploadId)
  try {
    await fs.promises.rm(dir, { recursive: true, force: true })
  } catch (_) {
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }
}
