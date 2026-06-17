import type { AnalyticsSummary } from '../../shared/analytics'

interface AnalyticsDashboardProps {
  summary: AnalyticsSummary | null
  loading: boolean
  error: string | null
  unpublished?: boolean
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="apple-card-flat rounded-xl p-4 text-center">
      <p className="text-2xl font-semibold tabular-nums text-apple-text">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-apple-muted">{label}</p>
    </div>
  )
}

function BarRow({
  label,
  value,
  max,
  suffix,
}: {
  label: string
  value: number
  max: number
  suffix?: string
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-apple-text">{label}</span>
        <span className="shrink-0 tabular-nums text-apple-muted">
          {value.toLocaleString()}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-apple-gray">
        <div className="h-full rounded-full bg-apple-blue" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export function AnalyticsDashboard({
  summary,
  loading,
  error,
  unpublished = false,
}: AnalyticsDashboardProps) {
  if (unpublished) {
    return (
      <div className="apple-card-flat rounded-xl px-5 py-8 text-center">
        <p className="text-[1.0625rem] font-medium text-apple-text">Publish to start tracking</p>
        <p className="mt-2 text-sm text-apple-muted">
          Analytics begin once your flipbook is shared and readers open it.
        </p>
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-apple-muted">Loading analytics…</p>
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>
  }

  if (!summary) {
    return <p className="text-sm text-apple-muted">No analytics yet.</p>
  }

  const maxPageViews = summary.topPages[0]?.views ?? 0
  const maxReferrers = summary.referrers[0]?.views ?? 0
  const maxLinks = summary.linkClicks[0]?.clicks ?? 0
  const maxDailyViews = Math.max(...summary.daily.map((day) => day.views), 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Views" value={summary.totalViews} />
        <StatCard label="Page reads" value={summary.totalPageViews} />
        <StatCard label="Link clicks" value={summary.totalLinkClicks} />
        <StatCard label="Video plays" value={summary.totalVideoPlays} />
      </div>

      {(summary.totalPaywallImpressions > 0 || summary.totalPaywallClicks > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Paywall views" value={summary.totalPaywallImpressions} />
          <StatCard label="Subscribe clicks" value={summary.totalPaywallClicks} />
        </div>
      )}

      {(summary.totalLeadCaptureImpressions > 0 || summary.totalLeadCaptureSubmits > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Email gate views" value={summary.totalLeadCaptureImpressions} />
          <StatCard label="Emails submitted" value={summary.totalLeadCaptureSubmits} />
        </div>
      )}

      <div>
        <p className="apple-section-label mb-3">Last 30 days</p>
        <div className="flex h-24 items-end gap-1 rounded-xl border border-apple-border-light bg-apple-gray/40 px-3 py-3">
          {summary.daily.map((day) => {
            const height = Math.max(8, Math.round((day.views / maxDailyViews) * 100))
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full max-w-[18px] rounded-t bg-apple-blue/80"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${day.views} views`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {summary.topPages.length > 0 && (
        <div>
          <p className="apple-section-label mb-3">Top pages</p>
          <div className="space-y-3">
            {summary.topPages.map((page) => (
              <BarRow
                key={page.pageIndex}
                label={`Page ${page.pageIndex + 1}`}
                value={page.views}
                max={maxPageViews}
                suffix="reads"
              />
            ))}
          </div>
        </div>
      )}

      {summary.referrers.length > 0 && (
        <div>
          <p className="apple-section-label mb-3">Referrers</p>
          <div className="space-y-3">
            {summary.referrers.map((referrer) => (
              <BarRow
                key={referrer.source}
                label={referrer.source}
                value={referrer.views}
                max={maxReferrers}
                suffix="views"
              />
            ))}
          </div>
        </div>
      )}

      {summary.linkClicks.length > 0 && (
        <div>
          <p className="apple-section-label mb-3">Link clicks</p>
          <div className="space-y-3">
            {summary.linkClicks.map((link) => (
              <BarRow
                key={link.hotspotId}
                label={link.label || link.url}
                value={link.clicks}
                max={maxLinks}
                suffix="clicks"
              />
            ))}
          </div>
        </div>
      )}

      {summary.totalViews === 0 && (
        <p className="text-sm text-apple-muted">
          No reader activity yet. Share your flipbook to start collecting analytics.
        </p>
      )}
    </div>
  )
}
