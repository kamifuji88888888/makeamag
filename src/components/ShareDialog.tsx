import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BrandingConfig, PublicationInfo } from '../../shared/flipbook'
import { displayTitle } from '../../shared/flipbook'
import { getEmbedCode, getShareUrl } from '../lib/api'

interface ShareDialogProps {
  shareUrl: string
  flipbookId: string
  fileName: string
  publication: PublicationInfo
  branding: BrandingConfig
  isPasswordProtected: boolean
  canPasswordProtect?: boolean
  onClose: () => void
  onPasswordChange: (password: string, enabled: boolean) => void
  onUpgradeRequest?: (feature: import('../../shared/plans').PlanFeature, label: string) => void
}

export function ShareDialog({
  shareUrl: initialShareUrl,
  flipbookId,
  fileName,
  publication,
  branding,
  isPasswordProtected,
  canPasswordProtect = true,
  onClose,
  onPasswordChange,
  onUpgradeRequest,
}: ShareDialogProps) {
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null)
  const [passwordEnabled, setPasswordEnabled] = useState(isPasswordProtected)
  const [password, setPassword] = useState('')
  const [embedWidth, setEmbedWidth] = useState(800)
  const [embedHeight, setEmbedHeight] = useState(600)

  const shareUrl = useMemo(
    () => getShareUrl(flipbookId, branding) || initialShareUrl,
    [branding, flipbookId, initialShareUrl],
  )

  const embedTitle = displayTitle({ fileName, publication })

  const embedCode = getEmbedCode(flipbookId, {
    width: embedWidth,
    height: embedHeight,
    branding,
    title: embedTitle,
  })

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
            <p className="mt-1 text-[1.0625rem] text-apple-muted">Link, embed, or protect with a password.</p>
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
          {branding.customDomain && (
            <p className="rounded-xl bg-apple-blue/8 px-4 py-3 text-sm text-apple-blue">
              Custom domain active — share links use https://{branding.customDomain}/
            </p>
          )}

          <div>
            <p className="apple-section-label mb-3">Full-screen link</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="apple-input text-sm" />
              <button type="button" onClick={handleCopyLink} className="apple-btn-primary shrink-0">
                {copied === 'link' ? 'Copied' : 'Copy'}
              </button>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                placeholder={isPasswordProtected ? 'New password' : 'Set a password'}
                className="apple-input mt-4"
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
