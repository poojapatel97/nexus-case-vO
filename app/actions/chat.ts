'use server'

import { saveChatMessage as saveToDynamoDB, ChatMessageResponse } from '@/lib/dynamodb'

/**
 * Server Action: Save a Gemini Copilot chat message to DynamoDB
 * Authenticates using AWS IAM via OIDC credentials provider
 */
export async function saveChatMessage(
  caseId: string,
  sender: 'user' | 'gemini',
  message: string
): Promise<ChatMessageResponse> {
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

    // Delegate to DynamoDB client library
    const result = await saveToDynamoDB({
      caseId,
      sender,
      message: message.trim(),
    })

    return result
  } catch (error) {
    console.error('[v0] Error in saveChatMessage action:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to save chat message: ${errorMessage}`,
    }
  }
}
