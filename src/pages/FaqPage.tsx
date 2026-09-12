import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '../../shared/site'
import { AppNav } from '../components/AppNav'
import { SiteFooter } from '../components/SiteFooter'

interface FaqItem {
  id: string
  question: string
  answer: ReactNode
}

const FAQS: FaqItem[] = [
  {
    id: 'replace-pdf',
    question: 'Where is the Replace PDF button?',
    answer: (
      <>
        <p>
          Replace PDF is inside the Publisher panel — not on the bottom toolbar next to Update.
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>Open your magazine from My flipbooks</li>
          <li>Tap <strong>Publisher</strong> in the bottom control bar</li>
          <li>Open the <strong>Details</strong> tab</li>
          <li>Under <strong>Source PDF</strong>, tap <strong>Replace PDF</strong></li>
        </ol>
        <p className="mt-3">
          This updates the magazine in place and <strong>keeps the same share link</strong>. Do not
          use New PDF or Upload another if you want to keep your URL.
        </p>
      </>
    ),
  },
  {
    id: 'same-url',
    question: 'How do I update my magazine without changing the share URL?',
    answer: (
      <p>
        Use <strong>Publisher → Details → Replace PDF</strong>, then tap <strong>Update</strong> if
        you also changed videos, hotspots, or other publisher settings. Starting a new upload creates
        a brand-new magazine with a new link.
      </p>
    ),
  },
  {
    id: 'remove-video',
    question: 'How do I remove a video from a page?',
    answer: (
      <>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Open the magazine in the editor</li>
          <li>Tap <strong>Add video</strong> in the bottom controls</li>
          <li>In the Videos list, tap <strong>Remove</strong> next to the video</li>
          <li>Tap <strong>Update</strong> to save the change on your published link</li>
        </ol>
      </>
    ),
  },
  {
    id: 'page-spread',
    question: 'How do I switch between Page and Spread view on mobile?',
    answer: (
      <p>
        Use the <strong>Page | Spread</strong> toggle in the flipbook control bar (near the page
        arrows). Readers can switch for their own viewing; in the editor, the choice is also saved
        with your magazine.
      </p>
    ),
  },
  {
    id: 'vimeo',
    question: 'Why isn’t my Vimeo video playing?',
    answer: (
      <>
        <p>
          Paste a Vimeo share, player, or manage link (for example{' '}
          <code className="rounded bg-apple-gray px-1.5 py-0.5 text-[0.85em]">
            vimeo.com/manage/videos/…
          </code>
          ). Private or domain-restricted videos must allow embedding on makeamag.com in Vimeo’s
          privacy settings.
        </p>
      </>
    ),
  },
  {
    id: 'missing-magazines',
    question: 'I signed in but don’t see my published magazines.',
    answer: (
      <p>
        Open <strong>My flipbooks</strong> after signing in — your account magazines sync into that
        list. If something is still missing, contact support with the old share URL and the email you
        publish with.
      </p>
    ),
  },
  {
    id: 'password',
    question: 'I can’t sign in with email and password.',
    answer: (
      <p>
        If you originally used a magic link, set a password with{' '}
        <Link to="/auth/forgot-password" className="apple-link">
          Forgot password
        </Link>
        , or choose <strong>Use email link instead</strong> on the sign-in screen. After resetting,
        you can use that password on future visits.
      </p>
    ),
  },
]

export function FaqPage() {
  const [openId, setOpenId] = useState<string | null>('replace-pdf')

  return (
    <div className="min-h-full bg-apple-bg">
      <AppNav />

      <main className="px-6 py-12">
        <article className="mx-auto max-w-[720px]">
          <p className="apple-section-label">Help</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-apple-text md:text-[2.5rem]">
            Frequently asked questions
          </h1>
          <p className="mt-3 text-[1.0625rem] text-apple-muted">
            Quick answers for publishing, sharing, and editing your magazines.
          </p>

          <div className="mt-10 space-y-3">
            {FAQS.map((item) => {
              const open = openId === item.id
              return (
                <div
                  key={item.id}
                  id={item.id}
                  className="overflow-hidden rounded-2xl border border-apple-border-light bg-white"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[1.0625rem] font-medium text-apple-text">{item.question}</span>
                    <span
                      className={[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-apple-gray text-apple-muted transition',
                        open ? 'rotate-45' : '',
                      ].join(' ')}
                      aria-hidden
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-apple-border-light px-5 py-4 text-[0.9375rem] leading-relaxed text-apple-muted">
                      {item.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-12 text-sm text-apple-muted">
            Still stuck? Email{' '}
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
