import { useState } from 'react'

interface PasswordGateProps {
  fileName: string
  onUnlock: (password: string) => Promise<void>
}

export function PasswordGate({ fileName, onUnlock }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onUnlock(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-apple-bg px-4">
      <form onSubmit={handleSubmit} className="apple-card w-full max-w-md p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-apple-gray">
            <svg className="h-7 w-7 text-apple-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-[1.75rem] font-semibold tracking-tight text-apple-text">Password required</h2>
          <p className="mt-2 truncate text-[1.0625rem] text-apple-muted">{fileName}</p>
        </div>

        <label htmlFor="flipbook-password" className="mb-2 block text-sm text-apple-muted">
          Enter password to continue
        </label>
        <input
          id="flipbook-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="apple-input mb-4"
          placeholder="Password"
        />

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading || !password} className="apple-btn-primary w-full">
          {loading ? 'Unlocking…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
