import React, { useEffect, useState } from 'react'
import { BarChart3, Loader2, AlertCircle } from 'lucide-react'
import { useRole } from '../context/RoleContext'
import ChatInput from '../components/ui/ChatInput'
import ToolsPanel from '../components/mcp/ToolsPanel'
import AnalyticsOutput from '../components/mcp/AnalyticsOutput'
import PromptSuggestions from '../components/mcp/PromptSuggestions'
import type { McpStatus, McpTool } from '../types/mcp'
import type { ChartData } from '../types/dashboard'

// ─── Helpers ───────────────────────────────────────────────────────────────

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

/** Strip basic markdown formatting from a cell value */
function stripMd(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim()
}

/**
 * Fallback: if the response has no CHART_DATA block, scan for a markdown table
 * and convert it into a saveable table ChartData.
 */
function parseMarkdownTable(text: string): ChartData | null {
  const lines = text.split('\n')
  const tableStart = lines.findIndex(l => l.trimStart().startsWith('|'))
  if (tableStart === -1) return null

  // Collect consecutive pipe-prefixed lines
  const tableLines: string[] = []
  for (let i = tableStart; i < lines.length; i++) {
    if (!lines[i].trimStart().startsWith('|')) break
    tableLines.push(lines[i])
  }

  // Drop separator rows (|---|---|)
  const dataLines = tableLines.filter(l => !/^\|[\s\-|:]+\|$/.test(l.trim()))
  if (dataLines.length < 2) return null

  const parseRow = (line: string): string[] =>
    line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => stripMd(c))

  const [headerLine, ...bodyLines] = dataLines
  const headers = parseRow(headerLine)
  if (headers.length === 0) return null

  const data = bodyLines.map(row => {
    const cells = parseRow(row)
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      const raw = cells[i] ?? ''
      const num = Number(raw.replace(/[,%]/g, ''))
      obj[h] = raw !== '' && !isNaN(num) && raw.trim() !== '—' ? num : raw
    })
    return obj
  })

  // Try to derive a title from a heading on the line just before the table
  let title = 'Analysis Table'
  for (let i = tableStart - 1; i >= Math.max(0, tableStart - 4); i--) {
    const line = lines[i].trim()
    if (line.startsWith('#')) { title = line.replace(/^#+\s*/, ''); break }
    if (line.length > 0 && !line.startsWith('|')) { title = stripMd(line).replace(/[:.]$/, ''); break }
  }

  return { type: 'table', title, data }
}

/** Returns a denial message if this role/message combo is blocked, null if allowed. */
function checkPermission(role: string, message: string): string | null {
  const lower = message.toLowerCase()

  if (role === 'technician') {
    const orgPatterns = [
      /\b(organization|fieldsync|test org|test organization)\b/i,
      /\ball (surveys?|towers?|technicians?|users?|inspections?)\b/i,
      /\beveryone'?s?\b/i,
      /\bother (technicians?|users?|people)\b/i,
      /\bjames\b/i,
      /\bsarah\b/i,
    ]
    const personalPatterns = [/\b(my|i |i've|i have|me |mine|matt)\b/i]
    const isOrgQuery = orgPatterns.some(p => p.test(lower))
    const isPersonal = personalPatterns.some(p => p.test(lower))
    if (isOrgQuery && !isPersonal) {
      return "You don't have permission to view organization-level or other users' data. As Matt Edrich (Technician), you can only access your own surveys and personal performance data."
    }
  }

  if (role === 'pm') {
    // Detect references to specific org names that are not in Susan's allowed list
    const blockedOrgPatterns = [
      /\b(acme|metro|nationwide|statewide|regional|county|city|municipal|global|national|federal)\b.*\b(org|organization|network|telecom|wireless)\b/i,
    ]
    if (blockedOrgPatterns.some(p => p.test(lower))) {
      return "You don't have permission to view data for that organization. Susan Smith is only a member of FieldSync Organization and Test."
    }
  }

  return null
}

// ─── Component ─────────────────────────────────────────────────────────────

const DataAnalytics: React.FC = () => {
  const { role } = useRole()
  const [mcpStatus, setMcpStatus] = useState<McpStatus>('loading')
  const [mcpError, setMcpError] = useState<string | null>(null)
  const [tools, setTools] = useState<McpTool[]>([])
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [response, setResponse] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [lastMessage, setLastMessage] = useState<string>('')
  const [isPermissionDenied, setIsPermissionDenied] = useState(false)
  const [pendingFill, setPendingFill] = useState<string | undefined>()
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setMcpStatus('loading')
    setMcpError(null)

    const poll = async () => {
      let attempts = 0
      const MAX_ATTEMPTS = 15

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

          if (data.error?.includes('MCP_SERVER_PATH')) {
            setMcpError(data.error)
            setMcpStatus('error')
            return
          }
        } catch {
          if (cancelled) return
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
    setIsPermissionDenied(false)
    setLastMessage(message)

    // Frontend permission pre-check
    const denied = checkPermission(role, message)
    if (denied) {
      setResponse(denied)
      setIsPermissionDenied(true)
      return
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, role }),
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
          // Check if Claude itself returned a denial (server-side enforcement)
          const isClaudeDenial = display.includes('Access Denied') || display.startsWith('⛔')
          setIsPermissionDenied(isClaudeDenial)
          setResponse(display)
          setChartData(chart ?? (!isClaudeDenial ? parseMarkdownTable(display) : null))
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

      {/* MCP status */}
      {mcpStatus === 'loading' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card mb-6">
          <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
          <span className="text-text-secondary text-sm">
            {retryCount === 0 ? 'Initializing data tools…' : `Connecting to database… (attempt ${retryCount + 1})`}
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
              Make sure <code className="text-accent font-mono">npm run server</code> is running and{' '}
              <code className="text-accent font-mono">MCP_SERVER_PATH</code> is set in{' '}
              <code className="text-accent font-mono">.env</code>
            </p>
          </div>
        </div>
      )}

      {mcpStatus === 'ready' && <ToolsPanel tools={tools} />}

      {/* Role-specific prompt suggestions */}
      <PromptSuggestions
        role={role}
        onSelect={q => setPendingFill(q)}
        disabled={mcpStatus !== 'ready'}
      />

      {/* Chat input */}
      <ChatInput
        disabled={mcpStatus !== 'ready'}
        mcpStatus={mcpStatus}
        onSend={handleSend}
        pendingFill={pendingFill}
        onFillConsumed={() => setPendingFill(undefined)}
      />

      {/* Output */}
      <AnalyticsOutput
        activeTools={activeTools}
        response={response}
        chartData={chartData}
        onSaveChat={response && !isPermissionDenied ? handleSaveChat : undefined}
        isPermissionDenied={isPermissionDenied}
      />
    </div>
  )
}

export default DataAnalytics
