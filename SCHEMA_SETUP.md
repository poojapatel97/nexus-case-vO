# The Nexus Case - Database Schema Setup Guide

## Quick Start

Your PostgreSQL schema for "The Nexus Case" is ready to deploy to Amazon Aurora PostgreSQL.

### Files Created

| File | Purpose |
|------|---------|
| `scripts/001-setup-nexus-case-schema.sql` | Raw SQL DDL - run this first against Aurora |
| `prisma/schema.prisma` | Prisma ORM schema (if using Prisma) |
| `db/schema.ts` | Drizzle ORM schema (if using Drizzle) |
| `lib/types/nexus-case.ts` | TypeScript types and interfaces |
| `lib/db/aurora.ts` | Database connection utility with pooling |
| `docs/DATABASE_SCHEMA.md` | Complete schema documentation |
| `docs/API_EXAMPLES.md` | API route examples and best practices |

### Step 1: Apply the SQL Schema

The migration file automatically runs against your Aurora database:

```sql
-- File: scripts/001-setup-nexus-case-schema.sql
-- This creates:
-- - 3 ENUMs (user_role, case_status, case_priority)
-- - 4 tables (users, cases, documents, audit_logs)
-- - Indexes for performance
-- - Auto-update triggers for timestamps
```

### Step 2: Install Dependencies

```bash
pnpm add pg @aws-sdk/rds-signer @aws-sdk/client-rds @vercel/functions
```

### Step 3: Configure Environment Variables

The Amazon Aurora PostgreSQL integration automatically provides:
- `PGHOST` - Aurora endpoint
- `PGUSER` - Database user
- `PGDATABASE` - Database name
- `AWS_REGION` - AWS region
- `AWS_ROLE_ARN` - IAM role for authentication
- `PGSSLMODE` - SSL mode

**⚠️ Important**: For Prisma to work, you must also set:
- `DATABASE_URL` - Full PostgreSQL connection string for migrations
- `DIRECT_DATABASE_URL` - Direct database URL for client operations

See `docs/AURORA_SETUP.md` for complete setup instructions with IAM authentication.

### Step 4: Choose Your ORM

#### Option A: Prisma

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

Then use `prisma/schema.prisma` and run migrations.

#### Option B: Drizzle

```bash
pnpm add drizzle-orm
pnpm add -D drizzle-kit
```

Then use `db/schema.ts` with Drizzle client.

### Step 5: Start Using the Database

```typescript
import { query, withConnection } from '@/lib/db/aurora'
import type { Case, User, Document } from '@/lib/types/nexus-case'

// Simple query
const user = await query('SELECT * FROM users WHERE id = $1', [1])

// Transaction
const result = await withConnection(async (client) => {
  const caseRes = await client.query('INSERT INTO cases (...) RETURNING *')
  const docRes = await client.query('INSERT INTO documents (...) RETURNING *')
  return { case: caseRes.rows[0], document: docRes.rows[0] }
})
```

---

## Schema Overview

### Tables (4 + 1)

1. **users** - System users with roles (admin, attorney, paralegal, clerk, client)
2. **cases** - Legal cases with status (pending, active, closed) and priority (low, medium, high)
3. **documents** - Case documents stored in S3 with metadata
4. **audit_logs** - Change tracking for compliance
5. *(Optional)* - Create additional tables as needed

### Key Features

✓ **Normalized Design** - 3NF with proper foreign keys
✓ **Indexes** - Optimized for common queries
✓ **Enums** - Enforce valid values at database level
✓ **Triggers** - Auto-update timestamps
✓ **Audit Trail** - Full change tracking with JSONB
✓ **Relationships** - Properly defined with CASCADE/SET NULL
✓ **Type Safety** - TypeScript interfaces for all tables

---

## Data Model

```
users (id, name, email, role)
  ├─ 1:N → cases (assigned_to)
  │  ├─ 1:N → documents (case_id) [S3]
  │  └─ 1:N → audit_logs (case_id)
  └─ 1:N → audit_logs (user_id)
```

### Sample Queries

```sql
-- Get active cases
SELECT * FROM cases WHERE status = 'active' ORDER BY priority DESC;

-- Get cases assigned to a user
SELECT c.*, u.name FROM cases c
LEFT JOIN users u ON c.assigned_to = u.id
WHERE c.assigned_to = $1;

-- Get all documents for a case
SELECT * FROM documents WHERE case_id = $1;

-- Get audit trail for a case
SELECT * FROM audit_logs WHERE case_id = $1 ORDER BY created_at DESC;
```

---

## Documentation

### Full Schema Documentation
See `docs/DATABASE_SCHEMA.md` for:
- Complete table reference
- Relationship diagrams
- Index strategy
- Query optimization tips

### API Examples
See `docs/API_EXAMPLES.md` for:
- Practical code examples
- Error handling patterns
- Testing strategies
- Best practices

### Type Definitions
See `lib/types/nexus-case.ts` for:
- TypeScript interfaces
- Request/response types
- Enum constants
- Helper labels

---

## Integration with Dashboard

The schema is designed to work seamlessly with the Nexus Case dashboard UI:

### Case List (Left Panel)
```typescript
// Query structure matches UI data
const cases = await query(`
  SELECT id, title, description, status, priority, assigned_to, created_at
  FROM cases
  WHERE status = ANY($1::case_status[])
  ORDER BY created_at DESC
  LIMIT 20
`, [['active', 'pending']])
```

### Document Viewer (Center Panel)
```typescript
// Documents for selected case
const documents = await query(`
  SELECT id, name, file_path_s3, file_size, uploaded_at
  FROM documents
  WHERE case_id = $1
  ORDER BY uploaded_at DESC
`, [caseId])
```

### Audit Logs (Settings)
```typescript
// Case history for compliance
const history = await query(`
  SELECT al.*, u.name as user_name
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.id
  WHERE al.case_id = $1
  ORDER BY al.created_at DESC
  LIMIT 50
`, [caseId])
```

---

## Production Checklist

- [ ] Schema deployed to Aurora
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] ORM initialized (Prisma or Drizzle)
- [ ] API routes created
- [ ] Error handling implemented
- [ ] Audit logging enabled
- [ ] Connection pooling tested
- [ ] Backup strategy in place
- [ ] Monitoring/alerting configured

---

## Need Help?

1. **Schema Questions**: See `docs/DATABASE_SCHEMA.md`
2. **Code Examples**: See `docs/API_EXAMPLES.md`
3. **Type Definitions**: See `lib/types/nexus-case.ts`
4. **Connection Setup**: See `lib/db/aurora.ts`
5. **AWS Aurora Docs**: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Aurora.html

---

## Next Steps

1. ✅ Review the schema files
2. ✅ Verify Aurora connection is working
3. ✅ Run the SQL migration
4. ✅ Choose Prisma or Drizzle ORM
5. ✅ Create API routes using examples
6. ✅ Integrate with dashboard UI
7. ✅ Deploy to production

Your database is ready! 🚀
