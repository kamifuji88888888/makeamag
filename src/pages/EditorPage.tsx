import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { PlanFeature, PlanId } from '../../shared/plans'
import { formatByteSize } from '../../shared/plans'
import { planBadgeClass, UpgradePrompt } from '../components/UpgradePrompt'
import { usePlanContext } from '../context/PlanContext'
import { planLimitMessage, sanitizeBrandingForPlan, sanitizeLeadCaptureForPlan, sanitizeMonetizationForPlan } from '../lib/planStorage'
import { getBillingAccountId } from '../lib/billingStorage'
import type {
  BrandingConfig,
  LeadCaptureConfig,
  LinkHotspot,
  MonetizationConfig,
  PublicationInfo,
  TocEntry,
  VideoEmbed,
} from '../../shared/flipbook'
import { DEFAULT_BRANDING, DEFAULT_LEAD_CAPTURE, DEFAULT_MONETIZATION, DEFAULT_PUBLICATION, normalizeBranding, normalizeLeadCapture, normalizeMonetization, normalizePublication } from '../../shared/flipbook'
import {
  deleteFlipbookLogo,
  fetchFlipbook,
  fetchFlipbookPdf,
  fetchStripeStatus,
  getShareUrl,
  publishFlipbook,
  startStripeConnect,
  updateFlipbook,
  uploadFlipbookLogo,
} from '../lib/api'
import type { LibraryEntry } from '../lib/libraryStorage'
import { useFlipbookLibrary } from '../hooks/useFlipbookLibrary'
import { extractPdfOutline, renderPdfFromBuffer, renderPdfToImages } from '../lib/pdfRenderer'
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
  isPasswordProtected: boolean
  publishPassword?: string
}

type EditorState =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string; progress: number }
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
    spreadView: state.spreadView,
    branding: sanitizeBrandingForPlan(state.branding, planId),
    monetization: sanitizeMonetizationForPlan(state.monetization, planId),
    leadCapture: sanitizeLeadCaptureForPlan(state.leadCapture, planId),
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
    spreadView: state.spreadView,
    branding: state.branding,
    monetization: state.monetization,
    leadCapture: state.leadCapture,
  }
}

