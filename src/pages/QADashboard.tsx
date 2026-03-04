import React, { useState } from 'react'
import {
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, UserCheck,
  ChevronDown, BarChart3, Users, TrendingUp, Circle,
} from 'lucide-react'
import { useRole } from '../context/RoleContext'

// ─── Shared types ──────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low'
type SurveyStatus = 'unassigned' | 'pending' | 'in_progress' | 'completed' | 'overdue'

interface Survey {
  id: string
  site: string
  organization: string
  priority?: Priority
  status: SurveyStatus
  assignee?: string
  progress?: number
  createdDate: string
  completedDate?: string
  deficiencies?: number
  dueDate?: string
}

// ─── Fake data ─────────────────────────────────────────────────────────────

const UNASSIGNED_SURVEYS: Survey[] = [
  { id: '#1042', site: 'Tower Site Alpha',   organization: 'FieldSync Org', priority: 'high',   status: 'unassigned', createdDate: '2025-02-26', dueDate: '2025-03-05' },
  { id: '#1043', site: 'Tower Site Beta',    organization: 'Test Org',      priority: 'medium', status: 'unassigned', createdDate: '2025-02-27', dueDate: '2025-03-07' },
  { id: '#1044', site: 'Tower Site Gamma',   organization: 'FieldSync Org', priority: 'medium', status: 'unassigned', createdDate: '2025-03-02', dueDate: '2025-03-10' },
  { id: '#1045', site: 'Tower Site Delta',   organization: 'Test Org',      priority: 'low',    status: 'unassigned', createdDate: '2025-02-23', dueDate: '2025-03-12' },
]

const ASSIGNED_SURVEYS: Survey[] = [
  { id: '#1038', site: 'Tower Site Epsilon', organization: 'FieldSync Org', status: 'in_progress', assignee: 'Matt Edrich',  progress: 60,  createdDate: '2025-02-18', dueDate: '2025-03-04' },
  { id: '#1039', site: 'Tower Site Zeta',    organization: 'FieldSync Org', status: 'in_progress', assignee: 'James Wilson', progress: 30,  createdDate: '2025-02-20', dueDate: '2025-03-06' },
  { id: '#1040', site: 'Tower Site Eta',     organization: 'Test Org',      status: 'completed',   assignee: 'Matt Edrich',  progress: 100, createdDate: '2025-02-10', completedDate: '2025-02-28', deficiencies: 1 },
  { id: '#1041', site: 'Tower Site Theta',   organization: 'FieldSync Org', status: 'pending',     assignee: 'Sarah Connor', progress: 0,   createdDate: '2025-02-25', dueDate: '2025-03-08' },
  { id: '#1046', site: 'Tower Site Lambda',  organization: 'Test Org',      status: 'in_progress', assignee: 'Matt Edrich',  progress: 25,  createdDate: '2025-02-28', dueDate: '2025-03-09' },
  { id: '#1036', site: 'Tower Site Kappa',   organization: 'FieldSync Org', status: 'overdue',     assignee: 'James Wilson', progress: 45,  createdDate: '2025-02-05', dueDate: '2025-02-28' },
]

const MATT_IN_PROGRESS: Survey[] = [
  { id: '#1038', site: 'Tower Site Epsilon', organization: 'FieldSync Org', status: 'in_progress', progress: 60, createdDate: '2025-02-18', dueDate: '2025-03-04' },
  { id: '#1046', site: 'Tower Site Lambda',  organization: 'Test Org',      status: 'in_progress', progress: 25, createdDate: '2025-02-28', dueDate: '2025-03-09' },
]

const MATT_COMPLETED: Survey[] = [
  { id: '#1040', site: 'Tower Site Eta',     organization: 'Test Org',      status: 'completed', completedDate: '2025-02-28', deficiencies: 1, createdDate: '2025-02-10' },
  { id: '#1037', site: 'Tower Site Omicron', organization: 'FieldSync Org', status: 'completed', completedDate: '2025-02-14', deficiencies: 2, createdDate: '2025-02-05' },
  { id: '#1035', site: 'Tower Site Xi',      organization: 'FieldSync Org', status: 'completed', completedDate: '2025-02-03', deficiencies: 7, createdDate: '2025-01-28' },
  { id: '#1033', site: 'Tower Site Nu',      organization: 'Test Org',      status: 'completed', completedDate: '2025-01-22', deficiencies: 0, createdDate: '2025-01-16' },
  { id: '#1031', site: 'Tower Site Mu',      organization: 'FieldSync Org', status: 'completed', completedDate: '2025-01-15', deficiencies: 3, createdDate: '2025-01-09' },
]

// ─── Shared UI helpers ─────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Priority, string> = {
  high:   'text-red-400 bg-red-400/10 border-red-400/30',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  low:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
}

const STATUS_STYLES: Record<SurveyStatus, string> = {
  unassigned:  'text-text-muted bg-surface border-border',
  pending:     'text-amber-400 bg-amber-400/10 border-amber-400/30',
  in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  completed:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  overdue:     'text-red-400 bg-red-400/10 border-red-400/30',
}

