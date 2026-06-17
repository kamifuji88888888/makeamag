import { useCallback, useEffect, useState } from 'react'
import type {
  BrandingConfig,
  FlipbookPublicMeta,
  LeadCaptureConfig,
  LinkHotspot,
  MonetizationConfig,
  PublicationInfo,
  TocEntry,
  VideoEmbed,
} from '../../shared/flipbook'
import { normalizeBranding, normalizeLeadCapture, normalizeMonetization, normalizePublication } from '../../shared/flipbook'
import {
  clearAccessToken,
  fetchFlipbook,
  fetchFlipbookPdf,
  getAccessToken,
  isLeadCaptureUnlocked,
  isMonetizationUnlocked,
  submitLeadCapture,
  unlockFlipbook,
  unlockMonetization,
} from '../lib/api'
import { renderPdfFromBuffer } from '../lib/pdfRenderer'

export type FlipbookLoadState =
  | { status: 'locked'; meta: FlipbookPublicMeta }
  | { status: 'loading'; progress: number; fileName: string }
  | {
      status: 'ready'
      fileName: string
      images: string[]
      aspectRatio: number
      videoEmbeds: VideoEmbed[]
      linkHotspots: LinkHotspot[]
      publication: PublicationInfo
      tableOfContents: TocEntry[]
      spreadView: boolean
      branding: BrandingConfig
      monetization: MonetizationConfig
      leadCapture: LeadCaptureConfig
      hasSubscriberAccess: boolean
      monetizationUnlocked: boolean
      leadCaptureUnlocked: boolean
      pageTexts: string[]
    }
  | { status: 'error'; message: string }

export function useFlipbookLoader(id: string | undefined) {
  const [state, setState] = useState<FlipbookLoadState>({
    status: 'loading',
    progress: 0,
    fileName: 'Loading…',
  })

  const loadPdf = useCallback(async (flipbookId: string, meta: FlipbookPublicMeta) => {
    setState({ status: 'loading', progress: 0, fileName: meta.fileName })

    try {
      const buffer = await fetchFlipbookPdf(flipbookId)
      const result = await renderPdfFromBuffer(buffer, (progress) => {
        setState({ status: 'loading', progress, fileName: meta.fileName })
      })

      const monetization = normalizeMonetization(meta.monetization)
      const leadCapture = normalizeLeadCapture(meta.leadCapture)

      setState({
        status: 'ready',
        fileName: meta.fileName,
        images: result.images,
        aspectRatio: result.aspectRatio,
        videoEmbeds: meta.videoEmbeds,
        linkHotspots: meta.linkHotspots ?? [],
        publication: normalizePublication(meta.publication),
        tableOfContents: meta.tableOfContents ?? [],
        spreadView: meta.spreadView ?? result.aspectRatio > 1.15,
        branding: normalizeBranding(meta.branding),
        monetization,
        leadCapture,
        hasSubscriberAccess: meta.hasSubscriberAccess,
        monetizationUnlocked: isMonetizationUnlocked(flipbookId, monetization),
        leadCaptureUnlocked: isLeadCaptureUnlocked(flipbookId, leadCapture),
        pageTexts: result.pageTexts,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Password required') {
        clearAccessToken(flipbookId)
        setState({ status: 'locked', meta })
        return
      }
      throw error
    }
  }, [])

  useEffect(() => {
    if (!id) {
      setState({ status: 'error', message: 'Invalid flipbook link' })
      return
    }

    const flipbookId = id
    let cancelled = false

    async function init() {
      try {
        const meta = await fetchFlipbook(flipbookId)
        if (cancelled) return

        if (meta.isPasswordProtected && !getAccessToken(flipbookId)) {
          setState({ status: 'locked', meta })
          return
        }

        await loadPdf(flipbookId, meta)
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Failed to load flipbook'
          setState({ status: 'error', message })
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [id, loadPdf])

  const handleUnlock = useCallback(
    async (password: string) => {
      if (!id) return
      await unlockFlipbook(id, password)
      const meta = await fetchFlipbook(id)
      await loadPdf(id, meta)
    },
    [id, loadPdf],
  )

  const handleMonetizationUnlock = useCallback(
    async (accessCode: string) => {
      if (!id) return
      await unlockMonetization(id, accessCode)
      setState((prev) => {
        if (prev.status !== 'ready') return prev
        return { ...prev, monetizationUnlocked: true }
      })
    },
    [id],
  )

  const handleLeadCaptureSubmit = useCallback(
    async (email: string, consent: boolean) => {
      if (!id) return
      await submitLeadCapture(id, email, consent)
      setState((prev) => {
        if (prev.status !== 'ready') return prev
        return { ...prev, leadCaptureUnlocked: true }
      })
    },
    [id],
  )

  return { state, handleUnlock, handleMonetizationUnlock, handleLeadCaptureSubmit }
}
