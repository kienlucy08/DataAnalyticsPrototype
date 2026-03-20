import React from 'react'
import { Monitor } from 'lucide-react'
import { useRole } from '../context/RoleContext'
import { PBI_CONFIGS } from '../config/powerbi.config'
import PowerBIDashboard from '../components/powerbi/PowerBIDashboard'

const ROLE_LABELS: Record<string, { title: string; description: string }> = {
  admin: {
    title: 'Admin Analytics Dashboard',
    description: 'Organization-wide metrics, team performance, and operational overview.',
  },
  pm: {
    title: 'Project Manager Dashboard',
    description: 'Project status, site progress, and scheduling analytics.',
  },
  technician: {
    title: 'Technician Dashboard',
    description: 'Assigned work, inspection results, and field activity summary.',
  },
  org_owner: {
    title: 'Org Owner Dashboard',
    description: 'Survey health, completion rates, and operational status across your organizations.',
  },
  qc_technician: {
    title: 'Technician Dashboard',
    description: 'Assigned work, inspection results, and field activity summary.',
  },
  qc_technician_2: {
    title: 'Technician Dashboard',
    description: 'Assigned work, inspection results, and field activity summary.',
  },
  clickup_admin: {
    title: 'Admin Dashboard',
    description: 'Organization-wide metrics, team performance, and operational overview.',
  },
  clickup_org_owner: {
    title: 'Org Owner Dashboard',
    description: 'Survey health, completion rates, and operational status across your organizations.',
  },
  clickup_pm: {
    title: 'Project Manager Dashboard',
    description: 'Project status, site progress, and scheduling analytics.',
  },
  clickup_technician: {
    title: 'Technician Dashboard',
    description: 'Assigned work, inspection results, and field activity summary.',
  },
}

const PowerBIDashboardPage: React.FC = () => {
  const { role } = useRole()
  const config = PBI_CONFIGS[role]
  const { title, description } = ROLE_LABELS[role] ?? ROLE_LABELS['pm']

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
          <Monitor className="text-accent" size={20} />
        </div>
        <div>
          <h1 className="text-text-primary text-2xl font-semibold leading-tight">
            PowerBI Dashboard
          </h1>
          <p className="text-text-secondary text-sm mt-1">{description}</p>
        </div>
      </div>

      {/* Role label */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-primary text-base font-medium">{title}</h2>
        <span className="text-xs text-text-muted bg-card border border-border px-2.5 py-1 rounded-full capitalize">
          {role} view
        </span>
      </div>

      {/* Power BI embed */}
      <PowerBIDashboard config={config} title={title} />
    </div>
  )
}

export default PowerBIDashboardPage
