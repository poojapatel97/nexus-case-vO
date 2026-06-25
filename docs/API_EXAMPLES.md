# The Nexus Case - API Examples

This document provides practical examples of how to use the Aurora PostgreSQL database with Next.js API routes.

## Table of Contents

1. [Database Setup](#database-setup)
2. [Basic Query Examples](#basic-query-examples)
3. [API Route Examples](#api-route-examples)
4. [Error Handling](#error-handling)

---

## Database Setup

### 1. Apply the SQL Schema

First, apply the database schema to your Aurora instance:

```bash
# Run the migration script
# The scripts/ folder is automatically executed against your Aurora database

# Verify it worked by checking tables exist
psql $DATABASE_URL -c "\dt"
```

### 2. Install Dependencies

```bash
pnpm add pg @aws-sdk/rds-signer @aws-sdk/client-rds @vercel/functions
```

### 3. Set Environment Variables

Configure in your Vercel project settings:
- `PGHOST` - Aurora cluster endpoint
- `PGUSER` - Database user
- `PGDATABASE` - Database name
- `AWS_REGION` - AWS region
- `AWS_ROLE_ARN` - IAM role ARN for authentication

---

## Basic Query Examples

### Raw Queries with lib/db/aurora.ts

```typescript
import { query, withConnection } from '@/lib/db/aurora'

// Simple query
async function getUserByEmail(email: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email])
  return result.rows[0]
}

// Query with JOIN
async function getCasesForUser(userId: number) {
  const result = await query(
    `SELECT c.*, u.name as assignee_name
     FROM cases c
     LEFT JOIN users u ON c.assigned_to = u.id
     WHERE c.assigned_to = $1
     ORDER BY c.priority DESC, c.created_at DESC`,
    [userId]
  )
  return result.rows
}

// Transaction
async function createCaseWithDocument(
  caseData: CreateCaseRequest,
  docData: CreateDocumentRequest
) {
  return await withConnection(async (client) => {
    // Insert case
    const caseResult = await client.query(
      `INSERT INTO cases (title, description, category, status, priority, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        caseData.title,
        caseData.description,
        caseData.category,
        caseData.status || 'pending',
        caseData.priority || 'medium',
        caseData.assignedTo || null,
      ]
    )

    const newCase = caseResult.rows[0]

    // Insert document
    const docResult = await client.query(
      `INSERT INTO documents (case_id, name, file_path_s3, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [newCase.id, docData.name, docData.filePathS3, docData.fileSize]
    )

    // Log audit
    await client.query(
      `INSERT INTO audit_logs (case_id, user_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newCase.id, docData.userId, 'create', 'case', newCase.id, null]
    )

    return { case: newCase, document: docResult.rows[0] }
  })
}
```

---

## API Route Examples

### GET /api/cases - List Cases

```typescript
// app/api/cases/route.ts
import { query } from '@/lib/db/aurora'
import { Case } from '@/lib/types/nexus-case'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    let query_text = 'SELECT * FROM cases WHERE 1=1'
    const params: unknown[] = []

    if (status) {
      params.push(status)
      query_text += ` AND status = $${params.length}`
    }

    if (assignedTo) {
      params.push(parseInt(assignedTo))
      query_text += ` AND assigned_to = $${params.length}`
    }

    query_text += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query<Case>(query_text, params)

    return Response.json({
      success: true,
      data: result.rows,
      limit,
      offset,
    })
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to fetch cases' },
      { status: 500 }
    )
  }
}
```

### POST /api/cases - Create Case

```typescript
// app/api/cases/route.ts
import { withConnection } from '@/lib/db/aurora'
import { CreateCaseRequest } from '@/lib/types/nexus-case'

