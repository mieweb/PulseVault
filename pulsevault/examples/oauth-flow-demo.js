/**
 * OAuth Authorization Endpoint Tests
 * 
 * This file demonstrates how to interact with the OAuth authorization endpoint
 * and provides test cases for validation.
 */

const crypto = require('crypto')

/**
 * Generate PKCE code verifier and challenge
 * @returns {Object} { codeVerifier, codeChallenge }
 */
function generatePKCE() {
  // Generate random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  
  // Generate code challenge (SHA-256 hash of verifier)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  return { codeVerifier, codeChallenge }
}

/**
 * Generate random state for CSRF protection
 */
function generateState() {
  return crypto.randomBytes(16).toString('base64url')
}

// Example usage
console.log('=== PulseVault OAuth 2.0 Authorization Flow ===\n')

// Step 1: Generate PKCE parameters
const { codeVerifier, codeChallenge } = generatePKCE()
const state = generateState()

console.log('1. Generated PKCE Parameters:')
console.log('   Code Verifier:', codeVerifier)
console.log('   Code Challenge:', codeChallenge)
console.log('   State:', state)
console.log()

// Step 2: Build authorization URL
const authParams = new URLSearchParams({
  response_type: 'code',
  client_id: 'pulsevault-mobile',
  redirect_uri: 'pulse://callback',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state,
  scope: 'read write',
  device_id: 'device-123',
  device_name: 'iPhone 14 Pro',
  device_type: 'mobile'
})

const authUrl = `http://localhost:3000/oauth/authorize?${authParams}`

console.log('2. Authorization URL:')
console.log('   ' + authUrl)
console.log()

console.log('3. Valid Test Cases:')
console.log('   ✅ Valid request with all required parameters')
console.log('   ✅ PKCE S256 method')
console.log('   ✅ redirect_uri starts with pulse://')
console.log()

console.log('4. Invalid Test Cases:')

// Test case 1: Missing PKCE
const invalidNoPKCE = new URLSearchParams({
  response_type: 'code',
  client_id: 'pulsevault-mobile',
  redirect_uri: 'pulse://callback',
  state: state
})
console.log('   ❌ Missing PKCE:')
console.log('      ' + `http://localhost:3000/oauth/authorize?${invalidNoPKCE}`)

// Test case 2: Plain PKCE method (not allowed)
const invalidPlainPKCE = new URLSearchParams({
  response_type: 'code',
  client_id: 'pulsevault-mobile',
  redirect_uri: 'pulse://callback',
  code_challenge: codeVerifier,
  code_challenge_method: 'plain',
  state: state
})
console.log('   ❌ Plain PKCE method:')
console.log('      ' + `http://localhost:3000/oauth/authorize?${invalidPlainPKCE}`)

// Test case 3: Invalid redirect_uri (doesn't start with pulse://)
const invalidRedirectUri = new URLSearchParams({
  response_type: 'code',
  client_id: 'pulsevault-mobile',
  redirect_uri: 'https://example.com/callback',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state
})
console.log('   ❌ Invalid redirect_uri:')
console.log('      ' + `http://localhost:3000/oauth/authorize?${invalidRedirectUri}`)

// Test case 4: Wrong response_type
const invalidResponseType = new URLSearchParams({
  response_type: 'token',
  client_id: 'pulsevault-mobile',
  redirect_uri: 'pulse://callback',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state
})
console.log('   ❌ Wrong response_type:')
console.log('      ' + `http://localhost:3000/oauth/authorize?${invalidResponseType}`)
console.log()

console.log('5. Expected Flow:')
console.log('   1. Mobile app generates code_verifier and code_challenge')
console.log('   2. Mobile app opens authorization URL in web browser')
console.log('   3. User signs in and authorizes access')
console.log('   4. Server issues authorization code')
console.log('   5. Redirect to: pulse://callback?code=AUTH_CODE&state=STATE')
console.log('   6. Mobile app exchanges code + code_verifier for tokens')
console.log('   7. Server validates PKCE and issues access_token + refresh_token')
console.log()

console.log('6. CURL Test Commands:')
console.log()
console.log('# Valid request:')
console.log(`curl -v "http://localhost:3000/oauth/authorize?${authParams}"`)
console.log()
console.log('# Missing PKCE (should fail):')
console.log(`curl -v "http://localhost:3000/oauth/authorize?${invalidNoPKCE}"`)
console.log()
console.log('# Invalid redirect_uri (should fail):')
console.log(`curl -v "http://localhost:3000/oauth/authorize?${invalidRedirectUri}"`)
console.log()

console.log('7. Store code_verifier for token exchange:')
console.log(`   export CODE_VERIFIER="${codeVerifier}"`)
console.log()
console.log('   After receiving authorization code, exchange it:')
console.log('   curl -X POST http://localhost:3000/oauth/token \\')
console.log('     -H "Content-Type: application/json" \\')
console.log('     -d \'{"grant_type":"authorization_code","code":"AUTH_CODE","code_verifier":"\'$CODE_VERIFIER\'","client_id":"pulsevault-mobile","redirect_uri":"pulse://callback"}\'')
console.log()

// Export for use in other files
module.exports = {
  generatePKCE,
  generateState,
  codeVerifier,
  codeChallenge,
  state,
  authUrl
}
