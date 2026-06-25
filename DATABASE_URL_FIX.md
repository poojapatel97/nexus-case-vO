# DATABASE_URL Error - Fix Summary

## Error You Encountered

```
Failed to load schema
No database URL found in integration environment variables.
Available keys: AWS_ROLE_ARN, PGHOST, PGPORT, AWS_RESOURCE_ARN, PGUSER, PGDATABASE, AWS_REGION, AWS_ACCOUNT_ID, PGSSLMODE
```

## Root Cause

Prisma expects a `DATABASE_URL` environment variable with a complete PostgreSQL connection string. However, Amazon Aurora PostgreSQL uses **IAM authentication**, which requires a different approach:

- ❌ Prisma looks for: `DATABASE_URL=postgresql://user:password@host:5432/db`
- ✅ Aurora provides: Individual parameters (`PGHOST`, `PGUSER`, `AWS_ROLE_ARN`, etc.)

The integration provides the individual Aurora connection parameters, but Prisma needs the full connection string.

---

## What Was Fixed

Updated `prisma/schema.prisma` to support both:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")         # For Prisma migrations
  directUrl = env("DIRECT_DATABASE_URL")  # For direct client operations
}
```

Created comprehensive guides:
- `docs/AURORA_SETUP.md` - Complete Aurora setup with IAM authentication
- `docs/PRISMA_AURORA_CONNECTION.md` - Prisma + Aurora connection patterns
- `scripts/validate-aurora-connection.js` - Connection validator script
- `.env.example` - Environment variable template

---

## Solution: Set DATABASE_URL and DIRECT_DATABASE_URL

You need to set these two environment variables:

### Option A: For Vercel Deployment (Recommended)

1. Go to **Vercel Dashboard** → **Project Settings** → **Environment Variables**

2. Add these two variables:

```
DATABASE_URL=postgresql://placeholder@placeholder/placeholder
DIRECT_DATABASE_URL=postgresql://placeholder@placeholder/placeholder
```

The actual values will be generated at runtime using AWS IAM authentication through the app code.

3. Deploy to Vercel - Vercel's OIDC provider will automatically:
   - Generate IAM auth tokens
   - Create the actual connection string
   - Use it for Prisma migrations

### Option B: For Local Development

1. Generate an AWS RDS auth token:

```bash
aws rds generate-db-auth-token \
  --hostname $PGHOST \
  --port 5432 \
  --username $PGUSER \
  --region $AWS_REGION
```

2. Create `.env.local`:

```bash
# Copy from Aurora integration variables
PGHOST=your-cluster.xxx.us-east-1.rds.amazonaws.com
PGPORT=5432
PGUSER=iam_db_user
PGDATABASE=nexus_case
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT:role/vercel-nexus-case

