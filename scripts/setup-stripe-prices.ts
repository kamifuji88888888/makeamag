/**
 * Creates MakeAMag subscription products/prices in Stripe and prints Railway env vars.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup-prim *
 * Re-running is safe — existing products/prices are reused via metadata lookup.
 */
import Stripe from 'stripe'
import { PLANS, type PlanId } from '../shared/plans.js'

type PaidPlanId = Exclude<PlanId, 'free'>

const PAID_PLANS: PaidPlanId[] = ['starter', 'pro', 'publisher']

const ENV_KEYS: Record<PaidPlanId, { monthly: string; annual: string }> = {
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

async function findProduct(stripe: Stripe, planId: PaidPlanId): Promise<Stripe.Product | null> {
  const products = await stripe.products.list({ limit: 100, active: true })
  return products.data.find((product) => product.metadata.makeamag_plan === planId) ?? null
}

async function findPrice(
  stripe: Stripe,
  productId: string,
  billing: 'monthly' | 'annual',
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  return prices.data.find((price) => price.metadata.makeamag_billing === billing) ?? null
}

async function ensureProduct(stripe: Stripe, planId: PaidPlanId): Promise<Stripe.Product> {
  const existing = await findProduct(stripe, planId)
  if (existing) return existing

  const plan = PLANS[planId]
  return stripe.products.create({
    name: `MakeAMag ${plan.name}`,
    description: plan.tagline,
    metadata: { makeamag_plan: planId },
  })
}

async function ensurePrice(
  stripe: Stripe,
  productId: string,
  planId: PaidPlanId,
  billing: 'monthly' | 'annual',
): Promise<Stripe.Price> {
  const existing = await findPrice(stripe, productId, billing)
  if (existing) return existing

  const plan = PLANS[planId]
  const interval = billing === 'monthly' ? 'month' : 'year'
  const unitAmount =
    billing === 'monthly' ? plan.monthlyPrice * 100 : plan.annualPrice * 12 * 100

  return stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: { interval },
    metadata: {
      makeamag_plan: planId,
      makeamag_billing: billing,
    },
  })
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) {
    console.error('Missing STRIPE_SECRET_KEY. Example:')
    console.error('  STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup')
    process.exit(1)
  }

  const mode = secret.startsWith('sk_live_') ? 'live' : 'test'
  const stripe = new Stripe(secret)

  console.log(`Setting up MakeAMag prices in Stripe (${mode} mode)...\n`)

  const envLines: string[] = []

  for (const planId of PAID_PLANS) {
    const plan = PLANS[planId]
    const product = await ensureProduct(stripe, planId)
    const monthly = await ensurePrice(stripe, product.id, planId, 'monthly')
    const annual = await ensurePrice(stripe, product.id, planId, 'annual')

    console.log(`${plan.name}`)
    console.log(`  Product: ${product.id}`)
    console.log(`  Monthly: $${plan.monthlyPrice}/mo → ${monthly.id}`)
    console.log(`  Annual:  $${plan.annualPrice}/mo ($${plan.annualPrice * 12}/yr) → ${annual.id}`)
    console.log('')

    envLines.push(`${ENV_KEYS[planId].monthly}=${monthly.id}`)
    envLines.push(`${ENV_KEYS[planId].annual}=${annual.id}`)
  }

  console.log('Add these to Railway Variables (along with STRIPE_SECRET_KEY):\n')
  for (const line of envLines) {
    console.log(line)
  }

  console.log('\nNext steps:')
  console.log('1. Stripe Dashboard → Developers → Webhooks → Add endpoint')
  console.log('   URL: https://makeamag-production.up.railway.app/api/billing/webhook')
  console.log('   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted')
  console.log('2. Copy the webhook signing secret → STRIPE_WEBHOOK_SECRET in Railway')
  console.log('3. Stripe Dashboard → Settings → Billing → Customer portal → Enable')
  console.log('4. Redeploy Railway, then test checkout on /pricing')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
