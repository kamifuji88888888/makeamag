import fs from 'fs/promises'
import path from 'path'
import type Stripe from 'stripe'
import type { BillingAccountStatus, BillingInterval, BillingStatus } from '../shared/billing.js'
import { isPaidPlan } from '../shared/billing.js'
import type { PlanId } from '../shared/plans.js'
import { parsePlanId } from '../shared/plans.js'
import { getStripeClient, isStripeConfigured } from './stripe.js'

export interface BillingRecord {
  accountId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  planId: PlanId
  billingInterval: BillingInterval | null
  status: BillingStatus
  updatedAt: string
}

const PRICE_ENV: Record<Exclude<PlanId, 'free'>, Record<BillingInterval, string>> = {
  starter: {
    monthly: 'STRIPE_PRICE_STARTER_MONTHLY',
    annual: 'STRIPE_PRICE_STARTER_ANNUAL',
  },
  pro: {
    monthly: 'STRIPE_PRICE_PRO_MONTHLY',
    annual: 'STRIPE_PRICE_PRO_ANNUAL',
  },
  publisher: {
    monthly: 'STRIPE_PRICE_PUBLISHER_MONTHLY',
    annual: 'STRIPE_PRICE_PUBLISHER_ANNUAL',
  },
}

const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'

function appOrigin() {
  return clientUrl.replace(/\/$/, '')
}

function priceIdFromEnv(planId: PlanId, billing: BillingInterval): string | null {
  if (planId === 'free') return null
  const envKey = PRICE_ENV[planId][billing]
  return process.env[envKey]?.trim() || null
}

function planFromPriceId(priceId: string): { planId: PlanId; billing: BillingInterval } | null {
  for (const planId of ['starter', 'pro', 'publisher'] as const) {
    for (const billing of ['monthly', 'annual'] as const) {
      if (priceIdFromEnv(planId, billing) === priceId) {
        return { planId, billing }
      }
    }
  }
  return null
}

export function isBillingConfigured(): boolean {
  if (!isStripeConfigured()) return false
  return Boolean(
    priceIdFromEnv('starter', 'monthly') ||
      priceIdFromEnv('starter', 'annual') ||
      priceIdFromEnv('pro', 'monthly') ||
      priceIdFromEnv('pro', 'annual'),
  )
}

function subscriptionStatus(raw: Stripe.Subscription.Status): BillingStatus {
  if (raw === 'active' || raw === 'trialing') return raw
  if (raw === 'past_due' || raw === 'unpaid') return 'past_due'
  if (raw === 'canceled' || raw === 'incomplete_expired') return 'canceled'
  return 'incomplete'
}

function isActiveStatus(status: BillingStatus): boolean {
  return status === 'active' || status === 'trialing'
}

