import React, { useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import type { Layout, LayoutItem } from 'react-grid-layout'
import { LayoutDashboard, X, Trash2, BarChart3, Save, ChevronDown, RotateCcw, Archive } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useDashboard } from '../context/DashboardContext'
import ChartRenderer from '../components/charts/ChartRenderer'

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const Dashboard: React.FC = () => {
  const { widgets, removeWidget, updateLayouts, clearAll, savedDashboards, saveDashboard, loadDashboard, deleteSavedDashboard } = useDashboard()
  const { width, containerRef } = useContainerWidth()

  const [saveInputOpen, setSaveInputOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [gridKey, setGridKey] = useState(0)
  const skipNextLayoutChange = useRef(false)

  const handleLoadDashboard = (id: string) => {
    skipNextLayoutChange.current = true
    loadDashboard(id)
    setGridKey(k => k + 1)
  }

  const handleLayoutChange = (layouts: Layout) => {
    if (skipNextLayoutChange.current) {
      skipNextLayoutChange.current = false
      return
    }
    updateLayouts(layouts)
  }

  const layout = useMemo<Layout>(() =>
    widgets.map<LayoutItem>(w => ({
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: w.layout.w,
      h: w.layout.h,
      minW: 3,
      minH: 3,
    })),
  [widgets])

  const handleSave = () => {
    saveDashboard(saveName)
    setSaveName('')
    setSaveInputOpen(false)
  }

  if (widgets.length === 0 && savedDashboards.length === 0) {
    return (
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-start gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
            <LayoutDashboard className="text-accent" size={20} />
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-semibold leading-tight">My Custom Dashboard</h1>
            <p className="text-text-secondary text-sm mt-1">Saved charts from your analytics conversations.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-border bg-card">
          <BarChart3 className="text-text-muted mb-4" size={40} />
          <p className="text-text-primary font-medium mb-1">No charts saved yet</p>
          <p className="text-text-muted text-sm mb-5">
            Ask Claude a data question, then click "Add to Dashboard" to save charts here.
          </p>
          <Link
            to="/custom-data-analytics"
            className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
          >
            Go to Custom Data Analytics
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
            <LayoutDashboard className="text-accent" size={20} />
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-semibold leading-tight">My Custom Dashboard</h1>
            <p className="text-text-secondary text-sm mt-1">
              {widgets.length} chart{widgets.length !== 1 ? 's' : ''} · Drag and resize to rearrange.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {/* Save dashboard button / input */}
          {saveInputOpen ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaveInputOpen(false) }}
                placeholder="Dashboard name…"
                className="text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent w-44"
              />
              <button
                onClick={handleSave}
                className="text-xs text-accent hover:text-accent-hover border border-accent/30 hover:border-accent/60 px-3 py-1.5 rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setSaveInputOpen(false)}
                className="text-xs text-text-muted hover:text-text-secondary px-1.5 py-1.5 rounded-lg transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSaveInputOpen(true)}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover border border-accent/30 hover:border-accent/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Save size={13} />
              Save Dashboard
            </button>
          )}
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Clear All
          </button>
        </div>
      </div>

      {/* Grid */}
      {widgets.length > 0 && (
        <div ref={containerRef as React.RefObject<HTMLDivElement>}>
          <GridLayout
            key={gridKey}
            width={width}
            layout={layout}
            gridConfig={{ cols: 12, rowHeight: 70 }}
            dragConfig={{ handle: '.drag-handle' }}
            resizeConfig={{ handles: ['se'] }}
            onLayoutChange={handleLayoutChange}
            className="layout"
          >
            {widgets.map(widget => (
              <div
                key={widget.id}
                className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
              >
                <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-border bg-surface/60 cursor-grab active:cursor-grabbing shrink-0">
                  <span className="text-text-primary text-xs font-medium truncate pr-2">{widget.title}</span>
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="text-text-muted hover:text-red-400 transition-colors shrink-0"
                    title="Remove widget"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="flex-1 p-2 min-h-0">
                  <ChartRenderer widget={widget} height={undefined} />
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      )}

      {/* Saved Dashboards Archive */}
      {savedDashboards.length > 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
          {/* Accordion header */}
          <button
            onClick={() => setArchiveOpen(v => !v)}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Archive className="text-text-muted" size={15} />
              <span className="text-text-primary text-sm font-medium">Saved Dashboards</span>
              <span className="text-xs text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
                {savedDashboards.length}
              </span>
            </div>
            <ChevronDown
              size={15}
              className={`text-text-muted transition-transform duration-200 ${archiveOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Accordion body */}
          {archiveOpen && (
            <div className="border-t border-border divide-y divide-border">
              {savedDashboards.map(saved => (
                <div key={saved.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{saved.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {saved.widgets.length} chart{saved.widgets.length !== 1 ? 's' : ''} · Saved {formatDate(saved.savedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => handleLoadDashboard(saved.id)}
                      className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover border border-accent/30 hover:border-accent/60 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                    <button
                      onClick={() => deleteSavedDashboard(saved.id)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-red-400 border border-border hover:border-red-400/40 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
