'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const stringify = require('fast-json-stable-stringify')

/**
 * Atomic metadata writer for PulseVault
 * Ensures metadata is always written atomically with fsync
 */
class MetadataWriter {
  /**
   * Write metadata atomically with checksum
   * @param {string} videoPath - Path to video directory
   * @param {object} metadata - Metadata object to write
   * @returns {Promise<string>} - Checksum of written metadata
   */
  static async writeMetadata(videoPath, metadata) {
    const metaPath = path.join(videoPath, 'meta.json')
    const tmpPath = path.join(videoPath, 'meta.tmp.json')

    // Add timestamp and compute checksum
    const enrichedMetadata = {
      ...metadata,
      updatedAt: new Date().toISOString(),
      version: '1.0'
    }

    // Serialize with stable key ordering
    const jsonContent = stringify(enrichedMetadata, { space: 2 })
    
    // Compute SHA-256 checksum
    const checksum = crypto
      .createHash('sha256')
      .update(jsonContent)
      .digest('hex')

    enrichedMetadata.checksum = checksum

    // Write to temp file first
    const finalContent = stringify(enrichedMetadata, { space: 2 })
    await fs.promises.writeFile(tmpPath, finalContent, { mode: 0o640 })

    // Fsync to ensure it's written to disk
    const fd = await fs.promises.open(tmpPath, 'r+')
    try {
      await fd.sync()
    } finally {
      await fd.close()
    }

    // Atomic rename
    await fs.promises.rename(tmpPath, metaPath)

    // Fsync the parent directory to ensure rename is persisted
    const dirFd = await fs.promises.open(videoPath, 'r')
    try {
      await dirFd.sync()
    } finally {
      await dirFd.close()
    }

    return checksum
  }

  /**
   * Read and verify metadata
   * @param {string} videoPath - Path to video directory
   * @returns {Promise<object>} - Metadata object
   */
  static async readMetadata(videoPath) {
    const metaPath = path.join(videoPath, 'meta.json')

    if (!fs.existsSync(metaPath)) {
      throw new Error('Metadata file not found')
    }

    const content = await fs.promises.readFile(metaPath, 'utf8')
    const metadata = JSON.parse(content)

    // Verify checksum if present
    if (metadata.checksum) {
      const storedChecksum = metadata.checksum
      const metadataWithoutChecksum = { ...metadata }
      delete metadataWithoutChecksum.checksum

      const recomputedChecksum = crypto
        .createHash('sha256')
        .update(stringify(metadataWithoutChecksum, { space: 2 }))
        .digest('hex')

      if (storedChecksum !== recomputedChecksum) {
        throw new Error('Metadata checksum mismatch - possible corruption')
      }
    }

    return metadata
  }

  /**
   * Update metadata (merge with existing)
   * @param {string} videoPath - Path to video directory
   * @param {object} updates - Partial metadata to merge
   * @returns {Promise<string>} - New checksum
   */
  static async updateMetadata(videoPath, updates) {
    let existingMetadata = {}
    
    try {
      existingMetadata = await this.readMetadata(videoPath)
    } catch (err) {
      // If no metadata exists, start fresh
    }

    const mergedMetadata = {
      ...existingMetadata,
      ...updates,
      // Remove checksum as it will be recomputed
      checksum: undefined
    }

    delete mergedMetadata.checksum

    return await this.writeMetadata(videoPath, mergedMetadata)
  }

  /**
   * Compute file checksum
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} - SHA-256 checksum
   */
  static async computeFileChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)

      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }
}

module.exports = MetadataWriter
