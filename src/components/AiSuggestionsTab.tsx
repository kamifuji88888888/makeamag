import { useEffect, useState } from 'react'
import type { AiAnalysisResult } from '../../shared/ai'
import type { PublicationInfo, TocEntry } from '../../shared/flipbook'
import { analyzePublication, fetchAiConfig } from '../lib/aiApi'

interface AiSuggestionsTabProps {
  fileName: string
  pageTexts: string[]
  publication: PublicationInfo
  tableOfContents: TocEntry[]
  onPublicationChange: (publication: PublicationInfo) => void
  onTableOfContentsChange: (entries: TocEntry[]) => void
}

function SparkleIcon() {
  return (
    <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
      />
    </svg>
  )
}

function providerLabel(provider: AiAnalysisResult['provider']): string {
  return provider === 'openai' ? 'AI' : 'Smart suggestions'
}

export function AiSuggestionsTab({
  fileName,
  pageTexts,
  publication,
  tableOfContents,
  onPublicationChange,
  onTableOfContentsChange,
}: AiSuggestionsTabProps) {
  const [provider, setProvider] = useState<'openai' | 'heuristic'>('heuristic')
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptedMetadata, setAcceptedMetadata] = useState(false)
  const [acceptedToc, setAcceptedToc] = useState(false)
  const [dismissedMetadata, setDismissedMetadata] = useState(false)
  const [dismissedToc, setDismissedToc] = useState(false)

  async function runAnalysis() {
    if (pageTexts.length === 0) {
      setError('No text could be extracted from this PDF yet.')
      return
    }

    setLoading(true)
    setError(null)
    setAcceptedMetadata(false)
    setAcceptedToc(false)
    setDismissedMetadata(false)
    setDismissedToc(false)

    try {
      const pages = pageTexts
        .map((text, pageIndex) => ({ pageIndex, text: text.trim() }))
        .filter((page) => page.text.length > 0)

      const result = await analyzePublication({
        fileName,
        pages,
        existingTocCount: tableOfContents.length,
        publicationContext: {
          title: publication.title,
          publisherName: publication.publisherName,
          issueLabel: publication.issueLabel,
        },
      })
      setAnalysis(result)
      setProvider(result.provider)
    } catch (err: unknown) {
      setAnalysis(null)
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAiConfig().then((config) => setProvider(config.provider))
  }, [])

  useEffect(() => {
    if (pageTexts.length === 0 || analysis || loading) return
    void runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName, pageTexts.length])

  function acceptMetadata() {
    if (!analysis) return
    onPublicationChange({
      title: analysis.publication.title || publication.title,
      publisherName: analysis.publication.publisherName || publication.publisherName,
      issueLabel: analysis.publication.issueLabel || publication.issueLabel,
      description: analysis.publication.description || publication.description,
    })
    setAcceptedMetadata(true)
  }

  function acceptToc() {
    if (!analysis || analysis.tableOfContents.length === 0) return
    const merged = [
      ...tableOfContents,
      ...analysis.tableOfContents.map((entry) => ({
        id: crypto.randomUUID(),
        title: entry.title,
        pageIndex: entry.pageIndex,
      })),
    ].sort((a, b) => a.pageIndex - b.pageIndex || a.title.localeCompare(b.title))
    onTableOfContentsChange(merged)
    setAcceptedToc(true)
  }

  function acceptAll() {
    acceptMetadata()
    if (analysis?.tableOfContents.length) {
      acceptToc()
    }
  }

  const showMetadataCard = Boolean(analysis) && !dismissedMetadata
  const showTocCard = Boolean(analysis?.tableOfContents.length) && !dismissedToc
  const hasActionableSuggestions = showMetadataCard || showTocCard

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-4">
        <div className="flex items-start gap-3">
          <SparkleIcon />
          <div>
            <p className="text-sm font-medium text-apple-text">AI-assisted publishing</p>
            <p className="mt-1 text-sm leading-relaxed text-apple-muted">
              We read your PDF text and suggest publication details and a table of contents. Review
              everything before applying — nothing changes until you accept it.
            </p>
            <p className="mt-2 text-xs text-apple-muted">
              Powered by {provider === 'openai' ? 'OpenAI' : 'built-in smart analysis'}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-apple-border-light px-4 py-8 text-center">
          <p className="text-sm font-medium text-apple-text">Analyzing your publication…</p>
          <p className="mt-2 text-sm text-apple-muted">Reading cover text and section headings</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={() => void runAnalysis()} className="apple-link ml-2">
            Try again
          </button>
        </div>
      )}

      {!loading && analysis && hasActionableSuggestions && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={acceptAll} className="apple-btn-primary text-sm">
            Accept all suggestions
          </button>
          <button type="button" onClick={() => void runAnalysis()} className="apple-btn-secondary text-sm">
            Re-analyze
          </button>
        </div>
      )}

      {!loading && analysis && showMetadataCard && (
        <section className="rounded-xl border border-apple-border-light p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-apple-text">Publication details</p>
              <p className="mt-1 text-xs text-apple-muted">{providerLabel(analysis.provider)} suggestion</p>
            </div>
            {acceptedMetadata ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Applied
              </span>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => setDismissedMetadata(true)} className="apple-btn-ghost text-xs">
                  Dismiss
                </button>
                <button type="button" onClick={acceptMetadata} className="apple-btn-secondary text-xs">
                  Accept
                </button>
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-apple-muted">Title</dt>
              <dd className="mt-1 text-apple-text">{analysis.publication.title || '—'}</dd>
            </div>
            {analysis.publication.publisherName && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-apple-muted">Publisher</dt>
                <dd className="mt-1 text-apple-text">{analysis.publication.publisherName}</dd>
              </div>
            )}
            {analysis.publication.issueLabel && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-apple-muted">Issue / volume</dt>
                <dd className="mt-1 text-apple-text">{analysis.publication.issueLabel}</dd>
              </div>
            )}
            {analysis.publication.description && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-apple-muted">Description</dt>
                <dd className="mt-1 leading-relaxed text-apple-muted">{analysis.publication.description}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {!loading && analysis && showTocCard && (
        <section className="rounded-xl border border-apple-border-light p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-apple-text">Table of contents</p>
              <p className="mt-1 text-xs text-apple-muted">
                {analysis.tableOfContents.length} section
                {analysis.tableOfContents.length === 1 ? '' : 's'} suggested
              </p>
            </div>
            {acceptedToc ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Applied
              </span>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => setDismissedToc(true)} className="apple-btn-ghost text-xs">
                  Dismiss
                </button>
                <button type="button" onClick={acceptToc} className="apple-btn-secondary text-xs">
                  Accept
                </button>
              </div>
            )}
          </div>

          <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-lg bg-apple-gray/70 p-2">
            {analysis.tableOfContents.map((entry) => (
              <li
                key={`${entry.pageIndex}-${entry.title}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                <span className="shrink-0 tabular-nums text-apple-muted">p.{entry.pageIndex + 1}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && analysis && !hasActionableSuggestions && (
        <div className="rounded-xl border border-apple-border-light px-4 py-5 text-sm text-apple-muted">
          {tableOfContents.length >= 3
            ? 'Your publication already has a table of contents. Metadata suggestions were applied or dismissed.'
            : 'No new suggestions right now. Try re-analyzing after updating your PDF.'}
          <button type="button" onClick={() => void runAnalysis()} className="apple-link mt-3 block">
            Re-analyze
          </button>
        </div>
      )}

      {!loading && !analysis && !error && pageTexts.length === 0 && (
        <div className="rounded-xl border border-apple-border-light px-4 py-5 text-sm text-apple-muted">
          This PDF has little extractable text — it may be scanned. Search will use OCR; AI suggestions
          work best on text-based PDFs.
        </div>
      )}
    </div>
  )
}
