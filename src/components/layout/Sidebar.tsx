import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MapPin,
  FolderKanban,
  Users,
  FileText,
  ClipboardList,
  Upload,
  Building2,
  BarChart3,
  Monitor,
} from 'lucide-react'
import { useRole } from '../../context/RoleContext'
import type { Role } from '../../context/RoleContext'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  roles?: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'QA Dashboard',  path: '/qa-dashboard',  icon: <LayoutDashboard size={18} /> },
  { label: 'Sites',         path: '/sites',         icon: <MapPin size={18} /> },
  { label: 'Projects',      path: '/projects',      icon: <FolderKanban size={18} /> },
  { label: 'Customers',     path: '/customers',     icon: <Users size={18} /> },
  { label: 'Scope of Work', path: '/scope-of-work', icon: <FileText size={18} /> },
  { label: 'Templates',     path: '/templates',     icon: <ClipboardList size={18} /> },
  { label: 'Import',        path: '/import',        icon: <Upload size={18} /> },
  { label: 'Organization',  path: '/organization',  icon: <Building2 size={18} /> },
]

const ANALYTICS_ITEMS: NavItem[] = [
  {
    label: 'PowerBI Dashboard',
    path: '/powerbi-dashboard',
    icon: <Monitor size={18} />,
    roles: ['admin', 'org_owner', 'pm', 'technician'],
  },
  {
    label: 'Custom Data Analytics',
    path: '/custom-data-analytics',
    icon: <BarChart3 size={18} />,
    roles: ['admin', 'org_owner', 'pm', 'technician'],
  },
  {
    label: 'My Custom Dashboard',
    path: '/custom-dashboard',
    icon: <LayoutDashboard size={18} />,
    roles: ['admin', 'org_owner', 'pm', 'technician'],
  },
]

const Sidebar: React.FC = () => {
  const { role } = useRole()

  const canSeeAnalytics = ANALYTICS_ITEMS.some(
    item => !item.roles || item.roles.includes(role)
  )

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
      'hover:bg-surface hover:text-text-primary',
      isActive
        ? 'bg-surface text-accent border-l-2 border-accent pl-[14px]'
        : 'text-text-secondary border-l-2 border-transparent',
    ].join(' ')

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-sidebar border-r border-border shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold tracking-tight">FS</span>
        </div>
        <span className="text-text-primary font-semibold text-base tracking-tight">
          FieldSync
        </span>
      </div>

      {/* Menu label */}
      <div className="px-5 pt-5 pb-1">
        <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">
          Menu
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3 pb-4 flex-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} to={item.path} className={linkClass}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Analytics section */}
        {canSeeAnalytics && (
          <>
            <div className="mt-5 mb-1 px-4">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">
                Analytics
              </span>
            </div>
            {ANALYTICS_ITEMS.filter(item => !item.roles || item.roles.includes(role)).map(item => (
              <NavLink key={item.path} to={item.path} className={linkClass}>
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <span className="text-text-muted text-xs">v1.0.0 · prototype</span>
      </div>
    </aside>
  )
}

export default Sidebar
