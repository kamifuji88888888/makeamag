import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { MAX_PDF_UPLOAD_BYTES, getPlan, maxPdfUploadBytes, parsePlanId } from '../shared/plans.js'
import type { AnalyticsEventInput } from '../shared/analytics.js'
import type {
  BrandingConfig,
  FlipbookStoredMeta,
  LeadCaptureConfig,
  LinkHotspot,
  MonetizationConfig,
  PublicationInfo,
  TocEntry,
  VideoEmbed,
} from '../shared/flipbook.js'
import {
  DEFAULT_BRANDING,
  DEFAULT_LEAD_CAPTURE,
  DEFAULT_MONETIZATION,
  DEFAULT_PUBLICATION,
  isValidDomain,
  normalizeBranding,
  normalizeLeadCapture,
  normalizeMonetization,
  normalizePublication,
  toPublicMeta,
} from '../shared/flipbook.js'
import {
  createAccessToken,
  createLeadCaptureToken,
  createMonetizationToken,
  extractBearerToken,
  hashPassword,
  verifyAccessToken,
  verifyMonetizationToken,
  verifyPassword,
} from './auth.js'
import { createDomainRegistry } from './domains.js'
import { createAnalyticsStore } from './analytics.js'
import { createLeadsStore, isValidLeadEmail } from './leads.js'
import { createStorage } from './storage/index.js'
import { buildAdminMetrics, isAdminAuthorized } from './adminMetrics.js'
import { createBillingStore, isBillingConfigured } from './billing.js'
import {
  createReaderCheckoutSession,
  createStripeConnectLink,
  isStripeConfigured,
  refreshStripeConnectLink,
  syncStripePrice,
  verifyStripeCheckoutSession,
} from './stripe.js'

const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const PORT = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'
const storage = createStorage()
const domains = createDomainRegistry(DATA_DIR)
const analytics = createAnalyticsStore(DATA_DIR)
const leads = createLeadsStore(DATA_DIR)
const billing = createBillingStore(DATA_DIR)

const app = express()
app.use(cors())
app.use((req, res, next) => {
  if (req.path.startsWith('/embed/') || req.path.startsWith('/view/')) {
    const ancestors = process.env.FRAME_ANCESTORS ?? '*'
    res.setHeader('Content-Security-Policy', `frame-ancestors ${ancestors}`)
  }
  next()
})

app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await billing.handleWebhook(req.body as Buffer, req.headers['stripe-signature'] as string | undefined)
    res.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook handling failed'
    res.status(400).json({ error: message })
  }
})

app.use(express.json({ limit: '1mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'))
    }
  },
})

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Logo must be PNG, JPG, WebP, or SVG'))
    }
  },
})

function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function canAccessPdf(meta: FlipbookStoredMeta, req: express.Request): boolean {
  if (!meta.passwordHash) return true
  const headerToken = extractBearerToken(req.headers.authorization)
  const queryToken = typeof req.query.t === 'string' ? req.query.t : null
  const token = headerToken ?? queryToken
  return token ? verifyAccessToken(token, meta.id) : false
}

async function syncBrandingDomain(meta: FlipbookStoredMeta) {
  const branding = normalizeBranding(meta.branding)
  meta.branding = branding
  if (branding.customDomain) {
    await domains.assign(meta.id, branding.customDomain)
  } else {
    await domains.clear(meta.id)
  }
}

app.get('/api/host-context', async (req, res) => {
  const host = req.hostname.toLowerCase()
  const canonical = (process.env.CANONICAL_HOST ?? '').toLowerCase()

  if (host === 'localhost' || host === '127.0.0.1') {
    res.json({ type: 'editor' })
    return
  }

  if (canonical && host === canonical) {
    res.json({ type: 'editor' })
    return
  }

  const flipbookId = await domains.resolve(host)
  if (flipbookId) {
    res.json({ type: 'flipbook', flipbookId })
    return
  }

  res.json({ type: 'editor' })
})

