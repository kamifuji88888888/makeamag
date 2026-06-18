import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isPaidPlan } from '../../shared/billing'
import {
  formatPlanPrice,
  PLAN_ORDER,
  type PlanId,
} from '../../shared/plans'
import { AppNav } from '../components/AppNav'
import { useAuth } from '../context/AuthContext'
import { usePlanContext } from '../context/PlanContext'
import {
  openBillingPortal,
  startPlanCheckout,
  verifyPlanCheckout,
} from '../lib/billingApi'
import { fetchStripeStatus } from '../lib/api'

const COMPARE_ROWS: { label: string; values: Record<PlanId, string | boolean> }[] = [
  { label: 'Flipbooks', values: { free: '5', starter: '25', pro: 'Unlimited', publisher: 'Unlimited' } },
  { label: 'Pages per flipbook', values: { free: '30', starter: '150', pro: '500', publisher: 'Unlimited' } },
  { label: 'Max PDF size', values: { free: '25 MB', starter: '50 MB', pro: '100 MB', publisher: '250 MB' } },
  { label: 'Video embeds', values: { free: false, starter: '3 / book', pro: 'Unlimited', publisher: 'Unlimited' } },
  { label: 'Password protection', values: { free: false, starter: true, pro: true, publisher: true } },
  { label: 'Reader paywall', values: { free: false, starter: false, pro: true, publisher: true } },
  { label: 'Custom branding', values: { free: false, starter: false, pro: true, publisher: true } },
  { label: 'Custom domain', values: { free: false, starter: false, pro: true, publisher: true } },
  { label: 'Analytics', values: { free: false, starter: '30 days', pro: '90 days', publisher: '1 year' } },
  { label: 'Folders', values: { free: false, starter: '5', pro: 'Unlimited', publisher: 'Unlimited' } },
  { label: 'White-label viewer', values: { free: false, starter: false, pro: true, publisher: true } },
  { label: 'Team workspaces', values: { free: false, starter: false, pro: false, publisher: 'Coming soon' } },
]

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <svg className="mx-auto h-5 w-5 text-apple-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    )
  }
  if (value === false) {
    return <span className="text-apple-muted">—</span>
  }
  return <span className="text-sm text-apple-text">{value}</span>
}

