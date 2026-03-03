import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Layout } from 'react-grid-layout'
import type { DashboardWidget, ChartData } from '../types/dashboard'

const STORAGE_KEY = 'fieldsync_dashboard'

interface DashboardContextValue {
  widgets: DashboardWidget[]
  addWidget: (chart: ChartData) => string
  removeWidget: (id: string) => void
  updateLayouts: (layouts: Layout[]) => void
  clearAll: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

function loadWidgets(): DashboardWidget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DashboardWidget[]) : []
  } catch {
    return []
  }
}

function save(widgets: DashboardWidget[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(loadWidgets)

  const addWidget = useCallback((chart: ChartData): string => {
    const id = `widget_${Date.now()}`
    // Stack new widgets: find lowest occupied y + h, default to 0 if empty
    setWidgets(prev => {
      const maxY = prev.reduce((acc, w) => Math.max(acc, w.layout.y + w.layout.h), 0)
      const newWidget: DashboardWidget = {
        ...chart,
        id,
        layout: { x: 0, y: maxY, w: 6, h: 4 },
        createdAt: Date.now(),
      }
      const next = [...prev, newWidget]
      save(next)
      return next
    })
    return id
  }, [])

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const next = prev.filter(w => w.id !== id)
      save(next)
      return next
    })
  }, [])

  const updateLayouts = useCallback((layouts: Layout[]) => {
    setWidgets(prev => {
      const next = prev.map(w => {
        const l = layouts.find(ll => ll.i === w.id)
        if (!l) return w
        return { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } }
      })
      save(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setWidgets([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <DashboardContext.Provider value={{ widgets, addWidget, removeWidget, updateLayouts, clearAll }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider')
  return ctx
}
