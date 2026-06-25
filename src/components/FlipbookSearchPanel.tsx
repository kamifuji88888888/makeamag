import { useEffect, useMemo, useRef, useState } from 'react'
import { searchFlipbookPages, type FlipbookSearchResult } from '../lib/flipbookSearch'
import { ocrPageImage, terminateOcrWorker } from '../lib/pdfOcr'
import { pageNeedsOcr } from '../lib/pdfTextExtraction'

interface FlipbookSearchPanelProps {
  pageTexts: string[]
  pageImages: string[]
  currentPage: number
  onGoToPage: (pageIndex: number) => void
  onPageTextsChange?: (pageTexts: string[]) => void
  onClose: () => void
}

function mergePageTexts(base: string[], ocrTexts: string[]): string[] {
  return base.map((text, index) => text || ocrTexts[index] || '')
}

export function FlipbookSearchPanel({
  pageTexts,
  pageImages,
  currentPage,
  onGoToPage,
  onPageTextsChange,
  onClose,
}: FlipbookSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FlipbookSearchResult[]>([])
  const [ocrTexts, setOcrTexts] = useState<string[]>(() => pageTexts.map(() => ''))
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 })
  const ocrTextsRef = useRef(ocrTexts)
  const scanAbortRef = useRef<AbortController | null>(null)
  const activeQueryRef = useRef('')

  useEffect(() => {
    ocrTextsRef.current = ocrTexts
  }, [ocrTexts])

  const effectiveTexts = useMemo(
    () => mergePageTexts(pageTexts, ocrTexts),
    [ocrTexts, pageTexts],
  )

  const hasEmbeddedText = pageTexts.some((text) => !pageNeedsOcr(text))
  const hasScannedText = ocrTexts.some((text) => text.length > 0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResults(searchFlipbookPages(effectiveTexts, query))
    }, 150)
    return () => window.clearTimeout(timer)
  }, [effectiveTexts, query])

  useEffect(() => {
    const normalized = query.trim()
    activeQueryRef.current = normalized

    if (normalized.length < 2) {
      scanAbortRef.current?.abort()
      setScanning(false)
      return
    }

    const pagesToScan = pageImages
      .map((_, pageIndex) => pageIndex)
      .filter((pageIndex) => {
        if (!pageNeedsOcr(pageTexts[pageIndex] ?? '')) return false
        return !ocrTextsRef.current[pageIndex]
      })

    if (pagesToScan.length === 0) {
      setScanning(false)
      return
    }

    const controller = new AbortController()
    scanAbortRef.current?.abort()
    scanAbortRef.current = controller

    async function scanPages() {
      setScanning(true)
      setScanProgress({ done: 0, total: pagesToScan.length })

      const discovered = [...ocrTextsRef.current]
      while (discovered.length < pageImages.length) {
        discovered.push('')
      }

      for (let index = 0; index < pagesToScan.length; index += 1) {
        if (controller.signal.aborted) return

        const pageIndex = pagesToScan[index]
        const image = pageImages[pageIndex]
        if (!image) continue

        try {
          const text = await ocrPageImage(image, controller.signal)
          if (controller.signal.aborted) return

          discovered[pageIndex] = text
          ocrTextsRef.current = [...discovered]
          setOcrTexts([...discovered])

          const merged = mergePageTexts(pageTexts, discovered)
          onPageTextsChange?.(merged)
          if (activeQueryRef.current === normalized) {
            setResults(searchFlipbookPages(merged, normalized))
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return
          discovered[pageIndex] = ''
        }

        if (controller.signal.aborted) return
        setScanProgress({ done: index + 1, total: pagesToScan.length })
      }

      if (!controller.signal.aborted) {
        setScanning(false)
      }
    }

    void scanPages()

    return () => {
      controller.abort()
    }
  }, [onPageTextsChange, pageImages, pageTexts, query])

  useEffect(() => {
    return () => {
      scanAbortRef.current?.abort()
      void terminateOcrWorker()
    }
  }, [])

  const resultLabel = useMemo(() => {
    if (scanning) {
      return scanProgress.total > 0
        ? `Scanning pages… ${scanProgress.done}/${scanProgress.total}`
        : 'Scanning pages…'
    }
    if (!query.trim()) {
      return hasEmbeddedText || hasScannedText
        ? 'Search this issue'
        : 'Search scans pages as you type'
    }
    if (results.length === 0) return 'No matches'
    return `${results.length} match${results.length === 1 ? '' : 'es'}`
  }, [hasEmbeddedText, hasScannedText, query, results.length, scanProgress.done, scanProgress.total, scanning])

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
          {!hasEmbeddedText && !hasScannedText && (
            <p className="mt-2 text-xs text-apple-muted">
              This PDF looks image-only. We&apos;ll scan pages while you search.
            </p>
          )}
        </div>

        <div className="overflow-y-auto px-3 py-3">
          {scanning && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-2 py-6 text-center">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-apple-blue/20 border-t-apple-blue" />
              <p className="text-sm text-apple-muted">
                Reading page images to find &ldquo;{query.trim()}&rdquo;…
              </p>
            </div>
          )}

          {!scanning && query.trim() && results.length === 0 && (
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
