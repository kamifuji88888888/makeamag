import type { BillingStatus } from './billing.js'
import type { PlanId } from './plans.js'

export interface AdminAccountMetric {
  accountId: string
  planId: PlanId
  billingStatus: BillingStatus
  flipbookCount: number
  storageBytes: number
  billingUpdatedAt: string | null
}

export interface AdminMetricsSummary {
  generatedAt: string
  totals: {
    flipbooks: number
    storageBytes: number
    billingAccounts: number
    unassignedFlipbooks: number
  }
  planBreakdown: Record<PlanId, number>
  accounts: AdminAccountMetric[]
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
