'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const fs = require('node:fs')
const MetadataWriter = require('../../lib/metadata-writer')

test('MetadataWriter writes and reads metadata atomically', async (t) => {
  const testDir = path.join('/tmp', 'metadata-test-' + Date.now())
  fs.mkdirSync(testDir, { recursive: true })

  t.after(() => {
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const metadata = {
    videoId: 'test-123',
    filename: 'test.mp4',
    size: 1024
  }

  // Write metadata
  const checksum = await MetadataWriter.writeMetadata(testDir, metadata)
  assert.ok(checksum, 'Checksum should be returned')

  // Verify meta.json exists
  const metaPath = path.join(testDir, 'meta.json')
  assert.ok(fs.existsSync(metaPath), 'meta.json should exist')

  // Verify meta.tmp.json was cleaned up
  const tmpPath = path.join(testDir, 'meta.tmp.json')
  assert.ok(!fs.existsSync(tmpPath), 'meta.tmp.json should not exist after write')

  // Read metadata back
  const readMetadata = await MetadataWriter.readMetadata(testDir)
  assert.equal(readMetadata.videoId, metadata.videoId)
  assert.equal(readMetadata.filename, metadata.filename)
  assert.equal(readMetadata.size, metadata.size)
  assert.ok(readMetadata.checksum, 'Checksum should be present')
  assert.ok(readMetadata.updatedAt, 'updatedAt should be present')
})

test('MetadataWriter updates existing metadata', async (t) => {
  const testDir = path.join('/tmp', 'metadata-update-test-' + Date.now())
  fs.mkdirSync(testDir, { recursive: true })

  t.after(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  // Initial write
  await MetadataWriter.writeMetadata(testDir, { videoId: 'test-456', status: 'uploaded' })

  // Update
  await MetadataWriter.updateMetadata(testDir, { status: 'transcoded', duration: 120 })

  // Read back
  const metadata = await MetadataWriter.readMetadata(testDir)
  assert.equal(metadata.videoId, 'test-456')
  assert.equal(metadata.status, 'transcoded')
  assert.equal(metadata.duration, 120)
})

test('MetadataWriter computes file checksum', async (t) => {
  const testFile = path.join('/tmp', 'checksum-test-' + Date.now() + '.txt')
  fs.writeFileSync(testFile, 'test content')

  t.after(() => {
    fs.rmSync(testFile, { force: true })
  })

  const checksum = await MetadataWriter.computeFileChecksum(testFile)
  assert.ok(checksum, 'Checksum should be computed')
  assert.equal(checksum.length, 64, 'SHA-256 checksum should be 64 hex characters')
})
