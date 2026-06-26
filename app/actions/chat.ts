'use server'

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { randomUUID } from 'crypto'

interface SaveChatMessageResponse {
  success: boolean
  chatId?: string
  timestamp?: string
  error?: string
}

interface ChatMessage {
  chatId: string
  timestamp: string
  caseId: string
  sender: 'user' | 'gemini'
  message: string
}

/**
 * Saves a Gemini Copilot chat message to DynamoDB using Vercel Marketplace prefixed keys
 */
export async function saveChatMessage(
  caseId: string,
  sender: 'user' | 'gemini',
  message: string
): Promise<SaveChatMessageResponse> {
  try {
    // Validate inputs
    if (!caseId?.trim()) {
      return { success: false, error: 'caseId is required' }
    }
    if (!sender || !['user', 'gemini'].includes(sender)) {
      return { success: false, error: 'sender must be either "user" or "gemini"' }
    }
    if (!message?.trim()) {
      return { success: false, error: 'message cannot be empty' }
    }

    // Map the Vercel Marketplace Integration specific environment variables
    const tableName = process.env.AWS_DYNAMODB_DYNAMODB_TABLE_NAME
    const region = process.env.AWS_DYNAMODB_AWS_REGION
    const roleArn = process.env.AWS_DYNAMODB_AWS_ROLE_ARN

    if (!tableName) {
      console.error('[v0] AWS_DYNAMODB_DYNAMODB_TABLE_NAME environment variable not set')
      return {
        success: false,
        error: 'Database configuration error: table name not set',
      }
    }

    if (!region || !roleArn) {
      console.error('[v0] AWS_DYNAMODB_AWS_REGION or AWS_DYNAMODB_AWS_ROLE_ARN environment variables not set')
      return {
        success: false,
        error: 'Database configuration error: AWS credentials not configured',
      }
    }

    // Initialize DynamoDB client with the OIDC role federation
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

    // Generate unique partition keys and timestamps matching your table structure
    const chatId = randomUUID()
    const timestamp = new Date().toISOString()

    const chatMessage: ChatMessage = {
      chatId,
      timestamp,
      caseId,
      sender,
      message: message.trim(),
    }

    // Execute PutCommand to write the item live
    const command = new PutCommand({
      TableName: tableName,
      Item: chatMessage,
    })

    await docClient.send(command)

    console.log(`[v0] Chat message saved successfully: chatId=${chatId}, caseId=${caseId}`)

    return {
      success: true,
      chatId,
      timestamp,
    }
  } catch (error) {
    console.error('[v0] Error saving chat message:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      success: false,
      error: `Failed to save chat message: ${errorMessage}`,
    }
  }
}