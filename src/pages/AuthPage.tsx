import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchAuthConfig,
  loginWithPassword,
  requestMagicLink,
  signUp,
  verifyMagicLink,
} from '../lib/authApi'
import { useAuth } from '../context/AuthContext'
import { AppNav } from '../components/AppNav'
import { PasswordInput } from '../components/PasswordInput'
import { SiteFooter } from '../components/SiteFooter'

type Mode = 'signin' | 'signup' | 'magic'
type Step = 'form' | 'sent' | 'verify' | 'error'

function AuthIcon() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-apple-gray">
      <svg className="h-7 w-7 text-apple-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    </div>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, user } = useAuth()
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')
  const [step, setStep] = useState<Step>(() => (searchParams.get('token') ? 'verify' : 'form'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [devLink, setDevLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchAuthConfig().then((config) => setMagicLinkEnabled(config.magicLinkEnabled))
  }, [])

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return

    setStep('verify')
    setLoading(true)
    setError(null)

    void verifyMagicLink(token)
      .then(({ user: signedInUser }) => {
        setUser(signedInUser)
        navigate('/', { replace: true })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Could not sign in'
        setError(message)
        setStep('error')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [searchParams, setUser, navigate])

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session =
        mode === 'signup'
          ? await signUp(email.trim(), password)
          : await loginWithPassword(email.trim(), password)
      setUser(session.user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not sign in'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLinkSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await requestMagicLink(email.trim())
      setDevLink(result.devLink ?? null)
      setStep('sent')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send sign-in link'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const isMagic = mode === 'magic'
  const title =
    step === 'sent'
      ? 'Check your email'
      : isMagic
        ? 'Sign in with email link'
        : mode === 'signup'
          ? 'Create your account'
          : 'Sign in to MakeAMag'

  const subtitle =
    step === 'sent'
      ? null
      : isMagic
        ? 'We’ll email you a secure one-time link.'
        : mode === 'signup'
          ? 'Save your flipbooks, billing, and published mags to your account.'
          : 'Welcome back. Enter your email and password to continue.'

  return (
    <div className="min-h-full bg-apple-bg">
      <AppNav />

      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <div className="apple-card px-8 py-10">
            {step === 'verify' && (
              <div className="text-center">
                <AuthIcon />
                <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                  Signing you in…
                </h1>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                  Just a moment while we verify your link.
                </p>
                {loading && (
                  <div className="mx-auto mt-8 h-1.5 w-32 overflow-hidden rounded-full bg-apple-gray">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-apple-blue" />
                  </div>
                )}
              </div>
            )}

            {step === 'form' && (
              <>
                <div className="text-center">
                  <AuthIcon />
                  <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">{subtitle}</p>
                  )}
                </div>

                {!isMagic && (
                  <div className="mt-8 flex rounded-full bg-apple-gray p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin')
                        setError(null)
                      }}
                      className={[
                        'flex-1 rounded-full py-2 text-sm transition',
                        mode === 'signin'
                          ? 'bg-white text-apple-text shadow-sm'
                          : 'text-apple-muted hover:text-apple-text',
                      ].join(' ')}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup')
                        setError(null)
                      }}
                      className={[
                        'flex-1 rounded-full py-2 text-sm transition',
                        mode === 'signup'
                          ? 'bg-white text-apple-text shadow-sm'
                          : 'text-apple-muted hover:text-apple-text',
                      ].join(' ')}
                    >
                      Create account
                    </button>
                  </div>
                )}

                <form
                  className="mt-6 space-y-4"
                  onSubmit={(event) =>
                    void (isMagic ? handleMagicLinkSubmit(event) : handlePasswordSubmit(event))
                  }
                >
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

                  {!isMagic && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm text-apple-muted">
                          Password
                        </label>
                        {mode === 'signin' && (
                          <Link to="/auth/forgot-password" className="text-sm apple-link">
                            Forgot password?
                          </Link>
                        )}
                      </div>
                      <PasswordInput
                        id="password"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                      />
                    </div>
                  )}

                  {error && (
                    <div className="space-y-2">
                      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                      {mode === 'signin' &&
                        error.toLowerCase().includes('incorrect') &&
                        magicLinkEnabled && (
                          <p className="text-sm text-apple-muted">
                            Signed up with an email link?{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setMode('magic')
                                setError(null)
                                setPassword('')
                              }}
                              className="apple-link"
                            >
                              Email me a sign-in link
                            </button>{' '}
                            instead.
                          </p>
                        )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email.trim() || (!isMagic && password.length < 8)}
                    className="apple-btn-primary w-full py-3 text-[0.9375rem]"
                  >
                    {loading
                      ? 'Please wait…'
                      : isMagic
                        ? 'Email me a sign-in link'
                        : mode === 'signup'
                          ? 'Create account'
                          : 'Sign in'}
                  </button>
                </form>

                <div className="mt-6 space-y-3 text-center text-sm">
                  {magicLinkEnabled && !isMagic && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('magic')
                        setError(null)
                        setPassword('')
                      }}
                      className="apple-link"
                    >
                      Use email link instead
                    </button>
                  )}
                  {isMagic && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin')
                        setError(null)
                      }}
                      className="apple-link"
                    >
                      Use password instead
                    </button>
                  )}
                </div>
              </>
            )}

            {step === 'sent' && (
              <div className="text-center">
                <AuthIcon />
                <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                  Check your email
                </h1>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                  We sent a sign-in link to{' '}
                  <span className="font-medium text-apple-text">{email}</span>.
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

                <button
                  type="button"
                  onClick={() => {
                    setStep('form')
                    setMode('magic')
                    setDevLink(null)
                    setError(null)
                  }}
                  className="apple-btn-ghost mt-8"
                >
                  Use a different email
                </button>
              </div>
            )}

            {step === 'error' && (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                  Link expired
                </h1>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                  {error ?? 'This sign-in link is invalid or has expired.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep('form')
                    setMode('signin')
                    setError(null)
                    navigate('/auth', { replace: true })
                  }}
                  className="apple-btn-primary mt-8"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-apple-muted">
            <Link to="/" className="apple-link">
              Back to MakeAMag
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
