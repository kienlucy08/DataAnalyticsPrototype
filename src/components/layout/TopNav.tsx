import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Shield, Briefcase, Wrench, User, Building2 } from 'lucide-react'
import { useRole } from '../../context/RoleContext'
import type { Role } from '../../context/RoleContext'

const ROLES: { value: Role; label: string; icon: React.ReactNode }[] = [
  { value: 'admin',           label: 'Admin',           icon: <Shield size={14} /> },
  { value: 'org_owner',       label: 'Org Owner',       icon: <Building2 size={14} /> },
  { value: 'pm',              label: 'Project Manager', icon: <Briefcase size={14} /> },
  { value: 'qc_technician',   label: 'QC Technician',   icon: <Wrench size={14} /> },
  { value: 'qc_technician_2', label: 'QC Technician',   icon: <Wrench size={14} /> },
]

const ROLE_BADGE: Record<Role, string> = {
  admin:           'text-purple-400 bg-purple-400/10 border-purple-400/30',
  org_owner:       'text-amber-400 bg-amber-400/10 border-amber-400/30',
  pm:              'text-blue-400 bg-blue-400/10 border-blue-400/30',
  qc_technician:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  qc_technician_2: 'text-teal-400 bg-teal-400/10 border-teal-400/30',
}

const USER_PERSONAS: Record<Role, { full: string; first: string }> = {
  admin:           { full: 'Lucy Kien',   first: 'Lucy' },
  org_owner:       { full: 'Sara Connor', first: 'Sara' },
  pm:              { full: 'Susan Smith', first: 'Susan' },
  qc_technician:   { full: 'Matt Edrich', first: 'Matt' },
  qc_technician_2: { full: 'John Smith',  first: 'John' },
}

const TopNav: React.FC = () => {
  const { role, setRole } = useRole()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentRole = ROLES.find((r) => r.value === role)!
  const user = USER_PERSONAS[role]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-0 bg-sidebar border-b border-border h-14 shrink-0">
      {/* Left: breadcrumb + greeting */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary text-sm">FieldSync</span>
          <span className="text-text-muted text-sm">/</span>
          <span className="text-text-primary text-sm font-medium">Prototype</span>
        </div>
        <span className="text-border">·</span>
        <span className="text-text-secondary text-sm">
          Hi, <span className="text-text-primary font-medium">{user.first}</span>!
        </span>
      </div>

      {/* Right: user name + role switcher */}
      <div className="flex items-center gap-3">
        {/* User name pill */}
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <User size={13} className="text-text-muted" />
          <span className="font-medium text-text-primary">{user.full}</span>
        </div>

        <span className="text-border text-sm">|</span>

        <span className="text-text-muted text-xs hidden sm:block">Viewing as:</span>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150',
              ROLE_BADGE[role],
            ].join(' ')}
          >
            {currentRole.icon}
            <span>{currentRole.label}</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {ROLES.map((r) => {
                const persona = USER_PERSONAS[r.value]
                return (
                  <button
                    key={r.value}
                    onClick={() => { setRole(r.value); setOpen(false) }}
                    className={[
                      'flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-left transition-colors duration-100',
                      r.value === role
                        ? 'bg-surface text-text-primary'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary',
                    ].join(' ')}
                  >
                    <span className={
                      r.value === 'admin'           ? 'text-purple-400' :
                      r.value === 'org_owner'       ? 'text-amber-400' :
                      r.value === 'pm'              ? 'text-blue-400' :
                      r.value === 'qc_technician_2' ? 'text-teal-400' : 'text-emerald-400'
                    }>
                      {r.icon}
                    </span>
                    <div className="flex flex-col items-start">
                      <span>{r.label}</span>
                      <span className="text-text-muted text-[10px]">{persona.full}</span>
                    </div>
                    {r.value === role && (
                      <span className="ml-auto text-accent text-sm">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopNav
