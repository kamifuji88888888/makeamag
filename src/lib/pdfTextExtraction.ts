import type * as PdfJs from 'pdfjs-dist/legacy/build/pdf.mjs'

type PdfPage = PdfJs.PDFPageProxy

export function normalizeExtractedText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export async function extractPageText(page: PdfPage): Promise<string> {
  const textContent = await page.getTextContent()
  const parts = textContent.items
    .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
    .filter(Boolean)

  return normalizeExtractedText(parts.join(' '))
}

export function pageNeedsOcr(text: string): boolean {
  return normalizeExtractedText(text).length < 12
}
