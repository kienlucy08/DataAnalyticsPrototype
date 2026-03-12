import React, { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle2, ChevronDown, Wifi } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types (mirror ClickUp API v2 task shape)
// ---------------------------------------------------------------------------

interface CUStatus {
  status: string
  color: string
  type: string
}

interface CUAssignee {
  id: number
  username: string
  email: string
  color: string
  initials: string
  profilePicture: string | null
}

interface CUPriority {
  id: string
  priority: string
  color: string
}

interface CUTask {
  id: string
  name: string
  status: CUStatus
  assignees: CUAssignee[]
  due_date: string | null
  priority: CUPriority | null
  url: string
  date_created: string
  date_updated: string
}

interface ListMeta {
  id: string
  name: string
  statuses: CUStatus[]
  source?: 'clickup' | 'mock'
}

type Tab = 'surveys' | 'site_visits' | 'scans'

// ---------------------------------------------------------------------------
// Static config — set CLICKUP_*_LIST_ID env vars in .env when going live
// ---------------------------------------------------------------------------

const SURVEYS_LIST_ID = import.meta.env.VITE_CLICKUP_SURVEYS_LIST_ID || 'mock_surveys'
const SITE_VISITS_LIST_ID = import.meta.env.VITE_CLICKUP_SITE_VISITS_LIST_ID || 'mock_site_visits'
const API = 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Random scans (no ClickUp sync — prototype only)
// ---------------------------------------------------------------------------

