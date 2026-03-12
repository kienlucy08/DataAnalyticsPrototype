import React, { createContext, useContext, useState } from 'react'

export type Proto = 1 | 2

interface PrototypeContextValue {
  proto: Proto
  setProto: (p: Proto) => void
}

const PrototypeContext = createContext<PrototypeContextValue | undefined>(undefined)

export const PrototypeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proto, setProto] = useState<Proto>(1)
  return (
    <PrototypeContext.Provider value={{ proto, setProto }}>
      {children}
    </PrototypeContext.Provider>
  )
}

export function useProto(): PrototypeContextValue {
  const ctx = useContext(PrototypeContext)
  if (!ctx) throw new Error('useProto must be used within PrototypeProvider')
  return ctx
}
