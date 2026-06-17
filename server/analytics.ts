import fs from 'fs/promises'
import path from 'path'
import type {
  AnalyticsDailyStat,
  AnalyticsEventInput,
  AnalyticsLinkStat,
  AnalyticsPageStat,
  AnalyticsReferrerStat,
  AnalyticsSummary,
} from '../shared/analytics.js'
import { normalizeReferrer, todayKey } from '../shared/analytics.js'

interface LinkAggregate {
  label: string
  url: string
  clicks: number
}

interface DailyAggregate {
  views: number
  pageViews: number
  linkClicks: number
  videoPlays: number
}

interface AnalyticsStore {
  sessions: Record<string, string>
  pageViews: Record<string, number>
  referrers: Record<string, number>
  links: Record<string, LinkAggregate>
  videos: Record<string, number>
  daily: Record<string, DailyAggregate>
  totals: {
    views: number
    pageViews: number
    linkClicks: number
    videoPlays: number
    paywallImpressions: number
    paywallClicks: number
    leadCaptureImpressions: number
    leadCaptureSubmits: number
  }
}

function emptyStore(): AnalyticsStore {
  return {
    sessions: {},
    pageViews: {},
    referrers: {},
    links: {},
    videos: {},
    daily: {},
    totals: {
      views: 0,
      pageViews: 0,
      linkClicks: 0,
      videoPlays: 0,
      paywallImpressions: 0,
      paywallClicks: 0,
      leadCaptureImpressions: 0,
      leadCaptureSubmits: 0,
    },
  }
}

function ensureDaily(store: AnalyticsStore, date: string): DailyAggregate {
  if (!store.daily[date]) {
    store.daily[date] = { views: 0, pageViews: 0, linkClicks: 0, videoPlays: 0 }
  }
  return store.daily[date]
}

export function createAnalyticsStore(dataDir: string) {
  const analyticsDir = path.join(dataDir, 'analytics')

  async function readStore(flipbookId: string): Promise<AnalyticsStore> {
    try {
      const raw = await fs.readFile(path.join(analyticsDir, `${flipbookId}.json`), 'utf-8')
      return JSON.parse(raw) as AnalyticsStore
    } catch {
      return emptyStore()
    }
  }

  async function writeStore(flipbookId: string, store: AnalyticsStore) {
    await fs.mkdir(analyticsDir, { recursive: true })
    await fs.writeFile(
      path.join(analyticsDir, `${flipbookId}.json`),
      JSON.stringify(store, null, 2),
    )
  }

  function applyEvent(store: AnalyticsStore, event: AnalyticsEventInput) {
    const date = todayKey(event.timestamp ?? new Date().toISOString())
    const day = ensureDaily(store, date)

    switch (event.type) {
      case 'session_start': {
        if (!store.sessions[event.sessionId]) {
          store.sessions[event.sessionId] = date
          store.totals.views += 1
          day.views += 1
          const source = normalizeReferrer(event.referrer)
          store.referrers[source] = (store.referrers[source] ?? 0) + 1
        }
        break
      }
      case 'page_view': {
        if (event.pageIndex === undefined) break
        const key = String(event.pageIndex)
        store.pageViews[key] = (store.pageViews[key] ?? 0) + 1
        store.totals.pageViews += 1
        day.pageViews += 1
        break
      }
      case 'link_click': {
        if (!event.hotspotId) break
        const existing = store.links[event.hotspotId] ?? {
          label: event.label ?? 'Link',
          url: event.url ?? '',
          clicks: 0,
        }
        existing.clicks += 1
        if (event.label) existing.label = event.label
        if (event.url) existing.url = event.url
        store.links[event.hotspotId] = existing
        store.totals.linkClicks += 1
        day.linkClicks += 1
        break
      }
      case 'video_play': {
        if (!event.videoId) break
        store.videos[event.videoId] = (store.videos[event.videoId] ?? 0) + 1
        store.totals.videoPlays += 1
        day.videoPlays += 1
        break
      }
      case 'paywall_impression': {
        store.totals.paywallImpressions += 1
        break
      }
      case 'paywall_click': {
        store.totals.paywallClicks += 1
        break
      }
      case 'lead_capture_impression': {
        store.totals.leadCaptureImpressions = (store.totals.leadCaptureImpressions ?? 0) + 1
        break
      }
      case 'lead_capture_submit': {
        store.totals.leadCaptureSubmits = (store.totals.leadCaptureSubmits ?? 0) + 1
        break
      }
    }
  }

  function buildSummary(store: AnalyticsStore, days = 30): AnalyticsSummary {
    const topPages: AnalyticsPageStat[] = Object.entries(store.pageViews)
      .map(([pageIndex, views]) => ({ pageIndex: Number(pageIndex), views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    const referrers: AnalyticsReferrerStat[] = Object.entries(store.referrers)
      .map(([source, views]) => ({ source, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8)

    const linkClicks: AnalyticsLinkStat[] = Object.entries(store.links)
      .map(([hotspotId, link]) => ({
        hotspotId,
        label: link.label,
        url: link.url,
        clicks: link.clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (days - 1))

    const daily: AnalyticsDailyStat[] = []
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = todayKey(date.toISOString())
      const bucket = store.daily[key]
      daily.push({
        date: key,
        views: bucket?.views ?? 0,
        pageViews: bucket?.pageViews ?? 0,
        linkClicks: bucket?.linkClicks ?? 0,
      })
    }

    return {
      totalViews: store.totals.views,
      totalPageViews: store.totals.pageViews,
      totalLinkClicks: store.totals.linkClicks,
      totalVideoPlays: store.totals.videoPlays,
      totalPaywallImpressions: store.totals.paywallImpressions ?? 0,
      totalPaywallClicks: store.totals.paywallClicks ?? 0,
      totalLeadCaptureImpressions: store.totals.leadCaptureImpressions ?? 0,
      totalLeadCaptureSubmits: store.totals.leadCaptureSubmits ?? 0,
      topPages,
      referrers,
      linkClicks,
      daily,
    }
  }

  return {
    async recordEvents(flipbookId: string, events: AnalyticsEventInput[]) {
      if (events.length === 0) return
      const store = await readStore(flipbookId)
      for (const event of events) {
        applyEvent(store, event)
      }
      await writeStore(flipbookId, store)
    },

    async getSummary(flipbookId: string, days = 30): Promise<AnalyticsSummary> {
      const store = await readStore(flipbookId)
      return buildSummary(store, days)
    },
  }
}
