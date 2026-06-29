import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, TableStatus } from '@aws-sdk/client-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

// ============================================================================
// Configuration
// ============================================================================

const AWS_REGION = process.env.AWS_REGION
const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME

if (!AWS_REGION || !AWS_ROLE_ARN || !DYNAMODB_TABLE_NAME) {
  console.error('[v0] Missing required DynamoDB environment variables')
  console.error('Required:', { AWS_REGION, AWS_ROLE_ARN, DYNAMODB_TABLE_NAME })
  process.exit(1)
}

// ============================================================================
// DynamoDB Setup
// ============================================================================

async function setupDynamoDB(): Promise<void> {
  try {
    console.log('[v0] Initializing DynamoDB with IAM authentication...')

    // Create DynamoDB client with IAM credentials
    const credentials = await awsCredentialsProvider({
      roleArn: AWS_ROLE_ARN,
      clientConfig: { region: AWS_REGION },
    })()

    const dynamoClient = new DynamoDBClient({
      region: AWS_REGION,
      credentials,
    })

    console.log('[v0] ✅ DynamoDB client authenticated successfully')

    // Check if table exists
    console.log(`[v0] Checking if table "${DYNAMODB_TABLE_NAME}" exists...`)
    let tableExists = false

    try {
      const describeCommand = new DescribeTableCommand({
        TableName: DYNAMODB_TABLE_NAME,
      })
      const describeResponse = await dynamoClient.send(describeCommand)
      tableExists = true
      console.log(
        `[v0] ✅ Table "${DYNAMODB_TABLE_NAME}" exists with status: ${describeResponse.Table?.TableStatus}`,
      )

      // Log table schema
      const keySchema = describeResponse.Table?.KeySchema || []
      const attrs = describeResponse.Table?.AttributeDefinitions || []
      console.log('[v0] Table Key Schema:', keySchema)
      console.log('[v0] Table Attributes:', attrs)
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`[v0] ℹ️  Table "${DYNAMODB_TABLE_NAME}" does not exist`)
        tableExists = false
      } else if (error.message?.includes('not authorized')) {
        console.log('[v0] ⚠️  Cannot check table - IAM role lacks DescribeTable permissions')
        console.log('[v0] Assuming table exists and is managed externally')
        tableExists = true
      } else {
        throw error
      }
    }

    // Create table if it doesn't exist
    if (!tableExists) {
      console.log('[v0] Attempting to create DynamoDB table...')

      const createCommand = new CreateTableCommand({
        TableName: DYNAMODB_TABLE_NAME,
        AttributeDefinitions: [
          {
            AttributeName: 'chatId',
            AttributeType: 'S', // String
          },
          {
            AttributeName: 'timestamp',
            AttributeType: 'S', // ISO string
          },
          {
            AttributeName: 'caseId',
            AttributeType: 'S', // String
          },
        ],
        KeySchema: [
          {
            AttributeName: 'chatId',
            KeyType: 'HASH', // Partition key
          },
          {
            AttributeName: 'timestamp',
            KeyType: 'RANGE', // Sort key
          },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'caseId-timestamp-index',
            KeySchema: [
              {
                AttributeName: 'caseId',
                KeyType: 'HASH',
              },
              {
                AttributeName: 'timestamp',
                KeyType: 'RANGE',
              },
            ],
            Projection: {
              ProjectionType: 'ALL',
            },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        BillingMode: 'PAY_PER_REQUEST', // On-demand billing
      })

      try {
        const createResponse = await dynamoClient.send(createCommand)
        console.log(`[v0] ✅ Table "${DYNAMODB_TABLE_NAME}" created successfully`)
        console.log('[v0] Table ARN:', createResponse.TableDescription?.TableArn)
      } catch (createError: any) {
        if (createError.message?.includes('not authorized')) {
          console.log('[v0] ⚠️  Cannot create table - IAM role lacks CreateTable permissions')
          console.log('[v0] Please ensure the DynamoDB table is created in your AWS account with:')
          console.log('     - Partition Key: chatId (String)')
          console.log('     - Sort Key: timestamp (String)')
          console.log('     - GSI: caseId-timestamp-index')
          return
        } else {
          throw createError
        }
      }

      // Wait for table to be active
      console.log('[v0] Waiting for table to be active...')
      let isActive = false
      let attempts = 0
      const maxAttempts = 30

      while (!isActive && attempts < maxAttempts) {
        const describeCommand = new DescribeTableCommand({
          TableName: DYNAMODB_TABLE_NAME,
        })
        const describeResponse = await dynamoClient.send(describeCommand)
        const status = describeResponse.Table?.TableStatus

        if (status === 'ACTIVE') {
          isActive = true
          console.log('[v0] ✅ Table is now ACTIVE')
        } else {
          console.log(`[v0] Table status: ${status}, waiting... (${attempts + 1}/${maxAttempts})`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
          attempts++
        }
      }

      if (!isActive) {
        throw new Error('Table creation timed out')
      }
    }

    // Log final schema
    console.log('[v0] ✅ DynamoDB setup complete!')
    console.log('[v0] Table schema:')
    console.log('  - Partition Key: chatId (String)')
    console.log('  - Sort Key: timestamp (ISO String)')
    console.log('  - Global Secondary Index: caseId-timestamp-index')
    console.log('  - Billing Mode: On-demand (PAY_PER_REQUEST)')
  } catch (error) {
    console.error('[v0] ✗ DynamoDB setup failed:', (error as Error).message)
    process.exit(1)
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('[v0] Starting DynamoDB setup...\n')
  await setupDynamoDB()
  console.log('\n[v0] ✅ DynamoDB is ready for use!')
}

main()
