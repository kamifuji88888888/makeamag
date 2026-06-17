export type AnalyticsEventType =
  | 'session_start'
  | 'page_view'
  | 'link_click'
  | 'video_play'
  | 'paywall_impression'
  | 'paywall_click'
  | 'lead_capture_impression'
  | 'lead_capture_submit'
export type AnalyticsViewerMode = 'view' | 'embed'

export interface AnalyticsEventInput {
  type: AnalyticsEventType
  sessionId: string
  mode: AnalyticsViewerMode
  timestamp?: string
  pageIndex?: number
  referrer?: string
  hotspotId?: string
  url?: string
  label?: string
  videoId?: string
}

export interface AnalyticsPageStat {
  pageIndex: number
  views: number
}

export interface AnalyticsReferrerStat {
  source: string
  views: number
}

export interface AnalyticsLinkStat {
  hotspotId: string
  label: string
  url: string
  clicks: number
}

export interface AnalyticsDailyStat {
  date: string
  views: number
  pageViews: number
  linkClicks: number
}

export interface AnalyticsSummary {
  totalViews: number
  totalPageViews: number
  totalLinkClicks: number
  totalVideoPlays: number
  totalPaywallImpressions: number
  totalPaywallClicks: number
  totalLeadCaptureImpressions: number
  totalLeadCaptureSubmits: number
  topPages: AnalyticsPageStat[]
  referrers: AnalyticsReferrerStat[]
  linkClicks: AnalyticsLinkStat[]
  daily: AnalyticsDailyStat[]
}

export function normalizeReferrer(referrer?: string): string {
  if (!referrer?.trim()) return 'Direct'
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    return host || 'Direct'
  } catch {
    return 'Direct'
  }
}

export function todayKey(iso = new Date().toISOString()): string {
  return iso.slice(0, 10)
}
