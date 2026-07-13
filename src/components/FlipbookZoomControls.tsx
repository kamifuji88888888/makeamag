interface FlipbookZoomControlsProps {
  zoom: number
  minZoom: number
  maxZoom: number
  onZoomChange: (zoom: number) => void
  onReset: () => void
  /** Nest inside another control bar without its own pill background. */
  inline?: boolean
  compact?: boolean
}

export function FlipbookZoomControls({
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
  onReset,
  inline = false,
  compact = false,
}: FlipbookZoomControlsProps) {
  const percent = Math.round(zoom * 100)
  const iconBtn = inline
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-apple-text transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-apple-text transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30'

  const content = (
    <>
      <button
        type="button"
        className={iconBtn}
        aria-label="Zoom out"
        disabled={zoom <= minZoom}
        onClick={() => onZoomChange(Math.max(minZoom, zoom - 0.25))}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      </button>

      <input
        type="range"
        min={minZoom * 100}
        max={maxZoom * 100}
        step={5}
        value={percent}
        onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
        className={[
          'flipbook-zoom-slider flex-1',
          inline ? 'min-w-[3.5rem] max-w-[5.5rem]' : 'min-w-[7rem]',
        ].join(' ')}
        aria-label="Zoom level"
        aria-valuemin={minZoom * 100}
        aria-valuemax={maxZoom * 100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
      />

      <button
        type="button"
        className={iconBtn}
        aria-label="Zoom in"
        disabled={zoom >= maxZoom}
        onClick={() => onZoomChange(Math.min(maxZoom, zoom + 0.25))}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <span
        className={[
          'text-center text-[0.8125rem] font-medium tabular-nums text-apple-muted',
          inline ? 'min-w-[2.5rem]' : 'min-w-[3rem]',
        ].join(' ')}
      >
        {percent}%
      </span>

      {zoom > minZoom && (
        <button
          type="button"
          onClick={onReset}
          className={[
            'apple-btn-ghost text-[0.75rem]',
            inline ? 'hidden sm:inline-flex' : '',
          ].join(' ')}
        >
          Reset
        </button>
      )}
    </>
  )

  if (inline) {
    return (
      <div className="flex items-center gap-1" role="group" aria-label="Zoom controls">
        {content}
      </div>
    )
  }

  return (
    <div
      className={[
        'apple-controls flex items-center gap-2',
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5',
      ].join(' ')}
      role="group"
      aria-label="Zoom controls"
    >
      {content}
    </div>
  )
}
