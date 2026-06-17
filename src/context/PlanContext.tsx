import { createContext, useContext, type ReactNode } from 'react'
import { usePlan } from '../hooks/usePlan'

type PlanContextValue = ReturnType<typeof usePlan>

const PlanContext = createContext<PlanContextValue | null>(null)

export function PlanProvider({ children }: { children: ReactNode }) {
  const value = usePlan()
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlanContext(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (!ctx) {
    throw new Error('usePlanContext must be used within PlanProvider')
  }
  return ctx
}
