import type { BillingAccountStatus } from '../shared/billing.js'
import { isPaidPlan } from '../shared/billing.js'
import type { PlanId } from '../shared/plans.js'
import { parsePlanId } from '../shared/plans.js'
import { isBillingConfigured } from './billing.js'

const FOUNDER_OVERRIDE_EMAILS = ['stephen@genlux.com']

export function planOverrideEmails(): string[] {
  const fromEnv =
    process.env.BILLING_OVERRIDE_EMAIL?.split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean) ?? []
  return [...new Set([...fromEnv, ...FOUNDER_OVERRIDE_EMAILS])]
}

export function isPlanOverrideEmail(email: string | undefined | null): boolean {
  if (!email?.trim()) return false
  return planOverrideEmails().includes(email.trim().toLowerCase())
}

export function founderOverridePlanId(): PlanId {
  const planId = parsePlanId(process.env.BILLING_OVERRIDE_PLAN?.trim() || 'publisher')
  return isPaidPlan(planId) ? planId : 'publisher'
}

export function founderBillingStatus(accountId: string): BillingAccountStatus {
  return {
    accountId,
    planId: founderOverridePlanId(),
    billingInterval: null,
    status: 'active',
    hasSubscription: true,
    billingEnabled: isBillingConfigured(),
  }
}
