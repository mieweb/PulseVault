/**
 * Test script for auth/login endpoint
 * Creates a test user and demonstrates the OAuth login flow
 */

const crypto = require('crypto')
const bcrypt = require('bcrypt')

// Generate PKCE parameters
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return { codeVerifier, codeChallenge }
}

async function createTestUser() {
  const { Pool } = require('pg')
  
  const pool = new Pool({
    connectionString: 'postgresql://pulsevault:devpassword@localhost:5432/pulsevault'
  })

  try {
    // Check if test user exists
    const existingUser = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      ['test@pulsevault.com']
    )

    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists')
      await pool.end()
      return
    }

    // Create test user
    const passwordHash = await bcrypt.hash('password123', 12)
    const userId = crypto.randomBytes(16).toString('hex')

    await pool.query(
      `INSERT INTO "user" (id, email, password_hash, name, "emailVerified", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        userId,
        'test@pulsevault.com',
        passwordHash,
        'Test User',
        false,
        'user'
      ]
    )

    console.log('✅ Test user created successfully')
    console.log('   Email: test@pulsevault.com')
    console.log('   Password: password123')
    
    await pool.end()
  } catch (error) {
    console.error('❌ Error creating test user:', error.message)
    await pool.end()
    process.exit(1)
  }
}

async function testLogin() {
  console.log('\n=== PulseVault Login Endpoint Test ===\n')

  // Step 1: Create test user
  console.log('1. Creating test user...')
  await createTestUser()

  // Step 2: Generate PKCE parameters
  const { codeVerifier, codeChallenge } = generatePKCE()
  const state = crypto.randomBytes(16).toString('base64url')

  console.log('\n2. Generated PKCE Parameters:')
  console.log('   Code Verifier:', codeVerifier)
  console.log('   Code Challenge:', codeChallenge)
  console.log('   State:', state)

  // Step 3: Prepare login request
  const loginData = {
    email: 'test@pulsevault.com',
    password: 'password123',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: 'pulse://callback',
    state: state,
    client_id: 'pulsevault-mobile',
    device_id: 'test-device-123',
    device_name: 'Test iPhone',
    device_type: 'mobile',
    scope: 'read write'
  }

  console.log('\n3. Login Request:')
  console.log(JSON.stringify(loginData, null, 2))

  console.log('\n4. CURL Command to test:')
  console.log(`
curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(loginData)}'
`)

  console.log('\n5. Expected Response:')
  console.log('   HTTP 302 Redirect to: pulse://callback?code=XXXXX&state=' + state)

  console.log('\n6. Store code_verifier for token exchange:')
  console.log(`   export CODE_VERIFIER="${codeVerifier}"`)

  console.log('\n7. After receiving authorization code, exchange it:')
  console.log(`
curl -X POST http://localhost:3000/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{"grant_type":"authorization_code","code":"AUTH_CODE","code_verifier":"'$CODE_VERIFIER'","client_id":"pulsevault-mobile","redirect_uri":"pulse://callback"}'
`)

  console.log('\n=== Test Cases ===\n')

  console.log('✅ Valid Login:')
  console.log('   Email: test@pulsevault.com')
  console.log('   Password: password123')

  console.log('\n❌ Invalid Password:')
  console.log('   Email: test@pulsevault.com')
  console.log('   Password: wrongpassword')

  console.log('\n❌ Non-existent User:')
  console.log('   Email: nonexistent@example.com')
  console.log('   Password: anything')

  console.log('\n❌ Invalid Redirect URI:')
  console.log('   redirect_uri: https://evil.com')
  console.log('   Expected: Error "redirect_uri must start with pulse://"')

  console.log('\n❌ Wrong PKCE Method:')
  console.log('   code_challenge_method: plain')
  console.log('   Expected: Error "code_challenge_method must be S256"')

  console.log('\n=== Integration with Frontend ===\n')
  console.log('The frontend (PulseVault UI) uses Better Auth with OAuth providers.')
  console.log('The backend OAuth is for the mobile app (Pulse camera app).')
  console.log('These are separate authentication systems:\n')
  console.log('  Frontend: Better Auth → Google/GitHub OAuth → PostgreSQL')
  console.log('  Mobile App: PulseVault OAuth → Email/Password → Authorization Code → Token\n')
}

// Run the test
testLogin().catch(console.error)
