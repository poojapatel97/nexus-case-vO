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
 * Saves a Gemini Copilot chat message to DynamoDB
 * @param caseId - The case ID associated with the chat message
 * @param sender - Either 'user' or 'gemini'
 * @param message - The chat message content
 * @returns Success flag, chatId, and timestamp for immediate UI updates
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

    // Get table name from environment
    const tableName = process.env.DYNAMODB_TABLE_NAME
    if (!tableName) {
      console.error('[v0] DYNAMODB_TABLE_NAME environment variable not set')
      return {
        success: false,
        error: 'Database configuration error: table name not set',
      }
    }

    // Initialize DynamoDB client with AWS IAM authentication
    const region = process.env.AWS_REGION
    const roleArn = process.env.AWS_ROLE_ARN

    if (!region || !roleArn) {
      console.error('[v0] AWS_REGION or AWS_ROLE_ARN environment variables not set')
      return {
        success: false,
        error: 'Database configuration error: AWS credentials not configured',
      }
    }

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

    // Generate unique IDs and timestamps
    const chatId = randomUUID()
    const timestamp = new Date().toISOString()

    // Prepare the chat message item
    const chatMessage: ChatMessage = {
      chatId,
      timestamp,
      caseId,
      sender,
      message: message.trim(),
    }

    // Execute PutCommand to write to DynamoDB
    const command = new PutCommand({
      TableName: tableName,
      Item: chatMessage,
    })

    await docClient.send(command)

    console.log(`[v0] Chat message saved: chatId=${chatId}, caseId=${caseId}, sender=${sender}`)

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
