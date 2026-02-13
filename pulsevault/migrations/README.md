# PulseVault OAuth 2.0 Database Schema

## Overview

This directory contains the database schema for PulseVault's OAuth 2.0 authentication system with PKCE (Proof Key for Code Exchange) support.

## Tables

### 1. `oauth_authorization_codes`
Stores temporary authorization codes issued during the OAuth 2.0 authorization code flow.

**Key Features:**
- ✅ PKCE support (RFC 7636) with `code_challenge` and `code_challenge_method`
- ✅ Device tracking (device_id, device_name, device_type)
- ✅ Security metadata (IP address, user agent)
- ✅ Automatic expiration tracking
- ✅ One-time use enforcement (`used_at` timestamp)

**Typical Lifetime:** 10 minutes (configurable)

### 2. `oauth_tokens`
Stores access tokens and refresh tokens with comprehensive tracking.

**Key Features:**
- ✅ Access token and refresh token storage
- ✅ Device fingerprinting for security
- ✅ Usage tracking (last_used_at, last_used_ip)
- ✅ Revocation support with reason tracking
- ✅ Separate expiration for access and refresh tokens
- ✅ Active token indexing for performance

**Typical Lifetimes:**
- Access Token: 1 hour (3600 seconds)
- Refresh Token: 30 days (2592000 seconds)

### 3. `oauth_clients`
Stores registered OAuth 2.0 clients (for multi-client support).

**Key Features:**
- ✅ Client credentials (hashed secret)
- ✅ Multiple redirect URI support
- ✅ Configurable token lifetimes
- ✅ PKCE enforcement option
- ✅ Grant type restrictions
- ✅ Scope management

## Usage

### Apply the Schema

```bash
# Using psql
psql -U pulsevault -d pulsevault -f migrations/001_oauth_tables.sql

# Or using a migration tool
# Add to your migration system
```

### Cleanup Functions

The schema includes two cleanup functions:

```sql
-- Cleanup expired authorization codes (older than 1 day)
SELECT cleanup_expired_oauth_codes();

-- Cleanup expired tokens (older than 7 days past expiration)
SELECT cleanup_expired_oauth_tokens();
```

**Recommended Cron Schedule:**
```bash
# Run cleanup daily at 2 AM
0 2 * * * psql -U pulsevault -d pulsevault -c "SELECT cleanup_expired_oauth_codes();"
0 2 * * * psql -U pulsevault -d pulsevault -c "SELECT cleanup_expired_oauth_tokens();"
```

## OAuth 2.0 Flow with PKCE

### Authorization Code Flow (with PKCE)

```
1. Client generates code_verifier (random string, 43-128 chars)
2. Client creates code_challenge = BASE64URL(SHA256(code_verifier))
3. Client redirects to /oauth/authorize with:
   - client_id
   - redirect_uri
   - scope
   - code_challenge
   - code_challenge_method=S256
   - state (CSRF protection)

4. Server validates and stores authorization code in oauth_authorization_codes

5. Client receives authorization code at redirect_uri

6. Client exchanges code for tokens at /oauth/token with:
   - code
   - code_verifier (proves client identity)
   - client_id
   - redirect_uri

7. Server validates code_verifier matches code_challenge
8. Server issues access_token and refresh_token
9. Tokens stored in oauth_tokens table
```

## Indexes

**Performance Optimizations:**
- Fast token lookup by access_token or refresh_token
- Efficient user token queries (user_id + device_id)
- Quick expiration checks for cleanup
- Active token filtering (WHERE revoked_at IS NULL)

## Security Considerations

### PKCE (Proof Key for Code Exchange)
- **Prevents authorization code interception attacks**
- Required for public clients (mobile apps, SPAs)
- Recommended for all clients

### Token Security
- Store only hashed tokens in production (not implemented in schema, do at application level)
- Use secure random token generation (min 256 bits entropy)
- Implement rate limiting on token endpoints
- Rotate refresh tokens on use (optional)

### Device Tracking
- Track device_id for token management
- Allow users to revoke tokens per device
- Monitor suspicious device changes

### Revocation
- Soft delete with revoked_at timestamp
- Track revocation reason for audit
- Support bulk revocation (all user tokens, all device tokens)

## Example Queries

