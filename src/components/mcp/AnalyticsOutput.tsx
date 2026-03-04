import React, { useState, useEffect } from 'react'
import { Loader2, Wrench, LayoutDashboard, Download, BarChart2, TrendingUp, Activity, PieChart as PieIcon, Hash, Table2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ChartData, ChartType } from '../../types/dashboard'
import { useDashboard } from '../../context/DashboardContext'
import ChartRenderer from '../charts/ChartRenderer'

interface Props {
  activeTools: string[]
  response: string | null
  chartData?: ChartData | null
  onSaveChat?: () => void
  isPermissionDenied?: boolean
}

const CHART_TYPES: { type: ChartType; icon: React.ReactNode; label: string }[] = [
  { type: 'bar',    icon: <BarChart2 size={13} />,  label: 'Bar'  },
  { type: 'line',   icon: <TrendingUp size={13} />, label: 'Line' },
  { type: 'area',   icon: <Activity size={13} />,   label: 'Area' },
  { type: 'pie',    icon: <PieIcon size={13} />,    label: 'Pie'  },
  { type: 'metric', icon: <Hash size={13} />,        label: 'Card'  },
  { type: 'table',  icon: <Table2 size={13} />,      label: 'Table' },
]

/** Minimal markdown renderer — handles bold, inline code, tables, and line breaks */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      nodes.push(<TableBlock key={`table-${i}`} lines={tableLines} />)
      continue
    }

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
    .filter(l => !l.match(/^\|[\s-|]+\|$/))
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

const AnalyticsOutput: React.FC<Props> = ({ activeTools, response, chartData, onSaveChat, isPermissionDenied }) => {
  const { addWidget } = useDashboard()
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<ChartType>(chartData?.type ?? 'bar')

  // Reset type selection when new chart data arrives
  useEffect(() => {
    if (chartData) setSelectedType(chartData.type)
  }, [chartData?.title, chartData?.type])

  if (activeTools.length === 0 && !response) return null

  const handleAddToDashboard = () => {
    if (!chartData) return
    addWidget({ ...chartData, type: selectedType })
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

      {/* Permission denied banner */}
      {isPermissionDenied && response && (
        <div className="flex items-start gap-3 px-4 py-4 bg-red-400/5 border-b border-red-400/20">
          <span className="text-lg shrink-0 mt-0.5">⛔</span>
          <p className="text-red-300 text-sm leading-relaxed">{response.replace(/^⛔\s*(Access Denied[:\s]*)?/, '')}</p>
        </div>
      )}

      {/* Normal response */}
      {!isPermissionDenied && response && (
        <div className="px-4 py-4 space-y-0.5">
          <div className="flex items-center gap-1.5 mb-3">
            <Wrench className="w-3.5 h-3.5 text-accent" />
            <span className="text-text-muted text-xs font-medium">Analysis</span>
          </div>
          {renderMarkdown(response)}
        </div>
      )}

      {/* Inline chart preview + type switcher */}
      {chartData && !isPermissionDenied && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            {/* Header with type switcher */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-2">
              <span className="text-text-secondary text-xs font-medium truncate">{chartData.title}</span>
              <div className="flex items-center gap-0.5 shrink-0 bg-card rounded-lg p-0.5 border border-border">
                {CHART_TYPES.map(({ type, icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    title={label}
                    className={[
                      'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                      selectedType === type
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:text-text-secondary',
                    ].join(' ')}
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={`p-3 ${selectedType === 'metric' ? 'h-32' : selectedType === 'table' ? 'max-h-72 overflow-auto' : 'h-64'}`}>
              <ChartRenderer
                widget={{ ...chartData, type: selectedType }}
                height={selectedType === 'metric' ? 96 : 220}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(chartData || onSaveChat) && !isPermissionDenied && (
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
