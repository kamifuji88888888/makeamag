import type { PlanId } from '../../shared/plans'
import type { AnalyticsSummary } from '../../shared/analytics'
import type {
  BrandingConfig,
  CapturedLead,
  FlipbookPublicMeta,
  LeadCaptureConfig,
  LinkHotspot,
  MonetizationConfig,
  PublicationInfo,
  TocEntry,
  VideoEmbed,
} from '../../shared/flipbook'
import { getBrandedShareOrigin } from './branding'

export interface PublisherUpdate {
  publication?: PublicationInfo
  tableOfContents?: TocEntry[]
  linkHotspots?: LinkHotspot[]
  spreadView?: boolean
  branding?: BrandingConfig
  monetization?: MonetizationConfig
  leadCapture?: LeadCaptureConfig
  subscriberAccessCode?: string
  removeSubscriberAccess?: boolean
}

const API_BASE = '/api'
const TOKEN_PREFIX = 'makeamag_access_'
const MONETIZATION_TOKEN_PREFIX = 'makeamag_monetization_'
const LEAD_CAPTURE_TOKEN_PREFIX = 'makeamag_lead_capture_'

function tokenKey(flipbookId: string) {
  return `${TOKEN_PREFIX}${flipbookId}`
}

function leadCaptureTokenKey(flipbookId: string) {
  return `${LEAD_CAPTURE_TOKEN_PREFIX}${flipbookId}`
}

function monetizationTokenKey(flipbookId: string) {
  return `${MONETIZATION_TOKEN_PREFIX}${flipbookId}`
}

export function storeAccessToken(flipbookId: string, token: string) {
  sessionStorage.setItem(tokenKey(flipbookId), token)
}

export function getAccessToken(flipbookId: string): string | null {
  return sessionStorage.getItem(tokenKey(flipbookId))
}

export function clearAccessToken(flipbookId: string) {
  sessionStorage.removeItem(tokenKey(flipbookId))
}

export function storeMonetizationToken(flipbookId: string, token: string) {
  sessionStorage.setItem(monetizationTokenKey(flipbookId), token)
}

export function getMonetizationToken(flipbookId: string): string | null {
  return sessionStorage.getItem(monetizationTokenKey(flipbookId))
}

export function clearMonetizationToken(flipbookId: string) {
  sessionStorage.removeItem(monetizationTokenKey(flipbookId))
}

export function storeLeadCaptureToken(flipbookId: string, token: string) {
  sessionStorage.setItem(leadCaptureTokenKey(flipbookId), token)
}

export function getLeadCaptureToken(flipbookId: string): string | null {
  return sessionStorage.getItem(leadCaptureTokenKey(flipbookId))
}

export function clearLeadCaptureToken(flipbookId: string) {
  sessionStorage.removeItem(leadCaptureTokenKey(flipbookId))
}

export function isMonetizationUnlocked(
  flipbookId: string,
  monetization: MonetizationConfig,
): boolean {
  if (!monetization.enabled) return true
  return Boolean(getMonetizationToken(flipbookId))
}

export function isLeadCaptureUnlocked(
  flipbookId: string,
  leadCapture: LeadCaptureConfig,
): boolean {
  if (!leadCapture.enabled) return true
  return Boolean(getLeadCaptureToken(flipbookId))
}

function authHeaders(flipbookId: string): HeadersInit {
  const token = getAccessToken(flipbookId)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function publishFlipbook(
  pdfFile: File,
  videoEmbeds: VideoEmbed[],
  options?: {
    password?: string
    publication?: PublicationInfo
    tableOfContents?: TocEntry[]
    linkHotspots?: LinkHotspot[]
    spreadView?: boolean
    branding?: BrandingConfig
    monetization?: MonetizationConfig
    leadCapture?: LeadCaptureConfig
    subscriberAccessCode?: string
    planId?: PlanId
    billingAccountId?: string
  },
): Promise<FlipbookPublicMeta> {
  const formData = new FormData()
  formData.append('pdf', pdfFile)
  formData.append('videoEmbeds', JSON.stringify(videoEmbeds))
  if (options?.publication) {
    formData.append('publication', JSON.stringify(options.publication))
  }
  if (options?.tableOfContents) {
    formData.append('tableOfContents', JSON.stringify(options.tableOfContents))
  }
  if (options?.linkHotspots) {
    formData.append('linkHotspots', JSON.stringify(options.linkHotspots))
  }
  if (options?.spreadView) {
    formData.append('spreadView', 'true')
  }
  if (options?.branding) {
    formData.append('branding', JSON.stringify(options.branding))
  }
  if (options?.monetization) {
    formData.append('monetization', JSON.stringify(options.monetization))
  }
  if (options?.leadCapture) {
    formData.append('leadCapture', JSON.stringify(options.leadCapture))
  }
  if (options?.subscriberAccessCode?.trim()) {
    formData.append('subscriberAccessCode', options.subscriberAccessCode.trim())
  }
  if (options?.password?.trim()) {
    formData.append('password', options.password.trim())
  }
  if (options?.planId) {
    formData.append('planId', options.planId)
  }
  if (options?.billingAccountId) {
    formData.append('billingAccountId', options.billingAccountId)
  }

  const response = await fetch(`${API_BASE}/flipbooks`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to publish flipbook')
  }

  return response.json() as Promise<FlipbookPublicMeta>
}

export async function updateFlipbook(
  id: string,
  updates: {
    videoEmbeds?: VideoEmbed[]
    password?: string
    removePassword?: boolean
  } & PublisherUpdate,
): Promise<FlipbookPublicMeta> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to update flipbook')
  }

  return response.json() as Promise<FlipbookPublicMeta>
}

