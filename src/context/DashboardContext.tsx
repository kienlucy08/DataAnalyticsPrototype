import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Layout } from 'react-grid-layout'
import type { DashboardWidget, ChartData, SavedDashboard } from '../types/dashboard'
import { useRole } from './RoleContext'
import type { Role } from './RoleContext'

const USER_KEYS: Record<Role, string> = {
  admin:      'lucy_kien',
  org_owner:  'sara_connor',
  pm:         'susan_smith',
  technician: 'matt_edrich',
}

function storageKey(userKey: string) {
  return `fieldsync_dashboard_${userKey}`
}
function savedKey(userKey: string) {
  return `fieldsync_saved_${userKey}`
}

function loadWidgets(userKey: string): DashboardWidget[] {
  try {
    const raw = localStorage.getItem(storageKey(userKey))
    return raw ? (JSON.parse(raw) as DashboardWidget[]) : []
  } catch { return [] }
}

function loadSaved(userKey: string): SavedDashboard[] {
  try {
    const raw = localStorage.getItem(savedKey(userKey))
    return raw ? (JSON.parse(raw) as SavedDashboard[]) : []
  } catch { return [] }
}

function persistWidgets(userKey: string, widgets: DashboardWidget[]) {
  localStorage.setItem(storageKey(userKey), JSON.stringify(widgets))
}
function persistSaved(userKey: string, saved: SavedDashboard[]) {
  localStorage.setItem(savedKey(userKey), JSON.stringify(saved))
}

interface DashboardContextValue {
  widgets: DashboardWidget[]
  addWidget: (chart: ChartData) => string
  removeWidget: (id: string) => void
  updateLayouts: (layouts: Layout) => void
  clearAll: () => void
  savedDashboards: SavedDashboard[]
  saveDashboard: (name: string) => void
  loadDashboard: (id: string) => void
  deleteSavedDashboard: (id: string) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useRole()
  const userKey = USER_KEYS[role]

  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => loadWidgets(userKey))
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>(() => loadSaved(userKey))

  // Reload data when user switches
  useEffect(() => {
    setWidgets(loadWidgets(userKey))
    setSavedDashboards(loadSaved(userKey))
  }, [userKey])

  const addWidget = useCallback((chart: ChartData): string => {
    const id = `widget_${Date.now()}`
    setWidgets(prev => {
      const maxY = prev.reduce((acc, w) => Math.max(acc, w.layout.y + w.layout.h), 0)
      const newWidget: DashboardWidget = {
        ...chart,
        id,
        layout: { x: 0, y: maxY, w: chart.type === 'table' ? 12 : 6, h: chart.type === 'table' ? 6 : 4 },
        createdAt: Date.now(),
      }
      const next = [...prev, newWidget]
      persistWidgets(userKey, next)
      return next
    })
    return id
  }, [userKey])

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const next = prev.filter(w => w.id !== id)
      persistWidgets(userKey, next)
      return next
    })
  }, [userKey])

  const updateLayouts = useCallback((layouts: Layout) => {
    setWidgets(prev => {
      const next = prev.map(w => {
        const l = layouts.find(ll => ll.i === w.id)
        if (!l) return w
        return { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } }
      })
      persistWidgets(userKey, next)
      return next
    })
  }, [userKey])

  const clearAll = useCallback(() => {
    setWidgets([])
    localStorage.removeItem(storageKey(userKey))
  }, [userKey])

  const saveDashboard = useCallback((name: string) => {
    setWidgets(currentWidgets => {
      const snapshot: SavedDashboard = {
        id: `saved_${Date.now()}`,
        name: name.trim() || `Dashboard ${new Date().toLocaleDateString()}`,
        widgets: currentWidgets,
        savedAt: Date.now(),
      }
      setSavedDashboards(prev => {
        const next = [snapshot, ...prev]
        persistSaved(userKey, next)
        return next
      })
      return currentWidgets
    })
  }, [userKey])

  const loadDashboard = useCallback((id: string) => {
    setSavedDashboards(prev => {
      const found = prev.find(s => s.id === id)
      if (found) {
        setWidgets(found.widgets)
        persistWidgets(userKey, found.widgets)
      }
      return prev
    })
  }, [userKey])

  const deleteSavedDashboard = useCallback((id: string) => {
    setSavedDashboards(prev => {
      const next = prev.filter(s => s.id !== id)
      persistSaved(userKey, next)
      return next
    })
  }, [userKey])

  return (
    <DashboardContext.Provider value={{
      widgets, addWidget, removeWidget, updateLayouts, clearAll,
      savedDashboards, saveDashboard, loadDashboard, deleteSavedDashboard,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider')
  return ctx
}
