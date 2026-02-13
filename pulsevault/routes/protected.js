/**
 * Protected Routes Example
 * Demonstrates usage of authentication middleware
 */

module.exports = async function(fastify, opts) {
  
  // Public endpoint - no authentication required
  fastify.get('/api/public/status', async (request, reply) => {
    return {
      status: 'ok',
      message: 'This is a public endpoint',
      timestamp: new Date().toISOString()
    };
  });

  // Protected endpoint - requires valid access token
  fastify.get('/api/protected/profile', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    return {
      message: 'This is a protected endpoint',
      user: request.user,
      timestamp: new Date().toISOString()
    };
  });

  // Optional authentication - shows different content based on auth status
  fastify.get('/api/content', {
    preHandler: fastify.authenticateOptional
  }, async (request, reply) => {
    if (request.user) {
      return {
        message: 'Welcome back!',
        user: {
          email: request.user.email,
          username: request.user.username
        },
        content: 'Premium content for authenticated users',
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        message: 'Welcome, guest!',
        content: 'Public content',
        timestamp: new Date().toISOString()
      };
    }
  });

  // Admin-only endpoint - requires authentication AND admin role
  fastify.get('/api/admin/users', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')]
  }, async (request, reply) => {
    // Get all users (admin only)
    const result = await fastify.dbQuery(
      'SELECT id, email, username, role, created_at FROM users ORDER BY created_at DESC'
    );

    return {
      message: 'Admin endpoint accessed',
      admin: request.user.email,
      users: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    };
  });

  // Moderator or Admin endpoint - requires specific roles
  fastify.get('/api/moderation/reports', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin', 'moderator')]
  }, async (request, reply) => {
    return {
      message: 'Moderation endpoint accessed',
      moderator: request.user.email,
      role: request.user.role,
      reports: [],
      timestamp: new Date().toISOString()
    };
  });

  // User profile endpoint - returns current user's profile information
  fastify.get('/api/user/profile', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    // Get full user profile from database
    const result = await fastify.dbQuery(
      'SELECT id, email, name, role, created_at, updated_at FROM "user" WHERE id = $1',
      [request.user.user_id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'not_found',
        error_description: 'User profile not found'
      });
    }

    const profile = result.rows[0];

    return {
      message: 'User profile retrieved',
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      timestamp: new Date().toISOString()
    };
  });

  // User's own data endpoint
  fastify.get('/api/user/videos', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    // Get videos uploaded by the authenticated user
    const result = await fastify.dbQuery(
      'SELECT id, title, description, created_at FROM videos WHERE uploader_id = $1 ORDER BY created_at DESC',
      [request.user.user_id]
    );

    return {
      message: 'Your videos',
      user: {
        id: request.user.user_id,
        email: request.user.email
      },
      videos: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    };
  });

  // Token info endpoint - shows information about the current token
  fastify.get('/api/auth/token-info', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    return {
      user: {
        id: request.user.user_id,
        email: request.user.email,
        username: request.user.username,
        role: request.user.role
      },
      token: {
        issued_at: request.user.token_issued_at,
        expires_at: request.user.token_expires_at,
        time_remaining: Math.floor((request.user.token_expires_at - new Date()) / 1000) + ' seconds'
      },
      timestamp: new Date().toISOString()
    };
  });

  // Logout endpoint - revokes the current token
  fastify.post('/api/auth/logout', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    // Extract token from Authorization header
    const token = request.headers.authorization.split(' ')[1];

    // Revoke the token
    await fastify.dbQuery(
      'UPDATE oauth_tokens SET revoked_at = NOW() WHERE access_token = $1',
      [token]
    );

    // Log the logout
    await fastify.auditLog({
      action: 'user.logout',
      user_id: request.user.user_id,
      details: {
        email: request.user.email,
        method: 'token_revocation'
      }
    });

    return {
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    };
  });

  // Revoke all tokens for current user
  fastify.post('/api/auth/logout-all', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    // Revoke all tokens for the user
    const result = await fastify.dbQuery(
      'UPDATE oauth_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL RETURNING device_name',
      [request.user.user_id]
    );

    // Log the action
    await fastify.auditLog({
      action: 'user.logout_all_devices',
      user_id: request.user.user_id,
      details: {
        email: request.user.email,
        devices_logged_out: result.rows.length
      }
    });

    return {
      message: 'Logged out from all devices',
      devices_revoked: result.rows.length,
      devices: result.rows.map(r => r.device_name),
      timestamp: new Date().toISOString()
    };
  });
};
