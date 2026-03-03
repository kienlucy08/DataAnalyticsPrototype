import React from 'react'
import {
  Database,
  Code,
  Network,
  ClipboardList,
  MapPin,
  Cloud,
  AlertTriangle,
  Wrench,
} from 'lucide-react'
import type { McpTool } from '../../types/mcp'

interface Props {
  tools: McpTool[]
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  schema: Database,
  execute_query: Code,
  explore_data_relationships: Network,
  query_inspection_data: ClipboardList,
  query_sites_by_location: MapPin,
  get_weather_for_site: Cloud,
  get_sites_needing_inspection: AlertTriangle,
}

const ToolsPanel: React.FC<Props> = ({ tools }) => {
  return (
    <div className="w-full mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-text-secondary text-xs font-medium uppercase tracking-wider">
          {tools.length} tools connected
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {tools.map(tool => {
          const Icon = TOOL_ICONS[tool.name] ?? Wrench
          return (
            <div
              key={tool.name}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-card border border-border hover:border-border-light transition-colors"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent/10 shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-text-primary text-xs font-medium truncate">{tool.name}</p>
                <p className="text-text-muted text-xs leading-tight mt-0.5 line-clamp-2">
                  {tool.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ToolsPanel
