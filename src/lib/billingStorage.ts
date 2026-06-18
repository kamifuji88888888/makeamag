const BILLING_ACCOUNT_KEY = 'makeamag_billing_account'

function createBillingAccountId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `acct_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function getBillingAccountId(): string {
  try {
    const existing = localStorage.getItem(BILLING_ACCOUNT_KEY)
    if (existing?.trim()) {
      return existing.trim()
    }
    const created = createBillingAccountId()
    localStorage.setItem(BILLING_ACCOUNT_KEY, created)
    return created
  } catch {
    return createBillingAccountId()
  }
}
