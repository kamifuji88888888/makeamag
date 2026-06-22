import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAuthConfig, requestPasswordReset } from '../lib/authApi'
import { AppNav } from '../components/AppNav'
import { SiteFooter } from '../components/SiteFooter'
import { SUPPORT_EMAIL } from '../../shared/site'

function AuthIcon() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-apple-gray">
      <svg className="h-7 w-7 text-apple-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
        />
      </svg>
    </div>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [delivered, setDelivered] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [passwordResetEnabled, setPasswordResetEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchAuthConfig().then((config) => setPasswordResetEnabled(config.passwordResetEnabled))
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await requestPasswordReset(email.trim())
      setDelivered(result.delivered)
      setDevLink(result.devLink ?? null)
      setSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send reset email'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-apple-bg">
      <AppNav />

      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <div className="apple-card px-8 py-10">
            {!sent ? (
              <>
                <div className="text-center">
                  <AuthIcon />
                  <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                    Forgot your password?
                  </h1>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                    Enter your email and we&apos;ll send you a link to reset your password.
                  </p>
                  {!passwordResetEnabled && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Email delivery is not configured on this server yet. Contact{' '}
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
                        {SUPPORT_EMAIL}
                      </a>{' '}
                      for help resetting your password.
                    </p>
                  )}
                </div>

                <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm text-apple-muted">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="apple-input"
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="apple-btn-primary w-full py-3 text-[0.9375rem]"
                  >
                    {loading ? 'Please wait…' : 'Send reset link'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <AuthIcon />
                <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                  Check your email
                </h1>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                  {delivered ? (
                    <>
                      We sent password reset instructions to{' '}
                      <span className="font-medium text-apple-text">{email}</span>.
                    </>
                  ) : (
                    <>
                      If an account exists for{' '}
                      <span className="font-medium text-apple-text">{email}</span>, we could not
                      deliver email right now.
                    </>
                  )}
                </p>
                <p className="mt-3 text-sm text-apple-muted">
                  Need help? Contact{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="apple-link">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>

                {devLink && (
                  <div className="mt-6 rounded-xl bg-apple-gray px-4 py-4 text-left">
                    <p className="text-xs font-medium uppercase tracking-wide text-apple-muted">
                      Development link
                    </p>
                    <a href={devLink} className="apple-link mt-2 block break-all text-sm">
                      {devLink}
                    </a>
                  </div>
                )}

                <Link to="/auth" className="apple-btn-ghost mt-8 inline-block">
                  Back to sign in
                </Link>
              </div>
            )}
          </div>

          {!sent && (
            <p className="mt-6 text-center text-sm text-apple-muted">
              <Link to="/auth" className="apple-link">
                Back to sign in
              </Link>
            </p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
