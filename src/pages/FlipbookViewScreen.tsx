import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFlipbookLoader } from '../hooks/useFlipbookLoader'
import { FlipbookViewer } from '../components/FlipbookViewer'
import { LoadingProgress } from '../components/LoadingProgress'
import { PasswordGate } from '../components/PasswordGate'
import { BrandedNav } from '../components/BrandedNav'
import { brandingScopeStyle } from '../lib/branding'
import { verifyStripeSession } from '../lib/api'
import { displayTitle } from '../../shared/flipbook'

interface FlipbookViewScreenProps {
  id: string | undefined
  isCustomDomain?: boolean
}

export function FlipbookViewScreen({ id, isCustomDomain = false }: FlipbookViewScreenProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [stripeUnlocked, setStripeUnlocked] = useState(false)
  const { state, handleUnlock, handleMonetizationUnlock, handleLeadCaptureSubmit } = useFlipbookLoader(id)

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

  if (state.status === 'locked') {
    return (
      <div className="branded-scope min-h-screen bg-apple-bg" style={brandingScopeStyle(state.meta.branding)}>
        <PasswordGate fileName={state.meta.fileName} onUnlock={handleUnlock} />
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-apple-bg px-4">
        <LoadingProgress progress={state.progress} fileName={state.fileName} />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-apple-bg px-4 text-center">
        <div className="apple-card max-w-md p-8">
          <p className="text-[1.25rem] font-semibold text-apple-text">Flipbook not found</p>
          <p className="mt-2 text-[1.0625rem] text-apple-muted">{state.message}</p>
        </div>
        {!isCustomDomain && (
          <a href="/" className="apple-btn-primary">
            Create your own
          </a>
        )}
      </div>
    )
  }

  const title = displayTitle({ fileName: state.fileName, publication: state.publication })
  const pageParam = Number(searchParams.get('page'))
  const initialPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : undefined

  return (
    <div
      className="branded-scope min-h-screen bg-apple-bg"
      style={brandingScopeStyle(state.branding)}
    >
      {!state.branding.hidePlatformChrome || state.branding.logoUrl ? (
        <BrandedNav
          flipbookId={id ?? null}
          fileName={state.fileName}
          publication={state.publication}
          branding={state.branding}
          isCustomDomain={isCustomDomain}
          subtitle={title}
        />
      ) : null}
      <FlipbookViewer
        images={state.images}
        aspectRatio={state.aspectRatio}
        fileName={state.fileName}
        mode="shared"
        flipbookId={id ?? null}
        videoEmbeds={state.videoEmbeds}
        linkHotspots={state.linkHotspots}
        popUpPanels={state.popUpPanels}
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
        isCustomDomain={isCustomDomain}
        initialPage={initialPage}
      />
    </div>
  )
}