export function createBillingStore(dataDir: string) {
  const billingDir = path.join(dataDir, 'billing')

  async function ensureDir() {
    await fs.mkdir(billingDir, { recursive: true })
  }

  function filePath(accountId: string) {
    return path.join(billingDir, `${accountId}.json`)
  }

  async function readRecord(accountId: string): Promise<BillingRecord | null> {
    try {
      const raw = await fs.readFile(filePath(accountId), 'utf-8')
      return JSON.parse(raw) as BillingRecord
    } catch {
      return null
    }
  }

  async function writeRecord(record: BillingRecord): Promise<void> {
    await ensureDir()
    await fs.writeFile(filePath(record.accountId), JSON.stringify(record, null, 2))
  }

  async function getOrCreateRecord(accountId: string): Promise<BillingRecord> {
    const existing = await readRecord(accountId)
    if (existing) return existing

    const record: BillingRecord = {
      accountId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planId: 'free',
      billingInterval: null,
      status: 'none',
      updatedAt: new Date().toISOString(),
    }
    await writeRecord(record)
    return record
  }

  function toStatus(record: BillingRecord): BillingAccountStatus {
    const effectivePlanId =
      isActiveStatus(record.status) && isPaidPlan(record.planId) ? record.planId : 'free'

    return {
      accountId: record.accountId,
      planId: effectivePlanId,
      billingInterval: record.billingInterval,
      status: record.status,
      hasSubscription: Boolean(record.stripeSubscriptionId),
      billingEnabled: isBillingConfigured(),
    }
  }

  async function syncFromSubscription(
    accountId: string,
    subscription: Stripe.Subscription,
  ): Promise<BillingRecord> {
    const record = await getOrCreateRecord(accountId)
    const priceId = subscription.items.data[0]?.price.id
    const mapped = priceId ? planFromPriceId(priceId) : null
    const metaPlanId = parsePlanId(subscription.metadata.planId)

    record.stripeSubscriptionId = subscription.id
    record.stripeCustomerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    record.planId = mapped?.planId ?? metaPlanId
    record.billingInterval = mapped?.billing ?? record.billingInterval
    record.status = subscriptionStatus(subscription.status)
    record.updatedAt = new Date().toISOString()

    if (!isActiveStatus(record.status)) {
      record.planId = 'free'
    }

    await writeRecord(record)
    return record
  }

  return {
    async getStatus(accountId: string): Promise<BillingAccountStatus> {
      const record = await getOrCreateRecord(accountId)
      return toStatus(record)
    },

    async createCheckoutSession(
      accountId: string,
      planId: PlanId,
      billing: BillingInterval,
      email?: string,
    ): Promise<string> {
      if (!isBillingConfigured()) {
        throw new Error('Plan billing is not configured on this server')
      }
      if (!isPaidPlan(planId)) {
        throw new Error('This plan does not require checkout')
      }

      const priceId = priceIdFromEnv(planId, billing)
      if (!priceId) {
        throw new Error(`Stripe price is not configured for ${planId} (${billing})`)
      }

      const stripe = getStripeClient()
      const record = await getOrCreateRecord(accountId)

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: record.stripeCustomerId ?? undefined,
        customer_email: record.stripeCustomerId ? undefined : email?.trim() || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appOrigin()}/pricing?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appOrigin()}/pricing?billing=canceled`,
        metadata: {
          accountId,
          planId,
          billing,
        },
        subscription_data: {
          metadata: {
            accountId,
            planId,
            billing,
          },
        },
      })

      if (!session.url) {
        throw new Error('Failed to create Stripe checkout session')
      }

      return session.url
    },

    async verifyCheckoutSession(accountId: string, sessionId: string): Promise<BillingAccountStatus> {
      const stripe = getStripeClient()
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      })

      if (session.metadata?.accountId !== accountId) {
        throw new Error('Checkout session does not match this account')
      }
      if (session.status !== 'complete') {
        throw new Error('Checkout was not completed')
      }

      const record = await getOrCreateRecord(accountId)
      if (session.customer && typeof session.customer === 'string') {
        record.stripeCustomerId = session.customer
      }

      const subscription = session.subscription
      if (subscription && typeof subscription !== 'string') {
        await syncFromSubscription(accountId, subscription)
      } else if (typeof subscription === 'string') {
        const full = await stripe.subscriptions.retrieve(subscription)
        await syncFromSubscription(accountId, full)
      } else {
        record.planId = parsePlanId(session.metadata?.planId)
        record.billingInterval = (session.metadata?.billing as BillingInterval | undefined) ?? null
        record.status = 'active'
        record.updatedAt = new Date().toISOString()
        await writeRecord(record)
      }

      const updated = await readRecord(accountId)
      return toStatus(updated ?? record)
    },

    async createPortalSession(accountId: string): Promise<string> {
      const record = await getOrCreateRecord(accountId)
      if (!record.stripeCustomerId) {
        throw new Error('No billing account found. Subscribe to a plan first.')
      }

      const stripe = getStripeClient()
      const session = await stripe.billingPortal.sessions.create({
        customer: record.stripeCustomerId,
        return_url: `${appOrigin()}/pricing`,
      })

      return session.url
    },

    async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
      }
      if (!signature) {
        throw new Error('Missing Stripe signature header')
      }

      const stripe = getStripeClient()
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const accountId = session.metadata?.accountId
          if (!accountId) break

          const record = await getOrCreateRecord(accountId)
          if (session.customer && typeof session.customer === 'string') {
            record.stripeCustomerId = session.customer
          }
          if (session.subscription && typeof session.subscription === 'string') {
            record.stripeSubscriptionId = session.subscription
          }
          record.planId = parsePlanId(session.metadata?.planId)
          record.billingInterval = (session.metadata?.billing as BillingInterval | undefined) ?? null
          record.status = 'active'
          record.updatedAt = new Date().toISOString()
          await writeRecord(record)
          break
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          const accountId = subscription.metadata?.accountId
          if (!accountId) break
          await syncFromSubscription(accountId, subscription)
          break
        }
        default:
          break
      }
    },
  }
}
