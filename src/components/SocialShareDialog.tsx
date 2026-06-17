import { useMemo, useState } from 'react'
import type { PublicationInfo } from '../../shared/flipbook'
import { displayTitle } from '../../shared/flipbook'
import { getSharePageUrl } from '../lib/api'
import type { BrandingConfig } from '../../shared/flipbook'
import {
  buildFacebookShareUrl,
  buildLinkedInShareUrl,
  buildTwitterShareUrl,
  canUseNativeShare,
  downloadPageImage,
  openShareWindow,
  sharePageNative,
} from '../lib/socialShare'

interface SocialShareDialogProps {
  flipbookId: string | null
  fileName: string
  publication: PublicationInfo
  branding: BrandingConfig
  pageIndex: number
  pageImage: string
  onClose: () => void
}

export function SocialShareDialog({
  flipbookId,
  fileName,
  publication,
  branding,
  pageIndex,
  pageImage,
  onClose,
}: SocialShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const title = displayTitle({ fileName, publication })
  const defaultText = useMemo(
    () => `Check out page ${pageIndex + 1} from ${title}`,
    [pageIndex, title],
  )

  const pageUrl = flipbookId
    ? getSharePageUrl(flipbookId, pageIndex, branding)
    : null

  const shareText = message.trim() || defaultText
  const imageFilename = `${title.replace(/[^\w.-]+/g, '-').toLowerCase()}-page-${pageIndex + 1}.png`

  async function handleCopyLink() {
    if (!pageUrl) return
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownload() {
    setBusy(true)
    try {
      await downloadPageImage(pageImage, imageFilename)
    } finally {
      setBusy(false)
    }
  }

  async function handleNativeShare() {
    if (!pageUrl) return
    setBusy(true)
    try {
      await sharePageNative({
        title,
        text: shareText,
        url: pageUrl,
        imageSrc: pageImage,
      })
    } finally {
      setBusy(false)
    }
  }

  function shareToTwitter() {
    if (!pageUrl) return
    openShareWindow(buildTwitterShareUrl(pageUrl, shareText))
  }

  function shareToFacebook() {
    if (!pageUrl) return
    openShareWindow(buildFacebookShareUrl(pageUrl))
  }

  function shareToLinkedIn() {
    if (!pageUrl) return
    openShareWindow(buildLinkedInShareUrl(pageUrl))
  }

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="apple-modal flex max-h-[90vh] w-full max-w-lg flex-col">
        <div className="flex items-start justify-between border-b border-apple-border-light px-6 py-5">
          <div>
            <h3 className="text-[1.375rem] font-semibold tracking-tight text-apple-text">
              Post to social
            </h3>
            <p className="mt-1 text-sm text-apple-muted">
              Page {pageIndex + 1} · {title}
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

        <div className="space-y-5 overflow-y-auto px-6 py-6">
          <div className="overflow-hidden rounded-xl border border-apple-border-light bg-apple-gray">
            <img src={pageImage} alt={`Page ${pageIndex + 1}`} className="mx-auto max-h-48 w-full object-contain" />
          </div>

          {!flipbookId && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Share your flipbook first to get a link readers can open. You can still download this page
              for Instagram or other apps.
            </p>
          )}

          <div>
            <label htmlFor="social-share-message" className="mb-2 block text-sm text-apple-muted">
              Caption
            </label>
            <textarea
              id="social-share-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={defaultText}
              rows={2}
              className="apple-input resize-none"
            />
          </div>

          {pageUrl && (
            <div className="flex gap-2">
              <input readOnly value={pageUrl} className="apple-input min-w-0 flex-1 text-sm" />
              <button type="button" onClick={handleCopyLink} className="apple-btn-secondary shrink-0">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!pageUrl}
              onClick={shareToTwitter}
              className="apple-btn-secondary"
            >
              Post on X
            </button>
            <button
              type="button"
              disabled={!pageUrl}
              onClick={shareToFacebook}
              className="apple-btn-secondary"
            >
              Share on Facebook
            </button>
            <button
              type="button"
              disabled={!pageUrl}
              onClick={shareToLinkedIn}
              className="apple-btn-secondary"
            >
              Share on LinkedIn
            </button>
            <button type="button" onClick={handleDownload} disabled={busy} className="apple-btn-secondary">
              Download image
            </button>
          </div>

          {canUseNativeShare() && pageUrl && (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={busy}
              className="apple-btn-primary w-full"
            >
              Share via device…
            </button>
          )}

          <p className="text-xs leading-relaxed text-apple-muted">
            Instagram and TikTok don&apos;t allow direct posting from websites. Download the page image,
            then upload it in their app — or use Share via device on mobile.
          </p>
        </div>
      </div>
    </div>
  )
}
