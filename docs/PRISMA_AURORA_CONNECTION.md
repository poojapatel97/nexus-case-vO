# Prisma with AWS Aurora PostgreSQL - Connection Guide

## Problem

By default, Prisma expects a `DATABASE_URL` environment variable with a complete connection string. AWS Aurora PostgreSQL uses IAM authentication, which requires special handling through the `@aws-sdk/rds-signer` package.

## Solution Overview

There are two approaches:

### Approach 1: Prisma + AWS IAM Authentication (Recommended for Vercel)

Use Prisma with `awsCredentialsProvider` from `@vercel/functions/oidc` for zero-secret deployments on Vercel.

### Approach 2: Prisma + Password Authentication (Development Only)

For local development, generate a temporary password and use it in DATABASE_URL.

---

## Approach 1: Using IAM Authentication (Recommended)

### For Vercel Production

Prisma reads the DATABASE_URL and connects using the standard PostgreSQL connection string format. On Vercel, the `@vercel/functions/oidc` provider handles credential generation.

#### Step 1: Generate IAM Database Auth Token

Create a utility to generate the token at startup:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { Signer } from '@aws-sdk/rds-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

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

// Generate token and construct connection string
const token = await signer.getAuthToken()
const dbUrl = `postgresql://${process.env.PGUSER}:${token}@${process.env.PGHOST}:5432/${process.env.PGDATABASE}?sslmode=require`

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
})

export default prisma
```

#### Step 2: Update prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

#### Step 3: Set Environment Variables in Vercel

```bash
# Vercel automatically provides:
PGHOST=your-cluster.xxx.us-east-1.rds.amazonaws.com
PGUSER=postgres
PGDATABASE=nexus_case
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT:role/vercel-nexus-case

# You must add these (construction will happen in lib/prisma.ts):
DATABASE_URL=postgresql://placeholder
DIRECT_DATABASE_URL=postgresql://placeholder
```

---

## Approach 2: Using Password Authentication (Local Development)

### For Local Development Only

#### Step 1: Generate RDS Auth Token Locally

```bash
# Install AWS CLI if not already installed
aws --version

# Generate a 15-minute auth token
aws rds generate-db-auth-token \
  --hostname nexus-case-prod.abc123.us-east-1.rds.amazonaws.com \
  --port 5432 \
  --username iam_db_user \
  --region us-east-1 > /tmp/rds_token.txt

# Read the token
cat /tmp/rds_token.txt
```

#### Step 2: Construct Database URL

```bash
# Format: postgresql://user:password@host:port/database?sslmode=require
DATABASE_URL="postgresql://iam_db_user:$(cat /tmp/rds_token.txt)@nexus-case-prod.abc123.us-east-1.rds.amazonaws.com:5432/nexus_case?sslmode=require"
```

#### Step 3: Add to .env.local

```bash
# .env.local (never commit to git!)
DATABASE_URL="postgresql://iam_db_user:YOUR_TOKEN_HERE@host:5432/nexus_case?sslmode=require"
DIRECT_DATABASE_URL="$DATABASE_URL"
```

#### Step 4: Run Prisma Commands

```bash
# Introspect existing schema
pnpm prisma db pull

# Create a new migration
pnpm prisma migrate dev --name init

# Apply migrations
pnpm prisma migrate deploy
```

---

## Connection String Format

### Standard PostgreSQL URL

```
postgresql://[user[:password]@][host][:port][/database][?param1=value1&...]
```

### For Aurora IAM Auth

```
postgresql://iam_db_user:AUTH_TOKEN@nexus-case.xxx.us-east-1.rds.amazonaws.com:5432/nexus_case?sslmode=require
```

### Components

| Component | Example | Notes |
|-----------|---------|-------|
| `user` | `iam_db_user` | IAM-enabled database user |
| `password` | `AUTH_TOKEN` | 15-minute generated token or password |
| `host` | `nexus-case.xxx.us-east-1.rds.amazonaws.com` | Aurora endpoint |
| `port` | `5432` | PostgreSQL default port |
| `database` | `nexus_case` | Database name |
| `sslmode` | `require` | Always use SSL for Aurora |

---

## Prisma Commands with Aurora

### Local Development (Using Password or Token)

```bash
# Pull current schema from database
pnpm prisma db pull

