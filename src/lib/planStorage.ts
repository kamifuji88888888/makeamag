import type { BrandingConfig, LeadCaptureConfig, MonetizationConfig } from '../../shared/flipbook'
import { DEFAULT_BRANDING, DEFAULT_LEAD_CAPTURE, DEFAULT_MONETIZATION, normalizeLeadCapture, normalizeMonetization } from '../../shared/flipbook'
import type { PlanId } from '../../shared/plans'
import { getPlan, maxPdfUploadBytes, planHasFeature, type PlanFeature } from '../../shared/plans'
import { getLibraryEntries, getLibraryFolders } from './libraryStorage'

const PLAN_KEY = 'makeamag_plan'

export interface PlanUsage {
  flipbookCount: number
  folderCount: number
}

export function getStoredPlan(): PlanId {
  // Local dev defaults to Pro so paid-tier features can be tested without Stripe.
  if (import.meta.env.DEV) {
    return 'pro'
  }

  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (raw === 'starter' || raw === 'pro' || raw === 'publisher' || raw === 'free') {
      return raw
    }
  } catch {
    // ignore
  }
  return 'free'
}

export function setStoredPlan(planId: PlanId): void {
  localStorage.setItem(PLAN_KEY, planId)
}

export function getPlanUsage(): PlanUsage {
  return {
    flipbookCount: getLibraryEntries().length,
    folderCount: getLibraryFolders().length,
  }
}

export function canUsePlanFeature(planId: PlanId, feature: PlanFeature): boolean {
  return planHasFeature(planId, feature)
}

export function canAddFlipbook(planId: PlanId, usage = getPlanUsage()): boolean {
  return usage.flipbookCount < getPlan(planId).limits.maxFlipbooks
}

export function canAddFolder(planId: PlanId, usage = getPlanUsage()): boolean {
  if (!planHasFeature(planId, 'folders')) return false
  return usage.folderCount < getPlan(planId).limits.maxFolders
}

export function isPageCountAllowed(planId: PlanId, pageCount: number): boolean {
  return pageCount <= getPlan(planId).limits.maxPagesPerFlipbook
}

export function isVideoEmbedAllowed(planId: PlanId, currentCount: number): boolean {
  if (!planHasFeature(planId, 'videoEmbeds')) return currentCount === 0
  return currentCount < getPlan(planId).limits.maxVideoEmbedsPerFlipbook
}

export function isPdfSizeAllowed(planId: PlanId, byteSize: number): boolean {
  return byteSize <= maxPdfUploadBytes(planId)
}

export function maxVideoEmbedsForPlan(planId: PlanId): number {
  return getPlan(planId).limits.maxVideoEmbedsPerFlipbook
}

export function analyticsDaysForPlan(planId: PlanId): number {
  return getPlan(planId).limits.analyticsRetentionDays
}

export function planLimitMessage(planId: PlanId, kind: 'flipbooks' | 'pages' | 'videos' | 'folders' | 'fileSize' | 'feature', detail?: string): string {
  const plan = getPlan(planId)
  switch (kind) {
    case 'flipbooks':
      return `Your ${plan.name} plan includes up to ${plan.limits.maxFlipbooks} flipbooks. Upgrade to add more.`
    case 'pages':
      return `Your ${plan.name} plan supports up to ${plan.limits.maxPagesPerFlipbook} pages per flipbook.${detail ? ` This PDF has ${detail} pages.` : ''}`
    case 'fileSize':
      return `Your ${plan.name} plan supports PDFs up to ${plan.limits.maxPdfUploadMb} MB.${detail ? ` This file is ${detail}.` : ''}`
    case 'videos':
      return plan.limits.maxVideoEmbedsPerFlipbook === 0
        ? 'Video embeds are available on Starter and above.'
        : `Your ${plan.name} plan allows ${plan.limits.maxVideoEmbedsPerFlipbook} video embeds per flipbook. Upgrade for more.`
    case 'folders':
      return planHasFeature(planId, 'folders')
        ? `Your ${plan.name} plan includes up to ${plan.limits.maxFolders} folders.`
        : 'Folders are available on Starter and above.'
    case 'feature':
      return `${detail ?? 'This feature'} requires an upgrade.`
    default:
      return 'Upgrade your plan to continue.'
  }
}

export function sanitizeBrandingForPlan(branding: BrandingConfig, planId: PlanId): BrandingConfig {
  if (!planHasFeature(planId, 'customBranding')) {
    return { ...DEFAULT_BRANDING }
  }

  const next = { ...branding }

  if (!planHasFeature(planId, 'whiteLabel')) {
    next.hidePlatformChrome = false
  }

  if (!planHasFeature(planId, 'customDomain')) {
    next.customDomain = ''
  }

  return next
}

export function sanitizeMonetizationForPlan(
  monetization: MonetizationConfig,
  planId: PlanId,
): MonetizationConfig {
  if (!planHasFeature(planId, 'readerMonetization')) {
    return { ...DEFAULT_MONETIZATION }
  }
  return normalizeMonetization(monetization)
}

export function sanitizeLeadCaptureForPlan(
  leadCapture: LeadCaptureConfig,
  planId: PlanId,
): LeadCaptureConfig {
  if (!planHasFeature(planId, 'leadCapture')) {
    return { ...DEFAULT_LEAD_CAPTURE }
  }
  return normalizeLeadCapture(leadCapture)
}
