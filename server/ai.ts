import type {
  AiAnalysisResult,
  AiAnalyzeRequest,
  AiPageSample,
  AiPublicationSuggestion,
  AiTocSuggestion,
} from '../shared/ai.js'

const MAX_PAGES = 30
const MAX_CHARS_PER_PAGE = 1200
const MAX_TOTAL_CHARS = 12000

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function aiProvider(): 'openai' | 'heuristic' {
  return isOpenAiConfigured() ? 'openai' : 'heuristic'
}

function trimPages(pages: AiPageSample[]): AiPageSample[] {
  let total = 0
  const trimmed: AiPageSample[] = []

  for (const page of pages.slice(0, MAX_PAGES)) {
    const text = page.text.trim().slice(0, MAX_CHARS_PER_PAGE)
    if (!text) continue
    if (total + text.length > MAX_TOTAL_CHARS) {
      const remaining = MAX_TOTAL_CHARS - total
      if (remaining > 80) {
        trimmed.push({ pageIndex: page.pageIndex, text: text.slice(0, remaining) })
      }
      break
    }
    trimmed.push({ pageIndex: page.pageIndex, text })
    total += text.length
  }

  return trimmed
}

function baseTitleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word
      if (word === word.toUpperCase() && word.length <= 4) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function extractCoverTitle(text: string, fallback: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean)
  const candidates = [
    ...sentences.slice(0, 3),
    normalized.slice(0, 120),
  ].filter((part) => part.length >= 4 && part.length <= 90)

  const best = candidates.sort((a, b) => b.length - a.length)[0]
  return best ? titleCase(best) : fallback
}

