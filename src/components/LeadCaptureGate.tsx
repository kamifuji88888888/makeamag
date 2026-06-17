import { useState } from 'react'
import type { LeadCaptureConfig, PublicationInfo } from '../../shared/flipbook'
import { displayTitle } from '../../shared/flipbook'

interface LeadCaptureGateProps {
  open: boolean
  fileName: string
  publication: PublicationInfo
  leadCapture: LeadCaptureConfig
  onClose: () => void
  onSubmit: (email: string, consent: boolean) => Promise<void>
}

export function LeadCaptureGate({
  open,
  fileName,
  publication,
  leadCapture,
  onClose,
  onSubmit,
}: LeadCaptureGateProps) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const title = displayTitle({ fileName, publication })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(email, consent)
      setEmail('')
      setConsent(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        className="apple-modal relative w-full max-w-md overflow-hidden p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-capture-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-apple-muted transition hover:bg-apple-gray"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <p className="apple-section-label">{title}</p>
          <h2
            id="lead-capture-title"
            className="mt-2 text-[1.75rem] font-semibold tracking-tight text-apple-text"
          >
            {leadCapture.headline}
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-apple-muted">
            {leadCapture.description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="lead-capture-email" className="mb-2 block text-sm text-apple-muted">
              Email address
            </label>
            <input
              id="lead-capture-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              className="apple-input"
              placeholder="you@example.com"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-left">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-apple-border text-apple-blue"
            />
            <span className="text-sm leading-relaxed text-apple-muted">{leadCapture.consentLabel}</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email.trim() || !consent}
            className="apple-btn-primary w-full"
          >
            {loading ? 'Unlocking…' : leadCapture.buttonLabel}
          </button>

          {!leadCapture.mandatory && (
            <button type="button" onClick={onClose} className="apple-btn-ghost w-full">
              Continue without email
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
