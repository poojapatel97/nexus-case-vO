# The Nexus Case - Database Schema Documentation

## Overview

This document describes the PostgreSQL schema for "The Nexus Case", an AI-powered case management system built on Amazon Aurora PostgreSQL with Next.js.

## Table of Contents

1. [Schema Structure](#schema-structure)
2. [Tables](#tables)
3. [Enums](#enums)
4. [Indexes](#indexes)
5. [Relationships](#relationships)
6. [ORM Configuration](#orm-configuration)
7. [Query Examples](#query-examples)

---

## Schema Structure

The database consists of 4 primary tables and 1 optional audit table:

- **users** - System users (attorneys, paralegals, clerks, etc.)
- **cases** - Legal cases managed by the system
- **documents** - Case documents stored in S3
- **audit_logs** - Change tracking for compliance

```
┌─────────────┐
│   users     │
│  (id, role) │
└──────┬──────┘
       │
       ├─── assigned_to ──┐
       │                   │
       │              ┌─────────────┐
       │              │   cases     │
       │              │ (id, status)│
       │              └──────┬──────┘
       │                     │
       │                     ├─── case_id ──┐
       │                     │                │
       │                     │          ┌──────────────┐
       │                     │          │ documents    │
       │                     │          │ (id, s3_path)│
       │                     │          └──────────────┘
       │                     │
       │                     └─── case_id ──┐
       │                                     │
       └────── user_id         ┌──────────────────┐
              audit_logs       │ (action, entity) │
                              └──────────────────┘
```

---

## Tables

### users

Represents users in the system with different roles (admin, attorney, paralegal, etc.).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | SERIAL | No | Auto-increment | Primary key |
| name | VARCHAR(255) | No | - | Full name of user |
| email | VARCHAR(255) | No | - | Unique email address |
| role | user_role | No | 'paralegal' | User role enum |
| created_at | TIMESTAMPTZ | No | CURRENT_TIMESTAMP | Account creation time |
| updated_at | TIMESTAMPTZ | No | CURRENT_TIMESTAMP | Last update time (auto-updated) |

**Unique Constraints:**
- `email` is unique

**Indexes:**
- `idx_users_email` - ON email
- `idx_users_role` - ON role
- `idx_users_created_at` - ON created_at DESC

**Sample Data:**
```sql
INSERT INTO users (name, email, role) VALUES
('Sarah Mitchell', 'sarah.mitchell@nexuslaw.com', 'attorney'),
('James Chen', 'james.chen@nexuslaw.com', 'paralegal'),
('Emma Rodriguez', 'emma.rodriguez@nexuslaw.com', 'admin');
```

---

### cases

Represents legal cases managed through the system.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | SERIAL | No | Auto-increment | Primary key |
| title | VARCHAR(255) | No | - | Case title/name |
| description | TEXT | No | - | Detailed description |
| category | VARCHAR(100) | No | - | Case category (e.g., "Intellectual Property") |
| status | case_status | No | 'pending' | Status enum (pending, active, closed) |
| priority | case_priority | No | 'medium' | Priority enum (low, medium, high) |
| assigned_to | INTEGER | Yes | NULL | FK to users.id |
| created_at | TIMESTAMPTZ | No | CURRENT_TIMESTAMP | Case creation time |
| updated_at | TIMESTAMPTZ | No | CURRENT_TIMESTAMP | Last update time (auto-updated) |

**Foreign Keys:**
- `assigned_to` → `users.id` ON DELETE SET NULL

**Indexes:**
- `idx_cases_status` - ON status
- `idx_cases_priority` - ON priority
- `idx_cases_assigned_to` - ON assigned_to
- `idx_cases_category` - ON category
- `idx_cases_created_at` - ON created_at DESC
- `idx_cases_active` - Partial index: ON created_at WHERE status = 'active' (for common queries)

**Sample Data:**
```sql
INSERT INTO cases (title, description, category, status, priority, assigned_to)
VALUES ('Patent Infringement Suit', '...', 'Intellectual Property', 'active', 'high', 1);
```

---

### documents

Represents documents associated with cases (stored in S3).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | SERIAL | No | Auto-increment | Primary key |
| case_id | INTEGER | No | - | FK to cases.id |
| name | VARCHAR(255) | No | - | Document filename |
| file_path_s3 | VARCHAR(500) | No | - | S3 object key/path |
| file_size | INTEGER | No | - | File size in bytes |
| uploaded_at | TIMESTAMPTZ | No | CURRENT_TIMESTAMP | Upload timestamp |

**Foreign Keys:**
- `case_id` → `cases.id` ON DELETE CASCADE

**Indexes:**
- `idx_documents_case_id` - ON case_id
- `idx_documents_uploaded_at` - ON uploaded_at DESC

**Sample Data:**
```sql
INSERT INTO documents (case_id, name, file_path_s3, file_size)
VALUES (1, 'Patent_Brief.pdf', 's3://nexus-case-docs/1/patent-brief-20240615.pdf', 2048576);
```

---

### audit_logs

Optional but recommended table for tracking changes to cases and documents (audit trail).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | SERIAL | No | Auto-increment | Primary key |
| case_id | INTEGER | Yes | NULL | FK to cases.id |
| user_id | INTEGER | Yes | NULL | FK to users.id |
| action | VARCHAR(50) | No | - | Action performed (create, update, delete, view) |
| entity_type | VARCHAR(50) | No | - | Entity type (case, document, user) |
| entity_id | INTEGER | No | - | ID of affected entity |
| changes | JSONB | Yes | NULL | JSON object of changed fields |
| ip_address | VARCHAR(45) | Yes | NULL | IP address of user |
| created_at | TIMESTAMPTZ | No | CURRENT_TIMESTAMP | Log timestamp |

**Foreign Keys:**
- `case_id` → `cases.id` ON DELETE SET NULL
- `user_id` → `users.id` ON DELETE SET NULL

**Indexes:**
- `idx_audit_logs_case_id` - ON case_id
- `idx_audit_logs_user_id` - ON user_id
- `idx_audit_logs_created_at` - ON created_at DESC
- `idx_audit_logs_entity` - Composite: ON entity_type, entity_id

---

## Enums

### user_role
```sql
CREATE TYPE user_role AS ENUM ('admin', 'attorney', 'paralegal', 'clerk', 'client');
```

### case_status
```sql
CREATE TYPE case_status AS ENUM ('pending', 'active', 'closed');
```

### case_priority
```sql
CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high');
```

---

## Indexes

### Index Strategy

- **Foreign Keys**: All FK columns are indexed for join performance
- **Filters**: Status, priority, category are indexed for WHERE clauses
- **Sorting**: created_at is indexed DESC for common ordering
- **Partial Indexes**: `idx_cases_active` for frequently queried active cases
- **Composite Indexes**: `idx_audit_logs_entity` for combined entity lookups

### Performance Notes

- Indexes on `users.email` and `cases.status` are critical for common queries
- Partial index on active cases significantly improves dashboard performance
- Composite index on audit logs enables efficient entity tracking

---

## Relationships

### One-to-Many: User → Cases

```typescript
User 1 ──→ * Cases
         (assigned_to)
```

A user can have multiple cases assigned to them. When a user is deleted, their assigned cases have `assigned_to` set to NULL.

### One-to-Many: Case → Documents

```typescript
Case 1 ──→ * Documents
        (case_id)
```

A case can have multiple documents. When a case is deleted, all associated documents are deleted (CASCADE).

### One-to-Many: User → AuditLogs

```typescript
User 1 ──→ * AuditLogs
        (user_id)
```

Tracks which user performed each action.

### One-to-Many: Case → AuditLogs

```typescript
Case 1 ──→ * AuditLogs
        (case_id)
```

Tracks all changes to a specific case.

---

## ORM Configuration

### Prisma Schema Location
- File: `prisma/schema.prisma`
- Connection: Uses `DATABASE_URL` environment variable
- Provider: PostgreSQL

### Drizzle Schema Location
- File: `db/schema.ts`
- Exports: Table definitions, relations, and type inference

### Type Definitions Location
- File: `lib/types/nexus-case.ts`
- Includes: Interfaces, enums, request/response types

### Database Connection
- File: `lib/db/aurora.ts`
- Uses: AWS IAM authentication with RDS Signer
- Pool Size: 20 max connections

---

## Query Examples

### SQL DDL

Get all active cases assigned to a user:
```sql
SELECT c.*, u.name as assignee_name
FROM cases c
LEFT JOIN users u ON c.assigned_to = u.id
WHERE c.status = 'active' AND c.assigned_to = $1
ORDER BY c.priority DESC, c.created_at DESC;
```

Get documents for a case with file sizes:
```sql
SELECT id, name, file_path_s3, file_size, uploaded_at
FROM documents
WHERE case_id = $1
ORDER BY uploaded_at DESC;
```

### Prisma Query

```typescript
import { prisma } from '@/lib/prisma'

// Get active cases with assignee
const cases = await prisma.case.findMany({
  where: { status: 'active', assignedTo: userId },
  include: { assignee: true, documents: true },
  orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
})

// Create case and document in transaction
const caseWithDoc = await prisma.$transaction(async (tx) => {
  const newCase = await tx.case.create({
    data: {
      title: 'Patent Infringement',
      description: 'Initial patent claim review',
      category: 'IP',
      status: 'pending',
      priority: 'high',
      assignedTo: 1,
    },
  })

  const doc = await tx.document.create({
    data: {
      caseId: newCase.id,
      name: 'Patent Brief.pdf',
      filePathS3: 's3://bucket/file.pdf',
      fileSize: 1024,
    },
  })

  return { newCase, doc }
})
```

### Drizzle Query

```typescript
import { db } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { cases, documents, users } from '@/db/schema'

// Get active cases with assignee
const activeCases = await db
  .select()
  .from(cases)
  .leftJoin(users, eq(cases.assignedTo, users.id))
  .where(and(eq(cases.status, 'active'), eq(cases.assignedTo, userId)))
  .orderBy(desc(cases.priority), desc(cases.createdAt))

// Get documents for a case
const caseDocuments = await db
  .select()
  .from(documents)
  .where(eq(documents.caseId, caseId))
  .orderBy(desc(documents.uploadedAt))
```

---

## Schema Maintenance

### Auto-Updated Timestamps

The `updated_at` column is automatically updated via a PostgreSQL trigger:

```sql
CREATE TRIGGER trigger_users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

This occurs on both `users` and `cases` tables.

### Constraints

- **Unique**: `users.email`
- **Not Null**: All user/case/document core fields
- **Foreign Keys**: Properly enforced with CASCADE/SET NULL as needed
- **Enums**: Enforce valid status, priority, and role values at the database level

### Scalability Considerations

- Indexes are optimized for read-heavy workloads (common in case management)
- Partial index on active cases reduces scan time for dashboard queries
- JSONB `changes` column in audit_logs provides flexible change tracking
- Connection pool set to 20 for Lambda/Vercel concurrency

---

## Next Steps

1. **Apply the schema**: Run `scripts/001-setup-nexus-case-schema.sql` against Aurora
2. **Configure ORM**: Choose Prisma or Drizzle and configure in code
3. **Create API routes**: Use `lib/db/aurora.ts` for database access
4. **Add seed data**: Create sample users, cases, and documents for testing
5. **Implement audit logging**: Log all case changes for compliance

For questions or schema changes, refer to AWS Aurora documentation or this schema file.
