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

  org_owner: `You are assisting Sara Connor, an Organization Owner at FieldSync. \
She manages FieldSync Organization and Test. \
CRITICAL ACCESS RULE: If the user asks about data from any organization other than \
"FieldSync Organization" or "Test", do NOT query the database. \
Instead respond with exactly this message: \
"⛔ Access Denied: You don't have permission to view data for that organization. \
Sara Connor manages FieldSync Organization and Test only." \
Do not add any other content to that response. \
For all other queries within her managed organizations, answer normally. \
She has full visibility into org-level data for her orgs: towers, surveys, deficiencies, \
technicians, scans, site visits, and all performance metrics within FieldSync Organization and Test.`,

  pm: `You are assisting Susan Smith, a Project Manager. \
She is a member of FieldSync Organization and Test ONLY. \
CRITICAL ACCESS RULE: If the user asks about data from any organization other than \
"FieldSync Organization" or "Test", do NOT query the database. \
Instead respond with exactly this message: \
"⛔ Access Denied: You don't have permission to view data for that organization. \
Susan Smith is only a member of FieldSync Organization and Test." \
Do not add any other content to that response. \
Susan's analytical focus is on operational productivity: sites, site visits, survey statuses, \
scan activity, and QC technician performance within her organizations. \
For all other queries within her organizations, answer normally.`,

  qc_technician: `You are assisting Matt Edrich, a QC Technician at FieldSync. \
He can ONLY access data about his own surveys, his own assigned work, and his own performance metrics. \
CRITICAL ACCESS RULE — you MUST enforce this strictly: \
If the user asks about (a) any organization by name, (b) org-level statistics or counts, \
(c) all towers or all surveys across the system, (d) other technicians or users by name, \
(e) surveys not personally assigned to Matt Edrich, or (f) any administrative or fleet-wide data — \
do NOT query the database under any circumstances. \
Instead respond with ONLY this exact message and nothing else: \
"⛔ Access Denied: You don't have permission to view that information. \
As a QC Technician, you can only access your own surveys and performance data." \
Allowed queries: surveys assigned to Matt Edrich, his deficiency counts, his personal completion times, \
his average deficiency rates, equipment he personally documented. \
When in doubt, deny access.`,

  qc_technician_2: `You are assisting John Smith, a QC Technician at FieldSync. \
He can ONLY access data about his own surveys, his own assigned work, and his own performance metrics. \
CRITICAL ACCESS RULE — you MUST enforce this strictly: \
If the user asks about (a) any organization by name, (b) org-level statistics or counts, \
(c) all towers or all surveys across the system, (d) other technicians or users by name, \
(e) surveys not personally assigned to John Smith, or (f) any administrative or fleet-wide data — \
do NOT query the database under any circumstances. \
Instead respond with ONLY this exact message and nothing else: \
"⛔ Access Denied: You don't have permission to view that information. \
As a QC Technician, you can only access your own surveys and performance data." \
Allowed queries: surveys assigned to John Smith, his deficiency counts, his personal completion times, \
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

// ---------------------------------------------------------------------------
// ClickUp Integration Routes
// ---------------------------------------------------------------------------

const CLICKUP_BASE = 'https://api.clickup.com/api/v2'

function clickupHeaders() {
  const key = process.env.CLICKUP_API_KEY
  if (!key) return null
  return { Authorization: key, 'Content-Type': 'application/json' }
}

// Mock data — returned when CLICKUP_API_KEY is not set
function mockTasks(listId: string) {
  const isSurveys = listId.toLowerCase().includes('survey') || listId === 'mock_surveys'
  const now = Date.now()
  const day = 86400000

  if (isSurveys) {
    return [
      { id: 'cu_s001', name: 'Survey – AT&T Tower Bravo Site #4521', status: { status: 'in progress', color: '#4194f6', type: 'custom' }, assignees: [{ id: 1001, username: 'Matt Edrich', email: 'matt@fieldsync.io', color: '#e06c75', initials: 'ME', profilePicture: null }], due_date: String(now + 7 * day), priority: { id: '2', priority: 'high', color: '#ffcc00' }, url: 'https://app.clickup.com/t/cu_s001', date_created: String(now - 14 * day), date_updated: String(now - day) },
      { id: 'cu_s002', name: 'Survey – Verizon Crown Castle Rooftop', status: { status: 'review', color: '#a4bdfc', type: 'custom' }, assignees: [{ id: 1002, username: 'John Smith', email: 'john@fieldsync.io', color: '#61afef', initials: 'JS', profilePicture: null }], due_date: String(now - 2 * day), priority: { id: '1', priority: 'urgent', color: '#ff4444' }, url: 'https://app.clickup.com/t/cu_s002', date_created: String(now - 21 * day), date_updated: String(now - 2 * day) },
      { id: 'cu_s003', name: 'Survey – T-Mobile Urban Monopole #7B', status: { status: 'not started', color: '#8b9ab5', type: 'open' }, assignees: [], due_date: String(now + 14 * day), priority: { id: '3', priority: 'normal', color: '#f7a44f' }, url: 'https://app.clickup.com/t/cu_s003', date_created: String(now - 3 * day), date_updated: String(now - 3 * day) },
      { id: 'cu_s004', name: 'Survey – Guy Facilities Guyed Tower Alpha', status: { status: 'not started', color: '#8b9ab5', type: 'open' }, assignees: [], due_date: null, priority: null, url: 'https://app.clickup.com/t/cu_s004', date_created: String(now - 1 * day), date_updated: String(now - 1 * day) },
      { id: 'cu_s005', name: 'Survey – Sprint Legacy Self-Support Site', status: { status: 'complete', color: '#6f3dc4', type: 'closed' }, assignees: [{ id: 1002, username: 'John Smith', email: 'john@fieldsync.io', color: '#61afef', initials: 'JS', profilePicture: null }], due_date: String(now - 10 * day), priority: { id: '3', priority: 'normal', color: '#f7a44f' }, url: 'https://app.clickup.com/t/cu_s005', date_created: String(now - 30 * day), date_updated: String(now - 8 * day) },
      { id: 'cu_s006', name: 'Survey – FieldSync Test Site Alpha', status: { status: 'in progress', color: '#4194f6', type: 'custom' }, assignees: [{ id: 1001, username: 'Matt Edrich', email: 'matt@fieldsync.io', color: '#e06c75', initials: 'ME', profilePicture: null }], due_date: String(now + 3 * day), priority: { id: '2', priority: 'high', color: '#ffcc00' }, url: 'https://app.clickup.com/t/cu_s006', date_created: String(now - 7 * day), date_updated: String(now - 2 * day) },
      { id: 'cu_s007', name: 'Survey – Coastal Guyed Tower – Guy Facilities', status: { status: 'not started', color: '#8b9ab5', type: 'open' }, assignees: [], due_date: null, priority: { id: '4', priority: 'low', color: '#6699ff' }, url: 'https://app.clickup.com/t/cu_s007', date_created: String(now - 2 * day), date_updated: String(now - 2 * day) },
      { id: 'cu_s008', name: 'Survey – Industrial Site – Crown Castle', status: { status: 'complete', color: '#6f3dc4', type: 'closed' }, assignees: [{ id: 1001, username: 'Matt Edrich', email: 'matt@fieldsync.io', color: '#e06c75', initials: 'ME', profilePicture: null }], due_date: String(now - 15 * day), priority: { id: '3', priority: 'normal', color: '#f7a44f' }, url: 'https://app.clickup.com/t/cu_s008', date_created: String(now - 35 * day), date_updated: String(now - 12 * day) },
    ]
  }

  return [
    { id: 'cu_v001', name: 'Site Visit – Tower Alpha Inspection Q1', status: { status: 'in progress', color: '#4194f6', type: 'custom' }, assignees: [{ id: 1001, username: 'Matt Edrich', email: 'matt@fieldsync.io', color: '#e06c75', initials: 'ME', profilePicture: null }], due_date: String(now + 5 * day), priority: { id: '2', priority: 'high', color: '#ffcc00' }, url: 'https://app.clickup.com/t/cu_v001', date_created: String(now - 10 * day), date_updated: String(now - day) },
    { id: 'cu_v002', name: 'Site Visit – Rural Crown Castle Site B', status: { status: 'not started', color: '#8b9ab5', type: 'open' }, assignees: [], due_date: String(now + 10 * day), priority: { id: '3', priority: 'normal', color: '#f7a44f' }, url: 'https://app.clickup.com/t/cu_v002', date_created: String(now - 4 * day), date_updated: String(now - 4 * day) },
    { id: 'cu_v003', name: 'Site Visit – Downtown Monopole Review', status: { status: 'complete', color: '#6f3dc4', type: 'closed' }, assignees: [{ id: 1002, username: 'John Smith', email: 'john@fieldsync.io', color: '#61afef', initials: 'JS', profilePicture: null }], due_date: String(now - 5 * day), priority: { id: '3', priority: 'normal', color: '#f7a44f' }, url: 'https://app.clickup.com/t/cu_v003', date_created: String(now - 20 * day), date_updated: String(now - 4 * day) },
    { id: 'cu_v004', name: 'Site Visit – Suburban Self-Support Inspection', status: { status: 'in progress', color: '#4194f6', type: 'custom' }, assignees: [{ id: 1001, username: 'Matt Edrich', email: 'matt@fieldsync.io', color: '#e06c75', initials: 'ME', profilePicture: null }], due_date: String(now + 2 * day), priority: { id: '1', priority: 'urgent', color: '#ff4444' }, url: 'https://app.clickup.com/t/cu_v004', date_created: String(now - 8 * day), date_updated: String(now - day) },
    { id: 'cu_v005', name: 'Site Visit – Coastal Guyed Tower Assessment', status: { status: 'not started', color: '#8b9ab5', type: 'open' }, assignees: [], due_date: String(now + 21 * day), priority: { id: '4', priority: 'low', color: '#6699ff' }, url: 'https://app.clickup.com/t/cu_v005', date_created: String(now - 1 * day), date_updated: String(now - 1 * day) },
    { id: 'cu_v006', name: 'Site Visit – Industrial Site Full Review', status: { status: 'complete', color: '#6f3dc4', type: 'closed' }, assignees: [{ id: 1002, username: 'John Smith', email: 'john@fieldsync.io', color: '#61afef', initials: 'JS', profilePicture: null }], due_date: String(now - 12 * day), priority: { id: '2', priority: 'high', color: '#ffcc00' }, url: 'https://app.clickup.com/t/cu_v006', date_created: String(now - 30 * day), date_updated: String(now - 10 * day) },
  ]
}

function mockMembers() {
  return [
    { id: 1001, username: 'Matt Edrich',  email: 'matt@fieldsync.io',   color: '#e06c75', initials: 'ME', profilePicture: null },
    { id: 1002, username: 'John Smith',   email: 'john@fieldsync.io',   color: '#61afef', initials: 'JS', profilePicture: null },
    { id: 1003, username: 'Susan Smith',  email: 'susan@fieldsync.io',  color: '#56b6c2', initials: 'SS', profilePicture: null },
    { id: 1004, username: 'Jayden Smith', email: 'jayden@fieldsync.io', color: '#9b59b6', initials: 'JY', profilePicture: null },
  ]
}

function mockListMeta(listId: string) {
  const isSurveys = listId.toLowerCase().includes('survey') || listId === 'mock_surveys'
  return {
    id: listId,
    name: isSurveys ? 'Surveys' : 'Site Visits',
    statuses: [
      { status: 'not started', color: '#8b9ab5', type: 'open' },
      { status: 'in progress', color: '#4194f6', type: 'custom' },
      { status: 'review', color: '#a4bdfc', type: 'custom' },
      { status: 'complete', color: '#6f3dc4', type: 'closed' },
    ],
  }
}

// GET /api/clickup/lists/:listId/tasks
app.get('/api/clickup/lists/:listId/tasks', async (req, res) => {
  const { listId } = req.params
  const headers = clickupHeaders()
  if (!headers) {
    res.json({ tasks: mockTasks(listId), source: 'mock' })
    return
  }
  try {
    const response = await fetch(`${CLICKUP_BASE}/list/${listId}/task?include_closed=true&page=0`, { headers })
    const data = await response.json() as { tasks?: unknown[]; err?: string }
    if (data.err) { res.status(400).json({ error: data.err }); return }
    res.json({ tasks: data.tasks ?? [], source: 'clickup' })
  } catch (err) {
    res.status(500).json({ error: errMsg(err) })
  }
})

// GET /api/clickup/lists/:listId — list metadata (name + statuses)
app.get('/api/clickup/lists/:listId', async (req, res) => {
  const { listId } = req.params
  const headers = clickupHeaders()
  if (!headers) {
    res.json({ ...mockListMeta(listId), source: 'mock' })
    return
  }
  try {
    const response = await fetch(`${CLICKUP_BASE}/list/${listId}`, { headers })
    const data = await response.json() as { err?: string }
    if (data.err) { res.status(400).json({ error: data.err }); return }
    res.json({ ...data, source: 'clickup' })
  } catch (err) {
    res.status(500).json({ error: errMsg(err) })
  }
})

// GET /api/clickup/lists/:listId/members — members with access to a specific list (respects private folder visibility)
app.get('/api/clickup/lists/:listId/members', async (req, res) => {
  const { listId } = req.params
  const headers = clickupHeaders()
  if (!headers) {
    res.json({ members: mockMembers(), source: 'mock' })
    return
  }
  try {
    const response = await fetch(`${CLICKUP_BASE}/list/${listId}/member`, { headers })
    const data = await response.json() as { members?: unknown[]; err?: string }
    if (data.err) { res.status(400).json({ error: data.err }); return }
    res.json({ members: data.members ?? [], source: 'clickup' })
  } catch (err) {
    res.status(500).json({ error: errMsg(err) })
  }
})

// PUT /api/clickup/tasks/:taskId — update status, assignees, due_date
app.put('/api/clickup/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params
  const headers = clickupHeaders()
  const body = req.body as Record<string, unknown>

  if (!headers) {
    // Mock: echo back the update so the frontend can apply optimistic state
    res.json({ id: taskId, ...body, source: 'mock' })
    return
  }
  try {
    const response = await fetch(`${CLICKUP_BASE}/task/${taskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })
    const data = await response.json() as { err?: string }
    if (data.err) { res.status(400).json({ error: data.err }); return }
    res.json({ ...data, source: 'clickup' })
  } catch (err) {
    res.status(500).json({ error: errMsg(err) })
  }
})

app.listen(port, () => {
  console.log(`[Server] MCP bridge running on http://localhost:${port}`)
})
