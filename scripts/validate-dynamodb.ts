import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

async function validateDynamoDB() {
  console.log('[v0] Starting DynamoDB validation...\n')

  // 1. Check environment variables
  console.log('[v0] Step 1: Validating environment variables...')
  const tableName = process.env.DYNAMODB_TABLE_NAME
  const region = process.env.AWS_REGION
  const roleArn = process.env.AWS_ROLE_ARN

  if (!tableName) {
    console.error('[v0] ❌ DYNAMODB_TABLE_NAME is not set')
    process.exit(1)
  }
  if (!region) {
    console.error('[v0] ❌ AWS_REGION is not set')
    process.exit(1)
  }
  if (!roleArn) {
    console.error('[v0] ❌ AWS_ROLE_ARN is not set')
    process.exit(1)
  }

  console.log('[v0] ✅ All environment variables are set')
  console.log(`    DYNAMODB_TABLE_NAME: ${tableName}`)
  console.log(`    AWS_REGION: ${region}`)
  console.log(`    AWS_ROLE_ARN: ${roleArn.substring(0, 50)}...`)

  // 2. Test IAM credentials
  console.log('\n[v0] Step 2: Testing AWS IAM credentials...')
  try {
    const credentials = await awsCredentialsProvider({
      roleArn,
      clientConfig: { region },
    })()

    console.log('[v0] ✅ AWS IAM credentials obtained successfully')
    console.log(`    Access Key ID: ${credentials.accessKeyId.substring(0, 10)}...`)
  } catch (error) {
    console.error('[v0] ❌ Failed to obtain AWS credentials:', error)
    process.exit(1)
  }

  // 3. Test DynamoDB client initialization
  console.log('\n[v0] Step 3: Initializing DynamoDB client...')
  try {
    const client = new DynamoDBClient({
      region,
      credentials: awsCredentialsProvider({
        roleArn,
        clientConfig: { region },
      }),
    })

    const docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    })

    console.log('[v0] ✅ DynamoDB client initialized')

    // 4. Test write operation
    console.log('\n[v0] Step 4: Testing write operation (PutItem)...')
    const testChatId = `test-${Date.now()}`
    const testTimestamp = new Date().toISOString()

    const testItem = {
      chatId: testChatId,
      timestamp: testTimestamp,
      caseId: 'test-case-001',
      sender: 'user',
      message: 'Test message for validation',
    }

    try {
      const putCommand = new PutCommand({
        TableName: tableName,
        Item: testItem,
      })

      await docClient.send(putCommand)
      console.log('[v0] ✅ Successfully wrote test item to DynamoDB')
      console.log(`    chatId: ${testChatId}`)

      // 5. Test read operation
      console.log('\n[v0] Step 5: Testing read operation (GetItem)...')
      try {
        const getCommand = new GetCommand({
          TableName: tableName,
          Key: { chatId: testChatId },
        })

        const result = await docClient.send(getCommand)
        if (result.Item) {
          console.log('[v0] ✅ Successfully read item from DynamoDB')
          console.log(`    Retrieved item:`, result.Item)

          // 6. Clean up test item
          console.log('\n[v0] Step 6: Cleaning up test item...')
          try {
            const deleteCommand = new DeleteCommand({
              TableName: tableName,
              Key: { chatId: testChatId },
            })

            await docClient.send(deleteCommand)
            console.log('[v0] ✅ Successfully deleted test item')
          } catch (error) {
            console.warn('[v0] ⚠️  Could not delete test item:', error)
          }

          // Success!
          console.log('\n[v0] ✅ DynamoDB validation completed successfully!')
          console.log('\nSummary:')
          console.log('  - Environment variables: ✅')
          console.log('  - AWS IAM credentials: ✅')
          console.log('  - DynamoDB client: ✅')
          console.log('  - Write operation (PutItem): ✅')
          console.log('  - Read operation (GetItem): ✅')
          console.log(`\nDashboard is ready to use DynamoDB with table: ${tableName}`)
        } else {
          console.error('[v0] ❌ Test item was not found after write')
          process.exit(1)
        }
      } catch (error) {
        console.error('[v0] ❌ Read operation failed:', error)
        process.exit(1)
      }
    } catch (error) {
      const err = error as any
      if (err.message?.includes('ResourceNotFoundException')) {
        console.error(
          `[v0] ❌ Table "${tableName}" does not exist in region "${region}"`,
        )
        console.error('[v0] Please create the DynamoDB table with:')
        console.error('     Partition Key: chatId (String)')
        console.error('     Sort Key: timestamp (String)')
        console.error('     GSI: caseId-timestamp-index (caseId as PK, timestamp as SK)')
      } else if (err.message?.includes('not authorized')) {
        console.error(
          '[v0] ❌ IAM role does not have DynamoDB PutItem permissions',
        )
        console.error('[v0] Please add these permissions to your IAM role:')
        console.error('     - dynamodb:PutItem')
        console.error('     - dynamodb:GetItem')
        console.error('     - dynamodb:Query')
        console.error('     - dynamodb:Scan')
      } else {
        console.error('[v0] ❌ Write operation failed:', error)
      }
      process.exit(1)
    }
  } catch (error) {
    console.error('[v0] ❌ Failed to initialize DynamoDB client:', error)
    process.exit(1)
  }
}

validateDynamoDB().catch((error) => {
  console.error('[v0] Validation script error:', error)
  process.exit(1)
})
