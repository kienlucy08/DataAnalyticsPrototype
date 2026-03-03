import React from 'react'
import { Loader2, Wrench, LayoutDashboard, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ChartData } from '../../types/dashboard'
import { useDashboard } from '../../context/DashboardContext'
import ChartRenderer from '../charts/ChartRenderer'

interface Props {
  activeTools: string[]
  response: string | null
  chartData?: ChartData | null
  onSaveChat?: () => void
}

/** Minimal markdown renderer — handles bold, inline code, tables, and line breaks */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Table detection: line starts with |
    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      nodes.push(<TableBlock key={`table-${i}`} lines={tableLines} />)
      continue
    }

    // Heading
    if (line.startsWith('### ')) {
      nodes.push(<p key={i} className="text-text-primary font-semibold text-sm mt-3 mb-1">{line.slice(4)}</p>)
    } else if (line.startsWith('## ')) {
      nodes.push(<p key={i} className="text-text-primary font-semibold text-base mt-4 mb-1">{line.slice(3)}</p>)
    } else if (line.startsWith('# ')) {
      nodes.push(<p key={i} className="text-text-primary font-bold text-base mt-4 mb-1">{line.slice(2)}</p>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push(
        <p key={i} className="text-text-secondary text-sm flex gap-2">
          <span className="text-accent shrink-0">•</span>
          <span>{inlineMarkdown(line.slice(2))}</span>
        </p>
      )
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />)
    } else {
      nodes.push(
        <p key={i} className="text-text-secondary text-sm leading-relaxed">
          {inlineMarkdown(line)}
        </p>
      )
    }
    i++
  }
  return nodes
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="text-accent bg-surface px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    }
    return part
  })
}

function TableBlock({ lines }: { lines: string[] }) {
  const rows = lines
    .filter(l => !l.match(/^\|[\s-|]+\|$/)) // skip separator rows
    .map(l =>
      l.split('|')
        .filter((_, i, arr) => i > 0 && i < arr.length - 1)
        .map(cell => cell.trim())
    )

  const [header, ...body] = rows
  if (!header) return null

  return (
    <div className="overflow-x-auto my-2 rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-surface border-b border-border">
            {header.map((cell, i) => (
              <th key={i} className="px-3 py-2 text-left text-text-primary font-semibold">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-0 hover:bg-surface/50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-text-secondary">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const AnalyticsOutput: React.FC<Props> = ({ activeTools, response, chartData, onSaveChat }) => {
  const { addWidget } = useDashboard()
  const navigate = useNavigate()

  if (activeTools.length === 0 && !response) return null

  const handleAddToDashboard = () => {
    if (!chartData) return
    addWidget(chartData)
    navigate('/custom-dashboard')
  }

  return (
    <div className="w-full mt-4 rounded-xl border border-border bg-card overflow-hidden">
      {/* Tool call activity */}
      {activeTools.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface/60">
          <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
          <span className="text-text-muted text-xs">
            Calling{' '}
            {activeTools.map((t, i) => (
              <span key={t}>
                <code className="text-accent font-mono">{t}</code>
                {i < activeTools.length - 1 ? ', ' : ''}
              </span>
            ))}
            …
          </span>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="px-4 py-4 space-y-0.5">
          <div className="flex items-center gap-1.5 mb-3">
            <Wrench className="w-3.5 h-3.5 text-accent" />
            <span className="text-text-muted text-xs font-medium">Analysis</span>
          </div>
          {renderMarkdown(response)}
        </div>
      )}

      {/* Inline chart preview */}
      {chartData && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-text-secondary text-xs font-medium">{chartData.title}</span>
            </div>
            <div className="p-3 h-64">
              <ChartRenderer widget={chartData} height={220} />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(chartData || onSaveChat) && (
        <div className="flex items-center gap-2 px-4 pb-4">
          {chartData && (
            <button
              onClick={handleAddToDashboard}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover border border-accent/30 hover:border-accent/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LayoutDashboard size={13} />
              Add to Dashboard
            </button>
          )}
          {onSaveChat && (
            <button
              onClick={onSaveChat}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary border border-border hover:border-border-light px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} />
              Save Chat
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default AnalyticsOutput
