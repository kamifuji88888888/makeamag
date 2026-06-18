import type { BillingAccountStatus, BillingInterval } from '../../shared/billing'
import type { PlanId } from '../../shared/plans'
import { getBillingAccountId } from './billingStorage'

const fetchOptions: RequestInit = {
  credentials: 'include',
}

export async function fetchBillingStatus(accountId = getBillingAccountId()): Promise<BillingAccountStatus> {
  const response = await fetch(`/api/billing/status?accountId=${encodeURIComponent(accountId)}`, fetchOptions)
  if (!response.ok) {
    throw new Error('Failed to load billing status')
  }
  return response.json() as Promise<BillingAccountStatus>
}

export async function startPlanCheckout(
  planId: PlanId,
  billing: BillingInterval,
  options?: { email?: string; accountId?: string },
): Promise<string> {
  const accountId = options?.accountId ?? getBillingAccountId()
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      accountId,
      planId,
      billing,
      email: options?.email,
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to start checkout')
  }

  const data = (await response.json()) as { url: string }
  return data.url
}

export async function verifyPlanCheckout(
  sessionId: string,
  accountId = getBillingAccountId(),
): Promise<BillingAccountStatus> {
  const response = await fetch('/api/billing/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ accountId, sessionId }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to verify checkout')
  }

  return response.json() as Promise<BillingAccountStatus>
}

export async function openBillingPortal(accountId = getBillingAccountId()): Promise<string> {
  const response = await fetch('/api/billing/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ accountId }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to open billing portal')
  }

  const data = (await response.json()) as { url: string }
  return data.url
}
