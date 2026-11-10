import { useEffect, useRef } from 'react'

interface FlipbookThumbnailsPanelProps {
  pageImages: string[]
  currentPage: number
  onGoToPage: (pageIndex: number) => void
  onClose: () => void
}

export function FlipbookThumbnailsPanel({
  pageImages,
  currentPage,
  onGoToPage,
  onClose,
}: FlipbookThumbnailsPanelProps) {
  const currentRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="apple-modal flex max-h-[85vh] w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between border-b border-apple-border-light px-5 py-4">
          <div>
            <h3 className="text-[1.125rem] font-semibold text-apple-text">Thumbnails</h3>
            <p className="text-sm text-apple-muted">
              {pageImages.length} page{pageImages.length === 1 ? '' : 's'} · Tap to jump
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-apple-muted hover:bg-apple-gray"
            aria-label="Close thumbnails"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {pageImages.map((src, index) => {
              const pageNumber = index + 1
              const isCurrent = pageNumber === currentPage
              return (
                <button
                  key={index}
                  ref={isCurrent ? currentRef : undefined}
                  type="button"
                  onClick={() => {
                    onGoToPage(index)
                    onClose()
                  }}
                  className={[
                    'group flex flex-col overflow-hidden rounded-xl border text-left transition',
                    isCurrent
                      ? 'border-apple-blue ring-2 ring-apple-blue/25'
                      : 'border-apple-border-light hover:border-apple-blue/40',
                  ].join(' ')}
                >
                  <div className="aspect-[3/4] bg-apple-gray">
                    <img
                      src={src}
                      alt={`Page ${pageNumber}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <span
                    className={[
                      'px-2 py-1.5 text-center text-xs font-medium tabular-nums',
                      isCurrent ? 'bg-apple-blue/10 text-apple-blue' : 'text-apple-muted',
                    ].join(' ')}
                  >
                    {pageNumber}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
