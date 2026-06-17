export interface FlipbookSearchResult {
  pageIndex: number
  pageNumber: number
  snippet: string
}

function buildSnippet(text: string, matchIndex: number, queryLength: number): string {
  const start = Math.max(0, matchIndex - 40)
  const end = Math.min(text.length, matchIndex + queryLength + 60)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end).trim()}${suffix}`
}

export function searchFlipbookPages(pageTexts: string[], query: string): FlipbookSearchResult[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  const results: FlipbookSearchResult[] = []

  pageTexts.forEach((text, pageIndex) => {
    const haystack = text.toLowerCase()
    const matchIndex = haystack.indexOf(normalized)
    if (matchIndex === -1) return

    results.push({
      pageIndex,
      pageNumber: pageIndex + 1,
      snippet: buildSnippet(text, matchIndex, normalized.length),
    })
  })

  return results
}
