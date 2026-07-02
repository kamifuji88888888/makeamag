interface FlipbookControlsProps {
  currentPage: number
  totalPages: number
  soundEnabled: boolean
  mode: 'editor' | 'shared' | 'embed'
  isPublishing?: boolean
  positionMode?: boolean
  onPrev: () => void
  onNext: () => void
  onToggleSound: () => void
  onUploadNew?: () => void
  onFullscreen?: () => void
  onAddVideo?: () => void
  onTogglePositionMode?: () => void
  onOpenPositionPreview?: () => void
  onShare?: () => void
  onOpenSocialShare?: () => void
  onOpenPublisher?: () => void
  onOpenContents?: () => void
  onOpenSearch?: () => void
  hasContents?: boolean
}

export function FlipbookControls({
  currentPage,
  totalPages,
  soundEnabled,
  mode,
  isPublishing,
  positionMode,
  onPrev,
  onNext,
  onToggleSound,
  onUploadNew,
  onFullscreen,
  onAddVideo,
  onTogglePositionMode,
  onOpenPositionPreview,
  onShare,
  onOpenSocialShare,
  onOpenPublisher,
  onOpenContents,
  onOpenSearch,
  hasContents,
}: FlipbookControlsProps) {
  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages
  const compact = mode === 'embed'

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-full text-apple-text transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <div
      className={[
        'apple-controls flex flex-wrap items-center justify-center gap-1',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
      ].join(' ')}
    >
      {mode === 'editor' && onUploadNew && (
        <>
          <button type="button" onClick={onUploadNew} className="apple-btn-ghost mr-1">
            New PDF
          </button>
          <div className="mx-1 h-5 w-px bg-apple-border-light" />
        </>
      )}

      <button type="button" onClick={onPrev} disabled={isFirst} aria-label="Previous page" className={iconBtn}>
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>

      <span className="min-w-[4.5rem] px-1 text-center text-[0.8125rem] font-medium tabular-nums text-apple-muted">
        {currentPage} / {totalPages}
      </span>

      <button type="button" onClick={onNext} disabled={isLast} aria-label="Next page" className={iconBtn}>
        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <div className="mx-1 h-5 w-px bg-apple-border-light" />

      <button
        type="button"
        onClick={onToggleSound}
        aria-label={soundEnabled ? 'Mute page turn sound' : 'Enable page turn sound'}
        className={[
          iconBtn,
          soundEnabled ? 'bg-apple-blue/10 text-apple-blue' : 'text-apple-muted',
        ].join(' ')}
      >
        {soundEnabled ? (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        ) : (
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        )}
      </button>

      {mode === 'editor' && onOpenPublisher && (
        <button type="button" onClick={onOpenPublisher} disabled={positionMode} className="apple-btn-ghost disabled:opacity-40">
          Publisher
        </button>
      )}

      {(hasContents || mode !== 'editor') && onOpenContents && (
        <button type="button" onClick={onOpenContents} className="apple-btn-ghost">
          Contents
        </button>
      )}

      {onOpenSearch && (
        <button type="button" onClick={onOpenSearch} className="apple-btn-ghost">
          Search
        </button>
      )}

      {mode === 'editor' && onAddVideo && (
        <button type="button" onClick={onAddVideo} disabled={positionMode} className="apple-btn-ghost disabled:opacity-40">
          Add video
        </button>
      )}

      {mode === 'editor' && onTogglePositionMode && (
        <button
          type="button"
          onClick={onTogglePositionMode}
          className={positionMode ? 'apple-btn-primary' : 'apple-btn-ghost'}
        >
          {positionMode ? 'Done' : 'Move & resize'}
        </button>
      )}

      {mode === 'editor' && positionMode && onOpenPositionPreview && (
        <button type="button" onClick={onOpenPositionPreview} className="apple-btn-ghost text-[0.75rem]">
          Preview
        </button>
      )}

      {mode === 'editor' && onOpenSocialShare && (
        <button
          type="button"
          onClick={onOpenSocialShare}
          disabled={positionMode}
          className="apple-btn-ghost"
        >
          Post
        </button>
      )}

      {(mode === 'shared' || mode === 'embed') && onOpenSocialShare && (
        <button type="button" onClick={onOpenSocialShare} className="apple-btn-ghost">
          Share
        </button>
      )}

      {mode === 'editor' && onShare && (
        <button
          type="button"
          onClick={onShare}
          disabled={isPublishing || positionMode}
          className="apple-btn-primary ml-1"
        >
          {isPublishing ? 'Publishing…' : 'Share'}
        </button>
      )}

      {mode === 'editor' && onFullscreen && (
        <button type="button" onClick={onFullscreen} aria-label="Toggle fullscreen" className={iconBtn}>
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>
      )}
    </div>
  )
}