export async function fetchFlipbook(id: string): Promise<FlipbookPublicMeta> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}`)
  if (!response.ok) {
    throw new Error('Flipbook not found')
  }
  return response.json() as Promise<FlipbookPublicMeta>
}

export async function unlockFlipbook(
  id: string,
  password: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Incorrect password')
  }

  const data = (await response.json()) as { accessToken: string }
  storeAccessToken(id, data.accessToken)
  return data.accessToken
}

export async function unlockMonetization(
  id: string,
  accessCode: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}/monetization-unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Incorrect access code')
  }

  const data = (await response.json()) as { accessToken: string }
  storeMonetizationToken(id, data.accessToken)
  return data.accessToken
}

export async function submitLeadCapture(
  id: string,
  email: string,
  consent: boolean,
): Promise<string> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}/lead-capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, consent }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Could not submit email')
  }

  const data = (await response.json()) as { accessToken: string }
  storeLeadCaptureToken(id, data.accessToken)
  return data.accessToken
}

export async function fetchCapturedLeads(
  id: string,
): Promise<{ leads: CapturedLead[]; total: number }> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}/leads`, {
    credentials: 'include',
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to load captured leads')
  }
  return response.json() as Promise<{ leads: CapturedLead[]; total: number }>
}

export async function fetchStripeStatus(): Promise<{ configured: boolean; billingEnabled?: boolean }> {
  const response = await fetch(`${API_BASE}/stripe/status`)
  if (!response.ok) {
    return { configured: false, billingEnabled: false }
  }
  return response.json() as Promise<{ configured: boolean; billingEnabled?: boolean }>
}

export async function startStripeConnect(flipbookId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/flipbooks/${flipbookId}/stripe/connect`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to connect Stripe')
  }

  const data = (await response.json()) as { url: string }
  return data.url
}

export async function createStripeCheckout(
  flipbookId: string,
  mode: 'view' | 'embed' = 'view',
): Promise<string> {
  const response = await fetch(`${API_BASE}/flipbooks/${flipbookId}/stripe-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to start checkout')
  }

  const data = (await response.json()) as { url: string }
  return data.url
}

export async function verifyStripeSession(
  flipbookId: string,
  sessionId: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/flipbooks/${flipbookId}/stripe-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Payment verification failed')
  }

  const data = (await response.json()) as { accessToken: string }
  storeMonetizationToken(flipbookId, data.accessToken)
  return data.accessToken
}

export async function ensureFlipbookAccess(
  id: string,
  isPasswordProtected: boolean,
): Promise<void> {
  if (!isPasswordProtected) return
  if (getAccessToken(id)) return
  throw new Error('Password required')
}

export async function fetchFlipbookPdf(id: string): Promise<ArrayBuffer> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}/pdf`, {
    headers: authHeaders(id),
  })

  if (response.status === 401) {
    throw new Error('Password required')
  }
  if (!response.ok) {
    throw new Error('PDF not found')
  }
  return response.arrayBuffer()
}

export async function uploadFlipbookLogo(id: string, file: File): Promise<FlipbookPublicMeta> {
  const formData = new FormData()
  formData.append('logo', file)

  const response = await fetch(`${API_BASE}/flipbooks/${id}/logo`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to upload logo')
  }

  return response.json() as Promise<FlipbookPublicMeta>
}

export async function deleteFlipbookLogo(id: string): Promise<FlipbookPublicMeta> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}/logo`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to remove logo')
  }

  return response.json() as Promise<FlipbookPublicMeta>
}

export function getShareUrl(id: string, branding?: BrandingConfig): string {
  const brandedOrigin = branding ? getBrandedShareOrigin(branding) : null
  if (brandedOrigin) {
    return `${brandedOrigin}/`
  }
  return `${window.location.origin}/view/${id}`
}

export function getSharePageUrl(
  id: string,
  pageIndex: number,
  branding?: BrandingConfig,
): string {
  const brandedOrigin = branding ? getBrandedShareOrigin(branding) : null
  const url = brandedOrigin
    ? new URL(`${brandedOrigin}/`)
    : new URL(`${window.location.origin}/view/${id}`)
  url.searchParams.set('page', String(pageIndex + 1))
  return url.toString()
}

export function getEmbedUrl(
  id: string,
  options?: { hideChrome?: boolean; branding?: BrandingConfig },
): string {
  const brandedOrigin = options?.branding ? getBrandedShareOrigin(options.branding) : null
  const base = brandedOrigin ?? window.location.origin
  const url = new URL(`${base}/embed/${id}`)
  if (options?.hideChrome) {
    url.searchParams.set('chrome', '0')
  }
  return url.toString()
}

export function getEmbedCode(
  id: string,
  options?: {
    width?: number
    height?: number
    hideChrome?: boolean
    branding?: BrandingConfig
    title?: string
  },
): string {
  const width = options?.width ?? 800
  const height = options?.height ?? 600
  const src = getEmbedUrl(id, {
    hideChrome: options?.hideChrome ?? options?.branding?.hidePlatformChrome,
    branding: options?.branding,
  })
  const title = options?.title ?? 'Flipbook'
  return `<iframe src="${src}" width="${width}" height="${height}" style="border:0;" allowfullscreen loading="lazy" title="${title}"></iframe>`
}

export function getPdfUrl(id: string): string {
  const token = getAccessToken(id)
  const base = `${API_BASE}/flipbooks/${id}/pdf`
  return token ? `${base}?t=${encodeURIComponent(token)}` : base
}

export async function fetchFlipbookAnalytics(id: string): Promise<AnalyticsSummary> {
  const response = await fetch(`${API_BASE}/flipbooks/${id}/analytics`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Failed to load analytics')
  }
  return response.json() as Promise<AnalyticsSummary>
}
