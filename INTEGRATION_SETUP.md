# Nexus Dashboard - AWS Integration Setup Guide

## Overview

The Nexus Dashboard integrates with two AWS services:
- **Amazon Aurora PostgreSQL** - For case management, user profiles, and case documents
- **Amazon DynamoDB** - For real-time Gemini Copilot chat messages

## Current Status

✅ **Aurora PostgreSQL**: Connected and seeded with test data
✅ **DynamoDB**: Connected, but requires IAM policy updates
❌ **DynamoDB Permissions**: Need PutItem, GetItem, Query, Scan permissions

## AWS Authentication Architecture

Both services use **AWS IAM Authentication via OIDC** with Vercel's `awsCredentialsProvider`:

```typescript
import { awsCredentialsProvider } from '@vercel/functions/oidc'

const credentials = await awsCredentialsProvider({
  roleArn: process.env.AWS_ROLE_ARN,
  clientConfig: { region: process.env.AWS_REGION },
})
```

This approach:
- ✅ Eliminates long-lived credentials
- ✅ Uses temporary, time-limited tokens
- ✅ Automatically rotates credentials
- ✅ Works seamlessly with Vercel deployments

## Environment Variables

All required environment variables are automatically set by the Vercel integration:

### Aurora PostgreSQL
```
PGHOST=<database-endpoint>
PGUSER=<username>
PGDATABASE=<database-name>
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::account:role/...
```

### DynamoDB
```
DYNAMODB_TABLE_NAME=nex_agentic
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::account:role/...
```

## DynamoDB Table Schema

The `nex_agentic` table stores Gemini Copilot chat messages:

**Primary Keys:**
- Partition Key: `chatId` (String) - Unique message identifier
- Sort Key: `timestamp` (String) - ISO 8601 timestamp for ordering

**Global Secondary Index:**
- Index Name: `caseId-timestamp-index`
- Partition Key: `caseId` (String)
- Sort Key: `timestamp` (String)
- Use: Query all messages for a specific case

**Attributes:**
- `chatId`: Unique message identifier (UUID)
- `timestamp`: ISO 8601 datetime when message was created
- `caseId`: Reference to the case (links to Aurora)
- `sender`: 'user' or 'gemini' (who sent the message)
- `message`: The message content (string)

**Billing Mode:** On-demand (PAY_PER_REQUEST)

## Fix DynamoDB Permissions

The IAM role needs these DynamoDB permissions. Update your AWS role with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DeleteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/nex_agentic",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/nex_agentic/index/*"
      ]
    }
  ]
}
```

### Steps to Update IAM Policy:

1. Go to AWS Console → IAM Roles
2. Find the role: `Vercel/access-apg-...` (shown in validation output)
3. Click "Add permissions" → "Attach policies"
4. Create inline policy with the JSON above
5. Replace `ACCOUNT_ID` with your AWS account ID (found in role ARN)
6. Replace `us-east-1` if using a different region

## Testing & Validation

### Validate Configuration

```bash
pnpm db:validate
```

This script checks:
- ✅ Environment variables are set
- ✅ AWS IAM credentials are obtainable
- ✅ DynamoDB client initializes
- ✅ Write operations work (PutItem)
- ✅ Read operations work (GetItem)
- ✅ Cleanup works (DeleteItem)

### Run Database Setup

```bash
# Create Aurora schema and seed test data
pnpm db:seed

# Setup DynamoDB table (requires create permissions)
pnpm db:setup

# Test connection and write/read
pnpm db:test
```

## Integration Points in the Dashboard

### 1. Chat Messages (DynamoDB)

**File:** `app/actions/chat.ts`

Server Action that saves Gemini Copilot messages:

```typescript
import { saveChatMessage } from '@/app/actions/chat'

// In your component or form handler
const response = await saveChatMessage(
  caseId,      // string
  'gemini',    // 'user' | 'gemini'
  message      // string
)

if (response.success) {
  console.log(`Message saved: ${response.chatId}`)
}
```

### 2. DynamoDB Client Library

**File:** `lib/dynamodb.ts`

Low-level client with full DynamoDB operations:

```typescript
import {
  saveChatMessage,
  getChatMessage,
  getCaseMessages,
  getAllMessages,
} from '@/lib/dynamodb'

// Save a message
const response = await saveChatMessage({
  caseId: 'case-123',
  sender: 'user',
  message: 'Hello Gemini'
})

// Get all messages for a case
const messages = await getCaseMessages('case-123')
```

### 3. Case Management (Aurora)

**File:** `lib/mockData.ts` + schema

Cases are stored in Aurora PostgreSQL with:
- Case details (title, description, status, priority)
- Assigned caseworker
- Category (legal domain)
- Timestamps

## Troubleshooting

### "not authorized" Error

**Problem:** DynamoDB operations fail with "not authorized"

**Solution:** Update IAM role permissions (see "Fix DynamoDB Permissions" above)

### "ResourceNotFoundException"

**Problem:** DynamoDB table doesn't exist

**Solution:** 
1. Verify table name in DYNAMODB_TABLE_NAME env var
2. Ensure table is in the correct region (AWS_REGION)
3. Create table using AWS Console or run `pnpm db:setup`

### "Credential validation error"

**Problem:** AWS credentials cannot be obtained

**Solution:**
1. Verify AWS_ROLE_ARN is set correctly
2. Verify AWS_REGION is set correctly
3. Check that the role exists in your AWS account

### Connection Timeout

**Problem:** Requests hang or timeout

**Solution:**
1. Verify network connectivity to AWS
2. Check security group/network rules allow egress to DynamoDB
3. Verify AWS endpoints are accessible

## Production Deployment

When deploying to Vercel:

1. ✅ Environment variables are automatically injected
2. ✅ IAM credentials are automatically provided via OIDC
3. ✅ No long-lived credentials needed
4. ✅ Credentials automatically rotate

Just ensure:
- [ ] DynamoDB table is created and accessible
- [ ] IAM role has correct permissions
- [ ] Aurora database is accessible to Vercel
- [ ] Environment variables are configured in Vercel settings

## Support Resources

- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS IAM OIDC Provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [Vercel AWS Integration](https://vercel.com/docs/integrations/aws)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
