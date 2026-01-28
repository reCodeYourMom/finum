'use client'

/**
 * ChatInterface Component
 * Interactive chat with AI financial coach
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

interface ChatSource {
  title: string
  category: string
  similarity: number
}

const SUGGESTED_PROMPTS = [
  "Comment réduire mes dépenses en courses ?",
  "Pourquoi ai-je dépassé mon budget ?",
  "Quelle est ma plus grosse dépense récurrente ?",
  "Comment économiser pour un projet dans 6 mois ?",
]

export default function ChatInterface({ conversationId: initialConversationId }: { conversationId?: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [sources, setSources] = useState<ChatSource[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load conversation if ID provided
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    }
  }, [conversationId])

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/coach/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        })))
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim() || isLoading) return

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: textToSend,
      createdAt: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationId,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      const data = await res.json()

      // Update conversation ID if new conversation
      if (!conversationId) {
        setConversationId(data.conversationId)
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `response-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        createdAt: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.sources) {
        setSources(data.sources)
      }
    } catch (error) {
      console.error('Error sending message:', error)

      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Désolé, une erreur s\'est produite. Peux-tu réessayer ?',
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h2 className="font-semibold text-gray-900">Coach IA Finum</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-purple-200 mx-auto mb-4" />
            <p className="text-gray-600 mb-6">
              Pose-moi une question sur ton budget !
            </p>

            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">Suggestions :</p>
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  {message.content.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sources (if available) */}
      {sources.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">Sources :</p>
          <div className="flex flex-wrap gap-1">
            {sources.map((source, idx) => (
              <span
                key={idx}
                className="inline-block text-xs px-2 py-1 bg-white rounded border border-gray-200 text-gray-600"
              >
                {source.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            disabled={isLoading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {input.length}/500 caractères
        </p>
      </form>
    </div>
  )
}
