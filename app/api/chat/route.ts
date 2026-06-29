import { saveChatMessage } from '@/app/actions/chat'
import { getCaseMessages } from '@/lib/dynamodb'

/**
 * POST /api/chat
 * Save a chat message from the Gemini Copilot
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { caseId, sender, message } = body

    // Validate request
    if (!caseId || !sender || !message) {
      return Response.json(
        { error: 'Missing required fields: caseId, sender, message' },
        { status: 400 }
      )
    }

    if (!['user', 'gemini'].includes(sender)) {
      return Response.json(
        { error: 'sender must be "user" or "gemini"' },
        { status: 400 }
      )
    }

    // Save message via Server Action
    const result = await saveChatMessage(caseId, sender, message)

    if (!result.success) {
      console.error('[v0] Chat save failed:', result.error)
      return Response.json(
        { error: result.error || 'Failed to save message' },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      chatId: result.chatId,
      timestamp: result.timestamp,
    })
  } catch (error) {
    console.error('[v0] Chat API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat?caseId=...
 * Retrieve all messages for a case
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')

    if (!caseId) {
      return Response.json(
        { error: 'caseId query parameter is required' },
        { status: 400 }
      )
    }

    // Fetch messages
    const messages = await getCaseMessages(caseId)

    return Response.json({
      success: true,
      caseId,
      messageCount: messages.length,
      messages,
    })
  } catch (error) {
    console.error('[v0] Chat GET API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
