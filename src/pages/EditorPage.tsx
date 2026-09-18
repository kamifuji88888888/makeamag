import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PlanFeature, PlanId } from '../../shared/plans'
import { formatByteSize } from '../../shared/plans'
import { UpgradePrompt } from '../components/UpgradePrompt'
import { AppNav } from '../components/AppNav'
import { SiteFooter } from '../components/SiteFooter'
import { usePlanContext } from '../context/PlanContext'
import { planLimitMessage, sanitizeBrandingForPlan, sanitizeLeadCaptureForPlan, sanitizeMonetizationForPlan } from '../lib/planStorage'
import { getBillingAccountId } from '../lib/billingStorage'
import type {
  BrandingConfig,
  FlipbookVisibility,
  LeadCaptureConfig,
  LinkHotspot,
  MonetizationConfig,
  PopUpPanel,
  PopUpPanelStyle,
  PublicationInfo,
  TocEntry,
  VideoEmbed,
} from '../../shared/flipbook'
import { DEFAULT_BRANDING, DEFAULT_LEAD_CAPTURE, DEFAULT_MONETIZATION, DEFAULT_POP_UP_PANEL_STYLE, DEFAULT_PUBLICATION, DEFAULT_VISIBILITY, normalizeBranding, normalizeLeadCapture, normalizeMonetization, normalizePopUpPanelStyle, normalizePublication, normalizeVisibility, sharePathId } from '../../shared/flipbook'
import {
  deleteFlipbookLogo,
  fetchFlipbook,
  fetchFlipbookPdf,
  fetchStripeStatus,
  getShareUrl,
  publishFlipbook,
  replaceFlipbookPdf,
  startStripeConnect,
  unlockFlipbook,
  updateFlipbook,
  uploadFlipbookLogo,
} from '../lib/api'
import type { LibraryEntry } from '../lib/libraryStorage'
import { saveDraftPdf } from '../lib/libraryStorage'
import { useFlipbookLibrary } from '../hooks/useFlipbookLibrary'
import { useAuth } from '../context/AuthContext'
import { extractPdfOutline, renderPdfFromBuffer, renderPdfToImages } from '../lib/pdfRenderer'
import { syncShareCover } from '../lib/shareCover'
import { createThumbnailFromDataUrl } from '../lib/thumbnail'
import { FlipbookLibrary } from '../components/FlipbookLibrary'
import { FlipbookViewer } from '../components/FlipbookViewer'
import { LoadingProgress } from '../components/LoadingProgress'
import { UploadZone } from '../components/UploadZone'

const TESTIMONIALS = [
  {
    quote:
      'We published GENLUX faster than we ever thought possible. The table of contents and spread view finally feel like a real magazine.',
    name: 'Stephen Kamifuji',
    role: 'Founder/Creative Director, GENLUX magazine',
  },
  {
    quote:
      'Issuu wanted $188 a month just for lead capture. MakeAMag gave us password protection and a custom domain for a fraction of that.',
    name: 'Thaddeus Okonkwo',
    role: 'Marketing Director, Pemberton & Hale',
  },
  {
    quote:
      'Our catalog looks white-labeled on our own domain. Clients have no idea we didn’t build the viewer from scratch.',
    name: 'Mireille Vance',
    role: 'Creative Lead, Studio Caspian',
  },
] as const

type ReadyState = {
  status: 'ready'
  libraryEntryId: string
  fileName: string
  pdfFile: File
  images: string[]
  aspectRatio: number
  flipbookId: string | null
  videoEmbeds: VideoEmbed[]
  linkHotspots: LinkHotspot[]
  popUpPanels: PopUpPanel[]
  popUpPanelStyle: PopUpPanelStyle
  publication: PublicationInfo
  tableOfContents: TocEntry[]
  spreadView: boolean
  branding: BrandingConfig
  monetization: MonetizationConfig
  leadCapture: LeadCaptureConfig
  pageTexts: string[]
  hasSubscriberAccess: boolean
  subscriberAccessCode: string
  shareUrl: string | null
  visibility: FlipbookVisibility
  isPasswordProtected: boolean
  publishPassword?: string
}

type EditorState =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string; progress: number; statusLabel?: string }
  | ReadyState
  | { status: 'error'; message: string }

function defaultSpreadView(aspectRatio: number) {
  return aspectRatio > 1.15
}

function defaultPublication(fileName: string): PublicationInfo {
  return {
    ...DEFAULT_PUBLICATION,
    title: fileName.replace(/\.pdf$/i, ''),
  }
}

function publisherPayload(state: ReadyState, planId: PlanId) {
  return {
    publication: state.publication,
    tableOfContents: state.tableOfContents,
    linkHotspots: state.linkHotspots,
    popUpPanels: state.popUpPanels,
    popUpPanelStyle: state.popUpPanelStyle,
    spreadView: state.spreadView,
    branding: sanitizeBrandingForPlan(state.branding, planId),
    monetization: sanitizeMonetizationForPlan(state.monetization, planId),
    leadCapture: sanitizeLeadCaptureForPlan(state.leadCapture, planId),
    visibility: state.visibility,
    ...(state.subscriberAccessCode.trim()
      ? { subscriberAccessCode: state.subscriberAccessCode.trim() }
      : {}),
  }
}

function libraryPublisherPatch(state: ReadyState) {
  return {
    publication: state.publication,
    tableOfContents: state.tableOfContents,
    linkHotspots: state.linkHotspots,
    popUpPanels: state.popUpPanels,
    popUpPanelStyle: state.popUpPanelStyle,
    spreadView: state.spreadView,
    branding: state.branding,
    monetization: state.monetization,
    leadCapture: state.leadCapture,
    visibility: state.visibility,
  }
}

