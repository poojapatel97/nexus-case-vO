import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME
const AWS_REGION = process.env.AWS_REGION
const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN

// Validate environment variables
if (!TABLE_NAME) {
  console.error('[v0] Missing DYNAMODB_TABLE_NAME environment variable')
}

if (!AWS_REGION) {
  console.error('[v0] Missing AWS_REGION environment variable')
}

if (!AWS_ROLE_ARN) {
  console.error('[v0] Missing AWS_ROLE_ARN environment variable')
}

// Initialize DynamoDB client with AWS IAM authentication via OIDC
const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: awsCredentialsProvider({
    roleArn: AWS_ROLE_ARN!,
    clientConfig: { region: AWS_REGION },
  }),
})

// Create DocumentClient for simplified data handling
export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

// Export table name for use in queries
export { TABLE_NAME }

// Type definitions for chat messages
export interface ChatMessage {
  chatId: string
  timestamp: string
  caseId: string
  sender: 'user' | 'gemini'
  message: string
}

export interface ChatMessageResponse {
  success: boolean
  chatId?: string
  timestamp?: string
  error?: string
}

/**
 * Save a chat message to DynamoDB
 */
export async function saveChatMessage(
  message: Omit<ChatMessage, 'chatId' | 'timestamp'> & { chatId?: string; timestamp?: string }
): Promise<ChatMessageResponse> {
  try {
    if (!TABLE_NAME || !AWS_REGION || !AWS_ROLE_ARN) {
      return {
        success: false,
        error: 'DynamoDB not properly configured',
      }
    }

    // Use provided chatId/timestamp or generate new ones
    const chatId = message.chatId || generateChatId()
    const timestamp = message.timestamp || new Date().toISOString()

    const item: ChatMessage = {
      chatId,
      timestamp,
      caseId: message.caseId,
      sender: message.sender,
      message: message.message,
    }

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })

    await docClient.send(command)

    console.log(`[v0] Chat message saved: chatId=${chatId}, caseId=${message.caseId}`)

    return {
      success: true,
      chatId,
      timestamp,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[v0] Error saving chat message:', errorMessage)
    return {
      success: false,
      error: `Failed to save message: ${errorMessage}`,
    }
  }
}

/**
 * Get a single chat message by chatId
 */
export async function getChatMessage(chatId: string): Promise<ChatMessage | null> {
  try {
    if (!TABLE_NAME) return null

    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { chatId },
    })

    const result = await docClient.send(command)
    return (result.Item as ChatMessage) || null
  } catch (error) {
    console.error('[v0] Error fetching chat message:', error)
    return null
  }
}

/**
 * Get all messages for a specific case (using GSI)
 */
export async function getCaseMessages(caseId: string): Promise<ChatMessage[]> {
  try {
    if (!TABLE_NAME) return []

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'caseId-timestamp-index',
      KeyConditionExpression: 'caseId = :caseId',
      ExpressionAttributeValues: {
        ':caseId': caseId,
      },
      ScanIndexForward: false, // Most recent first
    })

    const result = await docClient.send(command)
    return (result.Items as ChatMessage[]) || []
  } catch (error) {
    console.error('[v0] Error fetching case messages:', error)
    return []
  }
}

/**
 * Scan all messages (use sparingly - expensive operation)
 */
export async function getAllMessages(): Promise<ChatMessage[]> {
  try {
    if (!TABLE_NAME) return []

    const command = new ScanCommand({
      TableName: TABLE_NAME,
    })

    const result = await docClient.send(command)
    return (result.Items as ChatMessage[]) || []
  } catch (error) {
    console.error('[v0] Error scanning messages:', error)
    return []
  }
}

/**
 * Generate a unique chat ID
 */
function generateChatId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}