app.post('/api/flipbooks', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'PDF file is required' })
      return
    }

    const planId = parsePlanId(req.body.planId)
    const uploadLimit = maxPdfUploadBytes(planId)
    if (req.file.size > uploadLimit) {
      res.status(413).json({
        error: `PDF exceeds your ${getPlan(planId).name} plan limit of ${getPlan(planId).limits.maxPdfUploadMb} MB. Upgrade for larger uploads.`,
      })
      return
    }

    const id = uuidv4()
    let videoEmbeds: VideoEmbed[] = []
    if (req.body.videoEmbeds) {
      videoEmbeds = JSON.parse(req.body.videoEmbeds) as VideoEmbed[]
    }

    const password = typeof req.body.password === 'string' ? req.body.password.trim() : ''
    const publication = normalizePublication(
      parseJsonField<Partial<PublicationInfo>>(req.body.publication, DEFAULT_PUBLICATION),
    )
    const tableOfContents = parseJsonField<TocEntry[]>(req.body.tableOfContents, [])
    const linkHotspots = parseJsonField<LinkHotspot[]>(req.body.linkHotspots, [])
    const spreadView = req.body.spreadView === 'true' || req.body.spreadView === true
    const branding = normalizeBranding(
      parseJsonField<Partial<BrandingConfig>>(req.body.branding, DEFAULT_BRANDING),
    )
    const monetization = normalizeMonetization(
      parseJsonField<Partial<MonetizationConfig>>(req.body.monetization, DEFAULT_MONETIZATION),
    )
    const leadCapture = normalizeLeadCapture(
      parseJsonField<Partial<LeadCaptureConfig>>(req.body.leadCapture, DEFAULT_LEAD_CAPTURE),
    )
    const subscriberAccessCode =
      typeof req.body.subscriberAccessCode === 'string' ? req.body.subscriberAccessCode.trim() : ''
    const billingAccountId =
      typeof req.body.billingAccountId === 'string' ? req.body.billingAccountId.trim() : ''
    const pdfKey = await storage.savePdf(id, req.file.buffer)

    const meta: FlipbookStoredMeta = {
      id,
      fileName: req.file.originalname,
      createdAt: new Date().toISOString(),
      videoEmbeds,
      publication,
      tableOfContents,
      linkHotspots,
      spreadView,
      branding,
      monetization,
      leadCapture,
      pdfKey,
      pdfSizeBytes: req.file.size,
      ...(billingAccountId ? { billingAccountId } : {}),
      isPasswordProtected: Boolean(password),
      hasSubscriberAccess: Boolean(subscriberAccessCode),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
      ...(subscriberAccessCode
        ? { subscriberAccessHash: await hashPassword(subscriberAccessCode) }
        : {}),
    }

    await storage.saveMeta(meta)
    await syncBrandingDomain(meta)
    res.status(201).json(toPublicMeta(meta))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    res.status(500).json({ error: message })
  }
})

app.get('/api/flipbooks/:id', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }
  res.json(toPublicMeta(meta))
})

app.post('/api/flipbooks/:id/unlock', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  if (!meta.passwordHash) {
    res.json({ accessToken: createAccessToken(meta.id) })
    return
  }

  const { password } = req.body as { password?: string }
  if (!password || !(await verifyPassword(password, meta.passwordHash))) {
    res.status(401).json({ error: 'Incorrect password' })
    return
  }

  res.json({ accessToken: createAccessToken(meta.id) })
})

app.post('/api/flipbooks/:id/monetization-unlock', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  if (!meta.subscriberAccessHash) {
    res.status(400).json({ error: 'Subscriber access is not configured for this flipbook' })
    return
  }

  const { accessCode } = req.body as { accessCode?: string }
  if (!accessCode || !(await verifyPassword(accessCode.trim(), meta.subscriberAccessHash))) {
    res.status(401).json({ error: 'Incorrect access code' })
    return
  }

  res.json({ accessToken: createMonetizationToken(meta.id) })
})

