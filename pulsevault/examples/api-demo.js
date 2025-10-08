#!/usr/bin/env node

/**
 * PulseVault API Example
 * 
 * This script demonstrates the complete workflow:
 * 1. Generate signed URL
 * 2. Verify token validation
 * 3. Check metrics
 */

const http = require('http')

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE)
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        })
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

async function main() {
  console.log('🩸 PulseVault API Example\n')

  // 1. Health check
  console.log('1️⃣  Checking API health...')
  const health = await request('GET', '/')
  console.log(`   Status: ${health.statusCode}`)
  console.log(`   Response: ${health.body}`)
  console.log()

  // 2. Generate signed URL
  console.log('2️⃣  Generating signed URL...')
  const signResponse = await request('POST', '/media/sign', {
    videoId: 'demo-video-123',
    path: 'hls/master.m3u8',
    expiresIn: 300
  })

  if (signResponse.statusCode !== 200) {
    console.error(`   ❌ Failed: ${signResponse.statusCode}`)
    console.error(`   ${signResponse.body}`)
    return
  }

  const signData = JSON.parse(signResponse.body)
  console.log(`   ✅ Signed URL generated`)
  console.log(`   URL: ${signData.url}`)
  console.log(`   Expires: ${signData.expiresAt}`)
  console.log(`   Valid for: ${signData.expiresIn} seconds`)
  console.log()

  // 3. Test token validation (should fail - file doesn't exist)
  console.log('3️⃣  Testing token validation...')
  const mediaResponse = await request('GET', signData.url)
  console.log(`   Status: ${mediaResponse.statusCode}`)
  
  if (mediaResponse.statusCode === 404) {
    console.log(`   ✅ Token validated (file not found as expected)`)
  } else if (mediaResponse.statusCode === 401) {
    console.log(`   ❌ Token rejected`)
  } else {
    console.log(`   Response: ${mediaResponse.body}`)
  }
  console.log()

  // 4. Test invalid token
  console.log('4️⃣  Testing invalid token...')
  const invalidResponse = await request('GET', '/media/videos/demo-video-123/hls/master.m3u8?token=invalid')
  console.log(`   Status: ${invalidResponse.statusCode}`)
  
  if (invalidResponse.statusCode === 401) {
    console.log(`   ✅ Invalid token correctly rejected`)
  }
  console.log()

  // 5. Check metrics
  console.log('5️⃣  Fetching metrics...')
  const metricsResponse = await request('GET', '/metrics')
  
  if (metricsResponse.statusCode === 200) {
    const lines = metricsResponse.body.split('\n')
    const relevantMetrics = lines.filter(line => 
      line.includes('pulsevault_') || 
      line.includes('http_request_duration_seconds')
    ).slice(0, 10)
    
    console.log(`   ✅ Metrics available`)
    console.log(`   Sample metrics:`)
    relevantMetrics.forEach(line => {
      if (line && !line.startsWith('#')) {
        console.log(`   ${line}`)
      }
    })
  }
  console.log()

  console.log('✨ Example complete!')
  console.log()
  console.log('Next steps:')
  console.log('  • Upload a video using tus protocol')
  console.log('  • Finalize the upload with POST /uploads/finalize')
  console.log('  • Wait for transcoding to complete')
  console.log('  • Generate signed URL for playback')
  console.log('  • Stream video with range requests')
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
