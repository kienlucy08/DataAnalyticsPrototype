import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { mcpBridge } from './mcp-bridge.js'

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err))

const app = express()
const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const claude = new Anthropic({ apiKey: process.env.API_KEY })

const BASE_SYSTEM_PROMPT = `You are a data analyst for FieldSync infrastructure inspections. \
You have access to a PostgreSQL database containing tower sites, inspections, deficiencies, \
and equipment records. Use the available tools to query the database and answer questions \
accurately. Present findings clearly with specific numbers, summaries, and actionable insights. \
When showing tabular data, format it as a markdown table.

IMPORTANT — query efficiency rules you MUST follow:
- Always use SELECT with specific columns, never SELECT *
- Always include a LIMIT clause (maximum 50 rows) unless the query is a COUNT or aggregate
- For "list all" or "show all" questions, summarize or sample — do not return unlimited rows
- Prefer aggregate queries (COUNT, AVG, SUM, GROUP BY) over returning raw rows when possible
- If a query could return more than 50 rows, add LIMIT 50 and note that results are a sample

When your response contains data worth saving as a chart or table, append exactly one line at \
the very end of your response in this format (no trailing newline after it):
CHART_DATA:{"type":"bar","title":"Chart Title","xKey":"fieldName","yKey":"fieldName","data":[{"fieldName":"label","fieldName":123}]}
Rules — choose type based on the shape of your data:
- Use type "table" when: the result has 3 or more columns, or includes names/labels alongside \
  numbers (e.g. ranked lists, per-entity breakdowns, inspection lists). Include ALL columns in data — \
  not just the two used for the chart axis. This is the most important rule.
  CHART_DATA:{"type":"table","title":"Top Technician per Org","data":[{"Rank":1,"Organization":"FieldSync","Top Technician":"Matt Edrich","Surveys":25}]}
- Use type "bar", "line", or "area" when: result is a simple two-field numeric comparison (label + number)
- Use type "pie" when: result is proportional (parts of a whole); use nameKey and valueKey
- Use type "metric" when: result is a single number, average, or percentage:
  CHART_DATA:{"type":"metric","title":"Total Towers","value":142,"label":"across all organizations","data":[]}
- For multi-series bar/line/area, use dataKeys (array) alongside xKey
- data must be a JSON array of plain objects with consistent keys (empty array [] for metric type)
- Only include CHART_DATA when you have actual query results
- Do not wrap CHART_DATA in a code block — it must be a raw line at the very end`

const ROLE_PROMPTS: Record<string, string> = {
  admin: `You are assisting Lucy Kien, an Administrator at FieldSync. \
You have full, unrestricted access to all data in the system including all organizations, \
all users, all surveys, all technicians, and all metrics across the entire platform.`,

  pm: `You are assisting Susan Smith, a Project Manager. \
She is a member of FieldSync Organization and Test ONLY. \
CRITICAL ACCESS RULE: If the user asks about data from any organization other than \
"FieldSync Organization" or "Test", do NOT query the database. \
Instead respond with exactly this message: \
"⛔ Access Denied: You don't have permission to view data for that organization. \
Susan Smith is only a member of FieldSync Organization and Test." \
Do not add any other content to that response. \
For all other queries within her organizations, answer normally.`,

  technician: `You are assisting Matt Edrich, a Technician at FieldSync. \
He can ONLY access data about his own surveys, his own assigned work, and his own performance metrics. \
CRITICAL ACCESS RULE — you MUST enforce this strictly: \
If the user asks about (a) any organization by name, (b) org-level statistics or counts, \
(c) all towers or all surveys across the system, (d) other technicians or users by name, \
(e) surveys not personally assigned to Matt Edrich, or (f) any administrative or fleet-wide data — \
do NOT query the database under any circumstances. \
Instead respond with ONLY this exact message and nothing else: \
"⛔ Access Denied: You don't have permission to view that information. \
As a technician, you can only access your own surveys and performance data." \
Allowed queries: surveys assigned to Matt Edrich, his deficiency counts, his personal completion times, \
his average deficiency rates, equipment he personally documented. \
When in doubt, deny access.`,
}

function buildSystemPrompt(role?: string): string {
  const roleSection = role ? ROLE_PROMPTS[role] : ROLE_PROMPTS['admin']
  return roleSection
    ? `${BASE_SYSTEM_PROMPT}\n\n${roleSection}`
    : BASE_SYSTEM_PROMPT
}

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
  const { message, role } = req.body as { message: string; role?: string }
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

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }]

    // Agentic loop
    while (true) {
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: buildSystemPrompt(role),
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
        const MAX_RESULT_CHARS = 8000
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of toolUseBlocks) {
          try {
            let content = await mcpBridge.callTool(
              block.name,
              block.input as Record<string, unknown>
            )
            // Truncate oversized results to stay within token limits
            if (typeof content === 'string' && content.length > MAX_RESULT_CHARS) {
              content = content.slice(0, MAX_RESULT_CHARS) + `\n...[result truncated — ${content.length - MAX_RESULT_CHARS} chars omitted. Use more specific queries with LIMIT to get complete results.]`
            }
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