app.post('/api/flipbooks/:id/lead-capture', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  const leadCapture = normalizeLeadCapture(meta.leadCapture)
  if (!leadCapture.enabled) {
    res.status(400).json({ error: 'Lead capture is not enabled for this flipbook' })
    return
  }

  const { email, consent } = req.body as { email?: string; consent?: boolean }
  if (!email?.trim() || !isValidLeadEmail(email)) {
    res.status(400).json({ error: 'A valid email address is required' })
    return
  }

  if (!consent) {
    res.status(400).json({ error: 'Consent is required to continue' })
    return
  }

  const referrer = typeof req.headers.referer === 'string' ? req.headers.referer : undefined
  await leads.addLead(meta.id, email, referrer)
  res.json({ accessToken: createLeadCaptureToken(meta.id) })
})

app.get('/api/flipbooks/:id/leads', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  const captured = await leads.listLeads(meta.id)
  res.json({ leads: captured, total: captured.length })
})

app.get('/api/flipbooks/:id/pdf', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  if (!canAccessPdf(meta, req)) {
    res.status(401).json({ error: 'Password required' })
    return
  }

  try {
    const redirectUrl = await storage.getPdfRedirectUrl(meta.id)
    if (redirectUrl) {
      res.redirect(redirectUrl)
      return
    }

    const pdf = await storage.readPdf(meta.id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${meta.fileName}"`)
    res.send(pdf)
  } catch {
    res.status(404).json({ error: 'PDF file not found' })
  }
})

app.patch('/api/flipbooks/:id', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  const {
    videoEmbeds,
    password,
    removePassword,
    publication,
    tableOfContents,
    linkHotspots,
    spreadView,
    branding,
    monetization,
    leadCapture,
    subscriberAccessCode,
    removeSubscriberAccess,
  } = req.body as {
    videoEmbeds?: VideoEmbed[]
    password?: string
    removePassword?: boolean
    publication?: Partial<PublicationInfo>
    tableOfContents?: TocEntry[]
    linkHotspots?: LinkHotspot[]
    spreadView?: boolean
    branding?: Partial<BrandingConfig>
    monetization?: Partial<MonetizationConfig>
    leadCapture?: Partial<LeadCaptureConfig>
    subscriberAccessCode?: string
    removeSubscriberAccess?: boolean
  }

  if (videoEmbeds !== undefined) {
    if (!Array.isArray(videoEmbeds)) {
      res.status(400).json({ error: 'videoEmbeds must be an array' })
      return
    }
    meta.videoEmbeds = videoEmbeds
  }

  if (publication !== undefined) {
    meta.publication = normalizePublication(publication)
  }

  if (tableOfContents !== undefined) {
    if (!Array.isArray(tableOfContents)) {
      res.status(400).json({ error: 'tableOfContents must be an array' })
      return
    }
    meta.tableOfContents = tableOfContents
  }

  if (linkHotspots !== undefined) {
    if (!Array.isArray(linkHotspots)) {
      res.status(400).json({ error: 'linkHotspots must be an array' })
      return
    }
    meta.linkHotspots = linkHotspots
  }

  if (spreadView !== undefined) {
    meta.spreadView = Boolean(spreadView)
  }

  if (branding !== undefined) {
    const normalized = normalizeBranding({ ...meta.branding, ...branding })
    if (!isValidDomain(normalized.customDomain)) {
      res.status(400).json({ error: 'Invalid custom domain' })
      return
    }
    meta.branding = normalized
  }

  if (monetization !== undefined) {
    meta.monetization = normalizeMonetization({ ...meta.monetization, ...monetization })
    if (
      meta.stripeAccountId &&
      meta.monetization.paymentMethod === 'stripe' &&
      meta.monetization.stripePriceCents > 0
    ) {
      try {
        await syncStripePrice(meta)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stripe price sync failed'
        res.status(400).json({ error: message })
        return
      }
    }
  }

  if (leadCapture !== undefined) {
    meta.leadCapture = normalizeLeadCapture({ ...meta.leadCapture, ...leadCapture })
  }

  if (removeSubscriberAccess) {
    delete meta.subscriberAccessHash
  } else if (typeof subscriberAccessCode === 'string' && subscriberAccessCode.trim()) {
    meta.subscriberAccessHash = await hashPassword(subscriberAccessCode.trim())
  }

  if (removePassword) {
    delete meta.passwordHash
  } else if (typeof password === 'string' && password.trim()) {
    meta.passwordHash = await hashPassword(password.trim())
  }

  meta.isPasswordProtected = Boolean(meta.passwordHash)
  meta.hasSubscriberAccess = Boolean(meta.subscriberAccessHash)
  await storage.saveMeta(meta)
  await syncBrandingDomain(meta)
  res.json(toPublicMeta(meta))
})

