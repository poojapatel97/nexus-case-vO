'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronDown,
  Send,
  FileText,
  Database,
  CheckSquare,
  MessageCircle,
  Sparkles,
} from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
}

export function AICopilot() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hi! I&apos;m your Gemini AI Copilot. I can help you summarize case files, extract metadata, and generate compliance checklists. What would you like me to help with?',
      timestamp: '2024-06-25T14:20:00Z',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleQuickAction = (action: string) => {
    let text = ''
    switch (action) {
      case 'summarize':
        text = 'Summarize Case File'
        break
      case 'extract':
        text = 'Extract JSON Metadata'
        break
      case 'compliance':
        text = 'Generate Compliance Checklist'
        break
    }

    if (text) {
      handleSendMessage(text)
    }
  }

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim()
    if (!messageText) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageText,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        'Summarize Case File':
          'Based on the case file analysis:\n\n**Case**: Contract Dispute - Tech Licensing\n**Status**: Active\n**Priority**: High\n\n**Key Issues**:\n• Scope of deployment rights\n• Support SLA terms\n• Pricing disputes\n\n**Timeline**: Ongoing since January 2024\n\n**Recommendation**: Consider settlement negotiations on cloud deployment provisions.',
        'Extract JSON Metadata':
          '```json\n{\n  "caseNumber": "NXS-2024-001",\n  "type": "contract_dispute",\n  "status": "active",\n  "priority": "high",\n  "parties": [\n    "TechCorp Solutions Inc.",\n    "Enterprise Software Ltd."\n  ],\n  "documents": 3,\n  "keyIssues": [\n    "deployment_rights",\n    "support_sla",\n    "pricing"\n  ]\n}\n```',
        'Generate Compliance Checklist':
          '**Compliance Checklist**\n\n☐ Verify contract jurisdiction requirements\n☐ Review data protection compliance\n☐ Confirm all signatures and authorizations\n☐ Check regulatory filing requirements\n☐ Validate payment terms compliance\n☐ Review termination clause legality\n☐ Confirm NDA obligations\n☐ Document all modifications\n\n**Status**: 6 of 8 items completed',
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text:
          responses[messageText] ||
          `I've processed your request about "${messageText}". This functionality would integrate with Gemini AI API in a production environment. How else can I assist?`,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  const quickActions = [
    {
      id: 'summarize',
      label: 'Summarize Case File',
      icon: FileText,
    },
    {
      id: 'extract',
      label: 'Extract JSON Metadata',
      icon: Database,
    },
    {
      id: 'compliance',
      label: 'Generate Compliance Checklist',
      icon: CheckSquare,
    },
  ]

  if (isCollapsed) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsCollapsed(false)}
          className="h-12 w-12 rounded-full p-0 bg-primary hover:bg-primary/90 shadow-lg"
          title="Open AI Copilot"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[28rem] w-96 flex-col rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Gemini AI Copilot</h3>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Collapse"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Actions (visible when no messages) */}
      {messages.length <= 1 && (
        <div className="border-b border-border px-4 py-3 space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {action.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-md text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.text.includes('```') ? (
                <pre className="overflow-x-auto bg-black/30 p-2 rounded text-[10px] font-mono">
                  {msg.text}
                </pre>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse animation-delay-100" />
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse animation-delay-200" />
            </div>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="h-8 text-xs bg-muted border-border placeholder-muted-foreground"
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="h-8 w-8 p-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
