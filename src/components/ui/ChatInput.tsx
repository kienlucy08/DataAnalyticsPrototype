import React, { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'

const ChatInput: React.FC = () => {
  const [value, setValue] = useState('')

  const handleSend = () => {
    if (!value.trim()) return
    // TODO: wire to Claude / MCP backend
    console.log('Question submitted:', value)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full mt-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <p className="text-text-secondary text-sm font-medium">
          Ask Claude about your data
        </p>
        <span className="text-xs text-text-muted bg-card border border-border px-2 py-0.5 rounded-full">
          AI-powered · Coming soon
        </span>
      </div>
      <div className="flex items-center gap-3 w-full bg-card border border-border rounded-xl px-4 py-3 focus-within:border-accent transition-colors duration-150">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Show me inspection failures by site for the last 30 days..."
          className="flex-1 bg-transparent text-text-primary placeholder-text-muted text-sm outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="Send question"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}

export default ChatInput