const MOCK_SCANS = Array.from({ length: 10 }, (_, i) => ({
  id: `scan_${String(i + 1).padStart(3, '0')}`,
  site: ['Tower Alpha', 'Crown Castle Site B', 'Rural Self-Support', 'Urban Monopole', 'Coastal Guyed', 'Industrial Site'][i % 6],
  transfer_status: ['initial', 'transferred', 'processing', 'processed', 'sending', 'processed'][i % 6],
  size_mb: (Math.random() * 900 + 50).toFixed(1),
  creator: ['Matt Edrich', 'John Smith', 'Sara Connor'][i % 3],
  created: new Date(Date.now() - Math.random() * 30 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDue(ms: string | null): { text: string; overdue: boolean } {
  if (!ms) return { text: '—', overdue: false }
  const d = new Date(parseInt(ms))
  const overdue = d < new Date()
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue }
}

function statusBg(color: string) {
  return { backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }
}

function transferColor(s: string) {
  if (s === 'processed') return '#6f3dc4'
  if (s === 'processing') return '#4194f6'
  if (s === 'transferred' || s === 'sending') return '#f7a44f'
  return '#8b9ab5'
}

// ---------------------------------------------------------------------------
// Status badge with inline dropdown
// ---------------------------------------------------------------------------

function StatusBadge({
  task,
  statuses,
  onUpdate,
}: {
  task: CUTask
  statuses: CUStatus[]
  onUpdate: (taskId: string, newStatus: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = async (s: string) => {
    setOpen(false)
    setSaving(true)
    await onUpdate(task.id, s)
    setSaving(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
        style={statusBg(task.status.color)}
        onClick={() => setOpen(o => !o)}
        disabled={saving}
      >
        {saving && <RefreshCw size={10} className="animate-spin" />}
        {task.status.status}
        <ChevronDown size={10} />
      </button>

      {open && statuses.length > 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 bg-card border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px]">
          {statuses.map(s => (
            <button
              key={s.status}
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface flex items-center gap-2 transition-colors"
              onClick={() => select(s.status)}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className={s.status === task.status.status ? 'font-semibold' : ''} style={{ color: s.status === task.status.status ? s.color : '#cbd3e3' }}>
                {s.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClickUpIntegration() {
  const [tab, setTab] = useState<Tab>('surveys')
  const [tasks, setTasks] = useState<CUTask[]>([])
  const [meta, setMeta] = useState<ListMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'clickup' | 'mock' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const listId = tab === 'surveys' ? SURVEYS_LIST_ID : SITE_VISITS_LIST_ID

  const fetchList = useCallback(async (lid: string) => {
    setLoading(true)
    setError(null)
    try {
      const [tasksRes, metaRes] = await Promise.all([
        fetch(`${API}/api/clickup/lists/${lid}/tasks`),
        fetch(`${API}/api/clickup/lists/${lid}`),
      ])
      const tasksData = await tasksRes.json() as { tasks: CUTask[]; source: 'clickup' | 'mock' }
      const metaData = await metaRes.json() as ListMeta
      setTasks(tasksData.tasks ?? [])
      setSource(tasksData.source)
      setMeta(metaData)
      setStatusFilter('all')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'scans') fetchList(listId)
  }, [tab, listId, fetchList])

  const updateStatus = useCallback(async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: { ...t.status, status: newStatus, color: meta?.statuses.find(s => s.status === newStatus)?.color ?? t.status.color } }
        : t
    ))
    try {
      await fetch(`${API}/api/clickup/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (e) {
      console.error('Status update failed:', e)
    }
  }, [meta])

  const visibleTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status.status === statusFilter)

  const uniqueStatuses = [...new Set(tasks.map(t => t.status.status))]
  const statuses = meta?.statuses ?? []

  // KPI counts
  const notStarted = tasks.filter(t => t.status.type === 'open').length
  const inProgress = tasks.filter(t => t.status.type === 'custom').length
  const complete = tasks.filter(t => t.status.type === 'closed').length
  const unassigned = tasks.filter(t => t.assignees.length === 0).length

  return (
    <div className="p-6 space-y-5 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7b68ee22', border: '1px solid #7b68ee44' }}>
            <Wifi size={16} style={{ color: '#7b68ee' }} />
          </div>
          <div>
            <h1 className="text-text-primary text-xl font-semibold">ClickUp Integration</h1>
            <p className="text-text-muted text-xs mt-0.5">Cleanroom prototype — pull tasks, update status, test sync</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {source && (
            <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
              source === 'clickup'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
            }`}>
              {source === 'clickup' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {source === 'clickup' ? 'Live — ClickUp API' : 'Demo mode — add CLICKUP_API_KEY to .env'}
            </span>
          )}

          {tab !== 'scans' && (
            <button
              onClick={() => fetchList(listId)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Sync
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['surveys', 'site_visits', 'scans'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'surveys' ? 'Surveys' : t === 'site_visits' ? 'Site Visits' : 'Scans'}
            {tab === t && t !== 'scans' && !loading && (
              <span className="ml-2 text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                {tasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Scans tab */}
      {tab === 'scans' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-text-muted text-xs">
            Scans are not managed in ClickUp — randomly populated for prototype purposes
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60">
                {['Scan ID', 'Site', 'Transfer Status', 'Size (MB)', 'Creator', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_SCANS.map(s => (
                <tr key={s.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{s.id}</td>
                  <td className="px-4 py-3 text-text-primary">{s.site}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${transferColor(s.transfer_status)}22`, color: transferColor(s.transfer_status), border: `1px solid ${transferColor(s.transfer_status)}44` }}>
                      {s.transfer_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{s.size_mb}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.creator}</td>
                  <td className="px-4 py-3 text-text-muted">{s.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Surveys / Site Visits tab */}
      {tab !== 'scans' && (
        <>
          {/* KPI row */}
          {!loading && tasks.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Not Started', value: notStarted, color: '#8b9ab5' },
                { label: 'In Progress', value: inProgress, color: '#4194f6' },
                { label: 'Complete', value: complete, color: '#6f3dc4' },
                { label: 'Unassigned', value: unassigned, color: '#f7a44f' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: k.color }} />
                  <div>
                    <div className="text-2xl font-bold text-text-primary">{k.value}</div>
                    <div className="text-xs text-text-muted">{k.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filter row */}
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-card border border-border text-text-secondary text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
            >
              <option value="all">All statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-text-muted text-xs">{visibleTasks.length} tasks</span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Fetching from ClickUp…
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-[38%]">Task</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center text-text-muted text-sm">
                        No tasks found
                      </td>
                    </tr>
                  ) : visibleTasks.map(task => {
                    const { text: dueText, overdue } = formatDue(task.due_date)
                    const assignee = task.assignees[0] ?? null

                    return (
                      <tr key={task.id} className="border-b border-border/40 hover:bg-surface/40 transition-colors group">
                        <td className="px-4 py-3 text-text-primary font-medium">{task.name}</td>

                        <td className="px-4 py-3">
                          <StatusBadge task={task} statuses={statuses} onUpdate={updateStatus} />
                        </td>

                        <td className="px-4 py-3">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                style={{ backgroundColor: assignee.color }}
                              >
                                {assignee.initials}
                              </div>
                              <span className="text-text-secondary">{assignee.username}</span>
                            </div>
                          ) : (
                            <span className="text-text-muted italic text-xs">Unassigned</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {overdue ? (
                            <span className="text-red-400 font-medium text-xs">⚠ {dueText}</span>
                          ) : (
                            <span className="text-text-secondary text-xs">{dueText}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-xs">
                          {task.priority ? (
                            <span style={{ color: task.priority.color }} className="font-medium capitalize">
                              {task.priority.priority}
                            </span>
                          ) : <span className="text-text-muted">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                            title="Open in ClickUp"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