# Create a migration from schema changes
pnpm prisma migrate dev --name add_cases_table

# Apply pending migrations
pnpm prisma migrate deploy

# Generate Prisma Client
pnpm prisma generate
```

### Production Deployment (Vercel)

Vercel automatically:
1. Installs dependencies
2. Generates Prisma Client
3. Runs migrations (if configured)
4. Deploys the application

No manual Prisma commands needed on Vercel.

---

## Troubleshooting

### Error: "No database URL found"

**Cause**: `DATABASE_URL` environment variable is missing or empty

**Solution**:
```bash
# For local dev:
export DATABASE_URL="postgresql://user:password@host/nexus_case?sslmode=require"

# For Vercel:
vercel env add DATABASE_URL
# Then paste your connection string
```

### Error: "password authentication failed"

**Cause**: Incorrect credentials or expired token

**Solution**:
1. Verify PGUSER matches the Aurora IAM user
2. Regenerate the auth token:
   ```bash
   aws rds generate-db-auth-token \
     --hostname $PGHOST \
     --port 5432 \
     --username iam_db_user \
     --region $AWS_REGION
   ```
3. Update DATABASE_URL with new token

### Error: "SSL certificate problem"

**Cause**: SSL mode mismatch or certificate validation failure

**Solution**:
```bash
# Ensure sslmode=require in DATABASE_URL
postgresql://user:pass@host/db?sslmode=require

# For development only, you can use:
?sslmode=disable
# (NOT recommended for production)
```

### Error: "column "..." does not exist"

**Cause**: Prisma generated client is out of sync with database

**Solution**:
```bash
# Regenerate Prisma Client
pnpm prisma generate

# Pull latest schema
pnpm prisma db pull

# Create new migration if schema changed
pnpm prisma migrate dev
```

---

## Best Practices

### ✅ Do

- ✅ Use IAM authentication for Vercel deployments
- ✅ Set `sslmode=require` for all connections
- ✅ Use `@vercel/functions/oidc` for credential generation
- ✅ Rotate IAM tokens (they expire after 15 minutes)
- ✅ Keep DATABASE_URL secret (add to .gitignore)
- ✅ Test migrations in staging before production

### ❌ Don't

- ❌ Don't commit DATABASE_URL to git
- ❌ Don't use `sslmode=disable` in production
- ❌ Don't hardcode AWS credentials
- ❌ Don't share auth tokens
- ❌ Don't run `prisma migrate resolve` without backup

---

## Example: Complete Setup

### 1. Generate Token Script

Create `scripts/get-db-token.sh`:

```bash
#!/bin/bash

AWS_REGION=${AWS_REGION:-us-east-1}
PGHOST=${PGHOST:-your-cluster.xxx.us-east-1.rds.amazonaws.com}
PGUSER=${PGUSER:-postgres}

TOKEN=$(aws rds generate-db-auth-token \
  --hostname $PGHOST \
  --port 5432 \
  --username $PGUSER \
  --region $AWS_REGION)

echo "postgresql://$PGUSER:$TOKEN@$PGHOST:5432/nexus_case?sslmode=require"
```

### 2. Use in .env.local

```bash
#!/bin/bash
# scripts/setup-local-db.sh

source .env.local || true

export DATABASE_URL=$(bash scripts/get-db-token.sh)
export DIRECT_DATABASE_URL=$DATABASE_URL

echo "DATABASE_URL=$DATABASE_URL"

# Run Prisma commands
pnpm prisma db pull
pnpm prisma migrate dev --name init
```

### 3. Run Setup

```bash
bash scripts/setup-local-db.sh
```

---

## References

- [Prisma PostgreSQL Docs](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [AWS RDS IAM Auth](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [AWS RDS Signer](https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/auth/RDSDBAuthTokenGenerator.html)
- [Vercel OIDC Docs](https://vercel.com/docs/deployments/serverless-functions/identity/oidc)
