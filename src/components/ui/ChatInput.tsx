import React, { useState, useEffect } from 'react'
import { Send, Sparkles, Loader2 } from 'lucide-react'
import type { McpStatus } from '../../types/mcp'

interface Props {
  disabled?: boolean
  mcpStatus?: McpStatus
  onSend: (message: string) => Promise<void>
  pendingFill?: string
  onFillConsumed?: () => void
}

const STATUS_BADGE: Record<McpStatus, string> = {
  loading: 'Loading tools…',
  ready: 'Ready',
  error: 'Unavailable',
}

const ChatInput: React.FC<Props> = ({ disabled = false, mcpStatus = 'loading', onSend, pendingFill, onFillConsumed }) => {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)

  // Inject text from prompt suggestions
  useEffect(() => {
    if (pendingFill) {
      setValue(pendingFill)
      onFillConsumed?.()
    }
  }, [pendingFill])

  const canSend = !disabled && !sending && value.trim().length > 0

  const handleSend = async () => {
    if (!canSend) return
    const message = value.trim()
    setValue('')
    setSending(true)
    try {
      await onSend(message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="w-full mt-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <p className="text-text-secondary text-sm font-medium">Ask Claude about your data</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            mcpStatus === 'ready'
              ? 'text-green-400 bg-green-400/10 border-green-400/20'
              : mcpStatus === 'error'
              ? 'text-red-400 bg-red-400/10 border-red-400/20'
              : 'text-text-muted bg-card border-border'
          }`}
        >
          {STATUS_BADGE[mcpStatus]}
        </span>
      </div>

      <div
        className={`flex items-center gap-3 w-full bg-card border rounded-xl px-4 py-3 transition-colors duration-150 ${
          disabled
            ? 'border-border opacity-60 cursor-not-allowed'
            : 'border-border focus-within:border-accent'
        }`}
      >
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder={
            disabled
              ? 'Waiting for tools to load…'
              : 'e.g. Show me inspection failures by site for the last 30 days…'
          }
          className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm outline-none disabled:cursor-not-allowed"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!canSend}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="Send question"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  )
}

export default ChatInput
