import { useCallback, useEffect, useRef } from 'react'
import type { LinkHotspot } from '../../shared/flipbook'
import {
  flushFlipbookAnalytics,
  getAnalyticsSessionId,
  trackFlipbookEvent,
  viewerModeFromFlipbookMode,
} from '../lib/analyticsTracker'

const PAGE_DEDUPE_MS = 2000

export function useFlipbookAnalytics(
  flipbookId: string | null | undefined,
  mode: 'editor' | 'shared' | 'embed',
) {
  const lastPageRef = useRef<number | null>(null)
  const lastPageTimeRef = useRef(0)

  const analyticsMode = mode === 'editor' ? null : viewerModeFromFlipbookMode(mode)

  const trackPageView = useCallback(
    (pageIndex: number) => {
      if (!flipbookId || !analyticsMode) return
      const now = Date.now()
      if (
        lastPageRef.current === pageIndex &&
        now - lastPageTimeRef.current < PAGE_DEDUPE_MS
      ) {
        return
      }
      lastPageRef.current = pageIndex
      lastPageTimeRef.current = now
      trackFlipbookEvent(flipbookId, {
        type: 'page_view',
        mode: analyticsMode,
        pageIndex,
      })
    },
    [analyticsMode, flipbookId],
  )

  const trackLinkClick = useCallback(
    (hotspot: LinkHotspot) => {
      if (!flipbookId || !analyticsMode) return
      trackFlipbookEvent(flipbookId, {
        type: 'link_click',
        mode: analyticsMode,
        hotspotId: hotspot.id,
        label: hotspot.label,
        url: hotspot.url,
        pageIndex: hotspot.pageIndex,
      })
    },
    [analyticsMode, flipbookId],
  )

  const trackVideoPlay = useCallback(
    (embed: { id: string; pageIndex: number }) => {
      if (!flipbookId || !analyticsMode) return
      trackFlipbookEvent(flipbookId, {
        type: 'video_play',
        mode: analyticsMode,
        videoId: embed.id,
        pageIndex: embed.pageIndex,
      })
    },
    [analyticsMode, flipbookId],
  )

  const trackPaywallImpression = useCallback(() => {
    if (!flipbookId || !analyticsMode) return
    trackFlipbookEvent(flipbookId, {
      type: 'paywall_impression',
      mode: analyticsMode,
    })
  }, [analyticsMode, flipbookId])

  const trackPaywallClick = useCallback(() => {
    if (!flipbookId || !analyticsMode) return
    trackFlipbookEvent(flipbookId, {
      type: 'paywall_click',
      mode: analyticsMode,
    })
  }, [analyticsMode, flipbookId])

  const trackLeadCaptureImpression = useCallback(() => {
    if (!flipbookId || !analyticsMode) return
    trackFlipbookEvent(flipbookId, {
      type: 'lead_capture_impression',
      mode: analyticsMode,
    })
  }, [analyticsMode, flipbookId])

  const trackLeadCaptureSubmit = useCallback(() => {
    if (!flipbookId || !analyticsMode) return
    trackFlipbookEvent(flipbookId, {
      type: 'lead_capture_submit',
      mode: analyticsMode,
    })
  }, [analyticsMode, flipbookId])

  useEffect(() => {
    if (!flipbookId || !analyticsMode) return

    trackFlipbookEvent(flipbookId, {
      type: 'session_start',
      mode: analyticsMode,
      referrer: document.referrer || undefined,
    })
    trackPageView(0)

    return () => {
      flushFlipbookAnalytics(flipbookId)
    }
  }, [analyticsMode, flipbookId, trackPageView])

  return {
    trackPageView,
    trackLinkClick,
    trackVideoPlay,
    trackPaywallImpression,
    trackPaywallClick,
    trackLeadCaptureImpression,
    trackLeadCaptureSubmit,
    sessionId: flipbookId ? getAnalyticsSessionId(flipbookId) : null,
  }
}
