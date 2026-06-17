import type { CSSProperties } from 'react'
import type { BrandingConfig } from '../../shared/flipbook'
import { normalizeBranding } from '../../shared/flipbook'

export function brandingScopeStyle(branding: BrandingConfig): CSSProperties | undefined {
  const normalized = normalizeBranding(branding)
  if (!normalized.accentColor) return undefined
  return {
    ['--color-apple-blue' as string]: normalized.accentColor,
    ['--color-apple-blue-hover' as string]: normalized.accentColor,
  }
}

export function getBrandedShareOrigin(branding: BrandingConfig): string | null {
  const domain = normalizeBranding(branding).customDomain
  if (!domain) return null
  return `https://${domain}`
}

export function getLogoApiUrl(flipbookId: string): string {
  return `/api/flipbooks/${flipbookId}/logo`
}

export function resolveLogoUrl(flipbookId: string, branding: BrandingConfig): string {
  const normalized = normalizeBranding(branding)
  if (normalized.logoUrl.startsWith('http') || normalized.logoUrl.startsWith('data:')) {
    return normalized.logoUrl
  }
  if (normalized.logoUrl) {
    return normalized.logoUrl
  }
  return getLogoApiUrl(flipbookId)
}

export function getCanonicalHost(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname.toLowerCase()
}

export function isCustomDomainHost(host: string, canonicalHost?: string): boolean {
  const normalized = host.toLowerCase()
  if (!normalized || normalized === 'localhost' || normalized === '127.0.0.1') {
    return false
  }
  if (canonicalHost && normalized === canonicalHost.toLowerCase()) {
    return false
  }
  return true
}

export function getDnsTarget(): string {
  const configured = import.meta.env.VITE_CANONICAL_HOST as string | undefined
  if (configured) return configured
  if (typeof window !== 'undefined') {
    return window.location.host
  }
  return 'your-flipbook-host.com'
}