export function EditorPage() {
  const [state, setState] = useState<EditorState>({ status: 'idle' })
  const [isPublishing, setIsPublishing] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryLoadingId, setLibraryLoadingId] = useState<string | null>(null)
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [stripeNotice, setStripeNotice] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const library = useFlipbookLibrary()
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
            isPasswordProtected: false,
          })
        } else if (entry.flipbookId) {
          const meta = await fetchFlipbook(entry.flipbookId)
          const buffer = await fetchFlipbookPdf(entry.flipbookId)
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
            publication: normalizePublication(meta.publication),
            tableOfContents: meta.tableOfContents ?? [],
            spreadView: meta.spreadView ?? defaultSpreadView(result.aspectRatio),
            branding: normalizeBranding(meta.branding),
            monetization: normalizeMonetization(meta.monetization),
            leadCapture: normalizeLeadCapture(meta.leadCapture),
            pageTexts: result.pageTexts,
            hasSubscriberAccess: meta.hasSubscriberAccess,
            subscriberAccessCode: '',
            shareUrl: getShareUrl(meta.id, meta.branding),
            isPasswordProtected: meta.isPasswordProtected,
          })
        }

        library.bumpUpdated(entry.id)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to open flipbook'
        setState({ status: 'error', message })
      } finally {
        setLibraryLoadingId(null)
      }
    },
    [library, plan, showUpgrade],
  )

  const handleUploadNew = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

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

  const handlePublicationChange = useCallback(
    (publication: PublicationInfo) => {
      updateReady((prev) => ({ ...prev, publication: normalizePublication(publication) }))
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

      updateReady((prev) => {
        const nextBranding = sanitizeBrandingForPlan(normalized, plan.planId)
        return {
          ...prev,
          branding: nextBranding,
          shareUrl: prev.flipbookId ? getShareUrl(prev.flipbookId, nextBranding) : prev.shareUrl,
        }
      })
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
          await updateFlipbook(state.flipbookId, {
            videoEmbeds: state.videoEmbeds,
            ...publisherPayload(state, plan.planId),
            ...(password ? { password } : {}),
          })
          setState({
            ...state,
            shareUrl: getShareUrl(state.flipbookId, state.branding),
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
            ...publisherPayload(state, plan.planId),
          })
          library.markPublished(state.libraryEntryId, {
            id: meta.id,
            fileName: meta.fileName,
            isPasswordProtected: meta.isPasswordProtected,
            pageCount: state.images.length,
            ...libraryPublisherPatch(state),
          })
          setState({
            ...state,
            flipbookId: meta.id,
            branding: normalizeBranding(meta.branding),
            monetization: normalizeMonetization(meta.monetization),
            hasSubscriberAccess: meta.hasSubscriberAccess,
            subscriberAccessCode: '',
            shareUrl: getShareUrl(meta.id, meta.branding),
            isPasswordProtected: meta.isPasswordProtected,
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
      <header className="apple-nav">
        <div className="mx-auto flex h-[52px] max-w-[980px] items-center justify-between px-6">
          <Link to="/" className="text-[1.0625rem] font-semibold tracking-tight text-apple-text">
            MakeAMag
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/pricing" className="apple-btn-ghost">
              Pricing
            </Link>
            <span
              className={[
                'hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline',
                planBadgeClass(plan.planId),
              ].join(' ')}
            >
              {plan.plan.name}
            </span>
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
          </div>
        </div>
      </header>

      <main>
        {state.status === 'idle' && (
          <>
            <section className="px-6 pb-12 pt-16 text-center md:pt-20">
              <div className="mx-auto max-w-[680px]">
                <h1 className="apple-hero-title">
                  <span className="block">Make Your Online Magazine!</span>
                  <span className="block">In One Click!</span>
                </h1>
                <p className="apple-hero-subtitle mx-auto mt-5 max-w-[580px]">
                  Upload a brochure or magazine. Add videos, links, and a table of contents.
                  Share a beautiful flipbook — anywhere.
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
                  { title: 'Upload', desc: 'Any multi-page PDF. Brochures, catalogs, magazines.' },
                  { title: 'Publish', desc: 'Title, contents, link hotspots, and spread view for magazines.' },
                  { title: 'Share', desc: 'Full-screen links, embeds, and password protection.' },
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
                  Built for real magazines
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
            <LoadingProgress progress={state.progress} fileName={state.fileName} />
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
          <div className="px-6 py-10">
            {stripeNotice && (
              <div className="mx-auto mb-6 flex max-w-xl items-center justify-between rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm text-emerald-800">
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
            <FlipbookViewer
              images={state.images}
              aspectRatio={state.aspectRatio}
              fileName={state.fileName}
              mode="editor"
              flipbookId={state.flipbookId}
              videoEmbeds={state.videoEmbeds}
              linkHotspots={state.linkHotspots}
              publication={state.publication}
              tableOfContents={state.tableOfContents}
              spreadView={state.spreadView}
              branding={state.branding}
              monetization={state.monetization}
              leadCapture={state.leadCapture}
              pageTexts={state.pageTexts}
              hasSubscriberAccess={state.hasSubscriberAccess}
              subscriberAccessCode={state.subscriberAccessCode}
              shareUrl={state.shareUrl}
              isPasswordProtected={state.isPasswordProtected}
              isPublishing={isPublishing}
              onUploadNew={handleUploadNew}
              onShare={handleShare}
              onVideoEmbedsChange={handleVideoEmbedsChange}
              onLinkHotspotsChange={handleLinkHotspotsChange}
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
              onPasswordChange={handlePasswordChange}
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
    </div>
  )
}
