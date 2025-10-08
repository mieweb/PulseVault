'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const fs = require('node:fs')
const AuditLogger = require('../../lib/audit-logger')

test('AuditLogger creates hash-chained entries', async (t) => {
  const testDir = path.join('/tmp', 'audit-test-' + Date.now())
  fs.mkdirSync(testDir, { recursive: true })

  t.after(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const logger = new AuditLogger(testDir)

  // Log first entry
  const hash1 = await logger.log('test', { action: 'first' })
  assert.ok(hash1, 'First hash should be returned')

  // Log second entry
  const hash2 = await logger.log('test', { action: 'second' })
  assert.ok(hash2, 'Second hash should be returned')
  assert.notEqual(hash1, hash2, 'Hashes should be different')

  // Verify log file exists
  const dateStr = new Date().toISOString().split('T')[0]
  const logFile = path.join(testDir, `test-${dateStr}.log`)
  assert.ok(fs.existsSync(logFile), 'Log file should exist')

  // Verify chain integrity
  const isValid = await logger.verifyChain('test', dateStr)
  assert.ok(isValid, 'Log chain should be valid')
})

test('AuditLogger logs access events', async (t) => {
  const testDir = path.join('/tmp', 'audit-access-test-' + Date.now())
  fs.mkdirSync(testDir, { recursive: true })

  t.after(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const logger = new AuditLogger(testDir)
  const hash = await logger.logAccess('video-123', 'user-456', '192.168.1.1', 'Mozilla/5.0')

  assert.ok(hash, 'Hash should be returned')

  // Verify log entry
  const dateStr = new Date().toISOString().split('T')[0]
  const logFile = path.join(testDir, `access-${dateStr}.log`)
  const content = fs.readFileSync(logFile, 'utf8')
  const entry = JSON.parse(content.trim())

  assert.equal(entry.event.videoId, 'video-123')
  assert.equal(entry.event.userId, 'user-456')
  assert.equal(entry.event.ip, '192.168.1.xxx') // Should be anonymized
})

test('AuditLogger anonymizes IP addresses', async (t) => {
  const testDir = path.join('/tmp', 'audit-ip-test-' + Date.now())
  fs.mkdirSync(testDir, { recursive: true })

  t.after(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  const logger = new AuditLogger(testDir)

  // Test IPv4
  await logger.logAccess('video-1', 'user-1', '192.168.1.100', null)
  const dateStr = new Date().toISOString().split('T')[0]
  const logFile = path.join(testDir, `access-${dateStr}.log`)
  const content = fs.readFileSync(logFile, 'utf8')
  const entry = JSON.parse(content.trim())

  assert.equal(entry.event.ip, '192.168.1.xxx')
})
