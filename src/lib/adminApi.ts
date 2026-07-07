import type { AdminMetricsSummary } from '../../shared/adminMetrics'
import { formatStorageBytes } from '../../shared/adminMetrics'

const ADMIN_SECRET_KEY = 'makeamag_admin_secret'

export function getStoredAdminSecret(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_SECRET_KEY)
  } catch {
    return null
  }
}

export function setStoredAdminSecret(secret: string): void {
  sessionStorage.setItem(ADMIN_SECRET_KEY, secret)
}

export function clearStoredAdminSecret(): void {
  sessionStorage.removeItem(ADMIN_SECRET_KEY)
}

export async function fetchAdminMetrics(secret?: string): Promise<AdminMetricsSummary> {
  const headers: HeadersInit = secret ? { Authorization: `Bearer ${secret}` } : {}
  const response = await fetch('/api/admin/metrics', {
    credentials: 'include',
    headers,
  })

  if (response.status === 401) {
    throw new Error('Invalid admin secret')
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to load admin metrics')
  }

  return response.json() as Promise<AdminMetricsSummary>
}

export { formatStorageBytes }
