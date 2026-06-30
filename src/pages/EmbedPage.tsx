import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useFlipbookLoader } from '../hooks/useFlipbookLoader'
import { FlipbookViewer } from '../components/FlipbookViewer'
import { LoadingProgress } from '../components/LoadingProgress'
import { PasswordGate } from '../components/PasswordGate'
import { brandingScopeStyle } from '../lib/branding'
import { useFlipbookDocumentMeta } from '../lib/flipbookDocumentMeta'
import { verifyStripeSession } from '../lib/api'

export function EmbedPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const hideChrome =
    searchParams.get('chrome') === '0' || searchParams.get('chrome') === 'false'
  const { state, handleUnlock, handleMonetizationUnlock, handleLeadCaptureSubmit } = useFlipbookLoader(id)
  const [stripeUnlocked, setStripeUnlocked] = useState(false)

  useFlipbookDocumentMeta({
    enabled: state.status === 'ready',
    fileName: state.status === 'ready' ? state.fileName : '',
    publication: state.status === 'ready' ? state.publication : { title: '', publisherName: '', issueLabel: '', description: '' },
    flipbookId: id,
    branding: state.status === 'ready' ? state.branding : undefined,
    pagePath: id ? `/embed/${id}` : undefined,
  })

  useEffect(() => {
    const sessionId = searchParams.get('stripe_session')
    if (!sessionId || !id) return

    void verifyStripeSession(id, sessionId)
      .then(() => {
        setStripeUnlocked(true)
        const next = new URLSearchParams(searchParams)
        next.delete('stripe_session')
        setSearchParams(next, { replace: true })
      })
      .catch(() => {
        const next = new URLSearchParams(searchParams)
        next.delete('stripe_session')
        setSearchParams(next, { replace: true })
      })
  }, [id, searchParams, setSearchParams])

  useEffect(() => {
    document.documentElement.classList.add('embed-route')
    return () => document.documentElement.classList.remove('embed-route')
  }, [])

  if (state.status === 'locked') {
    return (
      <div
        className="branded-scope embed-root flex h-full min-h-[400px] items-center justify-center bg-apple-bg p-4"
        style={brandingScopeStyle(state.meta.branding)}
      >
        <PasswordGate fileName={state.meta.fileName} onUnlock={handleUnlock} />
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="embed-root flex h-full min-h-[400px] items-center justify-center bg-apple-bg px-4">
        <LoadingProgress progress={state.progress} fileName={state.fileName} />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="embed-root flex h-full min-h-[400px] flex-col items-center justify-center gap-4 bg-apple-bg px-4 text-center">
        <p className="text-sm text-apple-muted">{state.message}</p>
        <Link to="/" className="apple-link text-sm">
          Create a flipbook ›
        </Link>
      </div>
    )
  }

  const chromeHidden = hideChrome || state.branding.hidePlatformChrome
  const pageParam = Number(searchParams.get('page'))
  const initialPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : undefined

  return (
    <div
      className="branded-scope embed-root h-full min-h-[400px] bg-apple-bg"
      style={brandingScopeStyle(state.branding)}
    >
      <FlipbookViewer
        images={state.images}
        aspectRatio={state.aspectRatio}
        fileName={state.fileName}
        mode="embed"
        flipbookId={id ?? null}
        videoEmbeds={state.videoEmbeds}
        linkHotspots={state.linkHotspots}
        popUpPanels={state.popUpPanels}
        popUpPanelStyle={state.popUpPanelStyle}
        publication={state.publication}
        tableOfContents={state.tableOfContents}
        spreadView={state.spreadView}
        branding={state.branding}
        monetization={state.monetization}
        leadCapture={state.leadCapture}
        hasSubscriberAccess={state.hasSubscriberAccess}
        monetizationUnlocked={state.monetizationUnlocked || stripeUnlocked}
        leadCaptureUnlocked={state.leadCaptureUnlocked}
        pageTexts={state.pageTexts}
        onMonetizationUnlock={handleMonetizationUnlock}
        onLeadCaptureSubmit={handleLeadCaptureSubmit}
        hideChrome={chromeHidden}
        initialPage={initialPage}
      />
    </div>
  )
}