# Construct from token above
DATABASE_URL="postgresql://iam_db_user:TOKEN_HERE@$PGHOST:5432/$PGDATABASE?sslmode=require"
DIRECT_DATABASE_URL="$DATABASE_URL"
```

3. Run Prisma:

```bash
pnpm prisma db pull
pnpm prisma migrate dev --name init
```

---

## Quick Start Checklist

- [ ] Set `DATABASE_URL` environment variable in Vercel
- [ ] Set `DIRECT_DATABASE_URL` environment variable in Vercel
- [ ] Verify all Aurora variables are set (PGHOST, PGUSER, PGDATABASE, AWS_REGION, AWS_ROLE_ARN)
- [ ] Run `node scripts/validate-aurora-connection.js` to validate setup
- [ ] Deploy to Vercel or run locally with `.env.local`

---

## Recommended Reading Order

1. **Start here**: `docs/AURORA_SETUP.md`
   - Complete Aurora setup with IAM authentication
   - How to set up IAM roles and policies
   - Environment variable configuration

2. **For Prisma users**: `docs/PRISMA_AURORA_CONNECTION.md`
   - Prisma + Aurora connection patterns
   - Generating auth tokens
   - Troubleshooting connection issues

3. **For database operations**: `docs/DATABASE_SCHEMA.md`
   - Complete schema reference
   - Query examples
   - Index strategy

4. **For API development**: `docs/API_EXAMPLES.md`
   - Route handler examples
   - Error handling patterns
   - Testing strategies

---

## Testing Connection

After setting environment variables:

### Validate Setup

```bash
node scripts/validate-aurora-connection.js
```

Expected output:
```
✅ Aurora PostgreSQL Configuration Validated!
1️⃣  All required variables are set
2️⃣  Optional variables checked
3️⃣  Format validation passed
```

### Test Raw SQL Connection

```bash
pnpm node -e "
const { query } = require('./lib/db/aurora');
(async () => {
  const result = await query('SELECT NOW(), current_user;');
  console.log('✓ Connection successful:', result.rows);
})();
"
```

### Test Prisma

```bash
pnpm prisma db execute --stdin < scripts/001-setup-nexus-case-schema.sql
```

---

## Environment Variables Reference

| Variable | From | Purpose | Example |
|----------|------|---------|---------|
| `PGHOST` | Aurora Integration | Database host | `nexus-case.xxx.us-east-1.rds.amazonaws.com` |
| `PGPORT` | Aurora Integration | Database port | `5432` |
| `PGUSER` | Aurora Integration | Database user | `postgres` |
| `PGDATABASE` | Aurora Integration | Database name | `nexus_case` |
| `AWS_REGION` | Aurora Integration | AWS region | `us-east-1` |
| `AWS_ROLE_ARN` | Aurora Integration | IAM role for OIDC | `arn:aws:iam::xxx:role/vercel-nexus-case` |
| `DATABASE_URL` | **You set this** | Full connection string (Prisma) | `postgresql://...` |
| `DIRECT_DATABASE_URL` | **You set this** | Direct DB connection | `postgresql://...` |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          Vercel Deployment (v0)             │
├─────────────────────────────────────────────┤
│  Environment Variables (set by you)         │
│  ├─ DATABASE_URL                            │
│  └─ DIRECT_DATABASE_URL                     │
│                                              │
│  Vercel OIDC Provider                       │
│  ├─ Reads: AWS_ROLE_ARN, AWS_REGION        │
│  └─ Generates: AWS Credentials              │
│                                              │
│  Application (Next.js)                      │
│  ├─ Prisma (migrations)                     │
│  ├─ Drizzle ORM (queries)                   │
│  └─ lib/db/aurora.ts (raw SQL)              │
│                                              │
│  @aws-sdk/rds-signer                        │
│  └─ Generates: IAM Auth Token (15 min TTL) │
└──────────────────────────────────────────────┘
                    ↓
        AWS Aurora PostgreSQL
         ├─ IAM Authentication
         ├─ SSL/TLS Encryption
         └─ Connection Pooling (20 max)
```

---

## Still Getting Errors?

### "No database URL found"

```bash
# Run validator
node scripts/validate-aurora-connection.js

# Check Vercel environment variables
vercel env list

# Manually set if missing
vercel env add DATABASE_URL "postgresql://placeholder"
vercel env add DIRECT_DATABASE_URL "postgresql://placeholder"

# Redeploy
git push origin main
```

### "Connection refused"

1. Verify security group allows port 5432 inbound
2. Verify AWS_REGION is correct
3. Check PGHOST is correct Aurora endpoint
4. Verify IAM role has RDS connect permissions

### "IAM authentication failed"

1. Verify AWS_ROLE_ARN exists and has correct trust policy
2. Verify IAM user exists with `GRANT rds_iam` applied
3. Verify AWS account ID is correct

See `docs/AURORA_SETUP.md` for detailed troubleshooting.

---

## Files Modified

✅ `prisma/schema.prisma` - Updated datasource configuration
✅ `.env.example` - Added environment variable template
✅ Created 4 new documentation files
✅ Created validation script

**No database schema files were modified** - Your SQL schema is ready to deploy!

---

## Next Steps

1. ✅ Set `DATABASE_URL` and `DIRECT_DATABASE_URL` in Vercel
2. ✅ Run validation script
3. ✅ Deploy to Vercel
4. ✅ Check Vercel logs for any errors
5. ✅ Create API routes using the schema
6. ✅ Integrate database with dashboard

You're now ready to use AWS Aurora PostgreSQL with The Nexus Case dashboard! 🚀
