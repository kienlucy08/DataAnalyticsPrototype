import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

interface AnthropicTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

class McpBridge {
  private client: Client | null = null
  private tools: McpTool[] = []
  private initPromise: Promise<void> | null = null

  async initialize(): Promise<{ ready: boolean; tools: { name: string; description: string }[] }> {
    if (this.client && this.tools.length > 0) {
      return { ready: true, tools: this.tools.map(t => ({ name: t.name, description: t.description ?? '' })) }
    }

    if (!this.initPromise) {
      this.initPromise = this._connect().catch(err => {
        // Reset so the next request can try again (Python server may still be caching schema)
        this.initPromise = null
        this.client = null
        this.tools = []
        throw err
      })
    }
    await this.initPromise

    return { ready: true, tools: this.tools.map(t => ({ name: t.name, description: t.description ?? '' })) }
  }

  private async _connect(): Promise<void> {
    const serverPath = process.env.MCP_SERVER_PATH
    if (!serverPath) throw new Error('MCP_SERVER_PATH is not set in .env')

    const transport = new StdioClientTransport({
      command: 'python',
      args: [serverPath],
      env: { ...process.env } as Record<string, string>,
    })

    this.client = new Client(
      { name: 'fieldsync-analytics', version: '1.0.0' },
      { capabilities: {} }
    )

    // Schema caching on RDS takes 60-90s before the Python server starts the MCP
    // event loop. The SDK default is 60s which always times out. Override to 3 min.
    ;(this.client as unknown as { _requestTimeout: number })._requestTimeout = 180_000

    await this.client.connect(transport)
    const result = await this.client.listTools()
    this.tools = result.tools as unknown as McpTool[]
  }

  getAnthropicTools(): AnthropicTool[] {
    return this.tools.map(t => ({
      name: t.name,
      description: t.description ?? '',
      input_schema: t.inputSchema ?? { type: 'object', properties: {} },
    }))
  }

  async callTool(name: string, input: Record<string, unknown>): Promise<string> {
    if (!this.client) throw new Error('MCP client not initialized')
    const result = await this.client.callTool({ name, arguments: input })
    const content = result.content
    if (Array.isArray(content)) {
      return content
        .map((c: unknown) => {
          const block = c as { type: string; text?: string }
          return block.type === 'text' ? (block.text ?? '') : JSON.stringify(c)
        })
        .join('\n')
    }
    return JSON.stringify(content)
  }
}

export const mcpBridge = new McpBridge()