### Create Authorization Code
```sql
INSERT INTO oauth_authorization_codes (
    code, user_id, client_id, redirect_uri, scope,
    code_challenge, code_challenge_method,
    device_id, ip_address, expires_at
) VALUES (
    'AUTH_CODE_123',
    'user_456',
    'mobile_app',
    'com.pulsevault.app://callback',
    'read write',
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    'S256',
    'device_789',
    '192.168.1.100',
    NOW() + INTERVAL '10 minutes'
);
```

### Validate and Use Authorization Code
```sql
-- Check if code is valid
SELECT * FROM oauth_authorization_codes
WHERE code = 'AUTH_CODE_123'
  AND expires_at > NOW()
  AND used_at IS NULL
  AND revoked_at IS NULL;

-- Mark as used
UPDATE oauth_authorization_codes
SET used_at = NOW()
WHERE code = 'AUTH_CODE_123';
```

### Issue Tokens
```sql
INSERT INTO oauth_tokens (
    access_token, refresh_token, user_id, client_id, device_id,
    scope, ip_address, access_token_expires_at, refresh_token_expires_at
) VALUES (
    'ACCESS_TOKEN_XYZ',
    'REFRESH_TOKEN_ABC',
    'user_456',
    'mobile_app',
    'device_789',
    'read write',
    '192.168.1.100',
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '30 days'
);
```

### Validate Access Token
```sql
SELECT * FROM oauth_tokens
WHERE access_token = 'ACCESS_TOKEN_XYZ'
  AND access_token_expires_at > NOW()
  AND revoked_at IS NULL;

-- Update last used
UPDATE oauth_tokens
SET last_used_at = NOW(),
    last_used_ip = '192.168.1.100'
WHERE access_token = 'ACCESS_TOKEN_XYZ';
```

### Refresh Token
```sql
-- Validate refresh token
SELECT * FROM oauth_tokens
WHERE refresh_token = 'REFRESH_TOKEN_ABC'
  AND refresh_token_expires_at > NOW()
  AND revoked_at IS NULL;

-- Issue new access token (keep same refresh token or rotate)
UPDATE oauth_tokens
SET access_token = 'NEW_ACCESS_TOKEN_XYZ',
    access_token_expires_at = NOW() + INTERVAL '1 hour',
    updated_at = NOW()
WHERE refresh_token = 'REFRESH_TOKEN_ABC';
```

### Revoke Token
```sql
-- Revoke by access token
UPDATE oauth_tokens
SET revoked_at = NOW(),
    revoked_by = 'user',
    revoke_reason = 'User logged out'
WHERE access_token = 'ACCESS_TOKEN_XYZ';

-- Revoke all tokens for a device
UPDATE oauth_tokens
SET revoked_at = NOW(),
    revoked_by = 'user',
    revoke_reason = 'Device removed'
WHERE user_id = 'user_456'
  AND device_id = 'device_789'
  AND revoked_at IS NULL;

-- Revoke all tokens for a user
UPDATE oauth_tokens
SET revoked_at = NOW(),
    revoked_by = 'user',
    revoke_reason = 'User revoked all sessions'
WHERE user_id = 'user_456'
  AND revoked_at IS NULL;
```

### List Active Sessions (User's Devices)
```sql
SELECT 
    device_id,
    device_name,
    device_type,
    ip_address,
    last_used_at,
    created_at,
    access_token_expires_at
FROM oauth_tokens
WHERE user_id = 'user_456'
  AND revoked_at IS NULL
  AND refresh_token_expires_at > NOW()
ORDER BY last_used_at DESC;
```

## Integration with PulseVault

### Environment Variables

Add to `pulsevault/.env`:

```env
# OAuth Configuration
OAUTH_ENABLED=true
OAUTH_CODE_EXPIRY_SECONDS=600          # 10 minutes
OAUTH_ACCESS_TOKEN_EXPIRY_SECONDS=3600  # 1 hour
OAUTH_REFRESH_TOKEN_EXPIRY_DAYS=30      # 30 days
OAUTH_REQUIRE_PKCE=true                 # Enforce PKCE

# Default OAuth Client (for PulseVault mobile app)
OAUTH_CLIENT_ID=pulsevault-mobile
OAUTH_CLIENT_SECRET=your-secret-here-change-in-production
```

### Next Steps

1. Implement OAuth routes in `pulsevault/routes/oauth.js`
2. Add PKCE validation logic
3. Implement token generation and validation
4. Add rate limiting to OAuth endpoints
5. Set up scheduled cleanup jobs
6. Add audit logging for OAuth events

## References

- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