export function EditorPage() {
  const [state, setState] = useState<EditorState>({ status: 'idle' })
  const [isPublishing, setIsPublishing] = useState(false)
  const [isReplacingPdf, setIsReplacingPdf] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryLoadingId, setLibraryLoadingId] = useState<string | null>(null)
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [stripeNotice, setStripeNotice] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const library = useFlipbookLibrary()
  const { user } = useAuth()
  const plan = usePlanContext()
  const [upgradePrompt, setUpgradePrompt] = useState<{
    title: string
    message: string
    feature?: PlanFeature
  } | null>(null)

  const showUpgrade = useCallback(
    (title: string, kind: Parameters<typeof planLimitMessage>[1], feature?: PlanFeature, detail?: string) => {
      setUpgradePrompt({
        title,
        message: planLimitMessage(plan.planId, kind, detail),
        feature,
      })
    },
    [plan.planId],
  )

  useEffect(() => {
    void fetchStripeStatus().then((status) => setStripeConfigured(status.configured))
  }, [])

  useEffect(() => {
    if (!user) return
    void library.syncFromAccount().catch(() => {
      // Library still works from local drafts if the account sync fails.
    })
  }, [user, library.syncFromAccount])

  useEffect(() => {
    const flipbookId = searchParams.get('stripeConnected')
    if (!flipbookId) return

    const next = new URLSearchParams(searchParams)
    next.delete('stripeConnected')
    setSearchParams(next, { replace: true })

    void fetchFlipbook(flipbookId).then((meta) => {
      setStripeNotice('Stripe connected. Share or update your flipbook to sync pricing.')
      setState((prev) => {
        if (prev.status !== 'ready' || prev.flipbookId !== flipbookId) return prev
        return {
          ...prev,
          monetization: normalizeMonetization(meta.monetization),
          hasSubscriberAccess: meta.hasSubscriberAccess,
        }
      })
    })
  }, [searchParams, setSearchParams])

  const syncPublished = useCallback((ready: ReadyState) => {
    if (!ready.flipbookId) return
    void updateFlipbook(ready.flipbookId, {
      videoEmbeds: ready.videoEmbeds,
      ...publisherPayload(ready, plan.planId),
    }).catch(() => {})
  }, [plan.planId])

  const persistLibrary = useCallback(
    (ready: ReadyState, extra?: Parameters<typeof library.bumpUpdated>[1]) => {
      library.bumpUpdated(ready.libraryEntryId, {
        pageCount: ready.images.length,
        ...libraryPublisherPatch(ready),
        ...extra,
      })
    },
    [library],
  )

  const handleFileSelect = useCallback(
    async (file: File) => {
      plan.refreshUsage()
      if (!plan.canAddFlipbook()) {
        showUpgrade('Flipbook limit reached', 'flipbooks')
        return
      }

      if (!plan.canUploadPdf(file.size)) {
        showUpgrade('PDF too large', 'fileSize', undefined, formatByteSize(file.size))
        return
      }

      setState({ status: 'loading', fileName: file.name, progress: 0 })

      const runStep = async <T,>(step: string, fn: () => Promise<T>): Promise<T> => {
        try {
          return await fn()
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error)
          throw new Error(`${step}: ${detail}`)
        }
      }

      try {
        const result = await runStep('render', () =>
          renderPdfToImages(file, (progress) => {
            setState({ status: 'loading', fileName: file.name, progress })
          }),
        )

        if (!plan.canAddPages(result.pageCount)) {
          setState({ status: 'idle' })
          showUpgrade('PDF too long', 'pages', undefined, String(result.pageCount))
          return
        }

        const thumbnail = await runStep('thumbnail', () =>
          createThumbnailFromDataUrl(result.images[0] ?? ''),
        )
        const outline = await runStep('outline', () => extractPdfOutline(file).catch(() => []))
        const publication = defaultPublication(file.name)
        const spreadView = defaultSpreadView(result.aspectRatio)

        const entry = await runStep('save draft', () =>
          library.addDraft(file, result.pageCount, {
            publication,
            tableOfContents: outline,
            spreadView,
            thumbnail,
          }),
        )

        plan.refreshUsage()

        setState({
          status: 'ready',
          libraryEntryId: entry.id,
          fileName: file.name,
          pdfFile: file,
          images: result.images,
          aspectRatio: result.aspectRatio,
          flipbookId: null,
          videoEmbeds: [],
          linkHotspots: [],
          popUpPanels: [],
          popUpPanelStyle: { ...DEFAULT_POP_UP_PANEL_STYLE },
          publication,
          tableOfContents: outline,
          spreadView,
          branding: DEFAULT_BRANDING,
          monetization: { ...DEFAULT_MONETIZATION },
          leadCapture: { ...DEFAULT_LEAD_CAPTURE },
          pageTexts: result.pageTexts,
          hasSubscriberAccess: false,
          subscriberAccessCode: '',
          shareUrl: null,
          visibility: DEFAULT_VISIBILITY,
          isPasswordProtected: false,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to process PDF'
        setState({ status: 'error', message })
      }
    },
    [library, plan, showUpgrade],
  )

  const handleOpenLibraryEntry = useCallback(
    async (entry: LibraryEntry) => {
      setShowLibrary(false)
      setLibraryLoadingId(entry.id)
      setState({ status: 'loading', fileName: entry.fileName, progress: 0 })

      try {
        if (entry.type === 'draft') {
          const file = await library.openDraft(entry)
          if (!plan.canUploadPdf(file.size)) {
            setState({ status: 'idle' })
            showUpgrade('PDF too large', 'fileSize', undefined, formatByteSize(file.size))
            return
          }

          const result = await renderPdfToImages(file, (progress) => {
            setState({ status: 'loading', fileName: entry.fileName, progress })
          })

          const publication = normalizePublication(
            entry.publication ?? defaultPublication(entry.fileName),
          )

          setState({
            status: 'ready',
            libraryEntryId: entry.id,
            fileName: entry.fileName,
            pdfFile: file,
            images: result.images,
            aspectRatio: result.aspectRatio,
            flipbookId: null,
            videoEmbeds: [],
            linkHotspots: entry.linkHotspots ?? [],
            popUpPanels: entry.popUpPanels ?? [],
            popUpPanelStyle: normalizePopUpPanelStyle(entry.popUpPanelStyle),
            publication,
            tableOfContents: entry.tableOfContents ?? [],
            spreadView: entry.spreadView ?? defaultSpreadView(result.aspectRatio),
            branding: normalizeBranding(entry.branding),
            monetization: normalizeMonetization(entry.monetization),
            leadCapture: normalizeLeadCapture(entry.leadCapture),
            pageTexts: result.pageTexts,
            hasSubscriberAccess: false,
            subscriberAccessCode: '',
            shareUrl: null,
            visibility: entry.visibility ?? DEFAULT_VISIBILITY,
            isPasswordProtected: false,
          })
        } else if (entry.flipbookId) {
          const meta = await fetchFlipbook(entry.flipbookId)
          let buffer: ArrayBuffer
          try {
            buffer = await fetchFlipbookPdf(entry.flipbookId)
          } catch (error) {
            const message = error instanceof Error ? error.message : ''
            if (message === 'Password required') {
              const password = window.prompt(
                'This magazine is password-protected. Enter the password to open it:',
              )
              if (!password?.trim()) {
                throw new Error('Password required to open this magazine')
              }
              await unlockFlipbook(entry.flipbookId, password.trim())
              buffer = await fetchFlipbookPdf(entry.flipbookId)
            } else {
              throw error
            }
          }
          const result = await renderPdfFromBuffer(buffer, (progress) => {
            setState({ status: 'loading', fileName: meta.fileName, progress })
          })

          setState({
            status: 'ready',
            libraryEntryId: entry.id,
            fileName: meta.fileName,
            pdfFile: new File([buffer], meta.fileName, { type: 'application/pdf' }),
            images: result.images,
            aspectRatio: result.aspectRatio,
            flipbookId: meta.id,
            videoEmbeds: meta.videoEmbeds,
            linkHotspots: meta.linkHotspots ?? [],
            popUpPanels: meta.popUpPanels ?? [],
            popUpPanelStyle: normalizePopUpPanelStyle(meta.popUpPanelStyle),
            publication: normalizePublication(meta.publication),
            tableOfContents: meta.tableOfContents ?? [],
            spreadView: meta.spreadView ?? defaultSpreadView(result.aspectRatio),
            branding: normalizeBranding(meta.branding),
            monetization: normalizeMonetization(meta.monetization),
            leadCapture: normalizeLeadCapture(meta.leadCapture),
            pageTexts: result.pageTexts,
            hasSubscriberAccess: meta.hasSubscriberAccess,
            subscriberAccessCode: '',
            shareUrl: getShareUrl(sharePathId(meta), meta.branding),
            visibility: normalizeVisibility(meta.visibility),
            isPasswordProtected: meta.isPasswordProtected,
          })
          void syncShareCover(meta.id, result.images[0])
          void updateFlipbook(meta.id, { pageCount: result.pageCount }).catch(() => {})
          try {
            const thumbnail = await createThumbnailFromDataUrl(result.images[0] ?? '')
            library.bumpUpdated(entry.id, {
              pageCount: result.pageCount,
              fileName: meta.fileName,
              thumbnail,
              type: 'published',
              flipbookId: meta.id,
            })
          } catch {
            library.bumpUpdated(entry.id, {
              pageCount: result.pageCount,
              fileName: meta.fileName,
              type: 'published',
              flipbookId: meta.id,
            })
          }
          return
        } else {
          throw new Error('This library entry is missing its published link. Try uploading the PDF again.')
        }

        library.bumpUpdated(entry.id)
      } catch (error) {
        let message = error instanceof Error ? error.message : 'Failed to open flipbook'
        if (message === 'Flipbook not found' && entry.flipbookId) {
          await library.remove(entry.id)
          message =
            'This magazine is no longer on the server and was removed from your library. Upload or publish it again.'
        }
        setState({ status: 'error', message })
      } finally {
        setLibraryLoadingId(null)
      }
    },
    [library, plan, showUpgrade],
  )

  const updateReady = useCallback(
    (updater: (prev: ReadyState) => ReadyState) => {
      setState((prev) => {
        if (prev.status !== 'ready') return prev
        const next = updater(prev)
        syncPublished(next)
        persistLibrary(next)
        return next
      })
    },
    [persistLibrary, syncPublished],
  )

  const handleVideoEmbedsChange = useCallback(
    (videoEmbeds: VideoEmbed[]) => {
      if (!plan.can('videoEmbeds') && videoEmbeds.length > 0) {
        showUpgrade('Video embeds', 'videos', 'videoEmbeds')
        return
      }
      if (!plan.canAddVideoEmbed(videoEmbeds.length)) {
        showUpgrade('Video limit reached', 'videos', 'videoEmbeds')
        return
      }
      updateReady((prev) => ({ ...prev, videoEmbeds }))
    },
    [plan, showUpgrade, updateReady],
  )

  const handleLinkHotspotsChange = useCallback(
    (linkHotspots: LinkHotspot[]) => {
      updateReady((prev) => ({ ...prev, linkHotspots }))
    },
    [updateReady],
  )

  const handlePopUpPanelsChange = useCallback(
    (popUpPanels: PopUpPanel[]) => {
      updateReady((prev) => ({ ...prev, popUpPanels }))
    },
    [updateReady],
  )

  const handlePopUpPanelStyleChange = useCallback(
    (popUpPanelStyle: PopUpPanelStyle) => {
      updateReady((prev) => ({ ...prev, popUpPanelStyle: normalizePopUpPanelStyle(popUpPanelStyle) }))
    },
    [updateReady],
  )

  const handlePublicationChange = useCallback(
    (publication: PublicationInfo) => {
      updateReady((prev) => ({ ...prev, publication: normalizePublication(publication) }))
    },
    [updateReady],
  )

  const handlePageTextsChange = useCallback(
    (pageTexts: string[]) => {
      updateReady((prev) => ({ ...prev, pageTexts }))
    },
    [updateReady],
  )

  const handleTableOfContentsChange = useCallback(
    (tableOfContents: TocEntry[]) => {
      updateReady((prev) => ({ ...prev, tableOfContents }))
    },
    [updateReady],
  )

  const handleSpreadViewChange = useCallback(
    (spreadView: boolean) => {
      updateReady((prev) => ({ ...prev, spreadView }))
    },
    [updateReady],
  )

  const handleMonetizationChange = useCallback(
    (monetization: MonetizationConfig) => {
      const normalized = normalizeMonetization(monetization)

      if (normalized.enabled && !plan.can('readerMonetization')) {
        showUpgrade('Reader paywall', 'feature', 'readerMonetization', 'Reader paywall')
        return
      }

      updateReady((prev) => ({
        ...prev,
        monetization: sanitizeMonetizationForPlan(normalized, plan.planId),
      }))
    },
    [plan, showUpgrade, updateReady],
  )

  const handleLeadCaptureChange = useCallback(
    (leadCapture: LeadCaptureConfig) => {
      const normalized = normalizeLeadCapture(leadCapture)

      if (normalized.enabled && !plan.can('leadCapture')) {
        showUpgrade('Lead capture', 'feature', 'leadCapture', 'Lead capture')
        return
      }

      updateReady((prev) => ({
        ...prev,
        leadCapture: sanitizeLeadCaptureForPlan(normalized, plan.planId),
      }))
    },
    [plan, showUpgrade, updateReady],
  )

  const handleSubscriberAccessCodeChange = useCallback(
    (subscriberAccessCode: string) => {
      updateReady((prev) => ({ ...prev, subscriberAccessCode }))
    },
    [updateReady],
  )

  const handleStripeConnect = useCallback(async () => {
    if (state.status !== 'ready' || !state.flipbookId) return
    const url = await startStripeConnect(state.flipbookId)
    window.location.href = url
  }, [state])

  const handleBrandingChange = useCallback(
    (branding: BrandingConfig) => {
      const normalized = normalizeBranding(branding)

      if (normalized.hidePlatformChrome && !plan.can('whiteLabel')) {
        showUpgrade('White-label viewer', 'feature', 'whiteLabel', 'White-label viewer')
        return
      }
      if (normalized.customDomain && !plan.can('customDomain')) {
        showUpgrade('Custom domain', 'feature', 'customDomain', 'Custom domain')
        return
      }
      if (
        (normalized.logoUrl || normalized.accentColor || normalized.customDomain || normalized.hidePlatformChrome) &&
        !plan.can('customBranding')
      ) {
        showUpgrade('Custom branding', 'feature', 'customBranding', 'Custom branding')
        return
      }

      updateReady((prev) => ({
        ...prev,
        branding: sanitizeBrandingForPlan(normalized, plan.planId),
      }))
    },
    [plan, showUpgrade, updateReady],
  )

  const handleLogoUpload = useCallback(
    async (file: File) => {
      if (state.status !== 'ready' || !state.flipbookId) return
      const meta = await uploadFlipbookLogo(state.flipbookId, file)
      updateReady((prev) => ({ ...prev, branding: normalizeBranding(meta.branding) }))
    },
    [state, updateReady],
  )

  const handleLogoRemove = useCallback(async () => {
    if (state.status !== 'ready' || !state.flipbookId) return
    const meta = await deleteFlipbookLogo(state.flipbookId)
    updateReady((prev) => ({ ...prev, branding: normalizeBranding(meta.branding) }))
  }, [state, updateReady])

  const handleImportOutline = useCallback(() => {
    if (state.status !== 'ready') return
    void extractPdfOutline(state.pdfFile)
      .then((outline) => {
        if (outline.length === 0) {
          alert('No table of contents found in this PDF.')
          return
        }
        handleTableOfContentsChange(outline)
      })
      .catch(() => {
        alert('Could not read the PDF outline.')
      })
  }, [handleTableOfContentsChange, state])

  const applyPdfToReady = useCallback(
    (
      ready: ReadyState,
      file: File,
      result: Awaited<ReturnType<typeof renderPdfToImages>>,
    ): ReadyState => {
      const nextSpread =
        Math.abs(result.aspectRatio - ready.aspectRatio) > 0.05
          ? defaultSpreadView(result.aspectRatio)
          : ready.spreadView

      return {
        ...ready,
        fileName: file.name,
        pdfFile: file,
        images: result.images,
        aspectRatio: result.aspectRatio,
        pageTexts: result.pageTexts,
        spreadView: nextSpread,
        publication: {
          ...ready.publication,
          title: ready.publication.title || file.name.replace(/\.pdf$/i, ''),
        },
      }
    },
    [],
  )

  const handleReplacePdf = useCallback(
    async (file: File) => {
      if (state.status !== 'ready') return

      const ready = state
      const published = Boolean(ready.flipbookId)
      const confirmMessage = published
        ? `Replace the PDF for this magazine?\n\nYour share link stays the same. If the new PDF has a different page count, review hotspots, videos, and the table of contents.`
        : `Replace the PDF for this draft?\n\nHotspots and videos may need repositioning if the page count changes.`

      if (!window.confirm(confirmMessage)) return

      if (published && !user) {
        alert('Sign in to replace the PDF on a published magazine. This keeps your existing share link.')
        return
      }

      plan.refreshUsage()
      if (!plan.canUploadPdf(file.size)) {
        showUpgrade('PDF too large', 'fileSize', undefined, formatByteSize(file.size))
        return
      }

      setIsReplacingPdf(true)
      setState({
        status: 'loading',
        fileName: file.name,
        progress: 0.02,
        statusLabel: ready.flipbookId ? 'Uploading PDF…' : 'Preparing PDF…',
      })

      let uploadedToShare = false
      let nextFlipbookId = ready.flipbookId
      let nextShareUrl = ready.shareUrl
      let nextFileName = file.name

      try {
        // Upload first so the live share link gets the new PDF even if local
        // rendering of a large magazine later fails or runs out of memory.
        if (ready.flipbookId) {
          const meta = await replaceFlipbookPdf(ready.flipbookId, file, { planId: plan.planId })
          nextFlipbookId = meta.id || ready.flipbookId
          nextFileName = meta.fileName
          nextShareUrl =
            ready.shareUrl || getShareUrl(sharePathId(meta), meta.branding || ready.branding)
          uploadedToShare = true
          setState({
            status: 'loading',
            fileName: nextFileName,
            progress: 0.08,
            statusLabel: 'Rendering pages…',
          })
        }

        const largePdf = file.size > 40 * 1024 * 1024
        const result = await renderPdfToImages(
          file,
          (progress) => {
            setState({
              status: 'loading',
              fileName: nextFileName,
              // Keep a little headroom so upload phase is visible for published replaces.
              progress: ready.flipbookId ? 0.08 + progress * 0.92 : progress,
              statusLabel: 'Rendering pages…',
            })
          },
          largePdf ? { maxRenderWidth: 1100, jpegQuality: 0.82 } : undefined,
        )

        if (!plan.canAddPages(result.pageCount)) {
          // Share already has the new PDF if we uploaded first; keep ids so Share stays Update.
          setState({
            ...ready,
            fileName: nextFileName,
            flipbookId: nextFlipbookId,
            shareUrl: nextShareUrl,
          })
          showUpgrade('PDF too long', 'pages', undefined, String(result.pageCount))
          return
        }

        let nextReady = applyPdfToReady(ready, file, result)
        nextReady = {
          ...nextReady,
          fileName: nextFileName,
          flipbookId: nextFlipbookId,
          shareUrl: nextShareUrl,
        }

        if (nextFlipbookId) {
          void syncShareCover(nextFlipbookId, result.images[0])
          void updateFlipbook(nextFlipbookId, { pageCount: result.pageCount }).catch(() => {})
        } else {
          await saveDraftPdf(ready.libraryEntryId, file)
        }

        let thumbnail: string | undefined
        try {
          thumbnail = await createThumbnailFromDataUrl(result.images[0] ?? '')
        } catch {
          // Thumbnail is optional — don't fail a successful replace over it.
        }

        setState(nextReady)
        persistLibrary(nextReady, {
          fileName: nextReady.fileName,
          ...(thumbnail ? { thumbnail } : {}),
          type: nextReady.flipbookId ? 'published' : 'draft',
          ...(nextReady.flipbookId ? { flipbookId: nextFlipbookId } : {}),
        })

        if (nextReady.flipbookId && nextReady.shareUrl) {
          alert(`PDF replaced. Your share link is unchanged:\n\n${nextReady.shareUrl}`)
        }
      } catch (error) {
        // Never drop published editor state on failure — that forces a re-upload
        // and Share would create a brand-new flipbook/URL.
        const message = error instanceof Error ? error.message : 'Failed to replace PDF'
        if (uploadedToShare) {
          setState({
            ...ready,
            fileName: nextFileName,
            flipbookId: nextFlipbookId,
            shareUrl: nextShareUrl,
          })
          alert(
            `PDF uploaded to your share link, but the editor preview failed.\n\n${message}\n\nReload this magazine from My Flipbooks to refresh the preview. Your share link is unchanged.`,
          )
        } else {
          setState(ready)
          alert(
            published
              ? `Could not replace PDF (share link unchanged).\n\n${message}`
              : message,
          )
        }
      } finally {
        setIsReplacingPdf(false)
      }
    },
    [applyPdfToReady, persistLibrary, plan, showUpgrade, state, user],
  )

  const handleLibraryReupload = useCallback(
    async (entry: LibraryEntry, file: File) => {
      const published = entry.type === 'published' && Boolean(entry.flipbookId)
      const confirmMessage = published
        ? `Replace the PDF for “${entry.fileName}”?\n\nYour share link stays the same. If the new PDF has a different page count, review hotspots, videos, and the table of contents.`
        : `Replace the PDF for draft “${entry.fileName}”?\n\nHotspots and videos may need repositioning if the page count changes.`

      if (!window.confirm(confirmMessage)) return

      if (published && !user) {
        alert('Sign in to replace the PDF on a published magazine. This keeps your existing share link.')
        return
      }

      plan.refreshUsage()
      if (!plan.canUploadPdf(file.size)) {
        showUpgrade('PDF too large', 'fileSize', undefined, formatByteSize(file.size))
        return
      }

      setShowLibrary(false)
      setLibraryLoadingId(entry.id)
      setIsReplacingPdf(true)
      setState({
        status: 'loading',
        fileName: file.name,
        progress: 0.02,
        statusLabel: published ? 'Uploading PDF…' : 'Preparing PDF…',
      })

      let uploadedToShare = false
      let nextFlipbookId = entry.flipbookId ?? null
      let nextShareUrl: string | null = null
      let nextFileName = file.name

      try {
        let videoEmbeds: VideoEmbed[] = []
        let linkHotspots = entry.linkHotspots ?? []
        let popUpPanels = entry.popUpPanels ?? []
        let popUpPanelStyle = normalizePopUpPanelStyle(entry.popUpPanelStyle)
        let publication = normalizePublication(
          entry.publication ?? defaultPublication(entry.fileName),
        )
        let tableOfContents = entry.tableOfContents ?? []
        let spreadView = entry.spreadView
        let branding = normalizeBranding(entry.branding)
        let monetization = normalizeMonetization(entry.monetization)
        let leadCapture = normalizeLeadCapture(entry.leadCapture)
        let hasSubscriberAccess = false
        let visibility = entry.visibility ?? DEFAULT_VISIBILITY
        let isPasswordProtected = entry.isPasswordProtected

        if (published && entry.flipbookId) {
          const existingMeta = await fetchFlipbook(entry.flipbookId)
          const meta = await replaceFlipbookPdf(entry.flipbookId, file, { planId: plan.planId })
          nextFlipbookId = meta.id || entry.flipbookId
          nextFileName = meta.fileName
          nextShareUrl = getShareUrl(
            sharePathId(meta),
            meta.branding || existingMeta.branding || branding,
          )
          uploadedToShare = true
          videoEmbeds = existingMeta.videoEmbeds ?? []
          linkHotspots = existingMeta.linkHotspots ?? []
          popUpPanels = existingMeta.popUpPanels ?? []
          popUpPanelStyle = normalizePopUpPanelStyle(existingMeta.popUpPanelStyle)
          publication = normalizePublication(existingMeta.publication)
          tableOfContents = existingMeta.tableOfContents ?? []
          spreadView = existingMeta.spreadView
          branding = normalizeBranding(existingMeta.branding)
          monetization = normalizeMonetization(existingMeta.monetization)
          leadCapture = normalizeLeadCapture(existingMeta.leadCapture)
          hasSubscriberAccess = existingMeta.hasSubscriberAccess
          visibility = normalizeVisibility(existingMeta.visibility)
          isPasswordProtected = existingMeta.isPasswordProtected
          setState({
            status: 'loading',
            fileName: nextFileName,
            progress: 0.08,
            statusLabel: 'Rendering pages…',
          })
        }

        const largePdf = file.size > 40 * 1024 * 1024
        const result = await renderPdfToImages(
          file,
          (progress) => {
            setState({
              status: 'loading',
              fileName: nextFileName,
              progress: published ? 0.08 + progress * 0.92 : progress,
              statusLabel: 'Rendering pages…',
            })
          },
          largePdf ? { maxRenderWidth: 1100, jpegQuality: 0.82 } : undefined,
        )

        if (!plan.canAddPages(result.pageCount)) {
          setState({ status: 'idle' })
          showUpgrade('PDF too long', 'pages', undefined, String(result.pageCount))
          return
        }

        if (nextFlipbookId) {
          void syncShareCover(nextFlipbookId, result.images[0])
          void updateFlipbook(nextFlipbookId, { pageCount: result.pageCount }).catch(() => {})
        } else {
          await saveDraftPdf(entry.id, file)
        }

        let thumbnail: string | undefined
        try {
          thumbnail = await createThumbnailFromDataUrl(result.images[0] ?? '')
        } catch {
          // optional
        }

        const nextReady: ReadyState = {
          status: 'ready',
          libraryEntryId: entry.id,
          fileName: nextFileName,
          pdfFile: file,
          images: result.images,
          aspectRatio: result.aspectRatio,
          flipbookId: nextFlipbookId,
          videoEmbeds,
          linkHotspots,
          popUpPanels,
          popUpPanelStyle,
          publication: {
            ...publication,
            title: publication.title || nextFileName.replace(/\.pdf$/i, ''),
          },
          tableOfContents,
          spreadView: spreadView ?? defaultSpreadView(result.aspectRatio),
          branding,
          monetization,
          leadCapture,
          pageTexts: result.pageTexts,
          hasSubscriberAccess,
          subscriberAccessCode: '',
          shareUrl: nextShareUrl,
          visibility,
          isPasswordProtected,
        }

        setState(nextReady)
        persistLibrary(nextReady, {
          fileName: nextReady.fileName,
          pageCount: result.pageCount,
          ...(thumbnail ? { thumbnail } : {}),
          type: nextReady.flipbookId ? 'published' : 'draft',
          ...(nextReady.flipbookId ? { flipbookId: nextReady.flipbookId } : {}),
        })

        if (nextReady.flipbookId && nextReady.shareUrl) {
          alert(`PDF replaced. Your share link is unchanged:\n\n${nextReady.shareUrl}`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to replace PDF'
        if (uploadedToShare && nextFlipbookId) {
          setState({ status: 'idle' })
          alert(
            `PDF uploaded to your share link, but the editor preview failed.\n\n${message}\n\nOpen this magazine from My Flipbooks to refresh the preview. Your share link is unchanged.`,
          )
        } else {
          setState({ status: 'idle' })
          alert(
            published
              ? `Could not replace PDF (share link unchanged).\n\n${message}`
              : message,
          )
        }
      } finally {
        setIsReplacingPdf(false)
        setLibraryLoadingId(null)
      }
    },
    [persistLibrary, plan, showUpgrade, user],
  )

  const handleUploadNew = useCallback(() => {
    if (state.status === 'ready' && state.flipbookId) {
      const ok = window.confirm(
        'Start a new magazine?\n\nThis does not replace the one you have open. To keep the same share link, use Publisher → Details → Replace PDF instead.',
      )
      if (!ok) return
    }
    setState({ status: 'idle' })
  }, [state])

  const handleRefreshPages = useCallback(async () => {
    if (state.status !== 'ready') return

    const ready = state
    setState({ status: 'loading', fileName: ready.fileName, progress: 0 })

    try {
      let file = ready.pdfFile
      let fileName = ready.fileName

      if (ready.flipbookId) {
        const buffer = await fetchFlipbookPdf(ready.flipbookId)
        fileName = ready.fileName
        file = new File([buffer], fileName, { type: 'application/pdf' })
      }

      const result = ready.flipbookId
        ? await renderPdfFromBuffer(await file.arrayBuffer(), (progress) => {
            setState({ status: 'loading', fileName, progress })
          })
        : await renderPdfToImages(file, (progress) => {
            setState({ status: 'loading', fileName, progress })
          })

      const nextReady = applyPdfToReady(ready, file, result)
      const thumbnail = await createThumbnailFromDataUrl(result.images[0] ?? '')
      setState(nextReady)

      if (ready.flipbookId) {
        void syncShareCover(ready.flipbookId, result.images[0])
      }

      persistLibrary(nextReady, { thumbnail })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh pages'
      setState({ status: 'error', message })
    }
  }, [applyPdfToReady, persistLibrary, state])

  const handlePasswordChange = useCallback(
    (password: string, enabled: boolean) => {
      if (enabled && !plan.can('passwordProtection')) {
        showUpgrade('Password protection', 'feature', 'passwordProtection', 'Password protection')
        return
      }

      setState((prev) => {
        if (prev.status !== 'ready') return prev

        const next = {
          ...prev,
          publishPassword: enabled ? password : undefined,
          isPasswordProtected: enabled,
        }

        if (prev.flipbookId) {
          void updateFlipbook(prev.flipbookId, {
            ...(enabled && password ? { password } : {}),
            ...(!enabled ? { removePassword: true } : {}),
          }).catch(() => {})
        }

        library.bumpUpdated(prev.libraryEntryId, { isPasswordProtected: enabled })

        return next
      })
    },
    [library, plan],
  )

  const handleVisibilityChange = useCallback(
    (visibility: FlipbookVisibility) => {
      setState((prev) => {
        if (prev.status !== 'ready') return prev

        const next = { ...prev, visibility }

        if (prev.flipbookId) {
          void updateFlipbook(prev.flipbookId, { visibility }).catch(() => {})
        }

        library.bumpUpdated(prev.libraryEntryId, { visibility })

        return next
      })
    },
    [library],
  )

  const handleShare = useCallback(
    async (password?: string) => {
      if (state.status !== 'ready') return

      if ((password || state.publishPassword) && !plan.can('passwordProtection')) {
        showUpgrade('Password protection', 'feature', 'passwordProtection', 'Password protection')
        return
      }

      if (!plan.canUploadPdf(state.pdfFile.size)) {
        showUpgrade('PDF too large', 'fileSize', undefined, formatByteSize(state.pdfFile.size))
        return
      }

      setIsPublishing(true)
      try {
        if (state.flipbookId) {
          const updated = await updateFlipbook(state.flipbookId, {
            videoEmbeds: state.videoEmbeds,
            pageCount: state.images.length,
            ...publisherPayload(state, plan.planId),
            ...(password ? { password } : {}),
          })
          try {
            await syncShareCover(state.flipbookId, state.images[0])
          } catch {
            // Share still works; ShareDialog retries cover upload when opened.
          }
          setState({
            ...state,
            shareUrl: getShareUrl(sharePathId(updated), state.branding),
            isPasswordProtected: Boolean(password) || state.isPasswordProtected,
            hasSubscriberAccess:
              Boolean(state.subscriberAccessCode.trim()) || state.hasSubscriberAccess,
            subscriberAccessCode: '',
          })
          library.bumpUpdated(state.libraryEntryId, {
            isPasswordProtected: Boolean(password) || state.isPasswordProtected,
            ...libraryPublisherPatch(state),
          })
        } else {
          const meta = await publishFlipbook(state.pdfFile, state.videoEmbeds, {
            password: password ?? state.publishPassword,
            planId: plan.planId,
            billingAccountId: getBillingAccountId(),
            pageCount: state.images.length,
            ...publisherPayload(state, plan.planId),
          })
          try {
            await syncShareCover(meta.id, state.images[0])
          } catch {
            // Share still works; ShareDialog retries cover upload when opened.
          }
          library.markPublished(state.libraryEntryId, {
            id: meta.id,
            fileName: meta.fileName,
            isPasswordProtected: meta.isPasswordProtected,
            pageCount: state.images.length,
            ...libraryPublisherPatch({ ...state, visibility: normalizeVisibility(meta.visibility) }),
          })
          setState({
            ...state,
            flipbookId: meta.id,
            branding: normalizeBranding(meta.branding),
            monetization: normalizeMonetization(meta.monetization),
            hasSubscriberAccess: meta.hasSubscriberAccess,
            subscriberAccessCode: '',
            shareUrl: getShareUrl(sharePathId(meta), meta.branding),
            isPasswordProtected: meta.isPasswordProtected,
            visibility: normalizeVisibility(meta.visibility),
          })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to publish flipbook'
        alert(message)
      } finally {
        setIsPublishing(false)
      }
    },
    [library, plan, showUpgrade, state],
  )

  const handleCreateFolder = useCallback(
    (name: string) => {
      if (!plan.can('folders')) {
        showUpgrade('Folders', 'folders', 'folders')
        return
      }
      if (!plan.canAddFolder()) {
        showUpgrade('Folder limit reached', 'folders', 'folders')
        return
      }
      library.createFolder(name)
      plan.refreshUsage()
    },
    [library, plan, showUpgrade],
  )

  const handleUpgradeFeature = useCallback(
    (feature: PlanFeature, label: string) => {
      showUpgrade(label, 'feature', feature, label)
    },
    [showUpgrade],
  )

  const libraryPanel = (
    <FlipbookLibrary
      entries={library.visibleEntries}
      folders={library.folders}
      activeFolder={library.activeFolder}
      folderCounts={library.folderCounts}
      onOpen={handleOpenLibraryEntry}
      onReupload={(entry, file) => void handleLibraryReupload(entry, file)}
      onRemove={(id) => void library.remove(id)}
      onReorder={library.reorder}
      onResetOrder={library.resetOrderByRecent}
      onSelectFolder={library.setActiveFolder}
      onCreateFolder={handleCreateFolder}
      onRenameFolder={(id, name) => {
        library.renameFolder(id, name)
      }}
      onDeleteFolder={library.deleteFolder}
      onMoveToFolder={library.moveToFolder}
      loadingId={libraryLoadingId}
    />
  )

  return (
    <div className="min-h-full bg-apple-bg">
      <AppNav>
        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className="apple-btn-ghost"
        >
          My flipbooks
          {library.folderCounts.all > 0 && (
            <span className="ml-1.5 rounded-full bg-apple-gray px-2 py-0.5 text-xs tabular-nums text-apple-muted">
              {library.folderCounts.all}
            </span>
          )}
        </button>
        {state.status === 'ready' && (
          <button type="button" onClick={handleUploadNew} className="apple-btn-secondary">
            Upload another
          </button>
        )}
      </AppNav>

      <main>
        {state.status === 'idle' && (
          <>
            <section className="px-6 pb-12 pt-16 text-center md:pt-20">
              <div className="mx-auto max-w-[680px]">
                <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
                    />
                  </svg>
                  AI-assisted publishing
                </p>
                <h1 className="apple-hero-title mt-6">
                  <span className="block">The AI-assisted</span>
                  <span className="block">magazine publisher</span>
                </h1>
                <p className="apple-hero-subtitle mx-auto mt-5 max-w-[580px]">
                  Upload a PDF and AI suggests your title, SEO description, and table of contents.
                  Add videos, links, and panels — then share a beautiful flipbook anywhere.
                </p>
              </div>
            </section>

            <section className="mx-auto max-w-[680px] px-6 pb-12">
              <UploadZone onFileSelect={handleFileSelect} maxUploadMb={plan.maxPdfUploadMb} />
            </section>

            <section className="border-t border-apple-border-light bg-apple-gray px-6 py-16">
              <div className="mx-auto max-w-[680px]">{libraryPanel}</div>
            </section>

            <section className="px-6 py-20">
              <div className="mx-auto grid max-w-[980px] gap-5 md:grid-cols-3">
                {[
                  { title: 'Upload', desc: 'Drop any multi-page PDF — brochures, catalogs, or magazines.' },
                  {
                    title: 'AI assist',
                    desc: 'Get AI-suggested title, SEO description, issue label, and table of contents in seconds.',
                  },
                  {
                    title: 'Publish & share',
                    desc: 'Share links and embeds with rich previews. Paywalls, lead capture, and custom domains.',
                  },
                ].map((feature) => (
                  <div key={feature.title} className="apple-card p-8 text-center md:text-left">
                    <h3 className="text-[1.25rem] font-semibold tracking-tight text-apple-text">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[1.0625rem] leading-snug text-apple-muted">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-apple-border-light px-6 py-20">
              <div className="mx-auto max-w-[980px] text-center">
                <p className="apple-section-label">What publishers say</p>
                <h2 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                  AI-assisted publishing for real magazines
                </h2>
              </div>
              <div className="mx-auto mt-10 grid max-w-[980px] gap-5 md:grid-cols-3">
                {TESTIMONIALS.map((testimonial) => (
                  <figure key={testimonial.name} className="apple-card flex flex-col p-8 text-left">
                    <blockquote className="flex-1 text-[1.0625rem] leading-relaxed text-apple-text">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <figcaption className="mt-6 border-t border-apple-border-light pt-5">
                      <p className="font-semibold text-apple-text">{testimonial.name}</p>
                      <p className="mt-0.5 text-sm text-apple-muted">{testimonial.role}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          </>
        )}

        {state.status === 'loading' && (
          <div className="flex min-h-[60vh] items-center justify-center px-6 py-20">
            <LoadingProgress
              progress={state.progress}
              fileName={state.fileName}
              statusLabel={state.statusLabel}
            />
          </div>
        )}

        {state.status === 'error' && (
          <div className="mx-auto max-w-md px-6 py-20 text-center">
            <div className="apple-card mb-8 p-8">
              <p className="text-[1.25rem] font-semibold text-apple-text">Something went wrong</p>
              <p className="mt-2 text-[1.0625rem] text-apple-muted">{state.message}</p>
            </div>
            <button type="button" onClick={handleUploadNew} className="apple-btn-primary">
              Try again
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <div className="flex h-[calc(100dvh-52px)] flex-col overflow-hidden">
            {stripeNotice && (
              <div className="mx-auto mb-2 flex max-w-xl shrink-0 items-center justify-between rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm text-emerald-800">
                <span>{stripeNotice}</span>
                <button
                  type="button"
                  onClick={() => setStripeNotice(null)}
                  className="font-medium hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1">
            <FlipbookViewer
              images={state.images}
              aspectRatio={state.aspectRatio}
              fileName={state.fileName}
              mode="editor"
              flipbookId={state.flipbookId}
              sharePathId={
                state.shareUrl
                  ? (() => {
                      try {
                        return (
                          new URL(state.shareUrl).pathname.split('/').filter(Boolean).pop() ?? null
                        )
                      } catch {
                        return null
                      }
                    })()
                  : null
              }
              videoEmbeds={state.videoEmbeds}
              linkHotspots={state.linkHotspots}
              popUpPanels={state.popUpPanels}
              popUpPanelStyle={state.popUpPanelStyle}
              publication={state.publication}
              tableOfContents={state.tableOfContents}
              spreadView={state.spreadView}
              branding={state.branding}
              monetization={state.monetization}
              leadCapture={state.leadCapture}
              pageTexts={state.pageTexts}
              onPageTextsChange={handlePageTextsChange}
              hasSubscriberAccess={state.hasSubscriberAccess}
              subscriberAccessCode={state.subscriberAccessCode}
              shareUrl={state.shareUrl}
              visibility={state.visibility}
              isPasswordProtected={state.isPasswordProtected}
              isPublishing={isPublishing}
              onUploadNew={handleUploadNew}
              onShare={handleShare}
              onVideoEmbedsChange={handleVideoEmbedsChange}
              onLinkHotspotsChange={handleLinkHotspotsChange}
              onPopUpPanelsChange={handlePopUpPanelsChange}
              onPopUpPanelStyleChange={handlePopUpPanelStyleChange}
              onPublicationChange={handlePublicationChange}
              onTableOfContentsChange={handleTableOfContentsChange}
              onSpreadViewChange={handleSpreadViewChange}
              onBrandingChange={handleBrandingChange}
              onMonetizationChange={handleMonetizationChange}
              onLeadCaptureChange={handleLeadCaptureChange}
              onSubscriberAccessCodeChange={handleSubscriberAccessCodeChange}
              onLogoUpload={state.flipbookId ? handleLogoUpload : undefined}
              onLogoRemove={state.flipbookId ? handleLogoRemove : undefined}
              onImportOutline={handleImportOutline}
              onReplacePdf={handleReplacePdf}
              onRefreshPages={handleRefreshPages}
              pdfActionBusy={isReplacingPdf}
              onPasswordChange={handlePasswordChange}
              onVisibilityChange={handleVisibilityChange}
              canPasswordProtect={plan.can('passwordProtection')}
              canVideoEmbeds={plan.can('videoEmbeds')}
              canAnalytics={plan.can('analytics')}
              canCustomBranding={plan.can('customBranding')}
              canReaderMonetization={plan.can('readerMonetization')}
              canLeadCapture={plan.can('leadCapture')}
              stripeConfigured={stripeConfigured}
              onStripeConnect={handleStripeConnect}
              onUpgradeRequest={handleUpgradeFeature}
            />
            </div>
          </div>
        )}
      </main>

      {upgradePrompt && (
        <UpgradePrompt
          title={upgradePrompt.title}
          message={upgradePrompt.message}
          feature={upgradePrompt.feature}
          onClose={() => setUpgradePrompt(null)}
        />
      )}

      {showLibrary && (
        <div className="apple-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
          <div className="apple-modal w-full max-w-[680px]">
            <div className="flex items-center justify-between border-b border-apple-border-light px-6 py-5">
              <h3 className="text-[1.375rem] font-semibold tracking-tight text-apple-text">My flipbooks</h3>
              <button
                type="button"
                onClick={() => setShowLibrary(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-apple-muted hover:bg-apple-gray"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6">{libraryPanel}</div>
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  )
}
