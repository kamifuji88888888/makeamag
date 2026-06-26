export type VideoProvider = 'youtube' | 'vimeo' | 'direct'
export type VideoSizePreset = 'medium' | 'large' | 'full'

export interface VideoEmbed {
  id: string
  pageIndex: number
  url: string
  embedUrl: string
  provider: VideoProvider
  x: number
  y: number
  width: number
  height: number
}

export interface PublicationInfo {
  title: string
  publisherName: string
  issueLabel: string
}

export interface TocEntry {
  id: string
  title: string
  pageIndex: number
}

export interface LinkHotspot {
  id: string
  pageIndex: number
  url: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export type PopUpPanelKind = 'footnote' | 'spec' | 'citation' | 'note'

export interface PopUpPanel {
  id: string
  pageIndex: number
  kind: PopUpPanelKind
  triggerLabel: string
  title: string
  body: string
  x: number
  y: number
  width: number
  height: number
}

export interface BrandingConfig {
  logoUrl: string
  accentColor: string
  hidePlatformChrome: boolean
  customDomain: string
}

export interface MonetizationConfig {
  enabled: boolean
  previewPageCount: number
  headline: string
  description: string
  priceLabel: string
  ctaLabel: string
  checkoutUrl: string
  paymentMethod: 'link' | 'stripe'
  stripeConnected: boolean
  stripePriceCents: number
  stripeMode: 'payment' | 'subscription'
}

export interface LeadCaptureConfig {
  enabled: boolean
  previewPageCount: number
  headline: string
  description: string
  buttonLabel: string
  consentLabel: string
  mandatory: boolean
}

export interface CapturedLead {
  email: string
  capturedAt: string
  referrer?: string
}

export interface FlipbookPublicMeta {
  id: string
  fileName: string
  createdAt: string
  videoEmbeds: VideoEmbed[]
  isPasswordProtected: boolean
  hasSubscriberAccess: boolean
  publication: PublicationInfo
  tableOfContents: TocEntry[]
  linkHotspots: LinkHotspot[]
  popUpPanels: PopUpPanel[]
  spreadView: boolean
  branding: BrandingConfig
  monetization: MonetizationConfig
  leadCapture: LeadCaptureConfig
}

export interface FlipbookStoredMeta extends FlipbookPublicMeta {
  passwordHash?: string
  subscriberAccessHash?: string
  stripeAccountId?: string
  stripePriceId?: string
  stripeProductId?: string
  pdfKey: string
  billingAccountId?: string
  ownerId?: string
  pdfSizeBytes?: number
}

export const DEFAULT_PUBLICATION: PublicationInfo = {
  title: '',
  publisherName: '',
  issueLabel: '',
}

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: '',
  accentColor: '',
  hidePlatformChrome: false,
  customDomain: '',
}

export const DEFAULT_LEAD_CAPTURE: LeadCaptureConfig = {
  enabled: false,
  previewPageCount: 1,
  headline: 'Continue reading',
  description: 'Enter your email to unlock the rest of this issue.',
  buttonLabel: 'Unlock full issue',
  consentLabel: 'I agree to receive email updates from the publisher.',
  mandatory: true,
}

export const DEFAULT_MONETIZATION: MonetizationConfig = {
  enabled: false,
  previewPageCount: 8,
  headline: 'Continue reading',
  description: 'Subscribe to unlock the full issue and get access to every edition.',
  priceLabel: '',
  ctaLabel: 'Subscribe now',
  checkoutUrl: '',
  paymentMethod: 'stripe',
  stripeConnected: false,
  stripePriceCents: 0,
  stripeMode: 'payment',
}

export function formatStripePriceLabel(
  cents: number,
  mode: MonetizationConfig['stripeMode'],
): string {
  if (cents <= 0) return ''
  const amount = cents % 100 === 0 ? (cents / 100).toString() : (cents / 100).toFixed(2)
  return mode === 'subscription' ? `$${amount} / month` : `$${amount}`
}

