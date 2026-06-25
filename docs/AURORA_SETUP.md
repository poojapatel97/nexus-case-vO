# AWS Aurora PostgreSQL Setup Guide

## Connection Architecture

This project uses **AWS IAM authentication** for secure connections to Amazon Aurora PostgreSQL. The connection uses:
- AWS RDS Signer for IAM token generation
- AWS OIDC for credential federation via Vercel Functions
- Connection pooling via `pg` library
- Both Prisma ORM and Drizzle ORM support

## Environment Variables Required

The following environment variables must be set in your Vercel project:

```
PGHOST              # Aurora cluster endpoint (e.g., nexus-case-prod.abc123.us-east-1.rds.amazonaws.com)
PGPORT              # PostgreSQL port (default: 5432)
PGUSER              # IAM-enabled database user (default: postgres)
PGDATABASE          # Database name (e.g., nexus_case)
AWS_REGION          # AWS region (e.g., us-east-1)
AWS_ROLE_ARN        # IAM role ARN for OIDC federation (e.g., arn:aws:iam::123456789:role/vercel-nexus-case)
AWS_ACCOUNT_ID      # AWS account ID
PGSSLMODE           # SSL mode (default: require)
```

## Setting Up IAM Authentication

### 1. Create an IAM Role for Vercel

```bash
# Create IAM role with trust relationship to Vercel
aws iam create-role \
  --role-name vercel-nexus-case \
  --assume-role-policy-document file://trust-policy.json
```

**trust-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/oidc.vercel.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com:aud": "YOUR_VERCEL_TEAM_ID"
        }
      }
    }
  ]
}
```

### 2. Create RDS IAM Policy

```bash
aws iam put-role-policy \
  --role-name vercel-nexus-case \
  --policy-name RDSConnect \
  --policy-document file://rds-policy.json
```

**rds-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds-db:connect"
      ],
      "Resource": [
        "arn:aws:rds:REGION:ACCOUNT_ID:dbuser:RESOURCE_ID/*"
      ]
    }
  ]
}
```

### 3. Enable IAM Authentication on Aurora Cluster

```bash
aws rds modify-db-cluster \
  --db-cluster-identifier nexus-case \
  --enable-iam-database-authentication \
  --apply-immediately
```

### 4. Create IAM Database User

Connect to Aurora and run:
```sql
CREATE USER iam_db_user;
GRANT rds_iam TO iam_db_user;

-- For specific permissions:
GRANT CONNECT ON DATABASE nexus_case TO iam_db_user;
GRANT USAGE ON SCHEMA public TO iam_db_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO iam_db_user;
```

## Prisma Configuration

With AWS Aurora PostgreSQL, Prisma requires two connection strings:

1. **DATABASE_URL** - For migration operations via `prisma migrate` or schema introspection
2. **DIRECT_DATABASE_URL** - For direct client operations

Both should use the same connection parameters but may be routed differently in your infrastructure.

### Generate Connection String

```bash
# Construct PostgreSQL connection string
DATABASE_URL="postgresql://PGUSER:PASSWORD@PGHOST:PGPORT/PGDATABASE?sslmode=require"
```

### Run Prisma Migrations

```bash
# Introspect existing database
pnpm prisma db pull

# Generate migration
pnpm prisma migrate dev --name init

# Apply migration to production
pnpm prisma migrate deploy
```

## Drizzle Configuration

Drizzle uses the `lib/db/aurora.ts` connection pool which handles IAM authentication automatically.

No additional configuration needed—Drizzle queries use the established connection pool.

## Testing Connection

### Test with Raw SQL

```bash
# Create test script
cat > test-connection.js << 'EOF'
const { query } = require('./lib/db/aurora');

(async () => {
  try {
    const result = await query('SELECT NOW(), current_user;');
    console.log('✓ Connection successful:', result.rows);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
  }
})();
EOF

node test-connection.js
```

### Test with Prisma

```bash
pnpm prisma db execute --stdin < scripts/001-setup-nexus-case-schema.sql
```

### Test with Drizzle

```bash
# Create test script in lib/test-drizzle.ts
import { db } from '@/db'
import { users } from '@/db/schema'

const result = await db.select().from(users).limit(1)
console.log('✓ Drizzle connection successful:', result)
```

## Deploying to Vercel

### 1. Set Environment Variables

Go to **Vercel Dashboard** → **Project Settings** → **Environment Variables**

Add all required variables listed in "Environment Variables Required" section above.

### 2. Deploy

```bash
git push origin main
```

Vercel will automatically:
- Install dependencies
- Run Prisma client generation
- Deploy the application with AWS credentials from OIDC

## Troubleshooting

### Error: "No database URL found"

**Cause**: Missing `DATABASE_URL` or `DIRECT_DATABASE_URL` environment variable

**Solution**:
```bash
# Construct and add to Vercel:
DATABASE_URL="postgresql://iam_db_user:TOKEN@endpoint:5432/nexus_case?sslmode=require"
DIRECT_DATABASE_URL="$DATABASE_URL"
```

### Error: "IAM database authentication failed"

**Cause**: IAM role or user not properly configured

**Solution**:
1. Verify IAM role has `rds-db:connect` permission
2. Verify Aurora user exists with `GRANT rds_iam` applied
3. Check AWS_ROLE_ARN and AWS_REGION are correct

### Error: "Too many connections"

**Cause**: Connection pool exhausted

**Solution**:
- Increase `max` connections in `lib/db/aurora.ts` (currently 20)
- Implement connection pooling at application level
- Use PgBouncer for connection multiplexing

### Connection Timeout

**Cause**: Security group or network ACL blocking access

**Solution**:
1. Verify Aurora security group allows inbound on port 5432
2. Verify Vercel deployment has correct CIDR range
3. Check AWS_REGION environment variable is correct

## Performance Optimization

### Connection Pool Tuning

In `lib/db/aurora.ts`:

```typescript
const pool = new Pool({
  max: 20,                    // Max concurrent connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Connection attempt timeout
})
```

### Query Optimization

- Use indexes on frequently queried columns ✓
- Use connection transactions for multi-statement operations
- Implement query caching where appropriate
- Avoid long-running transactions

### Monitoring

```typescript
import { getPoolStats } from '@/lib/db/aurora'

// Get pool statistics
const stats = getPoolStats()
console.log('Pool stats:', stats)
// Output: { totalConnections: 5, idleConnections: 3, waitingRequests: 0 }
```

## Security Best Practices

✓ **IAM Authentication** - No passwords stored or transmitted
✓ **SSL/TLS** - All connections use encryption (`sslmode=require`)
✓ **RLS** - Implement Row-Level Security policies for multi-tenant isolation
✓ **Audit Logs** - All changes tracked in `audit_logs` table
✓ **Parameterized Queries** - All SQL queries use parameterized statements to prevent injection
✓ **Connection Pooling** - Reduces database overhead and improves performance

## References

- [AWS Aurora IAM Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [Prisma AWS Aurora Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Drizzle ORM PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [AWS RDS Signer](https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/auth/BasicAWSCredentials.html)
