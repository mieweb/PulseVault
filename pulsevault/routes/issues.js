'use strict'

const axios = require('axios')
const path = require('node:path')
const fs = require('node:fs').promises
const { createWriteStream } = require('node:fs')
const { pipeline } = require('node:stream/promises')
const { v4: uuidv4 } = require('uuid')
const os = require('node:os')

module.exports = async function (fastify, opts) {
  // Register multipart support for file uploads with optimized settings
  fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 100 * 1024 * 1024 // 100MB max zip file size
    },
    attachFieldsToBody: false, // Stream files directly, don't buffer in memory
  })

  fastify.post('/create_issue', async (request, reply) => {
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    const token = process.env.GITHUB_TOKEN

    let description, bug
    let issueUuid = null
    let zipFilePath = null
    let zipFileName = null
    
    try {
      // Generate UUID for this issue first
      issueUuid = uuidv4()
      const homeDir = os.homedir()
      const bugReportDir = path.join(homeDir, 'bug_report', issueUuid)
      
      // Parse all multipart form data (fields + files)
      const fields = {}
      
      for await (const part of request.parts()) {
        if (part.type === 'field') {
          fields[part.fieldname] = part.value
        } else if (part.type === 'file' && part.fieldname === 'zipFile') {
          // Create directory immediately
          await fs.mkdir(bugReportDir, { recursive: true })
          
          // Save file immediately while processing parts
          zipFileName = part.filename || 'attachment.zip'
          zipFilePath = path.join(bugReportDir, zipFileName)
          
          // Use pipeline for efficient streaming with proper backpressure handling
          const writeStream = createWriteStream(zipFilePath, {
            highWaterMark: 1024 * 1024 // 1MB buffer for faster writes
          })
          
          await pipeline(part.file, writeStream)
        }
      }
      
      description = fields.description
      bug = fields.bug
      
      // Validate required fields
      if (!description || !bug) {
        // Cleanup if validation fails
        if (issueUuid) {
          await fs.rm(bugReportDir, { recursive: true, force: true }).catch(() => {})
        }
        return reply.code(400).send({
          success: false,
          message: 'description and bug fields are required'
        })
      }
      
      // Ensure directory exists (if no file was uploaded)
      await fs.mkdir(bugReportDir, { recursive: true })

      fastify.log.info({ issueUuid, bugReportDir }, 'Created bug report directory')

      // Get server URL for download link
      const serverUrl = process.env.SERVER_URL || `${request.protocol}://${request.hostname}:${request.port || 3000}`
      const downloadUrl = zipFilePath ? `${serverUrl}/bug_report/${issueUuid}/download` : null

      // Create GitHub issue with additional info
      let issueBody = description
      if (downloadUrl) {
        issueBody += `\n\n---\n### 📎 Attachments\n**Download Zip File:** [${zipFileName}](${downloadUrl})`
      }
      
      const response = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          title: bug,
          body: issueBody,
          labels: ['bug']
        },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json'
          },
          timeout: 30000 // 30 second timeout
        }
      )

      return {
        success: true,
        message: 'Issue created successfully',
        githubIssueUrl: response.data.html_url,
        issueNumber: response.data.number,
        issueUuid,
        zipFileStored: !!zipFilePath,
        storageLocation: bugReportDir,
        downloadUrl
      }

    } catch (error) {
      fastify.log.error(error.response?.data || error.message)

      // Cleanup on error
      if (issueUuid) {
        try {
          const homeDir = os.homedir()
          const bugReportDir = path.join(homeDir, 'bug_report', issueUuid)
          await fs.rm(bugReportDir, { recursive: true, force: true })
          fastify.log.info({ issueUuid }, 'Cleaned up bug report directory after error')
        } catch (cleanupError) {
          fastify.log.error(cleanupError, 'Failed to cleanup bug report directory')
        }
      }

      return reply.code(500).send({
        success: false,
        message: 'Failed to create GitHub issue',
      })
    }
  })

  /**
   * Download bug report zip file
   * GET /bug_report/:uuid/download
   */
  fastify.get('/bug_report/:uuid/download', async (request, reply) => {
    const { uuid } = request.params

    try {
      const homeDir = os.homedir()
      const bugReportDir = path.join(homeDir, 'bug_report', uuid)

      // Check if directory exists
      try {
        await fs.access(bugReportDir)
      } catch (error) {
        return reply.code(404).send({
          success: false,
          message: 'Bug report not found'
        })
      }

      // Find the zip file in the directory
      const files = await fs.readdir(bugReportDir)
      const zipFile = files.find(file => file.endsWith('.zip'))

      if (!zipFile) {
        return reply.code(404).send({
          success: false,
          message: 'No zip file found for this bug report'
        })
      }

      const zipFilePath = path.join(bugReportDir, zipFile)

      // Stream the file for download
      const stream = require('node:fs').createReadStream(zipFilePath)
      
      reply.header('Content-Disposition', `attachment; filename="${zipFile}"`)
      reply.type('application/zip')
      
      return reply.send(stream)

    } catch (error) {
      fastify.log.error(error, 'Error downloading bug report')
      return reply.code(500).send({
        success: false,
        message: 'Failed to download bug report',
        error: error.message
      })
    }
  })
}
