import { useEffect, useMemo, useState } from 'react'
import { searchFlipbookPages, type FlipbookSearchResult } from '../lib/flipbookSearch'

interface FlipbookSearchPanelProps {
  pageTexts: string[]
  currentPage: number
  onGoToPage: (pageIndex: number) => void
  onClose: () => void
}

export function FlipbookSearchPanel({
  pageTexts,
  currentPage,
  onGoToPage,
  onClose,
}: FlipbookSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FlipbookSearchResult[]>([])

  const searchable = pageTexts.some((text) => text.length > 0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResults(searchFlipbookPages(pageTexts, query))
    }, 150)
    return () => window.clearTimeout(timer)
  }, [pageTexts, query])

  const resultLabel = useMemo(() => {
    if (!query.trim()) return 'Search this issue'
    if (results.length === 0) return 'No matches'
    return `${results.length} match${results.length === 1 ? '' : 'es'}`
  }, [query, results.length])

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="apple-modal flex max-h-[80vh] w-full max-w-lg flex-col">
        <div className="flex items-center justify-between border-b border-apple-border-light px-5 py-4">
          <div>
            <h3 className="text-[1.125rem] font-semibold text-apple-text">Search</h3>
            <p className="text-sm text-apple-muted">{resultLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-apple-muted hover:bg-apple-gray"
            aria-label="Close search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-apple-border-light px-5 py-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search words in this issue…"
            className="apple-input"
          />
        </div>

        <div className="overflow-y-auto px-3 py-3">
          {!searchable && (
            <p className="px-2 py-6 text-center text-sm text-apple-muted">
              This PDF does not contain searchable text. Scanned image-only pages cannot be searched.
            </p>
          )}

          {searchable && query.trim() && results.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-apple-muted">
              No pages matched &ldquo;{query.trim()}&rdquo;.
            </p>
          )}

          {results.map((result) => (
            <button
              key={`${result.pageIndex}-${result.snippet}`}
              type="button"
              onClick={() => {
                onGoToPage(result.pageIndex)
                onClose()
              }}
              className={[
                'w-full rounded-xl px-3 py-3 text-left transition hover:bg-apple-gray',
                currentPage === result.pageNumber ? 'bg-apple-blue/8' : '',
              ].join(' ')}
            >
              <p className="text-sm font-medium text-apple-text">Page {result.pageNumber}</p>
              <p className="mt-1 text-sm leading-relaxed text-apple-muted">{result.snippet}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
