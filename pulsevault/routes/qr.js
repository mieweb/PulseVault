'use strict'

const crypto = require('node:crypto')
const { v4: uuidv4 } = require('uuid')

/**
 * QR Code generation endpoint for PulseVault
 * Generates secure, signed QR codes with deeplinks for pulse-camera app integration
 * 
 * Security features:
 * - HMAC-signed tokens for authentication
 * - Expiry times (default 24 hours)
 * - One-time use tokens (optional)
 * - User/organization IDs for access control
 */
module.exports = async function (fastify, opts) {
  /**
   * Generate a signed upload token
   */
  function generateUploadToken(serverUrl, options = {}) {
    const {
      userId = 'anonymous',
      organizationId = null,
      draftId = null,
      expiresIn = 86400, // 24 hours default
      oneTimeUse = false
    } = options

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
    const tokenId = uuidv4()
    
    // Build token payload
    const payload = {
      server: serverUrl,
      userId,
      organizationId,
      draftId,
      expiresAt,
      tokenId,
      oneTimeUse
    }

    // Create HMAC signature
    const message = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', fastify.config.hmacSecret)
      .update(message)
      .digest('hex')

    // Encode token (base64 for URL safety)
    const token = Buffer.from(JSON.stringify({ ...payload, signature })).toString('base64url')

    return {
      token,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      expiresIn,
      tokenId
    }
  }

  /**
   * Verify upload token
   */
  function verifyUploadToken(token) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
      const { signature, ...payload } = decoded

      // Check expiry
      if (payload.expiresAt && payload.expiresAt < Math.floor(Date.now() / 1000)) {
        return { valid: false, reason: 'Token expired' }
      }

      // Verify signature
      const message = JSON.stringify(payload)
      const expectedSignature = crypto
        .createHmac('sha256', fastify.config.hmacSecret)
        .update(message)
        .digest('hex')

      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid signature' }
      }

      return { valid: true, payload }
    } catch (err) {
      return { valid: false, reason: 'Invalid token format' }
    }
  }

  /**
   * Generate QR code data for deeplink with signed token
   * Returns the deeplink URL that can be encoded as QR code
   */
  fastify.get('/qr/deeplink', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          draftId: { type: 'string' },
          server: { type: 'string' },
          userId: { type: 'string' },
          organizationId: { type: 'string' },
          expiresIn: { type: 'number', default: 86400 }, // seconds, default 24h
          oneTimeUse: { type: 'boolean', default: false }
        }
      }
    }
  }, async (request, reply) => {
    const { 
      draftId, 
      server, 
      userId = 'anonymous',
      organizationId,
      expiresIn = 86400,
      oneTimeUse = false
    } = request.query
    
    // Get server URL from query, config, or request
    let serverUrl = server
    if (!serverUrl) {
      // Try to infer from request
      const protocol = request.headers['x-forwarded-proto'] || (request.protocol || 'http')
      const host = request.headers.host || `${fastify.config.host}:${fastify.config.port}`
      serverUrl = `${protocol}://${host}`
    }
    
    // Normalize server URL - ensure it has protocol
    if (serverUrl && !serverUrl.includes('://')) {
      serverUrl = `http://${serverUrl}`
    }
    
    // Extract just protocol + host (remove any paths)
    try {
      const parsed = new URL(serverUrl)
      serverUrl = `${parsed.protocol}//${parsed.host}`
    } catch (e) {
      // If parsing fails, ensure protocol is present
      if (!serverUrl.includes('://')) {
        serverUrl = `http://${serverUrl}`
      }
    }
    
    // Generate signed token
    const tokenData = generateUploadToken(serverUrl, {
      userId,
      organizationId,
      draftId,
      expiresIn: parseInt(expiresIn, 10),
      oneTimeUse: oneTimeUse === 'true' || oneTimeUse === true
    })
    
    // Build secure deeplink URL
    // Format: pulsecam://?mode=upload&server=<server_url>&token=<signed_token>
    const params = new URLSearchParams({
      mode: 'upload',
      server: serverUrl,
      token: tokenData.token
    })
    
    if (draftId) {
      params.set('draftId', draftId)
    }
    
    const deeplinkUrl = `pulsecam://?${params.toString()}`
    
    return {
      deeplink: deeplinkUrl,
      server: serverUrl,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      expiresIn: tokenData.expiresIn,
      tokenId: tokenData.tokenId,
      draftId: draftId || null,
      userId,
      organizationId: organizationId || null,
      oneTimeUse: oneTimeUse === 'true' || oneTimeUse === true,
      // QR code data (can be used with any QR code library)
      qrData: deeplinkUrl
    }
  })

  /**
   * Generate QR code image (PNG) - requires qrcode package
   * This endpoint is optional and requires installing 'qrcode' package
   * Uses the same secure token generation as /qr/deeplink
   */
  fastify.get('/qr/image', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          draftId: { type: 'string' },
          server: { type: 'string' },
          userId: { type: 'string' },
          organizationId: { type: 'string' },
          expiresIn: { type: 'number', default: 86400 },
          oneTimeUse: { type: 'boolean', default: false },
          size: { type: 'number', default: 300 }
        }
      }
    }
  }, async (request, reply) => {
    const { 
      draftId, 
      server, 
      userId = 'anonymous',
      organizationId,
      expiresIn = 86400,
      oneTimeUse = false,
      size = 300 
    } = request.query
    
    // Get server URL
    let serverUrl = server
    if (!serverUrl) {
      const protocol = request.headers['x-forwarded-proto'] || (request.protocol || 'http')
      const host = request.headers.host || `${fastify.config.host}:${fastify.config.port}`
      serverUrl = `${protocol}://${host}`
    }
    
    // Normalize server URL - ensure it has protocol
    if (serverUrl && !serverUrl.includes('://')) {
      serverUrl = `http://${serverUrl}`
    }
    
    // Extract just protocol + host (remove any paths)
    try {
      const parsed = new URL(serverUrl)
      serverUrl = `${parsed.protocol}//${parsed.host}`
    } catch (e) {
      // If parsing fails, ensure protocol is present
      if (!serverUrl.includes('://')) {
        serverUrl = `http://${serverUrl}`
      }
    }
    
    // Generate signed token (same as deeplink endpoint)
    const tokenData = generateUploadToken(serverUrl, {
      userId,
      organizationId,
      draftId,
      expiresIn: parseInt(expiresIn, 10),
      oneTimeUse: oneTimeUse === 'true' || oneTimeUse === true
    })
    
    // Build secure deeplink URL
    const params = new URLSearchParams({
      mode: 'upload',
      server: serverUrl,
      token: tokenData.token
    })
    
    if (draftId) {
      params.set('draftId', draftId)
    }
    
    const deeplinkUrl = `pulsecam://?${params.toString()}`
    
    // Try to use qrcode package if available
    try {
      const QRCode = require('qrcode')
      const qrBuffer = await QRCode.toBuffer(deeplinkUrl, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M'
      })
      
      reply
        .type('image/png')
        .send(qrBuffer)
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        return reply.code(501).send({
          error: 'QR code image generation not available',
          message: 'Install qrcode package: npm install qrcode',
          deeplink: deeplinkUrl,
          qrData: deeplinkUrl,
          token: tokenData.token,
          expiresAt: tokenData.expiresAt
        })
      }
      throw err
    }
  })

  /**
   * Verify upload token endpoint (for app to validate token before upload)
   */
  fastify.post('/qr/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { token } = request.body
    
    const verification = verifyUploadToken(token)
    
    if (!verification.valid) {
      return reply.code(401).send({
        valid: false,
        reason: verification.reason
      })
    }
    
    return {
      valid: true,
      payload: {
        server: verification.payload.server,
        userId: verification.payload.userId,
        organizationId: verification.payload.organizationId,
        draftId: verification.payload.draftId,
        expiresAt: new Date(verification.payload.expiresAt * 1000).toISOString(),
        oneTimeUse: verification.payload.oneTimeUse,
        tokenId: verification.payload.tokenId
      }
    }
  })
}

