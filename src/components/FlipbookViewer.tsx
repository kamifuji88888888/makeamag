import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import HTMLFlipBook from 'react-pageflip'
import type { HTMLFlipBookRef } from 'react-pageflip'
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
import type { PlanFeature } from '../../shared/plans'
import { DEFAULT_BRANDING, DEFAULT_LEAD_CAPTURE, DEFAULT_MONETIZATION, DEFAULT_POP_UP_PANEL_STYLE, DEFAULT_PUBLICATION, displayTitle, normalizeLeadCapture } from '../../shared/flipbook'
import { brandingScopeStyle } from '../lib/branding'
import { createStripeCheckout } from '../lib/api'
import { useFlipbookAnalytics } from '../hooks/useFlipbookAnalytics'
import { useFlipbookZoom } from '../hooks/useFlipbookZoom'
import { usePageTurnSound } from '../hooks/usePageTurnSound'
import { FlipbookControls } from './FlipbookControls'
import { FlipbookPage } from './FlipbookPage'
import { FlipbookZoomControls } from './FlipbookZoomControls'
import { PopUpPanelModal } from './PopUpPanelModal'
import { PublicationHeader } from './PublicationHeader'
import { PublisherPanel } from './PublisherPanel'
import { ReaderPaywall } from './ReaderPaywall'
import { LeadCaptureGate } from './LeadCaptureGate'
import { FlipbookSearchPanel } from './FlipbookSearchPanel'
import { ShareDialog } from './ShareDialog'
import { SocialShareDialog } from './SocialShareDialog'
import { TocSidebar } from './TocSidebar'
import { VideoEmbedEditor } from './VideoEmbedEditor'
import { VideoPositionEditor } from './VideoPositionEditor'

interface FlipbookViewerProps {
  images: string[]
  aspectRatio: number
  fileName: string
  mode?: 'editor' | 'shared' | 'embed'
  flipbookId?: string | null
  videoEmbeds?: VideoEmbed[]
  linkHotspots?: LinkHotspot[]
  popUpPanels?: PopUpPanel[]
  popUpPanelStyle?: PopUpPanelStyle
  publication?: PublicationInfo
  tableOfContents?: TocEntry[]
  spreadView?: boolean
  branding?: BrandingConfig
  monetization?: MonetizationConfig
  leadCapture?: LeadCaptureConfig
  pageTexts?: string[]
  onPageTextsChange?: (pageTexts: string[]) => void
  hasSubscriberAccess?: boolean
  monetizationUnlocked?: boolean
  leadCaptureUnlocked?: boolean
  isCustomDomain?: boolean
  shareUrl?: string | null
  visibility?: FlipbookVisibility
  isPasswordProtected?: boolean
  isPublishing?: boolean
  hideChrome?: boolean
  initialPage?: number
  onUploadNew?: () => void
  onShare?: (password?: string) => void
  onVideoEmbedsChange?: (embeds: VideoEmbed[]) => void
  onLinkHotspotsChange?: (hotspots: LinkHotspot[]) => void
  onPopUpPanelsChange?: (panels: PopUpPanel[]) => void
  onPopUpPanelStyleChange?: (style: PopUpPanelStyle) => void
  onPublicationChange?: (publication: PublicationInfo) => void
  onTableOfContentsChange?: (entries: TocEntry[]) => void
  onSpreadViewChange?: (spreadView: boolean) => void
  onImportOutline?: () => void
  onBrandingChange?: (branding: BrandingConfig) => void
  onMonetizationChange?: (monetization: MonetizationConfig) => void
  onLeadCaptureChange?: (leadCapture: LeadCaptureConfig) => void
  onSubscriberAccessCodeChange?: (code: string) => void
  onMonetizationUnlock?: (accessCode: string) => Promise<void>
  onLeadCaptureSubmit?: (email: string, consent: boolean) => Promise<void>
  onLogoUpload?: (file: File) => Promise<void>
  onLogoRemove?: () => Promise<void>
  onPasswordChange?: (password: string, enabled: boolean) => void
  onVisibilityChange?: (visibility: FlipbookVisibility) => void
  canPasswordProtect?: boolean
  canVideoEmbeds?: boolean
  canAnalytics?: boolean
  canCustomBranding?: boolean
  canReaderMonetization?: boolean
  canLeadCapture?: boolean
  subscriberAccessCode?: string
  stripeConfigured?: boolean
  onStripeConnect?: () => Promise<void>
  onUpgradeRequest?: (feature: PlanFeature, label: string) => void
}

