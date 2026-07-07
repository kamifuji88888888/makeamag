import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PasswordInput } from '../components/PasswordInput'
import type { BrandingConfig, FlipbookVisibility, PublicationInfo } from '../../shared/flipbook'
import { displayTitle } from '../../shared/flipbook'
import { getBrandedReaderUrl, getEmbedCode, getShareCoverUrl, getShareUrl } from '../lib/api'
import { createQrCodeDataUrl, downloadDataUrl } from '../lib/qrCode'

interface ShareDialogProps {
  shareUrl: string
  flipbookId: string
  fileName: string
  publication: PublicationInfo
  branding: BrandingConfig
  visibility: FlipbookVisibility
  isPasswordProtected: boolean
  canPasswordProtect?: boolean
  onClose: () => void
  onPasswordChange: (password: string, enabled: boolean) => void
  onVisibilityChange: (visibility: FlipbookVisibility) => void
  onUpgradeRequest?: (feature: import('../../shared/plans').PlanFeature, label: string) => void
}

export function ShareDialog({
  shareUrl: initialShareUrl,
  flipbookId,
  fileName,
  publication,
  branding,
  visibility,
  isPasswordProtected,
  canPasswordProtect = true,
  onClose,
  onPasswordChange,
  onVisibilityChange,
  onUpgradeRequest,
}: ShareDialogProps) {
  const [copied, setCopied] = useState<'link' | 'embed' | 'qr' | null>(null)
  const [passwordEnabled, setPasswordEnabled] = useState(isPasswordProtected)
  const [password, setPassword] = useState('')
  const [embedWidth, setEmbedWidth] = useState(800)
  const [embedHeight, setEmbedHeight] = useState(600)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const shareUrl = useMemo(
    () => getShareUrl(flipbookId, branding) || initialShareUrl,
    [branding, flipbookId, initialShareUrl],
  )
  const brandedReaderUrl = useMemo(() => getBrandedReaderUrl(branding), [branding])
  const coverPreviewUrl = getShareCoverUrl(flipbookId)

  const embedTitle = displayTitle({ fileName, publication })
  const qrFilename = `${embedTitle.replace(/[^\w.-]+/g, '-').toLowerCase()}-qr.png`

  const embedCode = getEmbedCode(flipbookId, {
    width: embedWidth,
    height: embedHeight,
    branding,
    title: embedTitle,
  })

  useEffect(() => {
    let cancelled = false
    void createQrCodeDataUrl(shareUrl).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [shareUrl])

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied('link')
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleCopyEmbed() {
    await navigator.clipboard.writeText(embedCode)
    setCopied('embed')
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleCopyQrLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied('qr')
    setTimeout(() => setCopied(null), 2000)
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return
    downloadDataUrl(qrDataUrl, qrFilename)
  }

  function handlePasswordToggle(enabled: boolean) {
    if (enabled && !canPasswordProtect) {
      onUpgradeRequest?.('passwordProtection', 'Password protection')
      return
    }
    setPasswordEnabled(enabled)
    if (!enabled) {
      setPassword('')
      onPasswordChange('', false)
    }
  }

  function handlePasswordBlur() {
    if (passwordEnabled && password.trim()) {
      onPasswordChange(password.trim(), true)
    }
  }

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="apple-modal max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <div className="flex items-start justify-between border-b border-apple-border-light px-6 py-5">
          <div>
            <h3 className="text-[1.375rem] font-semibold tracking-tight text-apple-text">Share</h3>
            <p className="mt-1 text-[1.0625rem] text-apple-muted">
              Link, QR code, embed, or protect with a password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-apple-muted hover:bg-apple-gray"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {branding.customDomain && brandedReaderUrl && (
            <div className="rounded-xl bg-apple-blue/8 px-4 py-3 text-sm text-apple-blue">
              <p>
                Branded domain:{' '}
                <a href={brandedReaderUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  {brandedReaderUrl}
                </a>
              </p>
              <p className="mt-1 text-apple-muted">
                The full-screen share link below is unique to this issue and includes its cover in link previews.
              </p>
            </div>
          )}

          <div>
            <p className="apple-section-label mb-3">Link preview</p>
            <div className="flex gap-3 rounded-xl border border-apple-border-light bg-apple-gray/40 p-3">
              <img
                src={coverPreviewUrl}
                alt={`Cover preview for ${embedTitle}`}
                className="h-24 w-16 shrink-0 rounded-md border border-apple-border-light bg-white object-cover"
              />
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium text-apple-text">{embedTitle}</p>
                <p className="mt-1 truncate text-xs text-apple-muted">{shareUrl}</p>
                <p className="mt-2 text-xs text-apple-muted">
                  This cover appears when you share the link in iMessage, Slack, LinkedIn, and other apps.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="apple-section-label mb-3">Who can find this</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onVisibilityChange('public')}
                className={[
                  'rounded-xl border px-4 py-3 text-left transition',
                  visibility === 'public'
                    ? 'border-apple-blue bg-apple-blue/8'
                    : 'border-apple-border-light hover:bg-apple-gray',
                ].join(' ')}
              >
                <span className="block text-sm font-medium text-apple-text">Public</span>
                <span className="mt-1 block text-xs text-apple-muted">Shareable and indexable</span>
              </button>
              <button
                type="button"
                onClick={() => onVisibilityChange('unlisted')}
                className={[
                  'rounded-xl border px-4 py-3 text-left transition',
                  visibility === 'unlisted'
                    ? 'border-apple-blue bg-apple-blue/8'
                    : 'border-apple-border-light hover:bg-apple-gray',
                ].join(' ')}
              >
                <span className="block text-sm font-medium text-apple-text">Unlisted link</span>
                <span className="mt-1 block text-xs text-apple-muted">Link only · hidden from search</span>
              </button>
            </div>
          </div>

          <div>
            <p className="apple-section-label mb-3">Full-screen link</p>
            <p className="mb-3 text-xs text-apple-muted">
              Opens only this issue — not your publisher library or account.
            </p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="apple-input text-sm" />
              <button type="button" onClick={handleCopyLink} className="apple-btn-primary shrink-0">
                {copied === 'link' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <p className="apple-section-label mb-3">QR code</p>
            <div className="flex flex-col items-center gap-4 rounded-xl border border-apple-border-light bg-apple-gray/40 p-5 sm:flex-row sm:items-start">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${embedTitle}`}
                  className="h-36 w-36 rounded-lg border border-apple-border-light bg-white p-2"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-lg border border-apple-border-light bg-white text-xs text-apple-muted">
                  Generating…
                </div>
              )}
              <div className="flex w-full flex-1 flex-col gap-2">
                <p className="text-sm text-apple-muted">
                  Print or display this code so readers can open the issue on their phone.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrDataUrl}
                  className="apple-btn-secondary"
                >
                  Download QR image
                </button>
                <button type="button" onClick={handleCopyQrLink} className="apple-btn-ghost text-sm">
                  {copied === 'qr' ? 'Link copied' : 'Copy link instead'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <p className="apple-section-label mb-3">Embed on your site</p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-apple-muted">
                Width
                <input
                  type="number"
                  min={320}
                  max={1600}
                  value={embedWidth}
                  onChange={(e) => setEmbedWidth(Number(e.target.value))}
                  className="apple-input mt-1 text-sm"
                />
              </label>
              <label className="text-xs text-apple-muted">
                Height
                <input
                  type="number"
                  min={400}
                  max={1200}
                  value={embedHeight}
                  onChange={(e) => setEmbedHeight(Number(e.target.value))}
                  className="apple-input mt-1 text-sm"
                />
              </label>
            </div>
            <textarea
              readOnly
              rows={3}
              value={embedCode}
              className="apple-input mb-2 resize-none font-mono text-xs text-apple-muted"
            />
            <button type="button" onClick={handleCopyEmbed} className="apple-btn-secondary w-full">
              {copied === 'embed' ? 'Embed code copied' : 'Copy embed code'}
            </button>
          </div>

          <div className="apple-card-flat p-5">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={passwordEnabled}
                onChange={(e) => handlePasswordToggle(e.target.checked)}
                disabled={!canPasswordProtect && !passwordEnabled}
                className="h-4 w-4 rounded border-apple-border text-apple-blue focus:ring-apple-blue disabled:opacity-40"
              />
              <span className="text-[1.0625rem] text-apple-text">Password protect</span>
            </label>
            {!canPasswordProtect && (
              <p className="mt-2 text-sm text-apple-muted">
                Available on Starter and above.{' '}
                <Link to="/pricing" className="apple-link">
                  Upgrade
                </Link>
              </p>
            )}

            {passwordEnabled && (
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                placeholder={isPasswordProtected ? 'New password' : 'Set a password'}
                wrapperClassName="mt-4"
              />
            )}
          </div>

          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="apple-link block text-center text-[1.0625rem]">
            Preview full screen ›
          </a>
        </div>
      </div>
    </div>
  )
}
