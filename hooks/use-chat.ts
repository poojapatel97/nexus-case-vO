'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

export interface ChatMessage {
  chatId: string
  timestamp: string
  caseId: string
  sender: 'user' | 'gemini'
  message: string
}

interface SaveMessageResponse {
  success: boolean
  chatId?: string
  timestamp?: string
  error?: string
}

interface GetMessagesResponse {
  success: boolean
  caseId: string
  messageCount: number
  messages: ChatMessage[]
  error?: string
}

/**
 * React hook for managing chat messages with DynamoDB
 * Uses SWR for automatic caching and refetching
 */
export function useChat(caseId: string | null) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Fetch messages for the case
  const { data, error, isLoading, mutate } = useSWR<GetMessagesResponse>(
    caseId ? `/api/chat?caseId=${caseId}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch messages')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Manual refresh only
    }
  )

  const messages = data?.messages || []

  /**
   * Save a new chat message
   */
  const sendMessage = useCallback(
    async (
      sender: 'user' | 'gemini',
      message: string
    ): Promise<SaveMessageResponse> => {
      if (!caseId) {
        return { success: false, error: 'No case selected' }
      }

      setIsSaving(true)
      setSaveError(null)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId,
            sender,
            message,
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          setSaveError(err.error)
          return { success: false, error: err.error }
        }

        const result = await response.json()

        // Refresh messages list
        await mutate()

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setSaveError(message)
        return { success: false, error: message }
      } finally {
        setIsSaving(false)
      }
    },
    [caseId, mutate]
  )

  /**
   * Manually refresh messages
   */
  const refresh = useCallback(() => {
    return mutate()
  }, [mutate])

  return {
    messages,
    isLoading,
    isSaving,
    error: error ? 'Failed to load messages' : null,
    saveError,
    sendMessage,
    refresh,
  }
}
