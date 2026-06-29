# DynamoDB Setup Guide

This document outlines the DynamoDB schema required for the Nexus Case application's chat/messaging component.

## Table Schema

### Table Name
- **Default**: `nex_agentic` (configured via `DYNAMODB_TABLE_NAME` env var)

### Primary Key Structure

#### Partition Key (Hash Key)
- **Attribute Name**: `chatId`
- **Type**: String (S)
- **Description**: Unique identifier for each chat message, generated as UUID

#### Sort Key (Range Key)
- **Attribute Name**: `timestamp`
- **Type**: String (S)
- **Description**: ISO 8601 timestamp of when the message was created
- **Format**: `YYYY-MM-DDTHH:mm:ss.sssZ`

### Key Schema Definition
```json
{
  "KeySchema": [
    {
      "AttributeName": "chatId",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "timestamp",
      "KeyType": "RANGE"
    }
  ]
}
```

### Attribute Definitions
```json
{
  "AttributeDefinitions": [
    {
      "AttributeName": "chatId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "timestamp",
      "AttributeType": "S"
    },
    {
      "AttributeName": "caseId",
      "AttributeType": "S"
    }
  ]
}
```

## Global Secondary Indexes (GSI)

### Index: `caseId-timestamp-index`

**Purpose**: Query all chat messages for a specific case ordered by timestamp

**Key Schema**:
```json
{
  "KeySchema": [
    {
      "AttributeName": "caseId",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "timestamp",
      "KeyType": "RANGE"
    }
  ]
}
```

**Projection Type**: `ALL` (all attributes included)

**Billing Mode**: On-demand (PAY_PER_REQUEST) - recommended for variable workloads

## Item Schema

### Sample Document
```json
{
  "chatId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-06-29T14:30:00.000Z",
  "caseId": "case-12345",
  "sender": "user",
  "message": "What is the status of this case?",
  "metadata": {
    "userId": "user-456",
    "model": "gemini-2.0-flash"
  }
}
```

### Required Attributes
- `chatId` (String): Unique message identifier
- `timestamp` (String): ISO 8601 timestamp
- `caseId` (String): Related case identifier
- `sender` (String): Either "user" or "gemini"
- `message` (String): The message content

### Optional Attributes
- `metadata` (Object): Additional context (user ID, model used, etc.)

## IAM Permissions Required

For the application to function, the IAM role needs these DynamoDB permissions:

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
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:777997078074:table/nex_agentic",
        "arn:aws:dynamodb:us-east-1:777997078074:table/nex_agentic/index/caseId-timestamp-index"
      ]
    }
  ]
}
```

## Setup Instructions

### Option 1: Automatic Setup (if IAM permissions available)

```bash
pnpm db:setup
```

This will:
1. Create the DynamoDB table with the schema defined above
2. Set billing mode to on-demand
3. Create the GSI for case-based queries

### Option 2: Manual AWS Console Setup

1. Go to AWS DynamoDB Console
2. Click "Create table"
3. Configure:
   - **Table name**: `nex_agentic` (or your configured name)
   - **Partition key**: `chatId` (String)
   - **Sort key**: `timestamp` (String)
4. In "Table settings", keep default capacity (on-demand recommended)
5. Add GSI:
   - **Index name**: `caseId-timestamp-index`
   - **Partition key**: `caseId` (String)
   - **Sort key**: `timestamp` (String)
   - **Projection**: All

### Option 3: Using AWS CLI

```bash
aws dynamodb create-table \
  --table-name nex_agentic \
  --attribute-definitions \
    AttributeName=chatId,AttributeType=S \
    AttributeName=timestamp,AttributeType=S \
    AttributeName=caseId,AttributeType=S \
  --key-schema \
    AttributeName=chatId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --global-secondary-indexes \
    'IndexName=caseId-timestamp-index,Keys=[{AttributeName=caseId,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Verification

### Test Connection

```bash
pnpm db:test
```

This will:
1. Authenticate with DynamoDB using IAM credentials
2. Write a test item to the table
3. Read the test item back
4. Display connection status

### Query Examples

#### Get all messages for a case (using GSI)
```typescript
const queryCommand = new QueryCommand({
  TableName: 'nex_agentic',
  IndexName: 'caseId-timestamp-index',
  KeyConditionExpression: 'caseId = :caseId',
  ExpressionAttributeValues: {
    ':caseId': 'case-12345'
  }
})
```

#### Get a specific message
```typescript
const getCommand = new GetCommand({
  TableName: 'nex_agentic',
  Key: {
    chatId: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-06-29T14:30:00.000Z'
  }
})
```

## Troubleshooting

### Error: "User is not authorized to perform: dynamodb:PutItem"

**Cause**: IAM role doesn't have write permissions

**Solution**: 
1. Go to Vercel Settings → Integrations → Amazon DynamoDB
2. Ensure the IAM role has the required permissions (see IAM Permissions section)
3. Update the role's policy with the necessary actions

### Error: "ResourceNotFoundException"

**Cause**: Table doesn't exist

**Solution**:
1. Run `pnpm db:setup` to create the table, OR
2. Create the table manually using AWS Console or CLI

### Slow Queries

**Cause**: Inefficient query patterns or insufficient capacity

**Solution**:
1. Use the `caseId-timestamp-index` GSI for case-based queries
2. Ensure billing mode is set to `PAY_PER_REQUEST` for automatic scaling
3. Monitor CloudWatch metrics for throttling

## Environment Variables

The following environment variables must be set:

```env
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::777997078074:role/access-apg-yellow-river
DYNAMODB_TABLE_NAME=nex_agentic
```

These are automatically set when you connect the Amazon DynamoDB integration in Vercel.
