import React, { useEffect, useState } from 'react'
import { BarChart3, Loader2, AlertCircle } from 'lucide-react'
import ChatInput from '../components/ui/ChatInput'
import ToolsPanel from '../components/mcp/ToolsPanel'
import AnalyticsOutput from '../components/mcp/AnalyticsOutput'
import type { McpStatus, McpTool } from '../types/mcp'
import type { ChartData } from '../types/dashboard'

function parseChartData(text: string): { display: string; chart: ChartData | null } {
  const marker = '\nCHART_DATA:'
  const idx = text.lastIndexOf(marker)
  if (idx === -1) return { display: text, chart: null }
  try {
    const chart = JSON.parse(text.slice(idx + marker.length).trim()) as ChartData
    return { display: text.slice(0, idx).trimEnd(), chart }
  } catch {
    return { display: text, chart: null }
  }
}

const DataAnalytics: React.FC = () => {
  const [mcpStatus, setMcpStatus] = useState<McpStatus>('loading')
  const [mcpError, setMcpError] = useState<string | null>(null)
  const [tools, setTools] = useState<McpTool[]>([])
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [response, setResponse] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [lastMessage, setLastMessage] = useState<string>('')

  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setMcpStatus('loading')
    setMcpError(null)

    const poll = async () => {
      let attempts = 0
      const MAX_ATTEMPTS = 15 // ~75 seconds total

      while (!cancelled) {
        try {
          const r = await fetch('/api/mcp/status')
          const data = (await r.json()) as { ready: boolean; tools?: McpTool[]; error?: string }
          if (cancelled) return

          if (data.ready && data.tools) {
            setTools(data.tools)
            setMcpStatus('ready')
            return
          }

          // Hard config error — don't retry
          if (data.error?.includes('MCP_SERVER_PATH')) {
            setMcpError(data.error)
            setMcpStatus('error')
            return
          }
        } catch {
          if (cancelled) return
          // Backend not reachable yet — keep trying
        }

        attempts++
        if (attempts >= MAX_ATTEMPTS) {
          if (!cancelled) {
            setMcpError('Timed out waiting for MCP server. Check that npm run server is running and the database is reachable.')
            setMcpStatus('error')
          }
          return
        }

        if (!cancelled) setRetryCount(attempts)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    void poll()
    return () => { cancelled = true }
  }, [])

  const handleSend = async (message: string) => {
    setResponse(null)
    setChartData(null)
    setActiveTools([])
    setLastMessage(message)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) return

    const processChunk = (chunk: string) => {
      if (!chunk.startsWith('data: ')) return
      try {
        const event = JSON.parse(chunk.slice(6)) as {
          type: string
          tool?: string
          content?: string
          message?: string
        }
        if (event.type === 'tool_call' && event.tool) {
          setActiveTools(prev => prev.includes(event.tool!) ? prev : [...prev, event.tool!])
        } else if (event.type === 'text' && event.content) {
          const { display, chart } = parseChartData(event.content)
          setResponse(display)
          setChartData(chart)
          setActiveTools([])
        } else if (event.type === 'error') {
          setResponse(`Error: ${event.message ?? 'Unknown error'}`)
          setActiveTools([])
        }
      } catch {
        // malformed SSE chunk — skip
      }
    }

    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      const parts = buffer.split('\n\n')
      buffer = done ? '' : (parts.pop() ?? '')
      for (const part of parts) processChunk(part)
      if (done) {
        if (buffer.trim()) processChunk(buffer)
        break
      }
    }
  }

  const handleSaveChat = () => {
    if (!response) return
    const content = `Question: ${lastMessage}\n\nAnalysis:\n${response}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fieldsync-analysis-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
          <BarChart3 className="text-accent" size={20} />
        </div>
        <div>
          <h1 className="text-text-primary text-2xl font-semibold leading-tight">
            Custom Data Analytics
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Ask Claude questions about your data and save charts to your dashboard.
          </p>
        </div>
      </div>

      {/* MCP tools status */}
      {mcpStatus === 'loading' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card mb-6">
          <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
          <span className="text-text-secondary text-sm">
            {retryCount === 0
              ? 'Initializing data tools…'
              : `Connecting to database… (attempt ${retryCount + 1})`}
          </span>
        </div>
      )}

      {mcpStatus === 'error' && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-card mb-6">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-text-primary text-sm font-medium">Could not connect to MCP server</p>
            <p className="text-text-muted text-xs mt-0.5">{mcpError}</p>
            <p className="text-text-muted text-xs mt-1">
              Make sure <code className="text-accent font-mono">npm run server</code> is running and <code className="text-accent font-mono">MCP_SERVER_PATH</code> is set in <code className="text-accent font-mono">.env</code>
            </p>
          </div>
        </div>
      )}

      {mcpStatus === 'ready' && <ToolsPanel tools={tools} />}

      {/* Claude AI chat + output */}
      <ChatInput
        disabled={mcpStatus !== 'ready'}
        mcpStatus={mcpStatus}
        onSend={handleSend}
      />
      <AnalyticsOutput
        activeTools={activeTools}
        response={response}
        chartData={chartData}
        onSaveChat={response ? handleSaveChat : undefined}
      />
    </div>
  )
}

export default DataAnalytics
