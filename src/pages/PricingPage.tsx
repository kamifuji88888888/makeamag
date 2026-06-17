import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  formatPlanPrice,
  PLAN_ORDER,
  type PlanId,
} from '../../shared/plans'
import { usePlanContext } from '../context/PlanContext'

const COMPARE_ROWS: { label: string; values: Record<PlanId, string | boolean> }[] = [
  { label: 'Flipbooks', values: { free: '3', starter: '25', pro: 'Unlimited', publisher: 'Unlimited' } },
  { label: 'Pages per flipbook', values: { free: '30', starter: '150', pro: '500', publisher: 'Unlimited' } },
  { label: 'Max PDF size', values: { free: '15 MB', starter: '25 MB', pro: '100 MB', publisher: '250 MB' } },
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
  const { planId, setPlan, plans } = usePlanContext()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  function handleSelectPlan(id: PlanId) {
    setPlan(id)
    if (id === 'publisher') {
      window.location.href = 'mailto:sales@makeamag.com?subject=MakeAMag%20Publisher%20plan'
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-full bg-apple-bg">
      <header className="apple-nav">
        <div className="mx-auto flex h-[52px] max-w-[1080px] items-center justify-between px-6">
          <Link to="/" className="text-[1.0625rem] font-semibold tracking-tight text-apple-text">
            MakeAMag
          </Link>
          <Link to="/" className="apple-btn-ghost">
            Back to app
          </Link>
        </div>
      </header>

      <main className="px-6 py-16">
        <div className="mx-auto max-w-[980px] text-center">
          <p className="apple-section-label">Pricing</p>
          <h1 className="apple-hero-title mt-3 text-[clamp(2rem,5vw,3.5rem)]">
            Plans for every publisher.
          </h1>
          <p className="apple-hero-subtitle mx-auto mt-5 max-w-[640px]">
            Start free, then upgrade when you need password protection, branding, analytics, and more.
            No surprise ad overlays on your content.
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

        <div className="mx-auto mt-12 grid max-w-[1080px] gap-5 lg:grid-cols-4">
          {PLAN_ORDER.map((id) => {
            const plan = plans[id]
            const isCurrent = planId === id
            const price = formatPlanPrice(plan, billing)
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
                  onClick={() => handleSelectPlan(id)}
                  className={[
                    'mt-8 w-full',
                    plan.highlighted ? 'apple-btn-primary' : 'apple-btn-secondary',
                  ].join(' ')}
                >
                  {isCurrent ? 'Current plan' : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        <p className="mx-auto mt-8 max-w-[640px] text-center text-sm text-apple-muted">
          Billing integration coming soon — plan selection is saved locally for now so you can preview limits and upgrade flows.
        </p>

        <section className="mx-auto mt-20 max-w-[1080px]">
          <h2 className="mb-6 text-center text-[1.75rem] font-semibold tracking-tight text-apple-text">
            Compare plans
          </h2>
          <div className="apple-card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-apple-border-light">
                  <th className="px-4 py-3 font-medium text-apple-muted">Feature</th>
                  {PLAN_ORDER.map((id) => (
                    <th key={id} className="px-4 py-3 font-medium text-apple-text">
                      {plans[id].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-apple-border-light last:border-0">
                    <td className="px-4 py-3 text-apple-muted">{row.label}</td>
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
                title: 'Transparent tiers',
                desc: 'Custom branding and analytics on Pro — not locked behind a $188/mo tier.',
              },
              {
                title: 'Your brand first',
                desc: 'White-label viewer, custom domains, and no third-party ads on your publications.',
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
