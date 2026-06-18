import type { PlanId } from './plans.js'

export type BillingInterval = 'monthly' | 'annual'

export type BillingStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none'

export interface BillingAccountStatus {
  accountId: string
  planId: PlanId
  billingInterval: BillingInterval | null
  status: BillingStatus
  hasSubscription: boolean
  billingEnabled: boolean
}

export const PAID_PLAN_IDS: PlanId[] = ['starter', 'pro', 'publisher']

export function isPaidPlan(planId: PlanId): boolean {
  return PAID_PLAN_IDS.includes(planId)
}
