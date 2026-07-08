import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AnalyticsSummary } from '../../shared/analytics'
import type { BrandingConfig, CapturedLead, LeadCaptureConfig, LinkHotspot, MonetizationConfig, PopUpPanel, PopUpPanelKind, PopUpPanelModalSize, PopUpPanelStyle, PopUpPanelTheme, PopUpPanelTriggerShape, PublicationInfo, TocEntry } from '../../shared/flipbook'
import {
  POP_UP_PANEL_KIND_DEFAULTS,
  POP_UP_PANEL_KIND_LABELS,
  POP_UP_PANEL_KIND_STYLE_DEFAULTS,
  POP_UP_PANEL_THEME_LABELS,
} from '../../shared/flipbook'
import { fetchCapturedLeads, fetchFlipbookAnalytics } from '../lib/api'
import { analyzePublication } from '../lib/aiApi'
import { getDnsTarget, resolveLogoUrl } from '../lib/branding'
import { createLinkHotspot } from '../lib/linkHotspotUtils'
import { createPopUpPanel } from '../lib/popUpPanelUtils'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { AiSuggestionsTab } from './AiSuggestionsTab'

type Tab = 'ai' | 'details' | 'contents' | 'links' | 'panels' | 'branding' | 'monetize' | 'leads' | 'analytics'

interface PublisherPanelProps {
  fileName: string
  totalPages: number
  pageTexts?: string[]
  publication: PublicationInfo
  tableOfContents: TocEntry[]
  linkHotspots: LinkHotspot[]
  popUpPanels: PopUpPanel[]
  popUpPanelStyle: PopUpPanelStyle
  spreadView: boolean
  branding: BrandingConfig
  monetization: MonetizationConfig
  leadCapture: LeadCaptureConfig
  hasSubscriberAccess?: boolean
  subscriberAccessCode?: string
  flipbookId?: string | null
  onPublicationChange: (publication: PublicationInfo) => void
  onTableOfContentsChange: (entries: TocEntry[]) => void
  onLinkHotspotsChange: (hotspots: LinkHotspot[]) => void
  onPopUpPanelsChange: (panels: PopUpPanel[]) => void
  onPopUpPanelStyleChange: (style: PopUpPanelStyle) => void
  onPanelPosition?: (panel: PopUpPanel) => void
  onSpreadViewChange: (spreadView: boolean) => void
  onBrandingChange: (branding: BrandingConfig) => void
  onMonetizationChange?: (monetization: MonetizationConfig) => void
  onLeadCaptureChange?: (leadCapture: LeadCaptureConfig) => void
  onSubscriberAccessCodeChange?: (code: string) => void
  onLogoUpload?: (file: File) => Promise<void>
  onLogoRemove?: () => Promise<void>
  onImportOutline: () => void
  onClose: () => void
  canCustomBranding?: boolean
  canAnalytics?: boolean
  canReaderMonetization?: boolean
  canLeadCapture?: boolean
  stripeConfigured?: boolean
  onStripeConnect?: () => Promise<void>
  onReplacePdf?: (file: File) => Promise<void>
  onRefreshPages?: () => Promise<void>
  pdfActionBusy?: boolean
}

