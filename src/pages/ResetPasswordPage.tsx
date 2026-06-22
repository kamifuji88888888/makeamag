import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../lib/authApi'
import { useAuth } from '../context/AuthContext'
import { AppNav } from '../components/AppNav'
import { SiteFooter } from '../components/SiteFooter'

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

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, user } = useAuth()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token) {
      setError('This reset link is invalid or has expired')
      return
    }

    setLoading(true)
    try {
      const session = await resetPassword(token, password)
      setUser(session.user)
      setDone(true)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not reset password'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-full bg-apple-bg">
        <AppNav />
        <main className="flex min-h-[calc(100vh-52px)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-[420px]">
            <div className="apple-card px-8 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                Invalid reset link
              </h1>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                This password reset link is invalid or has expired.
              </p>
              <Link to="/auth/forgot-password" className="apple-btn-primary mt-8 inline-block">
                Request a new link
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-apple-bg">
      <AppNav />

      <main className="flex min-h-[calc(100vh-52px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <div className="apple-card px-8 py-10">
            {done ? (
              <div className="text-center">
                <AuthIcon />
                <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                  Password updated
                </h1>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                  Redirecting you to MakeAMag…
                </p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <AuthIcon />
                  <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-apple-text">
                    Choose a new password
                  </h1>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
                    Enter a new password for your account.
                  </p>
                </div>

                <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm text-apple-muted">
                      New password
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      className="apple-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-2 block text-sm text-apple-muted">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your password"
                      className="apple-input"
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || password.length < 8 || confirmPassword.length < 8}
                    className="apple-btn-primary w-full py-3 text-[0.9375rem]"
                  >
                    {loading ? 'Please wait…' : 'Update password'}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-apple-muted">
            <Link to="/auth" className="apple-link">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
