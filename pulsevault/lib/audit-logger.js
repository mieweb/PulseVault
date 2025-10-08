'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

/**
 * Audit logger with hash-chained entries
 * Creates append-only, tamper-evident log files
 */
class AuditLogger {
  constructor(auditDir) {
    this.auditDir = auditDir
    this.previousHash = {}
  }

  /**
   * Log an audit event
   * @param {string} category - Log category (access, upload, etc.)
   * @param {object} event - Event data
   */
  async log(category, event) {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0]
    const logFile = path.join(this.auditDir, `${category}-${dateStr}.log`)

    // Get previous hash for this log file
    const prevHash = this.previousHash[logFile] || await this.getLastHash(logFile)

    // Create log entry
    const entry = {
      timestamp: date.toISOString(),
      category,
      prevHash,
      event
    }

    // Compute entry hash
    const entryJson = JSON.stringify(entry)
    const currentHash = crypto
      .createHash('sha256')
      .update(entryJson)
      .digest('hex')

    entry.hash = currentHash

    // Append to log file
    const logLine = JSON.stringify(entry) + '\n'
    await fs.promises.appendFile(logFile, logLine, { mode: 0o640 })

    // Update in-memory previous hash
    this.previousHash[logFile] = currentHash

    return currentHash
  }

  /**
   * Get the last hash from a log file
   * @param {string} logFile - Path to log file
   * @returns {Promise<string|null>} - Last hash or null
   */
  async getLastHash(logFile) {
    if (!fs.existsSync(logFile)) {
      return null
    }

    const content = await fs.promises.readFile(logFile, 'utf8')
    const lines = content.trim().split('\n').filter(l => l)
    
    if (lines.length === 0) {
      return null
    }

    const lastLine = lines[lines.length - 1]
    const lastEntry = JSON.parse(lastLine)
    
    return lastEntry.hash || null
  }

  /**
   * Verify log chain integrity
   * @param {string} category - Log category
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @returns {Promise<boolean>} - True if chain is valid
   */
  async verifyChain(category, dateStr) {
    const logFile = path.join(this.auditDir, `${category}-${dateStr}.log`)
    
    if (!fs.existsSync(logFile)) {
      return true // No log file is valid
    }

    const content = await fs.promises.readFile(logFile, 'utf8')
    const lines = content.trim().split('\n').filter(l => l)

    let prevHash = null

    for (const line of lines) {
      const entry = JSON.parse(line)
      
      // Verify previous hash matches
      if (entry.prevHash !== prevHash) {
        return false
      }

      // Recompute hash
      const entryWithoutHash = { ...entry }
      delete entryWithoutHash.hash

      const recomputedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(entryWithoutHash))
        .digest('hex')

      if (entry.hash !== recomputedHash) {
        return false
      }

      prevHash = entry.hash
    }

    return true
  }

  /**
   * Log access event
   */
  async logAccess(videoId, userId, ip, userAgent) {
    return await this.log('access', {
      videoId,
      userId: userId || 'anonymous',
      ip: this.anonymizeIp(ip),
      userAgent: userAgent ? userAgent.substring(0, 100) : null
    })
  }

  /**
   * Log upload event
   */
  async logUpload(videoId, userId, fileSize, checksum) {
    return await this.log('upload', {
      videoId,
      userId: userId || 'anonymous',
      fileSize,
      checksum
    })
  }

  /**
   * Log transcode event
   */
  async logTranscode(videoId, status, duration, renditions) {
    return await this.log('transcode', {
      videoId,
      status,
      duration,
      renditions
    })
  }

  /**
   * Anonymize IP address (keep first 3 octets for IPv4, first 6 groups for IPv6)
   */
  anonymizeIp(ip) {
    if (!ip) return null
    
    if (ip.includes('.')) {
      // IPv4
      const parts = ip.split('.')
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`
    } else if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':')
      return parts.slice(0, 6).join(':') + ':xxxx:xxxx'
    }
    
    return 'unknown'
  }
}

module.exports = AuditLogger
