import { useState } from 'react'
import type { MonetizationConfig, PublicationInfo } from '../../shared/flipbook'
import { displayTitle } from '../../shared/flipbook'

interface ReaderPaywallProps {
  open: boolean
  fileName: string
  publication: PublicationInfo
  monetization: MonetizationConfig
  hasSubscriberAccess: boolean
  onClose: () => void
  onCheckoutClick: () => void
  onStripeCheckout?: () => Promise<void>
  onUnlock: (accessCode: string) => Promise<void>
}

export function ReaderPaywall({
  open,
  fileName,
  publication,
  monetization,
  hasSubscriberAccess,
  onClose,
  onCheckoutClick,
  onStripeCheckout,
  onUnlock,
}: ReaderPaywallProps) {
  const [showAccessCode, setShowAccessCode] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  if (!open) return null

  const title = displayTitle({ fileName, publication })
  const useStripe =
    monetization.paymentMethod === 'stripe' &&
    monetization.stripeConnected &&
    monetization.stripePriceCents > 0
  const hasExternalCheckout = monetization.paymentMethod === 'link' && Boolean(monetization.checkoutUrl)

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onUnlock(accessCode)
      setAccessCode('')
      setShowAccessCode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect access code')
    } finally {
      setLoading(false)
    }
  }

  async function handleStripeCheckout() {
    if (!onStripeCheckout) return
    setCheckoutLoading(true)
    onCheckoutClick()
    try {
      await onStripeCheckout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout')
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        className="apple-modal relative w-full max-w-md overflow-hidden p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-paywall-title"
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
            id="reader-paywall-title"
            className="mt-2 text-[1.75rem] font-semibold tracking-tight text-apple-text"
          >
            {monetization.headline}
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-apple-muted">
            {monetization.description}
          </p>
          {monetization.priceLabel && (
            <p className="mt-4 text-[1.375rem] font-semibold tracking-tight text-apple-text">
              {monetization.priceLabel}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-3">
          {useStripe && (
            <button
              type="button"
              onClick={handleStripeCheckout}
              disabled={checkoutLoading}
              className="apple-btn-primary w-full"
            >
              {checkoutLoading ? 'Opening checkout…' : monetization.ctaLabel}
            </button>
          )}

          {hasExternalCheckout && (
            <a
              href={monetization.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onCheckoutClick}
              className="apple-btn-primary block w-full text-center"
            >
              {monetization.ctaLabel}
            </a>
          )}

          {error && <p className="text-center text-sm text-red-500">{error}</p>}

          {hasSubscriberAccess && (
            <>
              {!showAccessCode ? (
                <button
                  type="button"
                  onClick={() => setShowAccessCode(true)}
                  className="apple-btn-secondary w-full"
                >
                  Already a subscriber?
                </button>
              ) : (
                <form onSubmit={handleUnlock} className="space-y-3 rounded-xl border border-apple-border-light p-4">
                  <label htmlFor="subscriber-access-code" className="block text-sm text-apple-muted">
                    Enter your subscriber access code
                  </label>
                  <input
                    id="subscriber-access-code"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    autoFocus
                    className="apple-input"
                    placeholder="Access code"
                  />
                  {error && showAccessCode && <p className="text-sm text-red-500">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || !accessCode.trim()}
                    className="apple-btn-primary w-full"
                  >
                    {loading ? 'Unlocking…' : 'Unlock full issue'}
                  </button>
                </form>
              )}
            </>
          )}

          <button type="button" onClick={onClose} className="apple-btn-ghost w-full">
            Keep reading preview
          </button>
        </div>
      </div>
    </div>
  )
}