app.get('/api/admin/metrics', async (req, res) => {
  if (!isAdminAuthorized(req.headers.authorization, process.env.ADMIN_SECRET)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const metrics = await buildAdminMetrics(storage, path.join(DATA_DIR, 'billing'))
    res.json(metrics)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load admin metrics'
    res.status(500).json({ error: message })
  }
})

app.get('/api/stripe/status', (_req, res) => {
  res.json({
    configured: isStripeConfigured(),
    billingEnabled: isBillingConfigured(),
  })
})

app.get('/api/billing/status', async (req, res) => {
  const accountId = typeof req.query.accountId === 'string' ? req.query.accountId.trim() : ''
  if (!accountId) {
    res.status(400).json({ error: 'accountId is required' })
    return
  }

  try {
    const status = await billing.getStatus(accountId)
    res.json(status)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load billing status'
    res.status(500).json({ error: message })
  }
})

app.post('/api/billing/checkout', async (req, res) => {
  try {
    const { accountId, planId, billing: billingInterval, email } = req.body as {
      accountId?: string
      planId?: string
      billing?: 'monthly' | 'annual'
      email?: string
    }

    if (!accountId?.trim()) {
      res.status(400).json({ error: 'accountId is required' })
      return
    }
    if (planId !== 'starter' && planId !== 'pro' && planId !== 'publisher') {
      res.status(400).json({ error: 'A paid plan is required for checkout' })
      return
    }
    if (billingInterval !== 'monthly' && billingInterval !== 'annual') {
      res.status(400).json({ error: 'billing must be monthly or annual' })
      return
    }

    const url = await billing.createCheckoutSession(accountId.trim(), planId, billingInterval, email)
    res.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    res.status(500).json({ error: message })
  }
})

app.post('/api/billing/verify', async (req, res) => {
  try {
    const { accountId, sessionId } = req.body as { accountId?: string; sessionId?: string }
    if (!accountId?.trim() || !sessionId?.trim()) {
      res.status(400).json({ error: 'accountId and sessionId are required' })
      return
    }

    const status = await billing.verifyCheckoutSession(accountId.trim(), sessionId.trim())
    res.json(status)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify checkout session'
    res.status(400).json({ error: message })
  }
})

app.post('/api/billing/portal', async (req, res) => {
  try {
    const { accountId } = req.body as { accountId?: string }
    if (!accountId?.trim()) {
      res.status(400).json({ error: 'accountId is required' })
      return
    }

    const url = await billing.createPortalSession(accountId.trim())
    res.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open billing portal'
    res.status(500).json({ error: message })
  }
})

app.post('/api/flipbooks/:id/stripe/connect', async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Stripe is not configured on this server' })
      return
    }

    const meta = await storage.readMeta(req.params.id)
    if (!meta) {
      res.status(404).json({ error: 'Flipbook not found' })
      return
    }

    const url = await createStripeConnectLink(meta)
    await storage.saveMeta(meta)
    res.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Stripe connect'
    res.status(500).json({ error: message })
  }
})

