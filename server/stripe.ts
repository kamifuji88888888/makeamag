import Stripe from 'stripe'
import type { FlipbookStoredMeta } from '../shared/flipbook.js'
import {
  displayTitle,
  formatStripePriceLabel,
  normalizeMonetization,
} from '../shared/flipbook.js'

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? ''
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'
const serverUrl = process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3001}`

let stripeClient: Stripe | null = null

export function isStripeConfigured(): boolean {
  return Boolean(stripeSecret)
}

function getStripe(): Stripe {
  if (!stripeSecret) {
    throw new Error('Stripe is not configured on this server')
  }
  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecret)
  }
  return stripeClient
}

function appOrigin() {
  return clientUrl.replace(/\/$/, '')
}

function serverOrigin() {
  return serverUrl.replace(/\/$/, '')
}

export async function createStripeConnectLink(meta: FlipbookStoredMeta): Promise<string> {
  const stripe = getStripe()
  let accountId = meta.stripeAccountId

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        flipbookId: meta.id,
      },
    })
    accountId = account.id
    meta.stripeAccountId = accountId
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${serverOrigin()}/api/stripe/refresh?flipbookId=${meta.id}`,
    return_url: `${serverOrigin()}/api/stripe/return?flipbookId=${meta.id}`,
    type: 'account_onboarding',
  })

  return link.url
}

export async function refreshStripeConnectLink(meta: FlipbookStoredMeta): Promise<string> {
  const stripe = getStripe()
  if (!meta.stripeAccountId) {
    return createStripeConnectLink(meta)
  }

  const link = await stripe.accountLinks.create({
    account: meta.stripeAccountId,
    refresh_url: `${serverOrigin()}/api/stripe/refresh?flipbookId=${meta.id}`,
    return_url: `${serverOrigin()}/api/stripe/return?flipbookId=${meta.id}`,
    type: 'account_onboarding',
  })

  return link.url
}

export async function syncStripePrice(meta: FlipbookStoredMeta): Promise<void> {
  const stripe = getStripe()
  if (!meta.stripeAccountId) return

  const monetization = normalizeMonetization(meta.monetization)
  if (monetization.stripePriceCents <= 0) return

  const title = displayTitle(meta)
  const stripeAccount = meta.stripeAccountId

  let productId = meta.stripeProductId
  if (!productId) {
    const product = await stripe.products.create(
      {
        name: title,
        metadata: { flipbookId: meta.id },
      },
      { stripeAccount },
    )
    productId = product.id
    meta.stripeProductId = productId
  } else {
    await stripe.products.update(
      productId,
      { name: title },
      { stripeAccount },
    )
  }

  const price = await stripe.prices.create(
    {
      product: productId,
      unit_amount: monetization.stripePriceCents,
      currency: 'usd',
      ...(monetization.stripeMode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
    },
    { stripeAccount },
  )

  meta.stripePriceId = price.id
  meta.monetization = {
    ...monetization,
    priceLabel: formatStripePriceLabel(monetization.stripePriceCents, monetization.stripeMode),
  }
}

export async function createReaderCheckoutSession(
  meta: FlipbookStoredMeta,
  mode: 'view' | 'embed',
): Promise<string> {
  const stripe = getStripe()
  if (!meta.stripeAccountId || !meta.stripePriceId) {
    throw new Error('Stripe checkout is not configured for this flipbook')
  }

  const monetization = normalizeMonetization(meta.monetization)
  const title = displayTitle(meta)
  const viewPath = mode === 'embed' ? `/embed/${meta.id}` : `/view/${meta.id}`

  const session = await stripe.checkout.sessions.create(
    {
      mode: monetization.stripeMode === 'subscription' ? 'subscription' : 'payment',
      line_items: [{ price: meta.stripePriceId, quantity: 1 }],
      success_url: `${appOrigin()}${viewPath}?stripe_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin()}${viewPath}`,
      metadata: {
        flipbookId: meta.id,
      },
    },
    { stripeAccount: meta.stripeAccountId },
  )

  if (!session.url) {
    throw new Error('Failed to create Stripe checkout session')
  }

  return session.url
}

export async function verifyStripeCheckoutSession(
  meta: FlipbookStoredMeta,
  sessionId: string,
): Promise<boolean> {
  const stripe = getStripe()
  if (!meta.stripeAccountId) return false

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    stripeAccount: meta.stripeAccountId,
  })

  return (
    session.metadata?.flipbookId === meta.id &&
    session.status === 'complete' &&
    session.payment_status === 'paid'
  )
}
