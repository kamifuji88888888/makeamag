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
  PopUpPanel,
  PopUpPanelStyle,
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
  normalizePopUpPanelStyle,
  normalizePopUpPanels,
  normalizePublication,
  toPublicMeta,
} from '../shared/flipbook.js'
import {
  clearSessionCookie,
  createAccessToken,
  createLeadCaptureToken,
  createMagicLinkToken,
  createMonetizationToken,
  createPasswordResetToken,
  createSessionToken,
  extractBearerToken,
  hashPassword,
  readSessionFromRequest,
  setSessionCookie,
  verifyAccessToken,
  verifyMagicLinkToken,
  verifyMonetizationToken,
  verifyPassword,
  verifyPasswordResetToken,
} from './auth.js'
import { sendMagicLinkEmail, sendPasswordResetEmail, isAuthEmailEnabled, isMagicLinkEnabled, authEmailProvider } from './email.js'
import { createUsersStore, type UserRecord } from './users.js'
import { createDomainRegistry } from './domains.js'
import { createAnalyticsStore } from './analytics.js'
import { createLeadsStore, isValidLeadEmail } from './leads.js'
import { createStorage } from './storage/index.js'
import { buildAdminMetrics, isAdminAuthorized } from './adminMetrics.js'
import { createBillingStore, isBillingConfigured } from './billing.js'
import {
  founderBillingStatus,
  isPlanOverrideEmail,
  planOverrideEmails,
} from './founderAccess.js'
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
const users = createUsersStore(DATA_DIR)

const billing = createBillingStore(DATA_DIR, {
  async matchPlanOverride(accountId) {
    const accountUser = await users.findByBillingAccountId(accountId)
    if (accountUser && isPlanOverrideEmail(accountUser.email)) {
      return true
    }

    for (const email of planOverrideEmails()) {
      const user = await users.findByEmail(email)
      if (user?.billingAccountId === accountId) {
        return true
      }
    }
    return false
  },
})

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

function canEditFlipbook(
  meta: FlipbookStoredMeta,
  session: ReturnType<typeof readSessionFromRequest>,
): boolean {
  if (!meta.ownerId) return true
  return session?.userId === meta.ownerId
}

function billingAccountForSession(
  session: ReturnType<typeof readSessionFromRequest>,
  fallback?: string,
): string {
  if (session?.billingAccountId) return session.billingAccountId
  return fallback?.trim() || ''
}

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

function startUserSession(res: express.Response, user: UserRecord) {
  const sessionToken = createSessionToken({
    userId: user.id,
    email: user.email,
    billingAccountId: user.billingAccountId,
  })
  setSessionCookie(res, sessionToken, isProduction)
  return users.toPublic(user)
}

app.get('/api/auth/config', (_req, res) => {
  res.json({
    magicLinkEnabled: isMagicLinkEnabled(),
    passwordResetEnabled: isAuthEmailEnabled(),
    emailProvider: authEmailProvider(),
  })
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, billingAccountId } = req.body as {
      email?: string
      password?: string
      billingAccountId?: string
    }
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const user = await users.createWithPassword(email, password, billingAccountId?.trim())
    res.status(201).json({ user: startUserSession(res, user) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create account'
    const status = message.includes('already exists') ? 409 : 400
    res.status(status).json({ error: message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const user = await users.authenticateWithPassword(email, password)
    if (!user) {
      res.status(401).json({ error: 'Incorrect email or password' })
      return
    }

    res.json({ user: startUserSession(res, user) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sign in'
    res.status(500).json({ error: message })
  }
})

app.post('/api/auth/magic-link', async (req, res) => {
  try {
    if (!isMagicLinkEnabled() && process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'Email sign-in is not enabled on this server' })
      return
    }

    const { email } = req.body as {
      email?: string
    }
    if (!email?.trim() || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required' })
      return
    }

    const token = createMagicLinkToken(email)
    const delivery = await sendMagicLinkEmail(email.trim(), token)
    res.json({
      ok: true,
      delivered: delivery.delivered,
      ...(delivery.devLink ? { devLink: delivery.devLink } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send sign-in link'
    res.status(500).json({ error: message })
  }
})

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token, billingAccountId } = req.body as {
      token?: string
      billingAccountId?: string
    }
    if (!token?.trim()) {
      res.status(400).json({ error: 'Sign-in token is required' })
      return
    }

    const email = verifyMagicLinkToken(token.trim())
    if (!email) {
      res.status(400).json({ error: 'This sign-in link is invalid or has expired' })
      return
    }

    const user = await users.findOrCreate(email, billingAccountId?.trim())
    res.json({ user: startUserSession(res, user) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify sign-in link'
    res.status(500).json({ error: message })
  }
})

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    if (!isAuthEmailEnabled() && process.env.NODE_ENV === 'production') {
      res.status(503).json({
        error:
          'Password reset email is not configured yet. Set AUTH_EMAIL_FROM and AWS credentials for Amazon SES, then redeploy.',
      })
      return
    }

    const { email } = req.body as { email?: string }
    if (!email?.trim() || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required' })
      return
    }

    const normalized = email.trim().toLowerCase()
    const user = await users.findByEmail(normalized)
    if (user?.passwordHash) {
      const token = createPasswordResetToken(normalized)
      const delivery = await sendPasswordResetEmail(normalized, token)
      res.json({
        ok: true,
        delivered: delivery.delivered,
        ...(delivery.devLink ? { devLink: delivery.devLink } : {}),
      })
      return
    }

    res.json({ ok: true, delivered: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send password reset email'
    res.status(500).json({ error: message })
  }
})

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string }
    if (!token?.trim()) {
      res.status(400).json({ error: 'Reset token is required' })
      return
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    const email = verifyPasswordResetToken(token.trim())
    if (!email) {
      res.status(400).json({ error: 'This reset link is invalid or has expired' })
      return
    }

    const user = await users.updatePassword(email, password)
    if (!user) {
      res.status(400).json({ error: 'This reset link is invalid or has expired' })
      return
    }

    res.json({ user: startUserSession(res, user) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password'
    res.status(500).json({ error: message })
  }
})

app.get('/api/auth/me', async (req, res) => {
  const session = readSessionFromRequest(req)
  if (!session) {
    res.status(401).json({ error: 'Not signed in' })
    return
  }

  const user = await users.findById(session.userId)
  if (!user) {
    clearSessionCookie(res, isProduction)
    res.status(401).json({ error: 'Not signed in' })
    return
  }

  res.json({ user: users.toPublic(user) })
})

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res, isProduction)
  res.status(204).end()
})

