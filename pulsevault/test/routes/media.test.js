'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../helper')

test('POST /media/sign generates valid signed URL', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/media/sign',
    payload: {
      videoId: 'test-video-123',
      path: 'hls/master.m3u8',
      expiresIn: 600
    }
  })

  assert.equal(response.statusCode, 200)
  const body = JSON.parse(response.body)
  
  assert.ok(body.url, 'URL should be present')
  assert.ok(body.url.includes('/media/videos/test-video-123/hls/master.m3u8'), 'URL should contain path')
  assert.ok(body.url.includes('?token='), 'URL should contain token')
  assert.ok(body.expiresAt, 'expiresAt should be present')
  assert.equal(body.expiresIn, 600)
})

test('POST /media/sign requires videoId and path', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/media/sign',
    payload: {
      videoId: 'test-video-123'
      // path missing
    }
  })

  assert.equal(response.statusCode, 400)
})

test('GET /media/videos/:videoId/* rejects missing token', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'GET',
    url: '/media/videos/test-video/hls/master.m3u8'
    // No token
  })

  assert.equal(response.statusCode, 401)
})

test('GET /media/videos/:videoId/* rejects expired token', async (t) => {
  const app = await build(t)

  // Create a token that expired 1 hour ago
  const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600
  const crypto = require('node:crypto')
  const videoId = 'test-video'
  const path = 'hls/master.m3u8'
  
  const message = `${videoId}:${path}:${expiredTimestamp}`
  const signature = crypto
    .createHmac('sha256', app.config.hmacSecret)
    .update(message)
    .digest('hex')
  
  const token = `${expiredTimestamp}.${signature}`

  const response = await app.inject({
    method: 'GET',
    url: `/media/videos/${videoId}/${path}?token=${token}`
  })

  assert.equal(response.statusCode, 401)
})
