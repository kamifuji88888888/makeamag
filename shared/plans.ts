export type PlanId = 'free' | 'starter' | 'pro' | 'publisher'

export type PlanFeature =
  | 'passwordProtection'
  | 'videoEmbeds'
  | 'customBranding'
  | 'customDomain'
  | 'analytics'
  | 'whiteLabel'
  | 'folders'
  | 'linkHotspots'
  | 'tableOfContents'
  | 'spreadView'
  | 'readerMonetization'
  | 'leadCapture'

export interface PlanLimits {
  maxFlipbooks: number
  maxPagesPerFlipbook: number
  maxVideoEmbedsPerFlipbook: number
  maxFolders: number
  maxPdfUploadMb: number
  analyticsRetentionDays: number
}

export interface PlanDefinition {
  id: PlanId
  name: string
  tagline: string
  monthlyPrice: number
  annualPrice: number
  highlighted?: boolean
  cta: string
  limits: PlanLimits
  features: PlanFeature[]
  featureBullets: string[]
}

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'publisher']

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Try MakeAMag with your first publications.',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Start free',
    limits: {
      maxFlipbooks: 3,
      maxPagesPerFlipbook: 30,
      maxVideoEmbedsPerFlipbook: 0,
      maxFolders: 0,
      maxPdfUploadMb: 15,
      analyticsRetentionDays: 0,
    },
    features: ['linkHotspots', 'tableOfContents', 'spreadView'],
    featureBullets: [
      'Up to 3 flipbooks',
      '30 pages per flipbook',
      '15 MB PDF uploads',
      'Full-screen & embed links',
      'Table of contents & link hotspots',
      'MakeAMag branding on shared views',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'For creators publishing regularly.',
    monthlyPrice: 19,
    annualPrice: 15,
    cta: 'Get Starter',
    limits: {
      maxFlipbooks: 25,
      maxPagesPerFlipbook: 150,
      maxVideoEmbedsPerFlipbook: 3,
      maxFolders: 5,
      maxPdfUploadMb: 25,
      analyticsRetentionDays: 30,
    },
    features: [
      'passwordProtection',
      'videoEmbeds',
      'folders',
      'linkHotspots',
      'tableOfContents',
      'spreadView',
      'analytics',
      'leadCapture',
    ],
    featureBullets: [
      'Up to 25 flipbooks',
      '150 pages per flipbook',
      '25 MB PDF uploads',
      'Password protection',
      'Video embeds (3 per flipbook)',
      'Folders, lead capture & 30-day analytics',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'White-label publishing for brands and magazines.',
    monthlyPrice: 49,
    annualPrice: 39,
    highlighted: true,
    cta: 'Get Pro',
    limits: {
      maxFlipbooks: 999,
      maxPagesPerFlipbook: 500,
      maxVideoEmbedsPerFlipbook: 999,
      maxFolders: 999,
      maxPdfUploadMb: 100,
      analyticsRetentionDays: 90,
    },
    features: [
      'passwordProtection',
      'videoEmbeds',
      'customBranding',
      'customDomain',
      'analytics',
      'whiteLabel',
      'folders',
      'linkHotspots',
      'tableOfContents',
      'spreadView',
      'readerMonetization',
      'leadCapture',
    ],
    featureBullets: [
      'Unlimited flipbooks',
      '500 pages per flipbook',
      '100 MB PDF uploads',
      'Custom logo, colors & domain',
      'White-label viewer (no MakeAMag chrome)',
      'Reader paywall & preview pages',
      'Full analytics & unlimited videos',
    ],
  },
  publisher: {
    id: 'publisher',
    name: 'Publisher',
    tagline: 'Teams managing catalogs, issues, and client work.',
    monthlyPrice: 99,
    annualPrice: 79,
    cta: 'Contact sales',
    limits: {
      maxFlipbooks: 999,
      maxPagesPerFlipbook: 999,
      maxVideoEmbedsPerFlipbook: 999,
      maxFolders: 999,
      maxPdfUploadMb: 250,
      analyticsRetentionDays: 365,
    },
    features: [
      'passwordProtection',
      'videoEmbeds',
      'customBranding',
      'customDomain',
      'analytics',
      'whiteLabel',
      'folders',
      'linkHotspots',
      'tableOfContents',
      'spreadView',
      'readerMonetization',
      'leadCapture',
    ],
    featureBullets: [
      'Everything in Pro',
      '250 MB PDF uploads',
      'Reader paywall & preview pages',
      'Team workspaces (coming soon)',
      'Priority support',
      '365-day analytics retention',
      'Volume & SSO options',
    ],
  },
}

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId]
}

export function planHasFeature(planId: PlanId, feature: PlanFeature): boolean {
  return PLANS[planId].features.includes(feature)
}

export function formatPlanPrice(plan: PlanDefinition, billing: 'monthly' | 'annual'): string {
  if (plan.monthlyPrice === 0) return '$0'
  const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice
  return `$${price}`
}

export function minimumPlanForFeature(feature: PlanFeature): PlanId {
  for (const id of PLAN_ORDER) {
    if (planHasFeature(id, feature)) return id
  }
  return 'publisher'
}

export function planDisplayName(planId: PlanId): string {
  return PLANS[planId].name
}

export function maxPdfUploadBytes(planId: PlanId): number {
  return PLANS[planId].limits.maxPdfUploadMb * 1024 * 1024
}

export const MAX_PDF_UPLOAD_BYTES = Math.max(
  ...PLAN_ORDER.map((id) => maxPdfUploadBytes(id)),
)

export function parsePlanId(raw: unknown): PlanId {
  if (raw === 'free' || raw === 'starter' || raw === 'pro' || raw === 'publisher') {
    return raw
  }
  return 'free'
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