function useFlipbookDimensions(
  aspectRatio: number,
  mode: 'editor' | 'shared' | 'embed',
  spreadView: boolean,
  singlePageLayout: boolean,
) {
  const [dims, setDims] = useState({ width: 500, height: 700 })

  useEffect(() => {
    function update() {
      const isEmbed = mode === 'embed'
      const isShared = mode === 'shared'
      const padding = isEmbed ? 16 : isShared ? 32 : 48
      const verticalChrome = isEmbed ? 72 : isShared ? 112 : 168
      const maxHeight = window.innerHeight - verticalChrome

      if (spreadView && singlePageLayout) {
        // Cover / back cover: one centered page, as tall as the viewport allows.
        const maxWidth = window.innerWidth - padding
        let pageHeight = Math.floor(maxHeight)
        let pageWidth = Math.floor(pageHeight * aspectRatio)

        if (pageWidth > maxWidth) {
          pageWidth = Math.floor(maxWidth)
          pageHeight = Math.floor(pageWidth / aspectRatio)
        }

        setDims({
          width: Math.max(240, pageWidth),
          height: Math.max(320, pageHeight),
        })
        return
      }

      const maxTotalWidth = spreadView
        ? window.innerWidth - padding
        : Math.min(
            window.innerWidth - padding,
            isEmbed ? 1400 : isShared ? 1200 : 960,
          )

      if (spreadView) {
        let pageHeight = Math.floor(maxHeight)
        let pageWidth = Math.floor(pageHeight * aspectRatio)

        if (pageWidth * 2 > maxTotalWidth) {
          pageWidth = Math.floor(maxTotalWidth / 2)
          pageHeight = Math.floor(pageWidth / aspectRatio)
        }

        setDims({
          width: Math.max(240, pageWidth),
          height: Math.max(320, pageHeight),
        })
        return
      }

      const controlsHeight = isEmbed ? 56 : isShared ? 80 : 120
      const maxHeightSingle = window.innerHeight - controlsHeight - padding
      let pageWidth = maxTotalWidth
      let pageHeight = pageWidth / aspectRatio

      if (pageHeight > maxHeightSingle) {
        pageHeight = maxHeightSingle
        pageWidth = pageHeight * aspectRatio
      }

      setDims({
        width: Math.max(240, Math.floor(pageWidth)),
        height: Math.max(320, Math.floor(pageHeight)),
      })
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [aspectRatio, mode, singlePageLayout, spreadView])

  return dims
}

function spreadSpineForPage(
  pageIndex: number,
  totalPages: number,
  spreadView: boolean,
): 'left' | 'right' | 'single' | null {
  if (!spreadView || totalPages <= 1) return null
  if (pageIndex === 0 || pageIndex === totalPages - 1) return 'single'
  return pageIndex % 2 === 1 ? 'left' : 'right'
}

export function FlipbookViewer({
  images,
  aspectRatio,
  fileName,
  mode = 'editor',
  flipbookId = null,
  videoEmbeds = [],
  linkHotspots = [],
  popUpPanels = [],
  popUpPanelStyle = DEFAULT_POP_UP_PANEL_STYLE,
  publication = DEFAULT_PUBLICATION,
  tableOfContents = [],
  spreadView = false,
  branding = DEFAULT_BRANDING,
  monetization = DEFAULT_MONETIZATION,
  leadCapture = DEFAULT_LEAD_CAPTURE,
  pageTexts = [],
  onPageTextsChange,
  hasSubscriberAccess = false,
  monetizationUnlocked = true,
  leadCaptureUnlocked = true,
  isCustomDomain = false,
  shareUrl = null,
  visibility = 'public',
  isPasswordProtected = false,
  isPublishing = false,
  hideChrome = false,
  initialPage,
  onUploadNew,
  onShare,
  onVideoEmbedsChange,
  onLinkHotspotsChange,
  onPopUpPanelsChange,
  onPopUpPanelStyleChange,
  onPublicationChange,
  onTableOfContentsChange,
  onSpreadViewChange,
  onImportOutline,
  onBrandingChange,
  onMonetizationChange,
  onLeadCaptureChange,
  onSubscriberAccessCodeChange,
  onMonetizationUnlock,
  onLeadCaptureSubmit,
  onLogoUpload,
  onLogoRemove,
  onPasswordChange,
  onVisibilityChange,
  canPasswordProtect = true,
  canVideoEmbeds = true,
  canAnalytics = true,
  canCustomBranding = true,
  canReaderMonetization = true,
  canLeadCapture = true,
  subscriberAccessCode = '',
  stripeConfigured = false,
  onStripeConnect,
  onUpgradeRequest,
}: FlipbookViewerProps) {
  const bookRef = useRef<HTMLFlipBookRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showLeadCapture, setShowLeadCapture] = useState(false)
  const [leadCaptureDismissed, setLeadCaptureDismissed] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showVideoEditor, setShowVideoEditor] = useState(false)
  const [showPublisherPanel, setShowPublisherPanel] = useState(false)
  const [showTocSidebar, setShowTocSidebar] = useState(false)
  const [showPositionPreview, setShowPositionPreview] = useState(false)
  const [positionPageIndex, setPositionPageIndex] = useState(0)
  const [inlinePositionMode, setInlinePositionMode] = useState(false)
  const [selectedEmbedId, setSelectedEmbedId] = useState<string | null>(null)
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [openPopUpPanel, setOpenPopUpPanel] = useState<PopUpPanel | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showSocialShareDialog, setShowSocialShareDialog] = useState(false)
  const [pendingPassword, setPendingPassword] = useState<string | undefined>()
  const wasPublishing = useRef(false)
  const initialPageApplied = useRef(false)
  const { play, unlock } = usePageTurnSound(soundEnabled)
  const isShared = mode === 'shared'
  const isEmbed = mode === 'embed'
  const normalizedLeadCapture = normalizeLeadCapture(leadCapture)
  const leadCaptureActive =
    (isShared || isEmbed) &&
    normalizedLeadCapture.enabled &&
    !leadCaptureUnlocked &&
    !leadCaptureDismissed
  const paywallActive =
    (isShared || isEmbed) && monetization.enabled && !monetizationUnlocked
  let previewLimit = images.length
  if (leadCaptureActive) {
    previewLimit = Math.min(previewLimit, Math.max(1, normalizedLeadCapture.previewPageCount))
  }
  if (paywallActive) {
    previewLimit = Math.min(previewLimit, Math.max(1, monetization.previewPageCount))
  }
  const gateActive = leadCaptureActive || paywallActive
  const visibleImages = gateActive ? images.slice(0, previewLimit) : images
  const searchablePageTexts = gateActive ? pageTexts.slice(0, previewLimit) : pageTexts
  const totalPages = visibleImages.length
  const [sessionPageTexts, setSessionPageTexts] = useState<string[]>(searchablePageTexts)

  useEffect(() => {
    setSessionPageTexts(gateActive ? pageTexts.slice(0, previewLimit) : pageTexts)
  }, [gateActive, pageTexts, previewLimit])

  const handlePageTextsChange = useCallback(
    (texts: string[]) => {
      setSessionPageTexts(texts)
      onPageTextsChange?.(texts)
    },
    [onPageTextsChange],
  )
  const isCoverOrBack =
    spreadView && totalPages > 0 && (currentPage === 1 || currentPage === totalPages)
  const usePortraitLayout = !spreadView || isCoverOrBack
  const { width, height } = useFlipbookDimensions(
    aspectRatio,
    mode,
    spreadView,
    usePortraitLayout,
  )
  const bookWidth = usePortraitLayout ? width : width * 2
  const {
    zoom,
    minZoom,
    maxZoom,
    isZoomed,
    setZoomLevel,
    resetZoom,
    resetPan,
    viewportStyle,
    viewportHandlers,
  } = useFlipbookZoom(bookWidth, height)
  const layoutMode = !spreadView ? 'single' : isCoverOrBack ? 'cover' : 'spread'
  const bookKey = `${layoutMode}-${width}-${height}-${totalPages}`
  const { trackPageView, trackLinkClick, trackVideoPlay, trackPaywallImpression, trackPaywallClick, trackLeadCaptureImpression, trackLeadCaptureSubmit } =
    useFlipbookAnalytics(flipbookId, mode)

  const openPaywall = useCallback(() => {
    setShowPaywall(true)
    trackPaywallImpression()
  }, [trackPaywallImpression])

  const openLeadCapture = useCallback(() => {
    setShowLeadCapture(true)
    trackLeadCaptureImpression()
  }, [trackLeadCaptureImpression])

  const displayName = displayTitle({ fileName, publication })
  const hasContents = tableOfContents.length > 0

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const flip = bookRef.current?.pageFlip()
      if (!flip) return
      const target = currentPage - 1
      if (flip.getCurrentPageIndex() !== target) {
        flip.flip(target)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [bookKey])

  useEffect(() => {
    if (shareUrl) {
      setShowShareDialog(true)
    }
  }, [shareUrl])

  useEffect(() => {
    if (wasPublishing.current && !isPublishing && shareUrl) {
      setShowShareDialog(true)
    }
    wasPublishing.current = isPublishing
  }, [isPublishing, shareUrl])

  const handleFlip = useCallback(
    (e: { data: number }) => {
      const nextPage = e.data + 1
      if (gateActive && nextPage > previewLimit) {
        if (leadCaptureActive) {
          openLeadCapture()
        } else {
          openPaywall()
        }
        window.setTimeout(() => {
          bookRef.current?.pageFlip().flip(previewLimit - 1)
        }, 0)
        setCurrentPage(previewLimit)
        return
      }

      setCurrentPage(nextPage)
      resetPan()
      trackPageView(e.data)
      if (!inlinePositionMode) {
        play()
      }
    },
    [gateActive, inlinePositionMode, leadCaptureActive, openLeadCapture, openPaywall, play, previewLimit, resetPan, trackPageView],
  )

  const flipNext = useCallback(() => {
    if (gateActive && currentPage >= previewLimit) {
      if (leadCaptureActive) {
        openLeadCapture()
      } else {
        openPaywall()
      }
      return
    }
    unlock()
    bookRef.current?.pageFlip().flipNext()
  }, [currentPage, gateActive, leadCaptureActive, openLeadCapture, openPaywall, previewLimit, unlock])

  const flipPrev = useCallback(() => {
    unlock()
    bookRef.current?.pageFlip().flipPrev()
  }, [unlock])

  const goToPage = useCallback(
    (pageIndex: number) => {
      if (gateActive && pageIndex + 1 > previewLimit) {
        if (leadCaptureActive) {
          openLeadCapture()
        } else {
          openPaywall()
        }
        return
      }
      unlock()
      bookRef.current?.pageFlip().flip(pageIndex)
      setCurrentPage(pageIndex + 1)
      resetPan()
      trackPageView(pageIndex)
    },
    [gateActive, leadCaptureActive, openLeadCapture, openPaywall, previewLimit, resetPan, trackPageView, unlock],
  )

  useEffect(() => {
    if (!initialPage || initialPageApplied.current || visibleImages.length === 0) return
    const page = Math.min(Math.max(1, initialPage), totalPages)
    initialPageApplied.current = true
    const timer = window.setTimeout(() => {
      goToPage(page - 1)
    }, 100)
    return () => window.clearTimeout(timer)
  }, [goToPage, initialPage, totalPages, visibleImages.length])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void el.requestFullscreen()
    }
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }
      if (
        showPositionPreview ||
        showVideoEditor ||
        showShareDialog ||
        showSocialShareDialog ||
        showSearch ||
        showLeadCapture ||
        showPaywall ||
        showPublisherPanel ||
        showTocSidebar ||
        openPopUpPanel
      ) {
        if (e.key === 'Escape' && openPopUpPanel) {
          setOpenPopUpPanel(null)
        }
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        flipNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        flipPrev()
      } else if (e.key === 'Escape' && inlinePositionMode) {
        setInlinePositionMode(false)
        setSelectedEmbedId(null)
        setSelectedLinkId(null)
        setSelectedPanelId(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    flipNext,
    flipPrev,
    inlinePositionMode,
    openPopUpPanel,
    showPositionPreview,
    showVideoEditor,
    showShareDialog,
    showSocialShareDialog,
    showSearch,
    showLeadCapture,
    showPaywall,
    showPublisherPanel,
    showTocSidebar,
  ])

  const handleAddVideo = useCallback(
    (embed: VideoEmbed) => {
      onVideoEmbedsChange?.([...videoEmbeds, embed])
    },
    [onVideoEmbedsChange, videoEmbeds],
  )

  const handleRemoveVideo = useCallback(
    (id: string) => {
      onVideoEmbedsChange?.(videoEmbeds.filter((embed) => embed.id !== id))
    },
    [onVideoEmbedsChange, videoEmbeds],
  )

  const handleUpdateEmbed = useCallback(
    (updated: VideoEmbed) => {
      onVideoEmbedsChange?.(
        videoEmbeds.map((embed) => (embed.id === updated.id ? updated : embed)),
      )
    },
    [onVideoEmbedsChange, videoEmbeds],
  )

  const handleUpdateLink = useCallback(
    (updated: LinkHotspot) => {
      onLinkHotspotsChange?.(
        linkHotspots.map((hotspot) => (hotspot.id === updated.id ? updated : hotspot)),
      )
    },
    [onLinkHotspotsChange, linkHotspots],
  )

  const handleUpdatePanel = useCallback(
    (updated: PopUpPanel) => {
      onPopUpPanelsChange?.(
        popUpPanels.map((panel) => (panel.id === updated.id ? updated : panel)),
      )
    },
    [onPopUpPanelsChange, popUpPanels],
  )

  const enterPanelAdjustMode = useCallback(
    (panel: PopUpPanel) => {
      setShowPublisherPanel(false)
      setInlinePositionMode(true)
      setSelectedPanelId(panel.id)
      resetZoom()
      goToPage(panel.pageIndex)
    },
    [goToPage, resetZoom],
  )

  const handleShareClick = useCallback(() => {
    onShare?.(pendingPassword)
  }, [onShare, pendingPassword])

  const handlePasswordChange = useCallback(
    (password: string, enabled: boolean) => {
      setPendingPassword(enabled ? password : undefined)
      onPasswordChange?.(password, enabled)
    },
    [onPasswordChange],
  )

  const togglePositionMode = useCallback(() => {
    setInlinePositionMode((active) => {
      if (active) {
        setSelectedEmbedId(null)
        setSelectedLinkId(null)
        setSelectedPanelId(null)
      } else {
        resetZoom()
      }
      return !active
    })
  }, [resetZoom])

  const enterVideoAdjustMode = useCallback(
    (embed: VideoEmbed) => {
      setShowVideoEditor(false)
      setInlinePositionMode(true)
      setSelectedEmbedId(embed.id)
      resetZoom()
      goToPage(embed.pageIndex)
    },
    [goToPage, resetZoom],
  )

  const pages = useMemo(
    () =>
      visibleImages.map((src, index) => (
        <FlipbookPage
          key={index}
          src={src}
          pageNumber={index + 1}
          pageIndex={index}
          spreadSpine={spreadSpineForPage(index, totalPages, spreadView)}
          videoEmbeds={videoEmbeds}
          linkHotspots={linkHotspots}
          popUpPanels={popUpPanels}
          popUpPanelStyle={popUpPanelStyle}
          branding={branding}
          interactiveVideos={!inlinePositionMode}
          editableVideos={inlinePositionMode}
          editableLinks={inlinePositionMode}
          editablePanels={inlinePositionMode}
          selectedEmbedId={selectedEmbedId}
          selectedLinkId={selectedLinkId}
          selectedPanelId={selectedPanelId}
          onSelectEmbed={setSelectedEmbedId}
          onSelectLink={setSelectedLinkId}
          onSelectPanel={setSelectedPanelId}
          onUpdateEmbed={handleUpdateEmbed}
          onUpdateLink={handleUpdateLink}
          onUpdatePanel={handleUpdatePanel}
          onLinkClick={trackLinkClick}
          onPanelOpen={setOpenPopUpPanel}
          onVideoPlay={trackVideoPlay}
        />
      )),
    [
      visibleImages,
      totalPages,
      spreadView,
      videoEmbeds,
      linkHotspots,
      popUpPanels,
      popUpPanelStyle,
      branding,
      inlinePositionMode,
      selectedEmbedId,
      selectedLinkId,
      selectedPanelId,
      handleUpdateEmbed,
      handleUpdateLink,
      handleUpdatePanel,
      trackLinkClick,
      trackVideoPlay,
    ],
  )

  return (
    <>
      <div
        ref={containerRef}
        className={[
          'branded-scope flex flex-col items-center justify-center',
          isEmbed ? 'h-full gap-3 bg-apple-bg p-2' : isShared ? 'min-h-screen gap-8 bg-apple-bg px-4 py-8' : 'min-h-full gap-8 px-4 py-4',
        ].join(' ')}
        style={brandingScopeStyle(branding)}
      >
        {!isShared && !isEmbed && !hideChrome && (
          <PublicationHeader
            fileName={fileName}
            publication={publication}
            editable={mode === 'editor'}
            onTitleChange={
              mode === 'editor' && onPublicationChange
                ? (title) => onPublicationChange({ ...publication, title })
                : undefined
            }
          />
        )}

        {isShared && !hideChrome && (
          <PublicationHeader fileName={fileName} publication={publication} compact />
        )}

        {inlinePositionMode && mode === 'editor' && (
          <div className="flex w-full max-w-xl items-center justify-between rounded-full border border-apple-blue/20 bg-apple-blue/8 px-5 py-2.5 text-sm text-apple-blue">
            <span>Drag to move · pull the corner handle to resize</span>
            <button
              type="button"
              onClick={() => {
                setInlinePositionMode(false)
                setSelectedEmbedId(null)
                setSelectedLinkId(null)
              }}
              className="font-medium hover:underline"
            >
              Done
            </button>
          </div>
        )}

        <div
          className={[
            'flipbook-zoom-viewport',
            isZoomed ? 'flipbook-zoom-viewport--active' : '',
          ].join(' ')}
          style={{ width: bookWidth, height }}
          {...viewportHandlers}
        >
          <div className="flipbook-zoom-layer" style={viewportStyle}>
            <div
              className={[
                'apple-flipbook-frame relative overflow-hidden',
                spreadView && !usePortraitLayout ? 'apple-flipbook-frame--spread' : '',
                inlinePositionMode ? 'ring-2 ring-apple-blue/30' : '',
              ].join(' ')}
              style={{ width: bookWidth, height }}
            >
              <HTMLFlipBook
                key={bookKey}
                ref={bookRef}
                className="flipbook"
                style={{ width: bookWidth, height }}
                width={width}
                height={height}
                size="fixed"
                minWidth={240}
                maxWidth={1400}
                minHeight={320}
                maxHeight={1400}
                drawShadow
                flippingTime={800}
                usePortrait={usePortraitLayout}
                startZIndex={0}
                autoSize={false}
                maxShadowOpacity={0.5}
                showCover={spreadView && !isCoverOrBack}
                mobileScrollSupport={!isZoomed}
                swipeDistance={isZoomed ? 9999 : 30}
                clickEventForward={!inlinePositionMode && !isZoomed}
                useMouseEvents={!inlinePositionMode && !isZoomed}
                onFlip={handleFlip}
              >
                {pages}
              </HTMLFlipBook>
            </div>
          </div>
        </div>

        {!hideChrome && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <p className="text-sm text-apple-muted">
              Drag corners to flip · Arrow keys to navigate
              {isZoomed && ' · Drag to pan'}
              {mode === 'editor' && inlinePositionMode && ' · Esc to exit position mode'}
              {gateActive && ' · Preview mode'}
              {videoEmbeds.length > 0 && !inlinePositionMode && ' · Tap videos to play'}
              {linkHotspots.length > 0 && !inlinePositionMode && ' · Tap links to open'}
              {popUpPanels.length > 0 && !inlinePositionMode && ' · Tap + buttons for footnotes & specs'}
            </p>
            {onSpreadViewChange && (
              <div
                className="inline-flex rounded-full border border-apple-border-light bg-apple-gray p-0.5"
                role="group"
                aria-label="Page layout"
              >
                <button
                  type="button"
                  onClick={() => onSpreadViewChange(false)}
                  aria-pressed={!spreadView}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    !spreadView
                      ? 'bg-white text-apple-text shadow-sm'
                      : 'text-apple-muted hover:text-apple-text',
                  ].join(' ')}
                >
                  Page
                </button>
                <button
                  type="button"
                  onClick={() => onSpreadViewChange(true)}
                  aria-pressed={spreadView}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    spreadView
                      ? 'bg-white text-apple-text shadow-sm'
                      : 'text-apple-muted hover:text-apple-text',
                  ].join(' ')}
                >
                  Spread
                </button>
              </div>
            )}
          </div>
        )}

        {!hideChrome && !inlinePositionMode && (
          <FlipbookZoomControls
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            onZoomChange={setZoomLevel}
            onReset={resetZoom}
            compact={isEmbed}
          />
        )}

        {!hideChrome && (
          <FlipbookControls
            currentPage={currentPage}
            totalPages={totalPages}
            soundEnabled={soundEnabled}
            mode={mode}
            isPublishing={isPublishing}
            positionMode={inlinePositionMode}
            hasContents={hasContents}
            onPrev={flipPrev}
            onNext={flipNext}
            onGoToPage={goToPage}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onUploadNew={onUploadNew}
            onFullscreen={mode === 'editor' ? toggleFullscreen : undefined}
            onAddVideo={
              mode === 'editor'
                ? () => {
                    if (!canVideoEmbeds) {
                      onUpgradeRequest?.('videoEmbeds', 'Video embeds')
                      return
                    }
                    setShowVideoEditor(true)
                  }
                : undefined
            }
            onTogglePositionMode={mode === 'editor' ? togglePositionMode : undefined}
            onOpenPositionPreview={
              mode === 'editor'
                ? () => {
                    setPositionPageIndex(currentPage - 1)
                    setShowPositionPreview(true)
                  }
                : undefined
            }
            onOpenPublisher={mode === 'editor' ? () => setShowPublisherPanel(true) : undefined}
            onOpenContents={
              hasContents ? () => setShowTocSidebar(true) : undefined
            }
            onOpenSearch={visibleImages.length > 0 ? () => setShowSearch(true) : undefined}
            onShare={mode === 'editor' ? handleShareClick : undefined}
            onOpenSocialShare={
              flipbookId ? () => setShowSocialShareDialog(true) : undefined
            }
          />
        )}

        {isShared && !hideChrome && !branding.hidePlatformChrome && !isCustomDomain && (
          <a href="/" className="apple-link text-sm">
            Create your own mag ›
          </a>
        )}

        {isEmbed && !hideChrome && !branding.hidePlatformChrome && (
          <a
            href={flipbookId ? `/view/${flipbookId}` : '/'}
            target="_blank"
            rel="noopener noreferrer"
            className="apple-link text-xs"
          >
            Open {displayName} ›
          </a>
        )}
      </div>

      {showVideoEditor && mode === 'editor' && (
        <VideoEmbedEditor
          currentPage={currentPage}
          totalPages={totalPages}
          videoEmbeds={videoEmbeds}
          onAdd={handleAddVideo}
          onRemove={handleRemoveVideo}
          onAdjust={enterVideoAdjustMode}
          onClose={() => setShowVideoEditor(false)}
        />
      )}

      {showPublisherPanel && mode === 'editor' && onPublicationChange && onTableOfContentsChange && onLinkHotspotsChange && onPopUpPanelsChange && onPopUpPanelStyleChange && onSpreadViewChange && onBrandingChange && (
        <PublisherPanel
          fileName={fileName}
          totalPages={images.length}
          pageTexts={pageTexts}
          publication={publication}
          tableOfContents={tableOfContents}
          linkHotspots={linkHotspots}
          popUpPanels={popUpPanels}
          popUpPanelStyle={popUpPanelStyle}
          spreadView={spreadView}
          monetization={monetization}
          leadCapture={normalizedLeadCapture}
          hasSubscriberAccess={hasSubscriberAccess}
          subscriberAccessCode={subscriberAccessCode}
          onPublicationChange={onPublicationChange}
          onTableOfContentsChange={onTableOfContentsChange}
          onLinkHotspotsChange={onLinkHotspotsChange}
          onPopUpPanelsChange={onPopUpPanelsChange}
          onPopUpPanelStyleChange={onPopUpPanelStyleChange}
          onPanelPosition={enterPanelAdjustMode}
          onSpreadViewChange={onSpreadViewChange}
          onMonetizationChange={onMonetizationChange}
          onLeadCaptureChange={onLeadCaptureChange}
          onSubscriberAccessCodeChange={onSubscriberAccessCodeChange}
          onImportOutline={() => onImportOutline?.()}
          onClose={() => setShowPublisherPanel(false)}
          flipbookId={flipbookId}
          branding={branding}
          onBrandingChange={onBrandingChange}
          onLogoUpload={onLogoUpload}
          onLogoRemove={onLogoRemove}
          canCustomBranding={canCustomBranding}
          canAnalytics={canAnalytics}
          canReaderMonetization={canReaderMonetization}
          canLeadCapture={canLeadCapture}
          stripeConfigured={stripeConfigured}
          onStripeConnect={onStripeConnect}
        />
      )}

      {showTocSidebar && hasContents && (
        <TocSidebar
          entries={tableOfContents}
          currentPage={currentPage}
          onGoToPage={goToPage}
          onClose={() => setShowTocSidebar(false)}
        />
      )}

      {showPositionPreview && mode === 'editor' && (
        <VideoPositionEditor
          pageImage={images[positionPageIndex] ?? images[0]}
          pageIndex={positionPageIndex}
          totalPages={totalPages}
          videoEmbeds={videoEmbeds}
          onPageChange={setPositionPageIndex}
          onUpdateEmbed={handleUpdateEmbed}
          onClose={() => setShowPositionPreview(false)}
        />
      )}

      {showShareDialog && shareUrl && flipbookId && (
        <ShareDialog
          shareUrl={shareUrl}
          flipbookId={flipbookId}
          fileName={fileName}
          publication={publication}
          branding={branding}
          visibility={visibility}
          isPasswordProtected={isPasswordProtected}
          canPasswordProtect={canPasswordProtect}
          onUpgradeRequest={onUpgradeRequest}
          onClose={() => setShowShareDialog(false)}
          onPasswordChange={handlePasswordChange}
          onVisibilityChange={onVisibilityChange ?? (() => {})}
        />
      )}

      {showSocialShareDialog && flipbookId && (
        <SocialShareDialog
          flipbookId={flipbookId}
          fileName={fileName}
          publication={publication}
          branding={branding}
          pageIndex={currentPage - 1}
          pageImage={visibleImages[currentPage - 1] ?? visibleImages[0]}
          onClose={() => setShowSocialShareDialog(false)}
        />
      )}

      {openPopUpPanel && (
        <PopUpPanelModal
          panel={openPopUpPanel}
          popUpPanelStyle={popUpPanelStyle}
          branding={branding}
          onClose={() => setOpenPopUpPanel(null)}
        />
      )}

      {showSearch && visibleImages.length > 0 && (
        <FlipbookSearchPanel
          pageTexts={sessionPageTexts}
          pageImages={visibleImages}
          currentPage={currentPage}
          onGoToPage={goToPage}
          onPageTextsChange={handlePageTextsChange}
          onClose={() => setShowSearch(false)}
        />
      )}

      {paywallActive && onMonetizationUnlock && (
        <ReaderPaywall
          open={showPaywall}
          fileName={fileName}
          publication={publication}
          monetization={monetization}
          hasSubscriberAccess={hasSubscriberAccess}
          onClose={() => setShowPaywall(false)}
          onCheckoutClick={() => {
            trackPaywallClick()
            setShowPaywall(false)
          }}
          onStripeCheckout={
            flipbookId
              ? async () => {
                  trackPaywallClick()
                  const url = await createStripeCheckout(
                    flipbookId,
                    mode === 'embed' ? 'embed' : 'view',
                  )
                  window.location.href = url
                }
              : undefined
          }
          onUnlock={async (accessCode) => {
            await onMonetizationUnlock(accessCode)
            setShowPaywall(false)
          }}
        />
      )}

      {leadCaptureActive && onLeadCaptureSubmit && (
        <LeadCaptureGate
          open={showLeadCapture}
          fileName={fileName}
          publication={publication}
          leadCapture={normalizedLeadCapture}
          onClose={() => {
            setShowLeadCapture(false)
            if (!normalizedLeadCapture.mandatory) {
              setLeadCaptureDismissed(true)
            }
          }}
          onSubmit={async (email, consent) => {
            await onLeadCaptureSubmit(email, consent)
            trackLeadCaptureSubmit()
            setShowLeadCapture(false)
          }}
        />
      )}
    </>
  )
}
