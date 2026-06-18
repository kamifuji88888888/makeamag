import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminMetricsSummary } from '../../shared/adminMetrics'
import { planDisplayName } from '../../shared/plans'
import {
  clearStoredAdminSecret,
  fetchAdminMetrics,
  formatStorageBytes,
  getStoredAdminSecret,
  setStoredAdminSecret,
} from '../lib/adminApi'

export function AdminPage() {
  const [secret, setSecret] = useState(() => getStoredAdminSecret() ?? '')
  const [inputSecret, setInputSecret] = useState('')
  const [metrics, setMetrics] = useState<AdminMetricsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadMetrics(nextSecret: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminMetrics(nextSecret)
      setMetrics(data)
      setSecret(nextSecret)
      setStoredAdminSecret(nextSecret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load metrics'
      setError(message)
      setMetrics(null)
      if (message === 'Invalid admin secret') {
        clearStoredAdminSecret()
        setSecret('')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!secret) return
    void loadMetrics(secret)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!secret) {
    return (
      <div className="min-h-screen bg-apple-bg px-6 py-16">
        <div className="mx-auto max-w-md">
          <Link to="/" className="text-sm text-apple-blue">
            ← Back to app
          </Link>
          <h1 className="apple-hero-title mt-6 text-[2rem]">Admin metrics</h1>
          <p className="mt-3 text-sm text-apple-muted">
            Enter your <code className="rounded bg-apple-gray px-1">ADMIN_SECRET</code> to view usage
            by billing account.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!inputSecret.trim()) return
              void loadMetrics(inputSecret.trim())
            }}
          >
            <input
              type="password"
              value={inputSecret}
              onChange={(event) => setInputSecret(event.target.value)}
              placeholder="Admin secret"
              className="apple-input"
              autoComplete="off"
            />
            <button type="submit" className="apple-btn-primary w-full" disabled={loading}>
              {loading ? 'Loading…' : 'View metrics'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-apple-bg px-6 py-10">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-sm text-apple-blue">
              ← Back to app
            </Link>
            <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-apple-text">
              Admin metrics
            </h1>
            {metrics && (
              <p className="mt-1 text-sm text-apple-muted">
                Updated {new Date(metrics.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadMetrics(secret)}
              disabled={loading}
              className="apple-btn-secondary"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => {
                clearStoredAdminSecret()
                setSecret('')
                setMetrics(null)
                setInputSecret('')
              }}
              className="apple-btn-ghost"
            >
              Sign out
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && !metrics && (
          <p className="mt-8 text-sm text-apple-muted">Loading metrics…</p>
        )}

        {metrics && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total flipbooks', value: String(metrics.totals.flipbooks) },
                { label: 'Total storage', value: formatStorageBytes(metrics.totals.storageBytes) },
                { label: 'Billing accounts', value: String(metrics.totals.billingAccounts) },
                { label: 'Unassigned flipbooks', value: String(metrics.totals.unassignedFlipbooks) },
              ].map((item) => (
                <div key={item.label} className="apple-card p-5">
                  <p className="text-sm text-apple-muted">{item.label}</p>
                  <p className="mt-2 text-[1.75rem] font-semibold text-apple-text">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 apple-card p-5">
              <h2 className="font-semibold text-apple-text">Active plans</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {(['free', 'starter', 'pro', 'publisher'] as const).map((planId) => (
                  <span key={planId} className="rounded-full bg-apple-gray px-3 py-1 text-apple-text">
                    {planDisplayName(planId)}: {metrics.planBreakdown[planId]}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 apple-card overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-apple-border-light">
                    <th className="px-4 py-3 font-medium text-apple-muted">Account</th>
                    <th className="px-4 py-3 font-medium text-apple-muted">Plan</th>
                    <th className="px-4 py-3 font-medium text-apple-muted">Status</th>
                    <th className="px-4 py-3 font-medium text-apple-muted">Flipbooks</th>
                    <th className="px-4 py-3 font-medium text-apple-muted">Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.accounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-apple-muted">
                        No billing accounts with activity yet.
                      </td>
                    </tr>
                  ) : (
                    metrics.accounts.map((account) => (
                      <tr key={account.accountId} className="border-b border-apple-border-light last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-apple-text">
                          {account.accountId.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 text-apple-text">{planDisplayName(account.planId)}</td>
                        <td className="px-4 py-3 text-apple-muted">{account.billingStatus}</td>
                        <td className="px-4 py-3 text-apple-text">{account.flipbookCount}</td>
                        <td className="px-4 py-3 text-apple-text">
                          {formatStorageBytes(account.storageBytes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
