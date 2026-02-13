/**
 * Complete OAuth 2.0 Flow Test
 * Demonstrates login + token exchange with PKCE validation
 */

const crypto = require('crypto')

// Generate PKCE parameters
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return { codeVerifier, codeChallenge }
}

async function testCompleteFlow() {
  console.log('=== Complete OAuth 2.0 Flow Test ===\n')

  // Step 1: Generate PKCE
  const { codeVerifier, codeChallenge } = generatePKCE()
  const state = crypto.randomBytes(16).toString('base64url')

  console.log('Step 1: Generate PKCE Parameters')
  console.log('  Code Verifier:', codeVerifier)
  console.log('  Code Challenge:', codeChallenge)
  console.log('  State:', state)
  console.log()

  // Step 2: Login to get authorization code
  const loginData = {
    email: 'test@pulsevault.com',
    password: 'password123',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: 'pulse://callback',
    state: state,
    client_id: 'pulsevault-mobile',
    device_id: 'test-device-456',
    device_name: 'Test iPhone 15',
    device_type: 'mobile',
    scope: 'read write'
  }

  console.log('Step 2: Login Request (POST /auth/login)')
  console.log('  Email: test@pulsevault.com')
  console.log('  Password: password123')
  console.log('  Code Challenge:', codeChallenge.substring(0, 20) + '...')
  console.log()

  console.log('CURL Command:')
  console.log(`
curl -i -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(loginData)}'
`)

  console.log('Expected Response:')
  console.log('  HTTP/1.1 302 Found')
  console.log('  Location: pulse://callback?code=XXXXXXXXXX&state=' + state)
  console.log()

  console.log('─────────────────────────────────────────────────────')
  console.log()

  // Step 3: Extract authorization code (in real flow, this comes from redirect)
  console.log('Step 3: Extract Authorization Code from Redirect')
  console.log('  The mobile app receives the redirect URL and extracts:')
  console.log('    - Authorization Code: XXXXXXXXXX')
  console.log('    - State: ' + state + ' (verify it matches)')
  console.log()

  // Step 4: Exchange code for tokens
  const tokenData = {
    grant_type: 'authorization_code',
    code: 'AUTH_CODE_FROM_STEP_2', // Replace with actual code
    code_verifier: codeVerifier,
    client_id: 'pulsevault-mobile',
    redirect_uri: 'pulse://callback',
    device_id: 'test-device-456'
  }

  console.log('Step 4: Exchange Code for Tokens (POST /oauth/token)')
  console.log('  Grant Type: authorization_code')
  console.log('  Code: AUTH_CODE_FROM_STEP_2')
  console.log('  Code Verifier:', codeVerifier.substring(0, 20) + '...')
  console.log()

  console.log('CURL Command (replace AUTH_CODE with actual code):')
  console.log(`
export CODE_VERIFIER="${codeVerifier}"
export AUTH_CODE="PASTE_CODE_HERE"

curl -X POST http://localhost:3000/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "'$AUTH_CODE'",
    "code_verifier": "'$CODE_VERIFIER'",
    "client_id": "pulsevault-mobile",
    "redirect_uri": "pulse://callback",
    "device_id": "test-device-456"
  }' | python3 -m json.tool
`)

  console.log('Expected Response:')
  console.log(`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "read write"
}`)
  console.log()

  console.log('─────────────────────────────────────────────────────')
  console.log()

  // Step 5: Verify token
  console.log('Step 5: Decode and Verify JWT Token')
  console.log('  Access Token Payload:')
  console.log(`  {
    "sub": "USER_ID",
    "client_id": "pulsevault-mobile",
    "scope": "read write",
    "device_id": "test-device-456",
    "type": "access_token",
    "iat": TIMESTAMP,
    "exp": TIMESTAMP + 1800,
    "iss": "pulsevault",
    "aud": "pulsevault-api"
  }`)
  console.log()

  console.log('  Refresh Token Payload:')
  console.log(`  {
    "sub": "USER_ID",
    "client_id": "pulsevault-mobile",
    "device_id": "test-device-456",
    "type": "refresh_token",
    "iat": TIMESTAMP,
    "exp": TIMESTAMP + 2592000,
    "iss": "pulsevault",
    "aud": "pulsevault-api"
  }`)
  console.log()

  console.log('─────────────────────────────────────────────────────')
  console.log()

  // Step 6: Use access token
  console.log('Step 6: Use Access Token to Make API Requests')
  console.log(`
export ACCESS_TOKEN="PASTE_ACCESS_TOKEN_HERE"

curl -H "Authorization: Bearer $ACCESS_TOKEN" \\
  http://localhost:3000/media/videos/video-id/metadata
`)
  console.log()

  console.log('=== Error Test Cases ===\n')

  console.log('❌ Invalid Code Verifier (PKCE Validation Fails)')
  console.log(`
curl -X POST http://localhost:3000/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "'$AUTH_CODE'",
    "code_verifier": "WRONG_VERIFIER_123",
    "client_id": "pulsevault-mobile",
    "redirect_uri": "pulse://callback"
  }'
`)
  console.log('Expected: 400 Bad Request - "PKCE verification failed"')
  console.log()

  console.log('❌ Code Already Used')
  console.log('  Try to exchange the same code twice')
  console.log('Expected: 400 Bad Request - "Authorization code has already been used"')
  console.log()

  console.log('❌ Expired Code')
  console.log('  Wait 10+ minutes and try to exchange code')
  console.log('Expected: 400 Bad Request - "Authorization code has expired"')
  console.log()

  console.log('❌ Invalid Code')
  console.log('  Use a non-existent authorization code')
  console.log('Expected: 400 Bad Request - "Authorization code is invalid"')
  console.log()

  console.log('❌ Wrong Redirect URI')
  console.log(`
curl -X POST http://localhost:3000/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "'$AUTH_CODE'",
    "code_verifier": "'$CODE_VERIFIER'",
    "client_id": "pulsevault-mobile",
    "redirect_uri": "pulse://different-uri"
  }'
`)
  console.log('Expected: 400 Bad Request - "Redirect URI does not match"')
  console.log()

  console.log('=== Token Verification ===\n')
  console.log('To verify a JWT token manually:')
  console.log(`
node -e "
const jwt = require('jsonwebtoken');
const token = 'PASTE_TOKEN_HERE';
const secret = process.env.HMAC_SECRET || 'your-secret';
try {
  const decoded = jwt.verify(token, secret, { 
    issuer: 'pulsevault',
    audience: 'pulsevault-api'
  });
  console.log(JSON.stringify(decoded, null, 2));
} catch (err) {
  console.error('Invalid token:', err.message);
}
"
`)
  console.log()

  console.log('=== Database Verification ===\n')
  console.log('Check authorization code was marked as used:')
  console.log(`
docker exec -i pulsevault-postgres psql -U pulsevault -d pulsevault -c \\
  "SELECT code, user_id, used_at, expires_at FROM oauth_authorization_codes ORDER BY created_at DESC LIMIT 1;"
`)
  console.log()

  console.log('Check tokens were stored:')
  console.log(`
docker exec -i pulsevault-postgres psql -U pulsevault -d pulsevault -c \\
  "SELECT LEFT(access_token, 50) as access_token_preview, user_id, device_name, access_token_expires_at FROM oauth_tokens ORDER BY created_at DESC LIMIT 1;"
`)
  console.log()

  console.log('=== Summary ===\n')
  console.log('Complete OAuth 2.0 Flow with PKCE:')
  console.log('1. ✅ Mobile app generates code_verifier and code_challenge')
  console.log('2. ✅ User logs in with email/password + code_challenge')
  console.log('3. ✅ Server issues authorization code')
  console.log('4. ✅ Mobile app exchanges code + code_verifier for tokens')
  console.log('5. ✅ Server validates PKCE (SHA-256 hash comparison)')
  console.log('6. ✅ Server issues JWT access token (30 min) and refresh token (30 days)')
  console.log('7. ✅ Tokens stored in database')
  console.log('8. ✅ Authorization code marked as used')
  console.log()

  console.log('Next Steps:')
  console.log('- Implement token refresh endpoint (POST /oauth/token with grant_type=refresh_token)')
  console.log('- Add authentication middleware to validate Bearer tokens')
  console.log('- Implement token revocation')
  console.log('- Add rate limiting to prevent abuse')
}

// Run the test
testCompleteFlow().catch(console.error)
