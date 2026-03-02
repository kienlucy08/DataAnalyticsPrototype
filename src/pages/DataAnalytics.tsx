import React from 'react'
import { BarChart3 } from 'lucide-react'
import { useRole } from '../context/RoleContext'
import { PBI_CONFIGS } from '../config/powerbi.config'
import PowerBIDashboard from '../components/powerbi/PowerBIDashboard'
import ChatInput from '../components/ui/ChatInput'

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
}

const DataAnalytics: React.FC = () => {
  const { role } = useRole()
  const config = PBI_CONFIGS[role]
  const { title, description } = ROLE_LABELS[role]

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 shrink-0 mt-0.5">
          <BarChart3 className="text-accent" size={20} />
        </div>
        <div>
          <h1 className="text-text-primary text-2xl font-semibold leading-tight">
            Data Analytics
          </h1>
          <p className="text-text-secondary text-sm mt-1">{description}</p>
        </div>
      </div>

      {/* Dashboard label */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-primary text-base font-medium">{title}</h2>
        <span className="text-xs text-text-muted bg-card border border-border px-2.5 py-1 rounded-full capitalize">
          {role} view
        </span>
      </div>

      {/* Power BI embed */}
      <PowerBIDashboard config={config} title={title} />

      {/* Claude AI chat input */}
      <ChatInput />
    </div>
  )
}

export default DataAnalytics
