import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js'
import { mcpBridge } from './mcp-bridge.js'

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err))

const app = express()
const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const claude = new Anthropic({ apiKey: process.env.API_KEY })

const SYSTEM_PROMPT = `You are a data analyst for FieldSync infrastructure inspections. \
You have access to a PostgreSQL database containing tower sites, inspections, deficiencies, \
and equipment records. Use the available tools to query the database and answer questions \
accurately. Present findings clearly with specific numbers, summaries, and actionable insights. \
When showing tabular data, format it as a markdown table.`

// GET /api/mcp/status — initialize MCP and return tool list
app.get('/api/mcp/status', async (_req, res) => {
  try {
    const result = await mcpBridge.initialize()
    res.json(result)
  } catch (err) {
    const message = errMsg(err)
    console.error('[MCP] Initialization failed:', message)
    res.status(500).json({ ready: false, error: message })
  }
})

// POST /api/chat — SSE streaming agentic loop
app.post('/api/chat', async (req, res) => {
  const { message } = req.body as { message: string }
  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    // Ensure MCP is initialized
    await mcpBridge.initialize()
    const tools = mcpBridge.getAnthropicTools()

    const messages: MessageParam[] = [{ role: 'user', content: message }]

    // Agentic loop
    while (true) {
      const response = await claude.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: tools as Parameters<typeof claude.messages.create>[0]['tools'],
        messages,
      })

      if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')
        send({ type: 'text', content: text })
        send({ type: 'done' })
        break
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        // Notify frontend of each tool call
        for (const block of toolUseBlocks) {
          send({ type: 'tool_call', tool: block.name })
        }

        // Execute tools sequentially (MCP stdio is not concurrent)
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of toolUseBlocks) {
          try {
            const content = await mcpBridge.callTool(
              block.name,
              block.input as Record<string, unknown>
            )
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content })
          } catch (toolErr) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Error: ${errMsg(toolErr)}`,
              is_error: true,
            })
          }
        }

        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })
        continue
      }

      // Unexpected stop reason
      send({ type: 'error', message: `Unexpected stop reason: ${response.stop_reason}` })
      send({ type: 'done' })
      break
    }
  } catch (err) {
    const message = errMsg(err)
    console.error('[Chat] Error:', message)
    send({ type: 'error', message })
    send({ type: 'done' })
  } finally {
    res.end()
  }
})

app.listen(port, () => {
  console.log(`[Server] MCP bridge running on http://localhost:${port}`)
})