export async function POST(request: Request) {
  try {
    const body: CreateCaseRequest = await request.json()

    const result = await withConnection(async (client) => {
      const caseResult = await client.query(
        `INSERT INTO cases (title, description, category, status, priority, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          body.title,
          body.description,
          body.category,
          body.status || 'pending',
          body.priority || 'medium',
          body.assignedTo || null,
        ]
      )

      const newCase = caseResult.rows[0]

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, $4)`,
        [null, 'create', 'case', newCase.id]
      )

      return newCase
    })

    return Response.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating case:', error)
    return Response.json(
      { success: false, error: 'Failed to create case' },
      { status: 500 }
    )
  }
}
```

### PATCH /api/cases/[id] - Update Case

```typescript
// app/api/cases/[id]/route.ts
import { withConnection } from '@/lib/db/aurora'
import { UpdateCaseRequest } from '@/lib/types/nexus-case'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = parseInt(params.id)
    const body: UpdateCaseRequest = await request.json()

    const result = await withConnection(async (client) => {
      // Get current case
      const currentResult = await client.query(
        'SELECT * FROM cases WHERE id = $1',
        [caseId]
      )

      if (currentResult.rows.length === 0) {
        throw new Error('Case not found')
      }

      const current = currentResult.rows[0]
      const changes: Record<string, unknown> = {}

      // Track changes
      if (body.status && body.status !== current.status) changes.status = [current.status, body.status]
      if (body.priority && body.priority !== current.priority) changes.priority = [current.priority, body.priority]

      // Update case
      const updates = []
      const values = []
      let paramIndex = 1

      if (body.title) {
        updates.push(`title = $${paramIndex++}`)
        values.push(body.title)
      }
      if (body.description) {
        updates.push(`description = $${paramIndex++}`)
        values.push(body.description)
      }
      if (body.status) {
        updates.push(`status = $${paramIndex++}`)
        values.push(body.status)
      }
      if (body.priority) {
        updates.push(`priority = $${paramIndex++}`)
        values.push(body.priority)
      }
      if (body.assignedTo !== undefined) {
        updates.push(`assigned_to = $${paramIndex++}`)
        values.push(body.assignedTo)
      }

      values.push(caseId)

      const updateResult = await client.query(
        `UPDATE cases SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      )

      // Log audit
      if (Object.keys(changes).length > 0) {
        await client.query(
          `INSERT INTO audit_logs (case_id, action, entity_type, entity_id, changes)
           VALUES ($1, $2, $3, $4, $5)`,
          [caseId, 'update', 'case', caseId, JSON.stringify(changes)]
        )
      }

      return updateResult.rows[0]
    })

    return Response.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating case:', error)
    return Response.json(
      { success: false, error: 'Failed to update case' },
      { status: 500 }
    )
  }
}
```

### GET /api/cases/[id]/documents - List Case Documents

```typescript
// app/api/cases/[id]/documents/route.ts
import { query } from '@/lib/db/aurora'
import { Document } from '@/lib/types/nexus-case'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = parseInt(params.id)

    const result = await query<Document>(
      `SELECT * FROM documents WHERE case_id = $1 ORDER BY uploaded_at DESC`,
      [caseId]
    )

    return Response.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return Response.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
```

### POST /api/cases/[id]/documents - Upload Document

```typescript
// app/api/cases/[id]/documents/route.ts
import { withConnection } from '@/lib/db/aurora'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = parseInt(params.id)
    const { name, filePathS3, fileSize } = await request.json()

    const result = await withConnection(async (client) => {
      // Insert document
      const docResult = await client.query(
        `INSERT INTO documents (case_id, name, file_path_s3, file_size)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [caseId, name, filePathS3, fileSize]
      )

      const doc = docResult.rows[0]

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (case_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, $4)`,
        [caseId, 'create', 'document', doc.id]
      )

      return doc
    })

    return Response.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return Response.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
```

---

## Error Handling

### Standard Error Response Format

```typescript
interface ErrorResponse {
  success: false
  error: string
  message?: string
}

// Example
export async function GET(request: Request) {
  try {
    // ... query logic
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not found')) {
      return Response.json(
        { success: false, error: 'Not found', message },
        { status: 404 }
      )
    }

    if (message.includes('invalid')) {
      return Response.json(
        { success: false, error: 'Invalid request', message },
        { status: 400 }
      )
    }

    console.error('Unhandled error:', error)
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Connection Pool Error Handling

```typescript
import { getPoolStats } from '@/lib/db/aurora'

// Monitor pool health
export async function GET(request: Request) {
  const stats = getPoolStats()

  if (stats.totalConnections === stats.idleConnections) {
    console.warn('All connections idle, possible connection leak')
  }

  if (stats.waitingRequests > 10) {
    console.warn('High number of waiting requests, consider scaling')
  }

  // ... rest of handler
}
```

---

## Testing

### Example Test Cases

```typescript
// __tests__/api/cases.test.ts
import { query, withConnection } from '@/lib/db/aurora'

describe('Cases API', () => {
  test('GET /api/cases returns list of cases', async () => {
    const response = await fetch('/api/cases')
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('POST /api/cases creates new case', async () => {
    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Case',
        description: 'Test description',
        category: 'Test',
      }),
    })
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.id).toBeDefined()
  })
})
```

---

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Wrap multi-statement operations in transactions** using `withConnection()`
3. **Index frequently queried columns** (already done in schema)
4. **Log all mutations** to audit_logs for compliance
5. **Use connection pooling** - never create new connections per request
6. **Handle errors gracefully** - catch, log, and return appropriate status codes
7. **Validate input** before executing queries
8. **Set reasonable query timeouts** to prevent hanging connections
9. **Monitor pool statistics** for connection health
10. **Use prepared statements** with parameterized queries

---

For more information, refer to:
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [Aurora PostgreSQL Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Aurora.html)
- [pg npm package](https://node-postgres.com/)
