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
  description: string
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
export type PopUpPanelTheme = 'brand' | 'violet' | 'slate' | 'amber' | 'emerald'
export type PopUpPanelTriggerShape = 'pill' | 'circle'
export type PopUpPanelModalSize = 'narrow' | 'standard' | 'wide'

export interface PopUpPanelStyle {
  theme: PopUpPanelTheme
  triggerShape: PopUpPanelTriggerShape
  modalSize: PopUpPanelModalSize
}

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
  theme?: PopUpPanelTheme
  triggerShape?: PopUpPanelTriggerShape
  modalSize?: PopUpPanelModalSize
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

export type FlipbookVisibility = 'public' | 'unlisted'

export const DEFAULT_VISIBILITY: FlipbookVisibility = 'public'

export interface FlipbookPublicMeta {
  id: string
  fileName: string
  createdAt: string
  videoEmbeds: VideoEmbed[]
  visibility: FlipbookVisibility
  isPasswordProtected: boolean
  hasSubscriberAccess: boolean
  publication: PublicationInfo
  tableOfContents: TocEntry[]
  linkHotspots: LinkHotspot[]
  popUpPanels: PopUpPanel[]
  popUpPanelStyle: PopUpPanelStyle
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
  description: '',
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

export const POP_UP_PANEL_CIRCLE_PRESET = {
  x: 44,
  y: 78,
  width: 10,
  height: 10,
}

export const DEFAULT_POP_UP_PANEL_STYLE: PopUpPanelStyle = {
  theme: 'violet',
  triggerShape: 'pill',
  modalSize: 'standard',
}

export const POP_UP_PANEL_THEME_LABELS: Record<PopUpPanelTheme, string> = {
  brand: 'Brand color',
  violet: 'Violet',
  slate: 'Slate',
  amber: 'Amber',
  emerald: 'Emerald',
}

export const POP_UP_PANEL_KIND_STYLE_DEFAULTS: Record<
  PopUpPanelKind,
  Pick<PopUpPanel, 'theme' | 'triggerShape' | 'modalSize'>
> = {
  footnote: { theme: 'slate', triggerShape: 'circle', modalSize: 'narrow' },
  spec: { theme: 'emerald', triggerShape: 'pill', modalSize: 'wide' },
  citation: { theme: 'amber', triggerShape: 'circle', modalSize: 'narrow' },
  note: { theme: 'violet', triggerShape: 'pill', modalSize: 'standard' },
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

export function normalizePopUpPanelTheme(value: unknown): PopUpPanelTheme | undefined {
  if (value === 'brand' || value === 'violet' || value === 'slate' || value === 'amber' || value === 'emerald') {
    return value
  }
  return undefined
}

export function normalizePopUpPanelTriggerShape(value: unknown): PopUpPanelTriggerShape | undefined {
  if (value === 'pill' || value === 'circle') return value
  return undefined
}

export function normalizePopUpPanelModalSize(value: unknown): PopUpPanelModalSize | undefined {
  if (value === 'narrow' || value === 'standard' || value === 'wide') return value
  return undefined
}

export function normalizePopUpPanelStyle(style?: Partial<PopUpPanelStyle>): PopUpPanelStyle {
  return {
    theme: normalizePopUpPanelTheme(style?.theme) ?? DEFAULT_POP_UP_PANEL_STYLE.theme,
    triggerShape:
      normalizePopUpPanelTriggerShape(style?.triggerShape) ?? DEFAULT_POP_UP_PANEL_STYLE.triggerShape,
    modalSize: normalizePopUpPanelModalSize(style?.modalSize) ?? DEFAULT_POP_UP_PANEL_STYLE.modalSize,
  }
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
  const theme = normalizePopUpPanelTheme(panel.theme)
  const triggerShape = normalizePopUpPanelTriggerShape(panel.triggerShape)
  const modalSize = normalizePopUpPanelModalSize(panel.modalSize)

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
    ...(theme ? { theme } : {}),
    ...(triggerShape ? { triggerShape } : {}),
    ...(modalSize ? { modalSize } : {}),
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
    description: publication?.description?.trim() ?? '',
  }
}

export function normalizeVisibility(value?: string | null): FlipbookVisibility {
  return value === 'unlisted' ? 'unlisted' : 'public'
}

export function shouldNoindexFlipbook(
  meta: Pick<FlipbookPublicMeta, 'visibility' | 'isPasswordProtected'>,
): boolean {
  return meta.visibility === 'unlisted' || meta.isPasswordProtected
}

export function toPublicMeta(meta: FlipbookStoredMeta): FlipbookPublicMeta {
  return {
    id: meta.id,
    fileName: meta.fileName,
    createdAt: meta.createdAt,
    videoEmbeds: meta.videoEmbeds ?? [],
    visibility: normalizeVisibility(meta.visibility),
    isPasswordProtected: Boolean(meta.passwordHash),
    hasSubscriberAccess: Boolean(meta.subscriberAccessHash),
    publication: normalizePublication(meta.publication),
    tableOfContents: meta.tableOfContents ?? [],
    linkHotspots: meta.linkHotspots ?? [],
    popUpPanels: normalizePopUpPanels(meta.popUpPanels),
    popUpPanelStyle: normalizePopUpPanelStyle(meta.popUpPanelStyle),
    spreadView: meta.spreadView ?? false,
    branding: normalizeBranding(meta.branding),
    monetization: publicMonetizationFromStored(meta.monetization, meta.stripeAccountId),
    leadCapture: normalizeLeadCapture(meta.leadCapture),
  }
}

export function displayTitle(meta: Pick<FlipbookPublicMeta, 'fileName' | 'publication'>): string {
  return meta.publication.title || meta.fileName.replace(/\.pdf$/i, '')
}

export function flipbookCoverImageUrl(siteOrigin: string, flipbookId: string): string {
  return `${siteOrigin.replace(/\/$/, '')}/api/flipbooks/${flipbookId}/cover`
}

export function displayDescription(
  meta: Pick<FlipbookPublicMeta, 'fileName' | 'publication'>,
): string {
  if (meta.publication.description.trim()) {
    return meta.publication.description.trim()
  }

  const title = displayTitle(meta)
  const parts = [title, meta.publication.publisherName, meta.publication.issueLabel].filter(Boolean)
  if (parts.length > 1) {
    return parts.join(' — ')
  }

  return `${title} — interactive flipbook`
}
