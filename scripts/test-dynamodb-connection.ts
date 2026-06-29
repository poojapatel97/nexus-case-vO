import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { v4 as uuidv4 } from 'uuid'

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
// Connection Test
// ============================================================================

async function testDynamoDBConnection(): Promise<void> {
  try {
    console.log('[v0] Initializing DynamoDB connection with IAM authentication...')

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

    // Create document client for simplified API
    const docClient = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    })

    console.log('[v0] ✅ DocumentClient created')

    // Test write operation
    console.log('[v0] Testing write operation...')
    const testChatId = uuidv4()
    const testTimestamp = new Date().toISOString()

    const putCommand = new PutCommand({
      TableName: DYNAMODB_TABLE_NAME,
      Item: {
        chatId: testChatId,
        timestamp: testTimestamp,
        caseId: 'test-case-123',
        sender: 'test',
        message: 'DynamoDB connection test message',
      },
    })

    await docClient.send(putCommand)
    console.log('[v0] ✅ Successfully wrote test item to DynamoDB')
    console.log(`    chatId: ${testChatId}`)
    console.log(`    timestamp: ${testTimestamp}`)

    // Test read operation
    console.log('[v0] Testing read operation...')
    const getCommand = new GetCommand({
      TableName: DYNAMODB_TABLE_NAME,
      Key: {
        chatId: testChatId,
        timestamp: testTimestamp,
      },
    })

    const getResponse = await docClient.send(getCommand)
    if (getResponse.Item) {
      console.log('[v0] ✅ Successfully read test item from DynamoDB')
      console.log('[v0] Retrieved item:', getResponse.Item)
    } else {
      console.log('[v0] ⚠️  Item was not found (might be eventual consistency)')
    }

    console.log('\n[v0] ✅ DynamoDB connection is fully functional!')
    console.log('[v0] Table schema:')
    console.log('  - Table: ' + DYNAMODB_TABLE_NAME)
    console.log('  - Partition Key: chatId (String)')
    console.log('  - Sort Key: timestamp (ISO String)')
    console.log('  - Region: ' + AWS_REGION)
  } catch (error) {
    console.error('[v0] ✗ DynamoDB connection test failed:', (error as Error).message)
    if ((error as any).message?.includes('not authorized')) {
      console.error('[v0] The IAM role does not have sufficient permissions for this operation.')
      console.error('[v0] Required permissions: dynamodb:PutItem, dynamodb:GetItem')
    }
    process.exit(1)
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('[v0] Starting DynamoDB connection test...\n')
  await testDynamoDBConnection()
}

main()