const STATUS_LABELS: Record<SurveyStatus, string> = {
  unassigned:  'Unassigned',
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  overdue:     'Overdue',
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: SurveyStatus }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  const color = value === 100 ? 'bg-emerald-400' : value > 50 ? 'bg-accent' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-text-muted w-7 text-right">{value}%</span>
    </div>
  )
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-accent">{icon}</span>
      <h2 className="text-text-primary text-sm font-semibold">{title}</h2>
      {count !== undefined && (
        <span className="text-[10px] text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

// ─── Admin View ────────────────────────────────────────────────────────────

function AdminView() {
  const allSurveys = [...UNASSIGNED_SURVEYS, ...ASSIGNED_SURVEYS]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Surveys',  value: 47, icon: <ClipboardCheck size={16} />, color: 'text-accent' },
          { label: 'Completed',      value: 28, icon: <CheckCircle2 size={16} />,   color: 'text-emerald-400' },
          { label: 'In Progress',    value: 11, icon: <TrendingUp size={16} />,     color: 'text-blue-400' },
          { label: 'Overdue',        value: 3,  icon: <AlertCircle size={16} />,    color: 'text-red-400' },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className={`mb-1.5 ${card.color}`}>{card.icon}</div>
            <div className="text-text-primary text-2xl font-bold">{card.value}</div>
            <div className="text-text-muted text-xs mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-text-muted text-xs mb-1">Completion Rate</div>
          <div className="text-text-primary text-xl font-bold mb-2">74%</div>
          <ProgressBar value={74} />
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="text-text-muted text-xs mb-1">Avg Deficiencies / Survey</div>
          <div className="text-text-primary text-xl font-bold">2.4</div>
          <div className="text-text-muted text-xs mt-1">across all completed surveys</div>
        </div>
      </div>

      <div>
        <SectionHeader icon={<BarChart3 size={15} />} title="All Active Surveys" count={allSurveys.length} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                {['ID', 'Site', 'Organization', 'Assignee', 'Status', 'Progress'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-text-primary font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSurveys.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.id}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.site}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.organization}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.assignee ?? <span className="text-text-muted italic">Unassigned</span>}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                  <td className="px-3 py-2.5 w-32">{s.progress !== undefined ? <ProgressBar value={s.progress} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── PM View ───────────────────────────────────────────────────────────────

function PMView() {
  const [assignOpen, setAssignOpen] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader icon={<AlertCircle size={15} />} title="Needs Assignment" count={UNASSIGNED_SURVEYS.length} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                {['ID', 'Site', 'Organization', 'Priority', 'Created', 'Due Date', 'Action'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-text-primary font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UNASSIGNED_SURVEYS.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.id}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.site}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.organization}</td>
                  <td className="px-3 py-2.5">{s.priority && <PriorityBadge priority={s.priority} />}</td>
                  <td className="px-3 py-2.5 text-text-muted">{s.createdDate}</td>
                  <td className="px-3 py-2.5 text-text-muted">{s.dueDate}</td>
                  <td className="px-3 py-2.5">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setAssignOpen(assignOpen === s.id ? null : s.id)}
                        className="flex items-center gap-1 text-accent hover:text-accent-hover border border-accent/30 hover:border-accent/60 px-2 py-1 rounded-lg transition-colors"
                      >
                        <UserCheck size={11} />
                        Assign
                        <ChevronDown size={10} className={`transition-transform ${assignOpen === s.id ? 'rotate-180' : ''}`} />
                      </button>
                      {assignOpen === s.id && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                          {['Matt Edrich', 'James Wilson', 'Sarah Connor'].map(name => (
                            <button
                              key={name}
                              onClick={() => setAssignOpen(null)}
                              className="w-full text-left px-3 py-2 text-text-secondary hover:bg-surface hover:text-text-primary transition-colors text-xs"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionHeader icon={<Users size={15} />} title="Assigned Surveys" count={ASSIGNED_SURVEYS.length} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                {['ID', 'Site', 'Assignee', 'Status', 'Progress', 'Due / Completed'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-text-primary font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSIGNED_SURVEYS.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.id}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.site}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.assignee}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                  <td className="px-3 py-2.5 w-36">{s.progress !== undefined && <ProgressBar value={s.progress} />}</td>
                  <td className="px-3 py-2.5 text-text-muted">
                    {s.status === 'completed'
                      ? <span className="text-emerald-400">✓ {s.completedDate}</span>
                      : s.status === 'overdue'
                      ? <span className="text-red-400">⚠ {s.dueDate}</span>
                      : s.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Technician View ───────────────────────────────────────────────────────

function TechnicianView() {
  const totalDef = MATT_COMPLETED.reduce((s, x) => s + (x.deficiencies ?? 0), 0)
  const avgDef = (totalDef / MATT_COMPLETED.length).toFixed(1)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'In Progress',      value: MATT_IN_PROGRESS.length, icon: <Clock size={16} />,        color: 'text-blue-400' },
          { label: 'Completed',        value: MATT_COMPLETED.length,   icon: <CheckCircle2 size={16} />, color: 'text-emerald-400' },
          { label: 'Avg Deficiencies', value: avgDef,                  icon: <AlertCircle size={16} />,  color: 'text-amber-400' },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className={`mb-1.5 ${card.color}`}>{card.icon}</div>
            <div className="text-text-primary text-2xl font-bold">{card.value}</div>
            <div className="text-text-muted text-xs mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div>
        <SectionHeader icon={<Clock size={15} />} title="Surveys In Progress" count={MATT_IN_PROGRESS.length} />
        <div className="space-y-3">
          {MATT_IN_PROGRESS.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-text-primary text-sm font-medium">{s.site}</span>
                  <span className="text-text-muted text-xs ml-2 font-mono">{s.id}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Circle size={8} className="text-blue-400 fill-blue-400" />
                  <span>{s.organization}</span>
                  <span>·</span>
                  <span>Due {s.dueDate}</span>
                </div>
              </div>
              <ProgressBar value={s.progress ?? 0} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader icon={<CheckCircle2 size={15} />} title="Completed Surveys" count={MATT_COMPLETED.length} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                {['ID', 'Site', 'Organization', 'Completed', 'Deficiencies'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-text-primary font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATT_COMPLETED.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.id}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.site}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.organization}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.completedDate}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-medium ${(s.deficiencies ?? 0) === 0 ? 'text-emerald-400' : (s.deficiencies ?? 0) >= 5 ? 'text-red-400' : 'text-amber-400'}`}>
                      {s.deficiencies}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Org Owner View ────────────────────────────────────────────────────────

const ORG_STATS = [
  {
    org: 'FieldSync Org',
    total: 28, completed: 17, inProgress: 7, overdue: 2, completionRate: 61,
  },
  {
    org: 'Test Org',
    total: 19, completed: 11, inProgress: 4, overdue: 1, completionRate: 58,
  },
]

function OrgOwnerView() {
  const allSurveys = [...UNASSIGNED_SURVEYS, ...ASSIGNED_SURVEYS]
  return (
    <div className="space-y-6">
      {/* Org-level KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ORG_STATS.map(org => (
          <div key={org.org} className="rounded-xl border border-border bg-card px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-primary text-sm font-semibold">{org.org}</span>
              <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                {org.completionRate}% complete
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Total',       value: org.total,       color: 'text-text-primary' },
                { label: 'Completed',   value: org.completed,   color: 'text-emerald-400' },
                { label: 'In Progress', value: org.inProgress,  color: 'text-blue-400' },
                { label: 'Overdue',     value: org.overdue,     color: 'text-red-400' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-text-muted text-[10px] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <ProgressBar value={org.completionRate} />
            </div>
          </div>
        ))}
      </div>

      {/* All surveys table */}
      <div>
        <SectionHeader icon={<BarChart3 size={15} />} title="All Surveys in Your Organizations" count={allSurveys.length} />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface border-b border-border">
                {['ID', 'Site', 'Organization', 'Assignee', 'Status', 'Progress', 'Due Date'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-text-primary font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSurveys.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                  <td className="px-3 py-2.5 text-text-muted font-mono">{s.id}</td>
                  <td className="px-3 py-2.5 text-text-primary">{s.site}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.organization}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{s.assignee ?? <span className="text-text-muted italic">Unassigned</span>}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                  <td className="px-3 py-2.5 w-32">{s.progress !== undefined ? <ProgressBar value={s.progress} /> : '—'}</td>
                  <td className="px-3 py-2.5 text-text-muted">{s.dueDate ?? s.completedDate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── QC Technician 2 View (placeholder) ───────────────────────────────────

function QcTech2View() {
  return (
    <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-border bg-card">
      <ClipboardCheck className="text-text-muted mb-4" size={36} />
      <p className="text-text-primary font-medium mb-1">John Smith — QC Technician</p>
      <p className="text-text-muted text-sm text-center max-w-sm">
        This view is under construction. John's personalized survey activity and performance data will appear here.
      </p>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

const ROLE_META = {
  admin:           { subtitle: 'Organization-wide survey overview, assignments, and performance metrics.' },
  org_owner:       { subtitle: 'Survey health, completion rates, and operational status across your managed organizations.' },
  pm:              { subtitle: 'Manage survey assignments and track QC technician progress across your organizations.' },
  qc_technician:   { subtitle: 'Your assigned surveys, progress, and completed inspection history.' },
  qc_technician_2: { subtitle: 'Your assigned surveys, progress, and completed inspection history.' },
}

const QADashboard: React.FC = () => {
  const { role } = useRole()
  const { subtitle } = ROLE_META[role]

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex items-start gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
          <ClipboardCheck className="text-accent" size={20} />
        </div>
        <div>
          <h1 className="text-text-primary text-2xl font-semibold leading-tight">QA Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      {role === 'admin'           && <AdminView />}
      {role === 'org_owner'       && <OrgOwnerView />}
      {role === 'pm'              && <PMView />}
      {role === 'qc_technician'   && <TechnicianView />}
      {role === 'qc_technician_2' && <QcTech2View />}
    </div>
  )
}

export default QADashboard