export function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { planId, setPlan, syncFromBilling, plans, hasSubscription, billingLoaded } = usePlanContext()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const [billingEnabled, setBillingEnabled] = useState(false)
  const [checkoutPlanId, setCheckoutPlanId] = useState<PlanId | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchStripeStatus().then((status) => {
      setBillingEnabled(Boolean(status.billingEnabled))
    })
  }, [])

  useEffect(() => {
    const billingResult = searchParams.get('billing')
    const sessionId = searchParams.get('session_id')

    if (billingResult === 'canceled') {
      setNotice('Checkout canceled. Your plan was not changed.')
      setSearchParams({}, { replace: true })
      return
    }

    if (billingResult !== 'success' || !sessionId) return

    void verifyPlanCheckout(sessionId)
      .then((status) => {
        syncFromBilling(status.planId, status.hasSubscription)
        setNotice(`You're now on ${plans[status.planId].name}. Thanks for subscribing!`)
        setSearchParams({}, { replace: true })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not verify checkout'
        setError(message)
        setSearchParams({}, { replace: true })
      })
  }, [plans, searchParams, setSearchParams, syncFromBilling])

  async function handleSelectPlan(id: PlanId) {
    setError(null)

    if (id === 'free') {
      if (hasSubscription) {
        try {
          setPortalLoading(true)
          const url = await openBillingPortal()
          window.location.href = url
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Could not open billing portal'
          setError(message)
        } finally {
          setPortalLoading(false)
        }
        return
      }
      setPlan('free')
      navigate('/')
      return
    }

    if (!billingEnabled) {
      setError('Stripe billing is not configured yet. Add plan price IDs in Railway to enable checkout.')
      return
    }

    try {
      setCheckoutPlanId(id)
      const url = await startPlanCheckout(id, billing, { email: user?.email })
      window.location.href = url
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not start checkout'
      setError(message)
      setCheckoutPlanId(null)
    }
  }

  async function handleManageBilling() {
    setError(null)
    try {
      setPortalLoading(true)
      const url = await openBillingPortal()
      window.location.href = url
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not open billing portal'
      setError(message)
    } finally {
      setPortalLoading(false)
    }
  }

  function buttonLabel(id: PlanId, isCurrent: boolean): string {
    if (checkoutPlanId === id) return 'Redirecting…'
    if (isCurrent && hasSubscription) return 'Current plan'
    if (isCurrent) return 'Current plan'
    if (id === 'free' && hasSubscription) return 'Manage subscription'
    if (id === 'free') return 'Start free'
    if (!billingEnabled && isPaidPlan(id)) return 'Coming soon'
    return plans[id].cta
  }

  return (
    <div className="min-h-full bg-apple-bg">
      <AppNav maxWidthClass="max-w-[1080px]">
        {hasSubscription && (
          <button
            type="button"
            onClick={() => void handleManageBilling()}
            disabled={portalLoading}
            className="apple-btn-ghost"
          >
            {portalLoading ? 'Opening…' : 'Manage billing'}
          </button>
        )}
        <Link to="/" className="apple-btn-ghost">
          Back to app
        </Link>
      </AppNav>

      <main className="px-6 py-16">
        <div className="mx-auto max-w-[980px] text-center">
          <p className="apple-section-label">Pricing</p>
          <h1 className="apple-hero-title mt-3 text-[clamp(2rem,5vw,3.5rem)]">
            Plans for every publisher.
          </h1>
          <p className="apple-hero-subtitle mx-auto mt-5 max-w-[640px]">
            Lead capture from $14/mo — Issuu charges $188. Custom domains on Pro for $29/mo — not $85.
            No ads on your content, ever.
          </p>

          <div className="mt-8 inline-flex rounded-full bg-apple-gray p-1">
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition',
                billing === 'annual' ? 'bg-white text-apple-text shadow-sm' : 'text-apple-muted',
              ].join(' ')}
            >
              Annual · save ~20%
            </button>
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition',
                billing === 'monthly' ? 'bg-white text-apple-text shadow-sm' : 'text-apple-muted',
              ].join(' ')}
            >
              Monthly
            </button>
          </div>
        </div>

        {(notice || error) && (
          <div className="mx-auto mt-8 max-w-[680px]">
            {notice && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {notice}
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="mx-auto mt-12 grid max-w-[1080px] gap-5 lg:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const plan = plans[id]
            const isCurrent = billingLoaded && planId === id
            const price = formatPlanPrice(plan, billing)
            const isLoading = checkoutPlanId === id || (portalLoading && id === 'free')
            return (
              <div
                key={id}
                className={[
                  'apple-card flex flex-col p-6 text-left',
                  plan.highlighted ? 'ring-2 ring-apple-blue/30' : '',
                ].join(' ')}
              >
                {plan.highlighted && (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-apple-blue/10 px-3 py-1 text-xs font-medium text-apple-blue">
                    Most popular
                  </span>
                )}
                <h2 className="text-[1.375rem] font-semibold text-apple-text">{plan.name}</h2>
                <p className="mt-2 min-h-[3rem] text-sm text-apple-muted">{plan.tagline}</p>
                <div className="mt-5">
                  <span className="text-[2rem] font-semibold tracking-tight text-apple-text">{price}</span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-sm text-apple-muted"> / mo</span>
                  )}
                  {billing === 'annual' && plan.monthlyPrice > 0 && (
                    <p className="mt-1 text-xs text-apple-muted">Billed annually</p>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.featureBullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm text-apple-text">
                      <span className="mt-0.5 text-apple-blue">✓</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void handleSelectPlan(id)}
                  disabled={isLoading || (isCurrent && id !== 'free' && hasSubscription)}
                  className={[
                    'mt-8 w-full',
                    plan.highlighted ? 'apple-btn-primary' : 'apple-btn-secondary',
                    isCurrent && id !== 'free' && hasSubscription ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  {buttonLabel(id, isCurrent)}
                </button>
              </div>
            )
          })}
        </div>

        <p className="mx-auto mt-8 max-w-[640px] text-center text-sm text-apple-muted">
          {billingEnabled
            ? 'Secure checkout powered by Stripe. Subscriptions sync automatically to this browser.'
            : 'Add Stripe price IDs on the server to enable live checkout. Until then, paid plans cannot be purchased.'}
        </p>

        <section className="mx-auto mt-20 max-w-[1080px]">
          <h2 className="mb-6 text-center text-[1.75rem] font-semibold tracking-tight text-apple-text">
            Compare plans
          </h2>
          <div className="apple-card overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-sm">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[16.5%]" />
                <col className="w-[16.5%]" />
                <col className="w-[16.5%]" />
                <col className="w-[16.5%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-apple-border-light">
                  <th className="px-4 py-3 text-left font-medium text-apple-muted">Feature</th>
                  {PLAN_ORDER.map((id) => (
                    <th key={id} className="px-4 py-3 text-center font-medium text-apple-text">
                      {plans[id].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-apple-border-light last:border-0">
                    <td className="px-4 py-3 text-left text-apple-muted">{row.label}</td>
                    {PLAN_ORDER.map((id) => (
                      <td key={id} className="px-4 py-3 text-center">
                        <CellValue value={row.values[id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-[760px] text-center">
          <h2 className="text-[1.75rem] font-semibold tracking-tight text-apple-text">
            Why publishers switch from Issuu-style platforms
          </h2>
          <div className="mt-8 grid gap-4 text-left md:grid-cols-3">
            {[
              {
                title: 'Lead capture at Starter',
                desc: 'Issuu locks lead capture behind $188/mo. MakeAMag includes it from $14/mo annual.',
              },
              {
                title: 'Your brand first',
                desc: 'White-label viewer and custom domain on Pro — features others charge $85+/mo for.',
              },
              {
                title: 'Built for magazines',
                desc: 'Spread view, TOC, link hotspots, and publisher metadata out of the box.',
              },
            ].map((item) => (
              <div key={item.title} className="apple-card-flat p-5">
                <h3 className="font-semibold text-apple-text">{item.title}</h3>
                <p className="mt-2 text-sm text-apple-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
