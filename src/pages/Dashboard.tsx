import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import type { Layout, LayoutItem } from 'react-grid-layout'
import { LayoutDashboard, X, Trash2, BarChart3 } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useDashboard } from '../context/DashboardContext'
import ChartRenderer from '../components/charts/ChartRenderer'

const Dashboard: React.FC = () => {
  const { widgets, removeWidget, updateLayouts, clearAll } = useDashboard()
  const { width, containerRef } = useContainerWidth()

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

  if (widgets.length === 0) {
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
    <div className="max-w-7xl mx-auto w-full">
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
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-1.5 rounded-lg transition-colors shrink-0 mt-1"
        >
          <Trash2 size={13} />
          Clear All
        </button>
      </div>

      {/* Grid */}
      <div ref={containerRef as React.RefObject<HTMLDivElement>}>
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={{ cols: 12, rowHeight: 70 }}
          dragConfig={{ handle: '.drag-handle' }}
          resizeConfig={{ handles: ['se'] }}
          onLayoutChange={updateLayouts}
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
    </div>
  )
}

export default Dashboard