app.get('/api/stripe/return', async (req, res) => {
  const flipbookId = typeof req.query.flipbookId === 'string' ? req.query.flipbookId : ''
  const redirect = `${clientUrl.replace(/\/$/, '')}/?stripeConnected=${encodeURIComponent(flipbookId)}`
  res.redirect(redirect)
})

app.get('/api/stripe/refresh', async (req, res) => {
  try {
    const flipbookId = typeof req.query.flipbookId === 'string' ? req.query.flipbookId : ''
    const meta = await storage.readMeta(flipbookId)
    if (!meta) {
      res.status(404).json({ error: 'Flipbook not found' })
      return
    }

    const url = await refreshStripeConnectLink(meta)
    res.redirect(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh Stripe connect'
    res.status(500).json({ error: message })
  }
})

app.post('/api/flipbooks/:id/stripe-checkout', async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Stripe is not configured on this server' })
      return
    }

    const meta = await storage.readMeta(req.params.id)
    if (!meta) {
      res.status(404).json({ error: 'Flipbook not found' })
      return
    }

    const { mode } = req.body as { mode?: 'view' | 'embed' }
    const url = await createReaderCheckoutSession(meta, mode === 'embed' ? 'embed' : 'view')
    res.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create checkout'
    res.status(500).json({ error: message })
  }
})

app.post('/api/flipbooks/:id/stripe-verify', async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      res.status(503).json({ error: 'Stripe is not configured on this server' })
      return
    }

    const meta = await storage.readMeta(req.params.id)
    if (!meta) {
      res.status(404).json({ error: 'Flipbook not found' })
      return
    }

    const { sessionId } = req.body as { sessionId?: string }
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' })
      return
    }

    const paid = await verifyStripeCheckoutSession(meta, sessionId)
    if (!paid) {
      res.status(402).json({ error: 'Payment not completed' })
      return
    }

    res.json({ accessToken: createMonetizationToken(meta.id) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment'
    res.status(500).json({ error: message })
  }
})

app.post('/api/flipbooks/:id/logo', logoUpload.single('logo'), async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'Logo file is required' })
    return
  }

  await storage.saveLogo(meta.id, req.file.buffer, req.file.mimetype)
  meta.branding = normalizeBranding({
    ...meta.branding,
    logoUrl: `/api/flipbooks/${meta.id}/logo`,
  })
  await storage.saveMeta(meta)
  res.json(toPublicMeta(meta))
})

app.delete('/api/flipbooks/:id/logo', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  await storage.deleteLogo(meta.id)
  meta.branding = normalizeBranding({ ...meta.branding, logoUrl: '' })
  await storage.saveMeta(meta)
  res.json(toPublicMeta(meta))
})

app.get('/api/flipbooks/:id/logo', async (req, res) => {
  const logo = await storage.readLogo(req.params.id)
  if (!logo) {
    res.status(404).json({ error: 'Logo not found' })
    return
  }

  res.setHeader('Content-Type', logo.contentType)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(logo.buffer)
})

app.post('/api/flipbooks/:id/events', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  const { events } = req.body as { events?: AnalyticsEventInput[] }
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: 'events must be a non-empty array' })
    return
  }
  if (events.length > 50) {
    res.status(400).json({ error: 'Too many events in one batch' })
    return
  }

  await analytics.recordEvents(req.params.id, events)
  res.status(204).end()
})

app.get('/api/flipbooks/:id/analytics', async (req, res) => {
  const meta = await storage.readMeta(req.params.id)
  if (!meta) {
    res.status(404).json({ error: 'Flipbook not found' })
    return
  }

  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30))
  const summary = await analytics.getSummary(req.params.id, days)
  res.json(summary)
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        }
      },
    }),
  )
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MakeAMag server running on http://0.0.0.0:${PORT}`)
})
