'use strict'

const fp = require('fastify-plugin')
const { Pool } = require('pg')

/**
 * Database plugin for PulseVault
 * Provides PostgreSQL connection for user authentication and OAuth
 */
module.exports = fp(async function (fastify, opts) {
  const databaseUrl = process.env.DATABASE_URL

  // Skip database setup if DATABASE_URL is not configured
  if (!databaseUrl) {
    fastify.log.warn('DATABASE_URL not configured - database features disabled')
    fastify.decorate('db', null)
    fastify.decorate('dbQuery', async () => {
      throw new Error('Database not configured')
    })
    return
  }

  try {
    // Create PostgreSQL connection pool
    const pool = new Pool({
      connectionString: databaseUrl,
      // Connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
    })

    // Test the connection
    const client = await pool.connect()
    try {
      const result = await client.query('SELECT NOW()')
      fastify.log.info(`Database connected at ${result.rows[0].now}`)
    } finally {
      client.release()
    }

    // Decorate fastify with database pool
    fastify.decorate('db', pool)

    // Helper function for queries
    fastify.decorate('dbQuery', async (text, params) => {
      const start = Date.now()
      try {
        const result = await pool.query(text, params)
        const duration = Date.now() - start
        fastify.log.debug({ query: text, duration, rows: result.rowCount }, 'Database query executed')
        return result
      } catch (error) {
        fastify.log.error({ err: error, query: text }, 'Database query error')
        throw error
      }
    })

    // Cleanup on server close
    fastify.addHook('onClose', async (instance) => {
      await pool.end()
      fastify.log.info('Database pool closed')
    })

    fastify.log.info('Database plugin registered successfully')
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to connect to database')
    // Allow server to start even if database connection fails
    fastify.decorate('db', null)
    fastify.decorate('dbQuery', async () => {
      throw new Error('Database connection failed')
    })
  }
}, {
  name: 'database',
  dependencies: ['config']
})
