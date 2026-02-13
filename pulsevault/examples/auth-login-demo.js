/**
 * Auth Login Endpoint Demo
 * 
 * This script demonstrates how to use the /auth/login endpoint
 * to authenticate users and receive OAuth authorization codes.
 */

const crypto = require('crypto')
const axios = require('axios')

// PKCE helper functions
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  
  return { codeVerifier, codeChallenge }
}

function generateState() {
  return crypto.randomBytes(16).toString('base64url')
}

// Demo configuration
const API_BASE_URL = 'http://localhost:3000'
const REDIRECT_URI = 'pulse://callback'

console.log('=== PulseVault Authentication Demo ===\n')

// Step 1: Generate PKCE parameters
const { codeVerifier, codeChallenge } = generatePKCE()
const state = generateState()

console.log('1. Generated PKCE Parameters:')
console.log('   Code Verifier:', codeVerifier)
console.log('   Code Challenge:', codeChallenge)
console.log('   State:', state)
console.log()

// Step 2: Prepare login request
const loginRequest = {
  email: 'test@pulsevault.local',
  password: 'password123',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  redirect_uri: REDIRECT_URI,
  state: state,
  client_id: 'pulsevault-mobile',
  device_id: 'demo-device-123',
  device_name: 'Demo iPhone',
  device_type: 'mobile',
  scope: 'read write'
}

console.log('2. Login Request:')
console.log('   POST', API_BASE_URL + '/auth/login')
console.log('   Body:', JSON.stringify(loginRequest, null, 2))
console.log()

console.log('3. CURL Command:')
console.log(`curl -X POST ${API_BASE_URL}/auth/login \\`)
console.log('  -H "Content-Type: application/json" \\')
console.log(`  -d '${JSON.stringify(loginRequest)}'`)
console.log()

console.log('4. Expected Response:')
console.log('   HTTP 302 Redirect')
console.log('   Location: pulse://callback?code=AUTHORIZATION_CODE&state=' + state)
console.log()

console.log('5. Test with different scenarios:')
console.log()

// Scenario 1: Valid login
console.log('   ✅ Valid Login:')
console.log(`   curl -X POST ${API_BASE_URL}/auth/login \\`)
console.log('     -H "Content-Type: application/json" \\')
console.log(`     -d '${JSON.stringify(loginRequest)}'`)
console.log()

// Scenario 2: Invalid password
const invalidPasswordRequest = { ...loginRequest, password: 'wrongpassword' }
console.log('   ❌ Invalid Password:')
console.log(`   curl -X POST ${API_BASE_URL}/auth/login \\`)
console.log('     -H "Content-Type: application/json" \\')
console.log(`     -d '${JSON.stringify(invalidPasswordRequest)}'`)
console.log('   Expected: 401 Unauthorized')
console.log()

// Scenario 3: Invalid redirect_uri
const invalidRedirectRequest = { ...loginRequest, redirect_uri: 'https://evil.com' }
console.log('   ❌ Invalid Redirect URI:')
console.log(`   curl -X POST ${API_BASE_URL}/auth/login \\`)
console.log('     -H "Content-Type: application/json" \\')
console.log(`     -d '${JSON.stringify(invalidRedirectRequest)}'`)
console.log('   Expected: 400 Bad Request (redirect_uri must start with "pulse://")')
console.log()

// Scenario 4: Missing PKCE
const noPKCERequest = {
  email: loginRequest.email,
  password: loginRequest.password,
  redirect_uri: loginRequest.redirect_uri
}
console.log('   ❌ Missing PKCE:')
console.log(`   curl -X POST ${API_BASE_URL}/auth/login \\`)
console.log('     -H "Content-Type: application/json" \\')
console.log(`     -d '${JSON.stringify(noPKCERequest)}'`)
console.log('   Expected: 400 Bad Request (missing required fields)')
console.log()

console.log('6. Complete OAuth Flow:')
console.log()
console.log('   Step 1: Mobile app calls /auth/login')
console.log('           Receives authorization code in redirect')
console.log()
console.log('   Step 2: Mobile app extracts code from redirect URL')
console.log('           pulse://callback?code=AUTH_CODE&state=STATE')
console.log()
console.log('   Step 3: Mobile app exchanges code for tokens')
console.log('           POST /oauth/token with code + code_verifier')
console.log()
console.log(`   curl -X POST ${API_BASE_URL}/oauth/token \\`)
console.log('     -H "Content-Type: application/json" \\')
console.log('     -d \'{"grant_type":"authorization_code","code":"AUTH_CODE","code_verifier":"' + codeVerifier + '","client_id":"pulsevault-mobile","redirect_uri":"pulse://callback"}\'')
console.log()

console.log('7. Registration (Create Test User):')
console.log()
const registerRequest = {
  email: 'newuser@pulsevault.local',
  password: 'securepassword123',
  name: 'New User'
}
console.log(`   curl -X POST ${API_BASE_URL}/auth/register \\`)
console.log('     -H "Content-Type: application/json" \\')
console.log(`     -d '${JSON.stringify(registerRequest)}'`)
console.log()

console.log('8. Health Check:')
console.log(`   curl ${API_BASE_URL}/auth/health`)
console.log()

console.log('=== Setup Instructions ===')
console.log()
console.log('1. Apply database migrations:')
console.log('   cd pulsevault')
console.log('   psql -U pulsevault -d pulsevault -f migrations/001_oauth_tables.sql')
console.log('   psql -U pulsevault -d pulsevault -f migrations/002_add_password_auth.sql')
console.log()
console.log('2. Set DATABASE_URL in .env:')
console.log('   DATABASE_URL=postgresql://pulsevault:devpassword@localhost:5432/pulsevault')
console.log()
console.log('3. Restart backend:')
console.log('   npm run dev')
console.log()
console.log('4. Create test user (either via SQL or /auth/register):')
console.log('   Email: test@pulsevault.local')
console.log('   Password: password123')
console.log()

// Export for use in other scripts
module.exports = {
  generatePKCE,
  generateState,
  API_BASE_URL,
  REDIRECT_URI,
  loginRequest,
  codeVerifier,
  codeChallenge,
  state
}