const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

export function normalizeDomain(input?: string): string {
  if (!input?.trim()) return ''
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
}

export function isValidDomain(domain: string): boolean {
  if (!domain) return true
  return DOMAIN_PATTERN.test(domain)
}

export function normalizeAccentColor(input?: string): string {
  const value = input?.trim() ?? ''
  if (!value) return ''
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : ''
}

export function normalizeBranding(branding?: Partial<BrandingConfig>): BrandingConfig {
  return {
    logoUrl: branding?.logoUrl?.trim() ?? '',
    accentColor: normalizeAccentColor(branding?.accentColor),
    hidePlatformChrome: branding?.hidePlatformChrome ?? false,
    customDomain: normalizeDomain(branding?.customDomain),
  }
}

export const LINK_HOTSPOT_PRESET = {
  x: 35,
  y: 40,
  width: 30,
  height: 8,
}

export const POP_UP_PANEL_PRESET = {
  x: 42,
  y: 78,
  width: 16,
  height: 7,
}

export const POP_UP_PANEL_KIND_LABELS: Record<PopUpPanelKind, string> = {
  footnote: 'Footnote',
  spec: 'Specifications',
  citation: 'Citation',
  note: 'Note',
}

export const POP_UP_PANEL_KIND_DEFAULTS: Record<
  PopUpPanelKind,
  Pick<PopUpPanel, 'triggerLabel' | 'title'>
> = {
  footnote: { triggerLabel: '†', title: 'Footnote' },
  spec: { triggerLabel: 'Specs', title: 'Specifications' },
  citation: { triggerLabel: '[1]', title: 'Source' },
  note: { triggerLabel: '+', title: 'Note' },
}

export function normalizePopUpPanel(panel: Partial<PopUpPanel>): PopUpPanel | null {
  const kind =
    panel.kind === 'spec' || panel.kind === 'citation' || panel.kind === 'note'
      ? panel.kind
      : 'footnote'
  const defaults = POP_UP_PANEL_KIND_DEFAULTS[kind]
  const triggerLabel = panel.triggerLabel?.trim() || defaults.triggerLabel
  const title = panel.title?.trim() || defaults.title
  const body = panel.body?.trim() ?? ''
  if (!body) return null

  const pageIndex = Math.max(0, Math.floor(panel.pageIndex ?? 0))
  const x = typeof panel.x === 'number' ? panel.x : POP_UP_PANEL_PRESET.x
  const y = typeof panel.y === 'number' ? panel.y : POP_UP_PANEL_PRESET.y
  const width = typeof panel.width === 'number' ? panel.width : POP_UP_PANEL_PRESET.width
  const height = typeof panel.height === 'number' ? panel.height : POP_UP_PANEL_PRESET.height

  return {
    id: panel.id?.trim() || crypto.randomUUID(),
    pageIndex,
    kind,
    triggerLabel,
    title,
    body,
    x,
    y,
    width,
    height,
  }
}

export function normalizePopUpPanels(panels?: PopUpPanel[]): PopUpPanel[] {
  if (!Array.isArray(panels)) return []
  return panels
    .map((panel) => normalizePopUpPanel(panel))
    .filter((panel): panel is PopUpPanel => panel !== null)
}

export const VIDEO_SIZE_PRESETS: Record<
  VideoSizePreset,
  Pick<VideoEmbed, 'x' | 'y' | 'width' | 'height'>
> = {
  medium: { x: 10, y: 32, width: 80, height: 45 },
  large: { x: 5, y: 22, width: 90, height: 52 },
  full: { x: 0, y: 0, width: 100, height: 100 },
}