app.get('/api/auth/flipbooks', async (req, res) => {
  const session = readSessionFromRequest(req)
  if (!session) {
    res.status(401).json({ error: 'Sign in to view your published flipbooks' })
    return
  }

  const all = await storage.listAllMeta()
  const owned = all
    .filter((meta) => meta.ownerId === session.userId)
    .map((meta) => ({
      id: meta.id,
      fileName: meta.fileName,
      createdAt: meta.createdAt,
      publication: meta.publication,
      isPasswordProtected: meta.isPasswordProtected,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  res.json({ flipbooks: owned })
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
    const popUpPanels = normalizePopUpPanels(parseJsonField<PopUpPanel[]>(req.body.popUpPanels, []))
    const popUpPanelStyle = normalizePopUpPanelStyle(
      parseJsonField<Partial<PopUpPanelStyle>>(req.body.popUpPanelStyle, undefined),
    )
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
    const session = readSessionFromRequest(req)
    const billingAccountId = billingAccountForSession(
      session,
      typeof req.body.billingAccountId === 'string' ? req.body.billingAccountId : '',
    )
    const pdfKey = await storage.savePdf(id, req.file.buffer)

    const meta: FlipbookStoredMeta = {
      id,
      fileName: req.file.originalname,
      createdAt: new Date().toISOString(),
      videoEmbeds,
      publication,
      tableOfContents,
      linkHotspots,
      popUpPanels,
      popUpPanelStyle,
      spreadView,
      branding,
      monetization,
      leadCapture,
      pdfKey,
      pdfSizeBytes: req.file.size,
      ...(billingAccountId ? { billingAccountId } : {}),
      ...(session ? { ownerId: session.userId } : {}),
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

  const session = readSessionFromRequest(req)
  if (!canEditFlipbook(meta, session)) {
    res.status(403).json({ error: 'You do not have permission to view leads for this flipbook' })
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

  const session = readSessionFromRequest(req)
  if (!canEditFlipbook(meta, session)) {
    res.status(403).json({ error: 'You do not have permission to edit this flipbook' })
    return
  }

  const {
    videoEmbeds,
    password,
    removePassword,
    publication,
    tableOfContents,
    linkHotspots,
    popUpPanels,
    popUpPanelStyle,
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
    popUpPanels?: PopUpPanel[]
    popUpPanelStyle?: Partial<PopUpPanelStyle>
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

  if (popUpPanels !== undefined) {
    if (!Array.isArray(popUpPanels)) {
      res.status(400).json({ error: 'popUpPanels must be an array' })
      return
    }
    meta.popUpPanels = normalizePopUpPanels(popUpPanels)
  }

  if (popUpPanelStyle !== undefined) {
    meta.popUpPanelStyle = normalizePopUpPanelStyle(popUpPanelStyle)
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
    const session = readSessionFromRequest(req)
    if (session && isPlanOverrideEmail(session.email)) {
      res.json(founderBillingStatus(accountId))
      return
    }

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

    const session = readSessionFromRequest(req)
    if (!canEditFlipbook(meta, session)) {
      res.status(403).json({ error: 'You do not have permission to edit this flipbook' })
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

  const session = readSessionFromRequest(req)
  if (!canEditFlipbook(meta, session)) {
    res.status(403).json({ error: 'You do not have permission to edit this flipbook' })
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

  const session = readSessionFromRequest(req)
  if (!canEditFlipbook(meta, session)) {
    res.status(403).json({ error: 'You do not have permission to edit this flipbook' })
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

  const session = readSessionFromRequest(req)
  if (!canEditFlipbook(meta, session)) {
    res.status(403).json({ error: 'You do not have permission to view analytics for this flipbook' })
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
