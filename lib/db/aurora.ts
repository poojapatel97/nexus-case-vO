// ============================================================================
// Aurora PostgreSQL Database Connection
// Using AWS IAM Authentication with @aws-sdk/rds-signer
// ============================================================================

import { Pool, ClientBase, QueryResult } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { attachDatabasePool } from '@vercel/functions'

// Validate required environment variables
const requiredEnvVars = ['PGHOST', 'PGUSER', 'PGDATABASE', 'AWS_REGION', 'AWS_ROLE_ARN']
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
    'Please configure AWS Aurora PostgreSQL connection variables.',
  )
}

/**
 * Initialize RDS Signer for IAM authentication
 */
const signer = new Signer({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region: process.env.AWS_REGION },
  }),
  region: process.env.AWS_REGION!,
  hostname: process.env.PGHOST!,
  username: process.env.PGUSER || 'postgres',
  port: 5432,
})

/**
 * Create a connection pool for Aurora PostgreSQL
 * - Maximum 20 concurrent connections
 * - Token cached for up to 15 minutes
 * - SSL disabled for Lambda/Vercel functions (recommended)
 */
const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || 'postgres',
  port: 5432,
  user: process.env.PGUSER || 'postgres',
  // Password is generated dynamically by signer
  password: () => signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

// Attach pool to Vercel Functions for monitoring
attachDatabasePool(pool)

// Log pool creation in development
if (process.env.NODE_ENV === 'development') {
  console.log('[Aurora] Connection pool initialized:', {
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
  })
}

// ============================================================================
// QUERY EXECUTION
// ============================================================================

/**
 * Execute a single query (no transaction)
 * @param text - SQL query text
 * @param params - Query parameters for parameterized queries
 * @returns Query result
 * @example
 * const result = await query('SELECT * FROM users WHERE id = $1', [1])
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  try {
    return await pool.query<T>(text, params)
  } catch (error) {
    console.error('[Aurora] Query error:', {
      text: text.substring(0, 100),
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Execute multiple queries within a transaction
 * @param fn - Callback function that receives a client connection
 * @returns Result from callback function
 * @example
 * const result = await withConnection(async (client) => {
 *   await client.query('INSERT INTO cases ...')
 *   await client.query('INSERT INTO audit_logs ...')
 *   return { success: true }
 * })
 */
export async function withConnection<T>(
  fn: (client: ClientBase) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    // Start transaction
    await client.query('BEGIN')

    // Execute user function
    const result = await fn(client)

    // Commit transaction
    await client.query('COMMIT')

    return result
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK')
    console.error('[Aurora] Transaction error:', error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    // Always release connection back to pool
    client.release()
  }
}

/**
 * Get a raw database connection for advanced use cases
 * @returns Database client - must be released manually
 * @example
 * const client = await getConnection()
 * try {
 *   await client.query(...)
 * } finally {
 *   client.release()
 * }
 */
export async function getConnection(): Promise<ClientBase> {
  return pool.connect()
}

// ============================================================================
// CONNECTION POOL MANAGEMENT
// ============================================================================

/**
 * Gracefully close the connection pool
 * Call this during server shutdown
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end()
    console.log('[Aurora] Connection pool closed')
  } catch (error) {
    console.error('[Aurora] Error closing pool:', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { pool, signer }