export function normalizeMonetization(
  monetization?: Partial<MonetizationConfig>,
): MonetizationConfig {
  const previewPageCount = Math.max(
    1,
    Math.min(50, Math.floor(monetization?.previewPageCount ?? DEFAULT_MONETIZATION.previewPageCount)),
  )

  const stripePriceCents = Math.max(
    0,
    Math.min(999_999, Math.floor(monetization?.stripePriceCents ?? 0)),
  )
  const stripeMode =
    monetization?.stripeMode === 'subscription' ? 'subscription' : 'payment'
  const paymentMethod =
    monetization?.paymentMethod === 'link' ? 'link' : 'stripe'

  const priceLabel =
    paymentMethod === 'stripe' && stripePriceCents > 0
      ? formatStripePriceLabel(stripePriceCents, stripeMode)
      : monetization?.priceLabel?.trim() ?? ''

  return {
    enabled: monetization?.enabled ?? false,
    previewPageCount,
    headline: monetization?.headline?.trim() || DEFAULT_MONETIZATION.headline,
    description: monetization?.description?.trim() || DEFAULT_MONETIZATION.description,
    priceLabel,
    ctaLabel: monetization?.ctaLabel?.trim() || DEFAULT_MONETIZATION.ctaLabel,
    checkoutUrl: monetization?.checkoutUrl?.trim() ?? '',
    paymentMethod,
    stripeConnected: monetization?.stripeConnected ?? false,
    stripePriceCents,
    stripeMode,
  }
}

export function normalizeLeadCapture(
  leadCapture?: Partial<LeadCaptureConfig>,
): LeadCaptureConfig {
  const previewPageCount = Math.max(
    1,
    Math.min(50, Math.floor(leadCapture?.previewPageCount ?? DEFAULT_LEAD_CAPTURE.previewPageCount)),
  )

  return {
    enabled: leadCapture?.enabled ?? false,
    previewPageCount,
    headline: leadCapture?.headline?.trim() || DEFAULT_LEAD_CAPTURE.headline,
    description: leadCapture?.description?.trim() || DEFAULT_LEAD_CAPTURE.description,
    buttonLabel: leadCapture?.buttonLabel?.trim() || DEFAULT_LEAD_CAPTURE.buttonLabel,
    consentLabel: leadCapture?.consentLabel?.trim() || DEFAULT_LEAD_CAPTURE.consentLabel,
    mandatory: leadCapture?.mandatory ?? true,
  }
}

export function publicMonetizationFromStored(
  monetization: MonetizationConfig | undefined,
  stripeAccountId?: string,
): MonetizationConfig {
  const normalized = normalizeMonetization(monetization)
  return {
    ...normalized,
    stripeConnected: Boolean(stripeAccountId),
  }
}

export function normalizePublication(publication?: Partial<PublicationInfo>): PublicationInfo {
  return {
    title: publication?.title?.trim() ?? '',
    publisherName: publication?.publisherName?.trim() ?? '',
    issueLabel: publication?.issueLabel?.trim() ?? '',
  }
}

export function toPublicMeta(meta: FlipbookStoredMeta): FlipbookPublicMeta {
  return {
    id: meta.id,
    fileName: meta.fileName,
    createdAt: meta.createdAt,
    videoEmbeds: meta.videoEmbeds ?? [],
    isPasswordProtected: Boolean(meta.passwordHash),
    hasSubscriberAccess: Boolean(meta.subscriberAccessHash),
    publication: normalizePublication(meta.publication),
    tableOfContents: meta.tableOfContents ?? [],
    linkHotspots: meta.linkHotspots ?? [],
    popUpPanels: normalizePopUpPanels(meta.popUpPanels),
    spreadView: meta.spreadView ?? false,
    branding: normalizeBranding(meta.branding),
    monetization: publicMonetizationFromStored(meta.monetization, meta.stripeAccountId),
    leadCapture: normalizeLeadCapture(meta.leadCapture),
  }
}

export function displayTitle(meta: Pick<FlipbookPublicMeta, 'fileName' | 'publication'>): string {
  return meta.publication.title || meta.fileName.replace(/\.pdf$/i, '')
}