function extractPublisher(text: string): string {
  const patterns = [
    /(?:published by|from|©|copyright)\s+([A-Z][A-Za-z0-9&.'\-\s]{2,48})/i,
    /([A-Z][A-Za-z0-9&.'\-\s]{2,48})\s+(?:magazine|catalog|brochure|journal)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].replace(/\s+/g, ' ').trim()
    }
  }

  return ''
}

function extractIssueLabel(text: string): string {
  const patterns = [
    /\b(?:vol\.?|volume)\s*(\d+)(?:\s*[·•|/-]\s*(?:no\.?|issue|#)\s*(\d+))?/i,
    /\b(?:issue|no\.?|#)\s*(\d+)\b/i,
    /\b(spring|summer|fall|autumn|winter)\s+(20\d{2})\b/i,
    /\b(20\d{2})\b/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    if (match[0].match(/spring|summer|fall|autumn|winter/i)) {
      return titleCase(match[0])
    }
    if (match[2]) {
      return `Vol. ${match[1]} · Issue ${match[2]}`
    }
    if (/vol/i.test(match[0])) {
      return `Vol. ${match[1]}`
    }
    if (/issue|no|#/i.test(match[0])) {
      return `Issue ${match[1]}`
    }
    return match[0]
  }

  return ''
}

function extractDescription(pages: AiPageSample[]): string {
  for (const page of pages) {
    const text = page.text.replace(/\s+/g, ' ').trim()
    if (text.length < 15) continue
    const sentence = text.split(/(?<=[.!?])\s+/).find((part) => part.length >= 20)
    if (sentence) {
      return sentence.slice(0, 320).trim()
    }
    return text.slice(0, 320).trim()
  }
  return ''
}

function buildDescriptionFallback(request: AiAnalyzeRequest, pages: AiPageSample[]): string {
  const fromPages = extractDescription(pages.length > 0 ? pages : [])
  if (fromPages) return fromPages

  const context = request.publicationContext
  const title =
    context?.title?.trim() ||
    extractCoverTitle(pages[0]?.text ?? '', baseTitleFromFileName(request.fileName))
  const publisher = context?.publisherName?.trim()
  const issue = context?.issueLabel?.trim()
  const coverSnippet = pages[0]?.text.replace(/\s+/g, ' ').trim().slice(0, 120)

  const parts = [title, publisher, issue].filter(Boolean)
  if (parts.length >= 2) {
    return `${parts.join(' — ')}. Explore the full interactive flipbook on MakeAMag.`.slice(0, 320)
  }
  if (title) {
    const detail = coverSnippet && coverSnippet !== title ? ` Featuring ${coverSnippet}.` : ''
    return `${title}.${detail} Read the full issue online.`.slice(0, 320).trim()
  }

  return `Explore ${baseTitleFromFileName(request.fileName)} — an interactive digital publication.`.slice(
    0,
    320,
  )
}

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 3 || trimmed.length > 72) return false
  if (/^\d+$/.test(trimmed)) return false
  if (/^page\s+\d+$/i.test(trimmed)) return false
  if ((trimmed.match(/\./g) ?? []).length > 2) return false

  const words = trimmed.split(/\s+/)
  if (words.length > 12) return false

  const alphaRatio = trimmed.replace(/[^A-Za-z]/g, '').length / trimmed.length
  if (alphaRatio < 0.5) return false

  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)
  const titleCaseWords = words.filter((word) => /^[A-Z]/.test(word)).length
  const titleCaseRatio = titleCaseWords / words.length

  return isAllCaps || titleCaseRatio >= 0.6
}

function extractTocCandidates(pages: AiPageSample[]): AiTocSuggestion[] {
  const entries: AiTocSuggestion[] = []
  const seen = new Set<string>()

  for (const page of pages) {
    if (page.pageIndex === 0) continue

    const lines = page.text
      .split(/\n+/)
      .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+/))
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    for (const line of lines.slice(0, 8)) {
      if (!looksLikeHeading(line)) continue
      const key = line.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({ title: titleCase(line), pageIndex: page.pageIndex })
      break
    }
  }

  return entries.slice(0, 20)
}

function heuristicAnalyze(request: AiAnalyzeRequest): AiAnalysisResult {
  const pages = trimPages(request.pages)
  const fallbackTitle = baseTitleFromFileName(request.fileName)
  const coverText = pages.find((page) => page.pageIndex === 0)?.text ?? pages[0]?.text ?? ''
  const earlyText = pages
    .slice(0, 4)
    .map((page) => page.text)
    .join(' ')

  const publication: AiPublicationSuggestion = {
    title: extractCoverTitle(coverText, fallbackTitle),
    publisherName: extractPublisher(earlyText) || request.publicationContext?.publisherName?.trim() || '',
    issueLabel: extractIssueLabel(coverText + ' ' + earlyText) || request.publicationContext?.issueLabel?.trim() || '',
    description: buildDescriptionFallback(request, pages),
  }

  const tableOfContents =
    (request.existingTocCount ?? 0) >= 3 ? [] : extractTocCandidates(pages)

  return {
    provider: 'heuristic',
    publication,
    tableOfContents,
  }
}

function buildPrompt(request: AiAnalyzeRequest, pages: AiPageSample[]): string {
  const pageBlocks = pages
    .map((page) => `Page ${page.pageIndex + 1}:\n${page.text}`)
    .join('\n\n')

  return [
    'You analyze magazine, catalog, and brochure PDFs for a digital publishing platform.',
    request.focus === 'description'
      ? 'Write a compelling 1-2 sentence SEO description (max 320 characters) for search engines and social sharing.'
      : 'Return JSON only with this shape:',
    request.focus === 'description'
      ? 'Return JSON: { "description": string }'
      : '{',
    ...(request.focus === 'description'
      ? []
      : [
          '  "title": string,',
          '  "publisherName": string,',
          '  "issueLabel": string,',
          '  "description": string (1-2 sentences for sharing),',
          '  "tableOfContents": [{ "title": string, "pageIndex": number }] ',
          '}',
        ]),
    'Use zero-based pageIndex values that match the provided page numbers minus one.',
    'Suggest 4-12 TOC entries for major sections when the PDF lacks a clear contents page.',
    'If existing TOC count is 3 or more, return an empty tableOfContents array.',
    `File name: ${request.fileName}`,
    `Existing TOC entries: ${request.existingTocCount ?? 0}`,
    request.publicationContext?.title
      ? `Known title: ${request.publicationContext.title}`
      : '',
    request.publicationContext?.publisherName
      ? `Known publisher: ${request.publicationContext.publisherName}`
      : '',
    request.publicationContext?.issueLabel
      ? `Known issue: ${request.publicationContext.issueLabel}`
      : '',
    '',
    pageBlocks.length > 0 ? pageBlocks : 'No extractable page text was available. Use the known metadata and file name.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function openAiAnalyze(request: AiAnalyzeRequest): Promise<AiAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return heuristicAnalyze(request)
  }

  const pages = trimPages(request.pages)
  if (pages.length === 0) {
    return heuristicAnalyze(request)
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract publication metadata and table-of-contents suggestions from PDF text samples. Respond with valid JSON only.',
        },
        {
          role: 'user',
          content: buildPrompt(request, pages),
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `OpenAI request failed (${response.status})`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = payload.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned an empty response')
  }

  const parsed = JSON.parse(content) as {
    title?: string
    publisherName?: string
    issueLabel?: string
    description?: string
    tableOfContents?: Array<{ title?: string; pageIndex?: number }>
  }

  const fallback = heuristicAnalyze(request)

  const tableOfContents: AiTocSuggestion[] = Array.isArray(parsed.tableOfContents)
    ? parsed.tableOfContents
        .map((entry) => ({
          title: String(entry.title ?? '').trim(),
          pageIndex: Number(entry.pageIndex),
        }))
        .filter(
          (entry) =>
            entry.title.length > 0 &&
            Number.isInteger(entry.pageIndex) &&
            entry.pageIndex >= 0,
        )
        .slice(0, 20)
    : fallback.tableOfContents

  return {
    provider: 'openai',
    publication: {
      title: String(parsed.title ?? '').trim() || fallback.publication.title,
      publisherName:
        String(parsed.publisherName ?? '').trim() || fallback.publication.publisherName,
      issueLabel: String(parsed.issueLabel ?? '').trim() || fallback.publication.issueLabel,
      description:
        String(parsed.description ?? '').trim() ||
        fallback.publication.description ||
        buildDescriptionFallback(request, pages),
    },
    tableOfContents:
      (request.existingTocCount ?? 0) >= 3 ? [] : tableOfContents,
  }
}

export async function analyzePublication(request: AiAnalyzeRequest): Promise<AiAnalysisResult> {
  if (!request.fileName?.trim()) {
    throw new Error('fileName is required')
  }

  const hasPages = Array.isArray(request.pages) && request.pages.some((page) => page.text.trim())
  const hasContext = Boolean(
    request.publicationContext?.title?.trim() ||
      request.publicationContext?.publisherName?.trim() ||
      request.publicationContext?.issueLabel?.trim(),
  )

  if (!hasPages && !hasContext) {
    throw new Error('Add a title or upload a text-based PDF before generating a description.')
  }

  const normalizedRequest = {
    ...request,
    pages: hasPages ? request.pages : [],
  }

  if (isOpenAiConfigured()) {
    try {
      return await openAiAnalyze(normalizedRequest)
    } catch (error) {
      console.error('[ai] OpenAI analysis failed, using heuristic fallback:', error)
      return heuristicAnalyze(normalizedRequest)
    }
  }

  return heuristicAnalyze(normalizedRequest)
}