export function PublisherPanel({
  fileName,
  totalPages,
  pageTexts = [],
  publication,
  tableOfContents,
  linkHotspots,
  popUpPanels,
  popUpPanelStyle,
  spreadView,
  branding,
  monetization,
  leadCapture,
  hasSubscriberAccess = false,
  subscriberAccessCode = '',
  flipbookId,
  onPublicationChange,
  onTableOfContentsChange,
  onLinkHotspotsChange,
  onPopUpPanelsChange,
  onPopUpPanelStyleChange,
  onPanelPosition,
  onSpreadViewChange,
  onBrandingChange,
  onMonetizationChange,
  onLeadCaptureChange,
  onSubscriberAccessCodeChange,
  onLogoUpload,
  onLogoRemove,
  onImportOutline,
  onClose,
  canCustomBranding = true,
  canAnalytics = true,
  canReaderMonetization = true,
  canLeadCapture = true,
  stripeConfigured = false,
  onStripeConnect,
  onReplacePdf,
  onRefreshPages,
  pdfActionBusy = false,
}: PublisherPanelProps) {
  const replacePdfInputRef = useRef<HTMLInputElement>(null)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [tab, setTab] = useState<Tab>('ai')
  const [descriptionGenerating, setDescriptionGenerating] = useState(false)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [linkPage, setLinkPage] = useState(0)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkError, setLinkError] = useState('')
  const [panelPage, setPanelPage] = useState(0)
  const [panelKind, setPanelKind] = useState<PopUpPanelKind>('footnote')
  const [panelTheme, setPanelTheme] = useState<PopUpPanelTheme>(
    POP_UP_PANEL_KIND_STYLE_DEFAULTS.footnote.theme!,
  )
  const [panelTriggerShape, setPanelTriggerShape] = useState<PopUpPanelTriggerShape>(
    POP_UP_PANEL_KIND_STYLE_DEFAULTS.footnote.triggerShape!,
  )
  const [panelModalSize, setPanelModalSize] = useState<PopUpPanelModalSize>(
    POP_UP_PANEL_KIND_STYLE_DEFAULTS.footnote.modalSize!,
  )
  const [panelTriggerLabel, setPanelTriggerLabel] = useState('')
  const [panelTitle, setPanelTitle] = useState('')
  const [panelBody, setPanelBody] = useState('')
  const [panelError, setPanelError] = useState('')
  const [newTocTitle, setNewTocTitle] = useState('')
  const [newTocPage, setNewTocPage] = useState(0)
  const [logoUploading, setLogoUploading] = useState(false)
  const [domainError, setDomainError] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [capturedLeads, setCapturedLeads] = useState<CapturedLead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const dnsTarget = getDnsTarget()

  function updatePublication(patch: Partial<PublicationInfo>) {
    onPublicationChange({ ...publication, ...patch })
  }

  async function generateDescription() {
    setDescriptionError(null)
    setDescriptionGenerating(true)
    try {
      const pages = pageTexts
        .map((text, pageIndex) => ({ pageIndex, text: text.trim() }))
        .filter((page) => page.text.length > 0)

      const result = await analyzePublication({
        fileName,
        pages,
        existingTocCount: tableOfContents.length,
        publicationContext: {
          title: publication.title,
          publisherName: publication.publisherName,
          issueLabel: publication.issueLabel,
        },
        focus: 'description',
      })

      const description = result.publication.description?.trim()
      if (!description) {
        setDescriptionError(
          'No description could be generated. Add a title or try a PDF with more extractable text.',
        )
        return
      }

      updatePublication({ description })
    } catch (err: unknown) {
      setDescriptionError(err instanceof Error ? err.message : 'Could not generate description')
    } finally {
      setDescriptionGenerating(false)
    }
  }

  function addTocEntry() {
    const title = newTocTitle.trim()
    if (!title) return
    onTableOfContentsChange([
      ...tableOfContents,
      { id: crypto.randomUUID(), title, pageIndex: newTocPage },
    ])
    setNewTocTitle('')
  }

  function addLink() {
    const hotspot = createLinkHotspot(linkPage, linkUrl, linkLabel)
    if (!hotspot) {
      setLinkError('Enter a valid URL')
      return
    }
    setLinkError('')
    onLinkHotspotsChange([...linkHotspots, hotspot])
    setLinkUrl('')
    setLinkLabel('')
  }

  function addPanel() {
    const panel = createPopUpPanel(
      panelPage,
      panelKind,
      panelTriggerLabel,
      panelTitle,
      panelBody,
      {
        theme: panelTheme,
        triggerShape: panelTriggerShape,
        modalSize: panelModalSize,
      },
    )
    if (!panel) {
      setPanelError('Enter panel content')
      return
    }
    setPanelError('')
    onPopUpPanelsChange([...popUpPanels, panel])
    setPanelBody('')
    onPanelPosition?.(panel)
  }

  function updatePanelKind(kind: PopUpPanelKind) {
    setPanelKind(kind)
    const defaults = POP_UP_PANEL_KIND_DEFAULTS[kind]
    const styleDefaults = POP_UP_PANEL_KIND_STYLE_DEFAULTS[kind]
    setPanelTriggerLabel(defaults.triggerLabel)
    setPanelTitle(defaults.title)
    if (styleDefaults.theme) setPanelTheme(styleDefaults.theme)
    if (styleDefaults.triggerShape) setPanelTriggerShape(styleDefaults.triggerShape)
    if (styleDefaults.modalSize) setPanelModalSize(styleDefaults.modalSize)
  }

  function updatePopUpPanelStyle(patch: Partial<PopUpPanelStyle>) {
    onPopUpPanelStyleChange({ ...popUpPanelStyle, ...patch })
  }

  const themeSwatches: Record<PopUpPanelTheme, string> = {
    brand: branding.accentColor || '#0071e3',
    violet: '#7c3aed',
    slate: '#475569',
    amber: '#d97706',
    emerald: '#059669',
  }

  function updateBranding(patch: Partial<BrandingConfig>) {
    onBrandingChange({ ...branding, ...patch })
  }

  async function handleLogoSelect(file: File | undefined) {
    if (!file || !onLogoUpload) return
    setLogoUploading(true)
    try {
      await onLogoUpload(file)
    } finally {
      setLogoUploading(false)
    }
  }

  function updateMonetization(patch: Partial<MonetizationConfig>) {
    onMonetizationChange?.({ ...monetization, ...patch })
  }

  function updateLeadCapture(patch: Partial<LeadCaptureConfig>) {
    onLeadCaptureChange?.({ ...leadCapture, ...patch })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ai', label: 'AI' },
    { id: 'details', label: 'Details' },
    { id: 'contents', label: 'Contents' },
    { id: 'links', label: 'Links' },
    { id: 'panels', label: 'Panels' },
    { id: 'monetize', label: 'Monetize' },
    { id: 'leads', label: 'Leads' },
    { id: 'branding', label: 'Branding' },
    { id: 'analytics', label: 'Analytics' },
  ]

  useEffect(() => {
    if (tab !== 'analytics' || !flipbookId) return

    let cancelled = false
    setAnalyticsLoading(true)
    setAnalyticsError(null)

    void fetchFlipbookAnalytics(flipbookId)
      .then((summary) => {
        if (!cancelled) setAnalytics(summary)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAnalyticsError(error instanceof Error ? error.message : 'Failed to load analytics')
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [flipbookId, tab])

  useEffect(() => {
    if (tab !== 'leads' || !flipbookId) return

    let cancelled = false
    setLeadsLoading(true)
    setLeadsError(null)

    void fetchCapturedLeads(flipbookId)
      .then((data) => {
        if (!cancelled) setCapturedLeads(data.leads)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLeadsError(error instanceof Error ? error.message : 'Failed to load leads')
        }
      })
      .finally(() => {
        if (!cancelled) setLeadsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [flipbookId, tab])

  const logoPreview = flipbookId ? resolveLogoUrl(flipbookId, branding) : branding.logoUrl

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="apple-modal flex max-h-[90vh] w-full max-w-lg flex-col">
        <div className="flex items-start justify-between border-b border-apple-border-light px-6 py-5">
          <div>
            <h3 className="text-[1.375rem] font-semibold tracking-tight text-apple-text">Publisher settings</h3>
            <p className="mt-1 text-[1.0625rem] text-apple-muted">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-apple-muted hover:bg-apple-gray"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 border-b border-apple-border-light px-6 pt-3">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'rounded-t-lg px-3 py-2 text-sm font-medium transition',
                tab === item.id
                  ? 'bg-apple-gray text-apple-text'
                  : 'text-apple-muted hover:text-apple-text',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {tab === 'ai' && (
            <AiSuggestionsTab
              fileName={fileName}
              pageTexts={pageTexts}
              publication={publication}
              tableOfContents={tableOfContents}
              onPublicationChange={onPublicationChange}
              onTableOfContentsChange={onTableOfContentsChange}
            />
          )}

          {tab === 'details' && (
            <>
              {(onReplacePdf || onRefreshPages) && (
                <div className="rounded-xl border border-apple-border-light bg-apple-gray/40 px-4 py-4">
                  <p className="text-sm font-medium text-apple-text">Source PDF</p>
                  <p className="mt-1 text-sm text-apple-muted">
                    {fileName} · {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onReplacePdf && (
                      <>
                        <input
                          ref={replacePdfInputRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (file) void onReplacePdf(file)
                          }}
                        />
                        <button
                          type="button"
                          disabled={pdfActionBusy}
                          onClick={() => replacePdfInputRef.current?.click()}
                          className="apple-btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Replace PDF
                        </button>
                      </>
                    )}
                    {onRefreshPages && (
                      <button
                        type="button"
                        disabled={pdfActionBusy}
                        onClick={() => void onRefreshPages()}
                        className="apple-btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Refresh pages
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-apple-muted">
                    {flipbookId
                      ? 'Replacing the PDF keeps your share link. Review hotspots and videos if the page count changes.'
                      : 'Refresh pages re-renders from your current PDF — useful after viewer updates.'}
                  </p>
                </div>
              )}
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">Content guidelines</p>
                <p className="mt-1 leading-relaxed text-amber-900/90">
                  Only publish material you have the right to share. We may remove flipbooks that violate
                  our{' '}
                  <Link to="/guidelines" className="apple-link">
                    content guidelines
                  </Link>
                  , including explicit or illegal content.
                </p>
              </div>
              <div>
                <label htmlFor="pub-title" className="mb-2 block text-sm text-apple-muted">
                  Title
                </label>
                <input
                  id="pub-title"
                  value={publication.title}
                  onChange={(e) => updatePublication({ title: e.target.value })}
                  placeholder={fileName.replace(/\.pdf$/i, '')}
                  className="apple-input"
                />
              </div>
              <div>
                <label htmlFor="pub-publisher" className="mb-2 block text-sm text-apple-muted">
                  Publisher
                </label>
                <input
                  id="pub-publisher"
                  value={publication.publisherName}
                  onChange={(e) => updatePublication({ publisherName: e.target.value })}
                  placeholder="Magazine or company name"
                  className="apple-input"
                />
              </div>
              <div>
                <label htmlFor="pub-issue" className="mb-2 block text-sm text-apple-muted">
                  Issue / volume
                </label>
                <input
                  id="pub-issue"
                  value={publication.issueLabel}
                  onChange={(e) => updatePublication({ issueLabel: e.target.value })}
                  placeholder="Vol. 12 · Spring 2026"
                  className="apple-input"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="pub-description" className="block text-sm text-apple-muted">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => void generateDescription()}
                    disabled={descriptionGenerating}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                  >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
                        />
                      </svg>
                      {descriptionGenerating ? 'Generating…' : 'Generate with AI'}
                    </button>
                </div>
                <textarea
                  id="pub-description"
                  value={publication.description}
                  onChange={(e) => updatePublication({ description: e.target.value })}
                  placeholder="Short summary for search engines and social link previews"
                  rows={4}
                  maxLength={320}
                  className="apple-input resize-none"
                />
                <p className="mt-2 text-xs text-apple-muted">
                  Used when your flipbook is shared on Google, social media, and messaging apps.
                  {publication.description ? ` ${publication.description.length}/320 characters` : ''}
                </p>
                {descriptionError && (
                  <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{descriptionError}</p>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-apple-border-light px-4 py-3">
                <input
                  type="checkbox"
                  checked={spreadView}
                  onChange={(e) => onSpreadViewChange(e.target.checked)}
                  className="h-4 w-4 rounded border-apple-border text-apple-blue"
                />
                <div>
                  <p className="text-sm font-medium text-apple-text">Double-page spread</p>
                  <p className="text-xs text-apple-muted">Best for landscape magazines and catalogs</p>
                </div>
              </label>
            </>
          )}

          {tab === 'contents' && (
            <>
              <div className="flex gap-2">
                <button type="button" onClick={onImportOutline} className="apple-btn-secondary text-sm">
                  Import from PDF
                </button>
                {tableOfContents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onTableOfContentsChange([])}
                    className="apple-btn-ghost text-sm text-apple-muted"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {tableOfContents.length > 0 && (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-apple-border-light p-2">
                  {tableOfContents.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-apple-gray"
                    >
                      <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                      <span className="shrink-0 tabular-nums text-apple-muted">p.{entry.pageIndex + 1}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${entry.title}`}
                        onClick={() =>
                          onTableOfContentsChange(tableOfContents.filter((e) => e.id !== entry.id))
                        }
                        className="text-apple-muted hover:text-red-500"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3 rounded-xl border border-apple-border-light p-4">
                <p className="text-sm font-medium text-apple-text">Add entry</p>
                <input
                  value={newTocTitle}
                  onChange={(e) => setNewTocTitle(e.target.value)}
                  placeholder="Section title"
                  className="apple-input"
                />
                <select
                  value={newTocPage}
                  onChange={(e) => setNewTocPage(Number(e.target.value))}
                  className="apple-input"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i} value={i}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addTocEntry} className="apple-btn-secondary w-full">
                  Add to contents
                </button>
              </div>
            </>
          )}

          {tab === 'links' && (
            <>
              <p className="text-sm text-apple-muted">
                Add clickable link regions. Use Position mode on the flipbook to drag them into place.
              </p>

              {linkHotspots.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-apple-border-light p-2">
                  {linkHotspots.map((hotspot) => (
                    <li
                      key={hotspot.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-apple-gray"
                    >
                      <span className="min-w-0 flex-1 truncate">{hotspot.label}</span>
                      <span className="shrink-0 tabular-nums text-apple-muted">p.{hotspot.pageIndex + 1}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${hotspot.label}`}
                        onClick={() =>
                          onLinkHotspotsChange(linkHotspots.filter((h) => h.id !== hotspot.id))
                        }
                        className="text-apple-muted hover:text-red-500"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3 rounded-xl border border-apple-border-light p-4">
                <select
                  value={linkPage}
                  onChange={(e) => setLinkPage(Number(e.target.value))}
                  className="apple-input"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i} value={i}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="apple-input"
                />
                <input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Link label (optional)"
                  className="apple-input"
                />
                {linkError && <p className="text-sm text-red-500">{linkError}</p>}
                <button type="button" onClick={addLink} className="apple-btn-secondary w-full">
                  Add link
                </button>
              </div>
            </>
          )}

          {tab === 'panels' && (
            <>
              <p className="text-sm text-apple-muted">
                Add pop-up footnotes, specs, and citations readers can open without leaving the page.
                Use Move &amp; resize mode to position the trigger button.
              </p>

              <div className="space-y-4 rounded-xl border border-apple-border-light p-4">
                <div>
                  <p className="text-sm font-medium text-apple-text">Publication defaults</p>
                  <p className="mt-1 text-xs text-apple-muted">
                    Fallback style for panels without custom colors or shapes.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-apple-muted">Color theme</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(POP_UP_PANEL_THEME_LABELS) as PopUpPanelTheme[]).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => updatePopUpPanelStyle({ theme })}
                        className={[
                          'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                          popUpPanelStyle.theme === theme
                            ? 'border-apple-blue bg-apple-blue/8 text-apple-blue'
                            : 'border-apple-border-light text-apple-text hover:border-apple-blue/30',
                        ].join(' ')}
                      >
                        <span
                          className="h-3 w-3 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: themeSwatches[theme] }}
                        />
                        {POP_UP_PANEL_THEME_LABELS[theme]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="panel-default-shape" className="mb-2 block text-xs font-medium uppercase tracking-wide text-apple-muted">
                      Trigger shape
                    </label>
                    <select
                      id="panel-default-shape"
                      value={popUpPanelStyle.triggerShape}
                      onChange={(e) =>
                        updatePopUpPanelStyle({ triggerShape: e.target.value as PopUpPanelTriggerShape })
                      }
                      className="apple-input"
                    >
                      <option value="pill">Pill</option>
                      <option value="circle">Circle</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="panel-default-modal" className="mb-2 block text-xs font-medium uppercase tracking-wide text-apple-muted">
                      Modal width
                    </label>
                    <select
                      id="panel-default-modal"
                      value={popUpPanelStyle.modalSize}
                      onChange={(e) =>
                        updatePopUpPanelStyle({ modalSize: e.target.value as PopUpPanelModalSize })
                      }
                      className="apple-input"
                    >
                      <option value="narrow">Narrow</option>
                      <option value="standard">Standard</option>
                      <option value="wide">Wide</option>
                    </select>
                  </div>
                </div>
              </div>

              {popUpPanels.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-apple-border-light p-2">
                  {popUpPanels.map((panel) => (
                    <li
                      key={panel.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-apple-gray"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {panel.triggerLabel} · {panel.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-apple-muted">p.{panel.pageIndex + 1}</span>
                      {onPanelPosition && (
                        <button
                          type="button"
                          onClick={() => onPanelPosition(panel)}
                          className="shrink-0 text-apple-blue hover:underline"
                        >
                          Position
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${panel.title}`}
                        onClick={() =>
                          onPopUpPanelsChange(popUpPanels.filter((item) => item.id !== panel.id))
                        }
                        className="text-apple-muted hover:text-red-500"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3 rounded-xl border border-apple-border-light p-4">
                <select
                  value={panelPage}
                  onChange={(e) => setPanelPage(Number(e.target.value))}
                  className="apple-input"
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i} value={i}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  value={panelKind}
                  onChange={(e) => updatePanelKind(e.target.value as PopUpPanelKind)}
                  className="apple-input"
                >
                  {(Object.keys(POP_UP_PANEL_KIND_LABELS) as PopUpPanelKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {POP_UP_PANEL_KIND_LABELS[kind]}
                    </option>
                  ))}
                </select>
                <input
                  value={panelTriggerLabel}
                  onChange={(e) => setPanelTriggerLabel(e.target.value)}
                  placeholder="Trigger label (shown on page)"
                  className="apple-input"
                />
                <input
                  value={panelTitle}
                  onChange={(e) => setPanelTitle(e.target.value)}
                  placeholder="Panel title"
                  className="apple-input"
                />
                <textarea
                  value={panelBody}
                  onChange={(e) => setPanelBody(e.target.value)}
                  placeholder="Footnote, spec details, citation text…"
                  rows={4}
                  className="apple-input resize-none"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    value={panelTheme}
                    onChange={(e) => setPanelTheme(e.target.value as PopUpPanelTheme)}
                    className="apple-input"
                    aria-label="Panel color theme"
                  >
                    {(Object.keys(POP_UP_PANEL_THEME_LABELS) as PopUpPanelTheme[]).map((theme) => (
                      <option key={theme} value={theme}>
                        {POP_UP_PANEL_THEME_LABELS[theme]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={panelTriggerShape}
                    onChange={(e) => setPanelTriggerShape(e.target.value as PopUpPanelTriggerShape)}
                    className="apple-input"
                    aria-label="Trigger shape"
                  >
                    <option value="pill">Pill trigger</option>
                    <option value="circle">Circle trigger</option>
                  </select>
                  <select
                    value={panelModalSize}
                    onChange={(e) => setPanelModalSize(e.target.value as PopUpPanelModalSize)}
                    className="apple-input"
                    aria-label="Modal width"
                  >
                    <option value="narrow">Narrow modal</option>
                    <option value="standard">Standard modal</option>
                    <option value="wide">Wide modal</option>
                  </select>
                </div>
                {panelError && <p className="text-sm text-red-500">{panelError}</p>}
                <button type="button" onClick={addPanel} className="apple-btn-secondary w-full">
                  Add panel
                </button>
              </div>
            </>
          )}

          {tab === 'monetize' && (
            <>
              {!canReaderMonetization ? (
                <div className="rounded-xl border border-apple-border-light bg-apple-gray px-4 py-5 text-sm text-apple-muted">
                  Reader paywalls and preview pages are available on Pro and Publisher plans.{' '}
                  <Link to="/pricing" className="apple-link">
                    View plans
                  </Link>
                </div>
              ) : (
                <>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-apple-border-light px-4 py-3">
                    <input
                      type="checkbox"
                      checked={monetization.enabled}
                      onChange={(e) => updateMonetization({ enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-apple-border text-apple-blue"
                    />
                    <div>
                      <p className="text-sm font-medium text-apple-text">Enable reader paywall</p>
                      <p className="text-xs text-apple-muted">
                        Show a free preview, then prompt readers to subscribe or purchase
                      </p>
                    </div>
                  </label>

                  {monetization.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="preview-pages" className="mb-2 block text-sm text-apple-muted">
                          Free preview pages
                        </label>
                        <input
                          id="preview-pages"
                          type="range"
                          min={1}
                          max={Math.max(1, totalPages - 1)}
                          value={Math.min(monetization.previewPageCount, Math.max(1, totalPages - 1))}
                          onChange={(e) =>
                            updateMonetization({ previewPageCount: Number(e.target.value) })
                          }
                          className="flipbook-zoom-slider w-full"
                        />
                        <p className="mt-1 text-xs text-apple-muted">
                          Readers can flip through the first {monetization.previewPageCount} pages for free
                        </p>
                      </div>

                      <div>
                        <label htmlFor="paywall-headline" className="mb-2 block text-sm text-apple-muted">
                          Paywall headline
                        </label>
                        <input
                          id="paywall-headline"
                          value={monetization.headline}
                          onChange={(e) => updateMonetization({ headline: e.target.value })}
                          className="apple-input"
                        />
                      </div>

                      <div>
                        <label htmlFor="paywall-description" className="mb-2 block text-sm text-apple-muted">
                          Description
                        </label>
                        <textarea
                          id="paywall-description"
                          value={monetization.description}
                          onChange={(e) => updateMonetization({ description: e.target.value })}
                          rows={3}
                          className="apple-input resize-none"
                        />
                      </div>

                      <div className="rounded-xl border border-apple-border-light p-4">
                        <p className="mb-3 text-sm font-medium text-apple-text">Collect payments with</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => updateMonetization({ paymentMethod: 'stripe' })}
                            className={[
                              'rounded-xl border px-4 py-3 text-left transition',
                              monetization.paymentMethod === 'stripe'
                                ? 'border-apple-blue bg-apple-blue/8'
                                : 'border-apple-border-light hover:border-apple-blue/30',
                            ].join(' ')}
                          >
                            <p className="text-sm font-medium text-apple-text">Stripe</p>
                            <p className="mt-1 text-xs text-apple-muted">Built-in checkout</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMonetization({ paymentMethod: 'link' })}
                            className={[
                              'rounded-xl border px-4 py-3 text-left transition',
                              monetization.paymentMethod === 'link'
                                ? 'border-apple-blue bg-apple-blue/8'
                                : 'border-apple-border-light hover:border-apple-blue/30',
                            ].join(' ')}
                          >
                            <p className="text-sm font-medium text-apple-text">External link</p>
                            <p className="mt-1 text-xs text-apple-muted">Substack, Shopify, etc.</p>
                          </button>
                        </div>
                      </div>

                      {monetization.paymentMethod === 'stripe' ? (
                        <div className="space-y-4 rounded-xl border border-apple-border-light p-4">
                          {!stripeConfigured ? (
                            <p className="text-sm text-apple-muted">
                              Stripe is not configured on this server yet. Add{' '}
                              <span className="font-mono text-apple-text">STRIPE_SECRET_KEY</span> to your
                              environment, or switch to an external checkout link.
                            </p>
                          ) : !flipbookId ? (
                            <p className="text-sm text-apple-muted">
                              Share your flipbook first, then connect Stripe to accept payments.
                            </p>
                          ) : monetization.stripeConnected ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-emerald-800">Stripe connected</p>
                                <p className="text-xs text-emerald-700">Readers can pay directly from the paywall</p>
                              </div>
                              <button
                                type="button"
                                disabled={stripeConnecting}
                                onClick={async () => {
                                  if (!onStripeConnect) return
                                  setStripeConnecting(true)
                                  try {
                                    await onStripeConnect()
                                  } finally {
                                    setStripeConnecting(false)
                                  }
                                }}
                                className="apple-btn-ghost text-xs"
                              >
                                Manage
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={stripeConnecting || !onStripeConnect}
                              onClick={async () => {
                                if (!onStripeConnect) return
                                setStripeConnecting(true)
                                try {
                                  await onStripeConnect()
                                } finally {
                                  setStripeConnecting(false)
                                }
                              }}
                              className="apple-btn-primary w-full"
                            >
                              {stripeConnecting ? 'Connecting…' : 'Connect with Stripe'}
                            </button>
                          )}

                          <div>
                            <label htmlFor="stripe-price" className="mb-2 block text-sm text-apple-muted">
                              Price (USD)
                            </label>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted">
                                $
                              </span>
                              <input
                                id="stripe-price"
                                type="number"
                                min={1}
                                step={0.01}
                                value={
                                  monetization.stripePriceCents > 0
                                    ? (monetization.stripePriceCents / 100).toFixed(2)
                                    : ''
                                }
                                onChange={(e) => {
                                  const dollars = Number(e.target.value)
                                  updateMonetization({
                                    stripePriceCents: Number.isFinite(dollars)
                                      ? Math.round(dollars * 100)
                                      : 0,
                                  })
                                }}
                                placeholder="12.00"
                                className="apple-input pl-7"
                              />
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => updateMonetization({ stripeMode: 'payment' })}
                              className={[
                                'rounded-xl border px-3 py-2 text-sm transition',
                                monetization.stripeMode === 'payment'
                                  ? 'border-apple-blue bg-apple-blue/8 text-apple-text'
                                  : 'border-apple-border-light text-apple-muted',
                              ].join(' ')}
                            >
                              One-time purchase
                            </button>
                            <button
                              type="button"
                              onClick={() => updateMonetization({ stripeMode: 'subscription' })}
                              className={[
                                'rounded-xl border px-3 py-2 text-sm transition',
                                monetization.stripeMode === 'subscription'
                                  ? 'border-apple-blue bg-apple-blue/8 text-apple-text'
                                  : 'border-apple-border-light text-apple-muted',
                              ].join(' ')}
                            >
                              Monthly subscription
                            </button>
                          </div>

                          <p className="text-xs text-apple-muted">
                            Share or update your flipbook after setting a price so Stripe checkout stays in sync.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="paywall-checkout" className="mb-2 block text-sm text-apple-muted">
                            Checkout or subscribe URL
                          </label>
                          <input
                            id="paywall-checkout"
                            type="url"
                            value={monetization.checkoutUrl}
                            onChange={(e) => updateMonetization({ checkoutUrl: e.target.value })}
                            placeholder="https://your-site.com/subscribe"
                            className="apple-input"
                          />
                          <p className="mt-1 text-xs text-apple-muted">
                            Link to Shopify, Substack, Patreon, or your membership page
                          </p>
                        </div>
                      )}

                      <div>
                        <label htmlFor="paywall-cta" className="mb-2 block text-sm text-apple-muted">
                          Button label
                        </label>
                        <input
                          id="paywall-cta"
                          value={monetization.ctaLabel}
                          onChange={(e) => updateMonetization({ ctaLabel: e.target.value })}
                          className="apple-input"
                        />
                      </div>

                      <div>
                        <label htmlFor="subscriber-code" className="mb-2 block text-sm text-apple-muted">
                          Subscriber access code
                        </label>
                        <input
                          id="subscriber-code"
                          type="text"
                          value={subscriberAccessCode}
                          onChange={(e) => onSubscriberAccessCodeChange?.(e.target.value)}
                          placeholder={
                            hasSubscriberAccess ? 'Enter a new code to replace the current one' : 'Optional code for paying subscribers'
                          }
                          className="apple-input"
                        />
                        <p className="mt-1 text-xs text-apple-muted">
                          {hasSubscriberAccess
                            ? 'An access code is active. Share it with subscribers after they purchase.'
                            : 'Readers who already paid can enter this code to unlock the full issue.'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'leads' && (
            <>
              {!canLeadCapture ? (
                <div className="rounded-xl border border-apple-border-light bg-apple-gray px-4 py-5 text-sm text-apple-muted">
                  Lead capture is available on Starter and above.{' '}
                  <Link to="/pricing" className="apple-link">
                    View plans
                  </Link>
                </div>
              ) : (
                <>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-apple-border-light px-4 py-3">
                    <input
                      type="checkbox"
                      checked={leadCapture.enabled}
                      onChange={(e) => updateLeadCapture({ enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-apple-border text-apple-blue"
                    />
                    <div>
                      <p className="text-sm font-medium text-apple-text">Collect reader emails</p>
                      <p className="text-xs text-apple-muted">
                        Show a free preview, then ask readers for their email to continue
                      </p>
                    </div>
                  </label>

                  {leadCapture.enabled && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="lead-preview-pages" className="mb-2 block text-sm text-apple-muted">
                          Free preview pages
                        </label>
                        <input
                          id="lead-preview-pages"
                          type="range"
                          min={1}
                          max={Math.max(1, totalPages - 1)}
                          value={Math.min(leadCapture.previewPageCount, Math.max(1, totalPages - 1))}
                          onChange={(e) =>
                            updateLeadCapture({ previewPageCount: Number(e.target.value) })
                          }
                          className="flipbook-zoom-slider w-full"
                        />
                        <p className="mt-1 text-xs text-apple-muted">
                          Readers can view the first {leadCapture.previewPageCount} page
                          {leadCapture.previewPageCount === 1 ? '' : 's'} before the email gate
                        </p>
                      </div>

                      <div>
                        <label htmlFor="lead-headline" className="mb-2 block text-sm text-apple-muted">
                          Gate headline
                        </label>
                        <input
                          id="lead-headline"
                          value={leadCapture.headline}
                          onChange={(e) => updateLeadCapture({ headline: e.target.value })}
                          className="apple-input"
                        />
                      </div>

                      <div>
                        <label htmlFor="lead-description" className="mb-2 block text-sm text-apple-muted">
                          Description
                        </label>
                        <textarea
                          id="lead-description"
                          value={leadCapture.description}
                          onChange={(e) => updateLeadCapture({ description: e.target.value })}
                          rows={3}
                          className="apple-input resize-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="lead-button" className="mb-2 block text-sm text-apple-muted">
                          Button label
                        </label>
                        <input
                          id="lead-button"
                          value={leadCapture.buttonLabel}
                          onChange={(e) => updateLeadCapture({ buttonLabel: e.target.value })}
                          className="apple-input"
                        />
                      </div>

                      <div>
                        <label htmlFor="lead-consent" className="mb-2 block text-sm text-apple-muted">
                          Consent text
                        </label>
                        <input
                          id="lead-consent"
                          value={leadCapture.consentLabel}
                          onChange={(e) => updateLeadCapture({ consentLabel: e.target.value })}
                          className="apple-input"
                        />
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-apple-border-light px-4 py-3">
                        <input
                          type="checkbox"
                          checked={leadCapture.mandatory}
                          onChange={(e) => updateLeadCapture({ mandatory: e.target.checked })}
                          className="h-4 w-4 rounded border-apple-border text-apple-blue"
                        />
                        <div>
                          <p className="text-sm font-medium text-apple-text">Require email to continue</p>
                          <p className="text-xs text-apple-muted">
                            When off, readers can dismiss the form and keep browsing
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  <div className="rounded-xl border border-apple-border-light p-4">
                    <p className="text-sm font-medium text-apple-text">Collected emails</p>
                    {!flipbookId ? (
                      <p className="mt-2 text-sm text-apple-muted">Publish to start collecting emails.</p>
                    ) : leadsLoading ? (
                      <p className="mt-2 text-sm text-apple-muted">Loading leads…</p>
                    ) : leadsError ? (
                      <p className="mt-2 text-sm text-red-500">{leadsError}</p>
                    ) : capturedLeads.length === 0 ? (
                      <p className="mt-2 text-sm text-apple-muted">No emails collected yet.</p>
                    ) : (
                      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                        {capturedLeads.map((lead) => (
                          <div
                            key={`${lead.email}-${lead.capturedAt}`}
                            className="flex items-center justify-between gap-3 rounded-lg bg-apple-gray px-3 py-2 text-sm"
                          >
                            <span className="truncate text-apple-text">{lead.email}</span>
                            <span className="shrink-0 text-xs text-apple-muted">
                              {new Date(lead.capturedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'branding' && (
            <>
              {!canCustomBranding && (
                <div className="apple-card-flat mb-4 px-4 py-3 text-sm text-apple-muted">
                  Custom branding is available on Pro and above.{' '}
                  <Link to="/pricing" className="apple-link">
                    View plans
                  </Link>
                </div>
              )}
              <div className={canCustomBranding ? '' : 'pointer-events-none opacity-50'}>
              <div>
                <p className="mb-2 text-sm text-apple-muted">Logo</p>
                {logoPreview ? (
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-apple-border-light p-3">
                    <img src={logoPreview} alt="Logo preview" className="h-10 max-w-[140px] object-contain" />
                    {onLogoRemove && (
                      <button type="button" onClick={() => void onLogoRemove()} className="apple-btn-ghost text-sm">
                        Remove
                      </button>
                    )}
                  </div>
                ) : null}
                {flipbookId && onLogoUpload ? (
                  <>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => void handleLogoSelect(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={() => logoInputRef.current?.click()}
                      className="apple-btn-secondary w-full"
                    >
                      {logoUploading ? 'Uploading…' : logoPreview ? 'Replace logo' : 'Upload logo'}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-apple-muted">
                    Share your flipbook first to upload a logo, or paste an external logo URL below.
                  </p>
                )}
                <input
                  value={branding.logoUrl}
                  onChange={(e) => updateBranding({ logoUrl: e.target.value })}
                  placeholder="https://yoursite.com/logo.png"
                  className="apple-input mt-3"
                />
              </div>

              <div>
                <label htmlFor="brand-accent" className="mb-2 block text-sm text-apple-muted">
                  Accent color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="brand-accent"
                    type="color"
                    value={branding.accentColor || '#0071e3'}
                    onChange={(e) => updateBranding({ accentColor: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-apple-border-light bg-white p-1"
                  />
                  <input
                    value={branding.accentColor}
                    onChange={(e) => updateBranding({ accentColor: e.target.value })}
                    placeholder="#0071e3"
                    className="apple-input flex-1"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-apple-border-light px-4 py-3">
                <input
                  type="checkbox"
                  checked={branding.hidePlatformChrome}
                  onChange={(e) => updateBranding({ hidePlatformChrome: e.target.checked })}
                  className="h-4 w-4 rounded border-apple-border text-apple-blue"
                />
                <div>
                  <p className="text-sm font-medium text-apple-text">White-label viewer</p>
                  <p className="text-xs text-apple-muted">Hide MakeAMag branding on shared and embed views</p>
                </div>
              </label>

              <div>
                <label htmlFor="brand-domain" className="mb-2 block text-sm text-apple-muted">
                  Custom domain
                </label>
                <input
                  id="brand-domain"
                  value={branding.customDomain}
                  onChange={(e) => {
                    setDomainError('')
                    updateBranding({ customDomain: e.target.value })
                  }}
                  placeholder="magazine.example.com"
                  className="apple-input"
                />
                {domainError && <p className="mt-2 text-sm text-red-500">{domainError}</p>}
                <div className="apple-card-flat mt-3 p-4 text-sm text-apple-muted">
                  <p className="font-medium text-apple-text">DNS setup</p>
                  <p className="mt-2">
                    Point a CNAME record for your domain to{' '}
                    <span className="font-mono text-apple-text">{dnsTarget}</span>
                  </p>
                  <p className="mt-2">
                    After DNS propagates, readers can open your flipbook at{' '}
                    <span className="font-mono text-apple-text">
                      https://{branding.customDomain || 'magazine.example.com'}/
                    </span>
                  </p>
                </div>
              </div>
              </div>
            </>
          )}

          {tab === 'analytics' && (
            canAnalytics ? (
              <AnalyticsDashboard
                summary={analytics}
                loading={analyticsLoading}
                error={analyticsError}
                unpublished={!flipbookId}
              />
            ) : (
              <div className="apple-card-flat px-5 py-8 text-center">
                <p className="text-[1.0625rem] font-medium text-apple-text">Analytics on Starter+</p>
                <p className="mt-2 text-sm text-apple-muted">
                  Track views, page reads, referrers, and link clicks.
                </p>
                <Link to="/pricing" className="apple-link mt-4 inline-block text-sm">
                  View plans ›
                </Link>
              </div>
            )
          )}
        </div>

        <div className="border-t border-apple-border-light px-6 py-4">
          <button type="button" onClick={onClose} className="apple-btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
