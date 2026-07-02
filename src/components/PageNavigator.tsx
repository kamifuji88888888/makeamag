import { useEffect, useId, useRef, useState } from 'react'

interface PageNavigatorProps {
  currentPage: number
  totalPages: number
  compact?: boolean
  onGoToPage: (pageIndex: number) => void
}

function clampPage(page: number, totalPages: number) {
  if (totalPages <= 0) return 1
  return Math.min(Math.max(1, page), totalPages)
}

export function PageNavigator({
  currentPage,
  totalPages,
  compact = false,
  onGoToPage,
}: PageNavigatorProps) {
  const inputId = useId()
  const goToInputRef = useRef<HTMLInputElement>(null)
  const [draftPage, setDraftPage] = useState(currentPage)
  const [goToValue, setGoToValue] = useState(String(currentPage))
  const [showGoTo, setShowGoTo] = useState(false)

  useEffect(() => {
    setDraftPage(currentPage)
    setGoToValue(String(currentPage))
  }, [currentPage])

  useEffect(() => {
    if (!showGoTo) return
    goToInputRef.current?.focus()
    goToInputRef.current?.select()
  }, [showGoTo])

  useEffect(() => {
    if (!showGoTo) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowGoTo(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showGoTo])

  function commitPage(page: number) {
    const next = clampPage(page, totalPages)
    setDraftPage(next)
    setGoToValue(String(next))
    if (next !== currentPage) {
      onGoToPage(next - 1)
    }
  }

  function handleGoToSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = Number.parseInt(goToValue, 10)
    if (!Number.isFinite(parsed)) return
    commitPage(parsed)
    setShowGoTo(false)
  }

  if (totalPages <= 0) {
    return null
  }

  const showSlider = totalPages > 1

  return (
    <div
      className={[
        'relative flex items-center',
        compact ? 'min-w-[5.5rem] gap-1.5' : 'min-w-[7.5rem] gap-2',
      ].join(' ')}
    >
      {showSlider && (
        <input
          type="range"
          min={1}
          max={totalPages}
          step={1}
          value={draftPage}
          onChange={(event) => setDraftPage(Number(event.target.value))}
          onPointerUp={() => commitPage(draftPage)}
          onKeyUp={(event) => {
            if (event.key === 'Enter') {
              commitPage(draftPage)
            }
          }}
          className={[
            'flipbook-zoom-slider',
            compact ? 'min-w-[3.5rem] max-w-[4.5rem]' : 'min-w-[5.5rem] max-w-[8rem]',
          ].join(' ')}
          aria-label="Jump to page"
          aria-valuemin={1}
          aria-valuemax={totalPages}
          aria-valuenow={draftPage}
          aria-valuetext={`Page ${draftPage} of ${totalPages}`}
        />
      )}

      <button
        type="button"
        onClick={() => setShowGoTo((open) => !open)}
        className={[
          'rounded-full px-2 py-1 text-center font-medium tabular-nums text-apple-muted transition hover:bg-black/5 hover:text-apple-text',
          compact ? 'min-w-[3.25rem] text-[0.75rem]' : 'min-w-[4.5rem] text-[0.8125rem]',
        ].join(' ')}
        aria-expanded={showGoTo}
        aria-controls={`${inputId}-panel`}
        aria-label={`Go to page, currently page ${currentPage} of ${totalPages}`}
      >
        {currentPage} / {totalPages}
      </button>

      {showGoTo && (
        <form
          id={`${inputId}-panel`}
          onSubmit={handleGoToSubmit}
          className={[
            'absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-xl border border-apple-border-light bg-white p-3 shadow-lg',
            compact ? 'w-44' : 'w-48',
          ].join(' ')}
        >
          <label htmlFor={inputId} className="mb-2 block text-xs text-apple-muted">
            Go to page
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={goToInputRef}
              id={inputId}
              type="number"
              min={1}
              max={totalPages}
              value={goToValue}
              onChange={(event) => setGoToValue(event.target.value)}
              className="apple-input w-16 px-2 py-1.5 text-center text-sm tabular-nums"
            />
            <span className="text-sm text-apple-muted">/ {totalPages}</span>
            <button type="submit" className="apple-btn-primary shrink-0 px-3 py-1.5 text-sm">
              Go
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
