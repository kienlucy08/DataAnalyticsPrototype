import React, { createContext, useContext, useState } from 'react'

export type Role = 'admin' | 'org_owner' | 'pm' | 'qc_technician' | 'qc_technician_2' | 'clickup_pm' | 'clickup_technician' | 'clickup_org_owner' | 'clickup_admin'

interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined)

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('admin')

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
