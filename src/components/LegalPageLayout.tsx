import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '../../shared/site'
import { AppNav } from './AppNav'
import { SiteFooter } from './SiteFooter'

interface LegalPageLayoutProps {
  title: string
  updated: string
  children: ReactNode
}

export function LegalPageLayout({ title, updated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-full bg-apple-bg">
      <AppNav />

      <main className="px-6 py-12">
        <article className="mx-auto max-w-[720px]">
          <p className="apple-section-label">Legal</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-apple-text md:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-apple-muted">Last updated {updated}</p>

          <div className="prose-legal mt-10 space-y-6 text-[0.9375rem] leading-relaxed text-apple-text">
            {children}
          </div>

          <p className="mt-12 text-sm text-apple-muted">
            Questions? Contact us at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>

          <p className="mt-6">
            <Link to="/" className="apple-link text-sm">
              ← Back to MakeAMag
            </Link>
          </p>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
