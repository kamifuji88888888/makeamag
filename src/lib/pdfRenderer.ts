import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TocEntry } from '../../shared/flipbook'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
  import.meta.url,
).href

export interface PdfRenderResult {
  images: string[]
  aspectRatio: number
  pageCount: number
  pageTexts: string[]
}

const MAX_RENDER_WIDTH = 1400

async function loadPdf(data: ArrayBuffer) {
  return pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  }).promise
}

function createPageCanvas(pageViewport: { width: number; height: number }) {
  const canvas = document.createElement('canvas')
  canvas.width = pageViewport.width
  canvas.height = pageViewport.height

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    throw new Error('Could not create canvas context for PDF rendering')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  return { canvas, context }
}

async function renderPageToDataUrl(
  page: pdfjsLib.PDFPageProxy,
  pageViewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>,
  optionalContentConfigPromise?: ReturnType<pdfjsLib.PDFDocumentProxy['getOptionalContentConfig']>,
): Promise<string> {
  const { canvas, context } = createPageCanvas(pageViewport)

  await page.render({
    canvas,
    canvasContext: context,
    viewport: pageViewport,
    intent: 'display',
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    background: '#ffffff',
    optionalContentConfigPromise,
  }).promise

  return canvas.toDataURL('image/png')
}

async function extractPageText(page: pdfjsLib.PDFPageProxy): Promise<string> {
  const content = await page.getTextContent()
  return content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function renderPages(
  pdf: pdfjsLib.PDFDocumentProxy,
  onProgress?: (progress: number) => void,
): Promise<PdfRenderResult> {
  const numPages = pdf.numPages
  const images: string[] = []
  const pageTexts: string[] = []

  const firstPage = await pdf.getPage(1)
  const baseViewport = firstPage.getViewport({ scale: 1 })
  const scale = Math.min(2, MAX_RENDER_WIDTH / baseViewport.width)
  const viewport = firstPage.getViewport({ scale })
  const aspectRatio = viewport.width / viewport.height
  const optionalContentConfigPromise = pdf.getOptionalContentConfig({ intent: 'display' })

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const pageViewport = page.getViewport({ scale })

    images.push(await renderPageToDataUrl(page, pageViewport, optionalContentConfigPromise))
    pageTexts.push(await extractPageText(page))
    onProgress?.(pageNum / numPages)
  }

  return { images, aspectRatio, pageCount: numPages, pageTexts }
}

export async function renderPdfToImages(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<PdfRenderResult> {
  const arrayBuffer = await file.arrayBuffer()
  return renderPdfFromBuffer(arrayBuffer, onProgress)
}

export async function renderPdfFromBuffer(
  data: ArrayBuffer,
  onProgress?: (progress: number) => void,
): Promise<PdfRenderResult> {
  const pdf = await loadPdf(data)
  return renderPages(pdf, onProgress)
}

export async function renderPdfFromUrl(
  url: string,
  onProgress?: (progress: number) => void,
): Promise<PdfRenderResult> {
  const pdf = await pdfjsLib.getDocument({ url, useSystemFonts: true }).promise
  return renderPages(pdf, onProgress)
}

async function resolveOutlinePageIndex(
  pdf: pdfjsLib.PDFDocumentProxy,
  item: { dest?: string | unknown[] | null; title?: string },
): Promise<number | null> {
  if (!item.dest) return null

  try {
    let dest: unknown = item.dest
    if (typeof dest === 'string') {
      dest = await pdf.getDestination(dest)
    }
    if (!Array.isArray(dest) || !dest[0]) return null
    return await pdf.getPageIndex(dest[0] as Parameters<pdfjsLib.PDFDocumentProxy['getPageIndex']>[0])
  } catch {
    return null
  }
}

async function flattenOutline(
  pdf: pdfjsLib.PDFDocumentProxy,
  items: NonNullable<Awaited<ReturnType<pdfjsLib.PDFDocumentProxy['getOutline']>>>,
  acc: TocEntry[] = [],
): Promise<TocEntry[]> {
  for (const item of items) {
    const pageIndex = await resolveOutlinePageIndex(pdf, item)
    if (pageIndex !== null && item.title?.trim()) {
      acc.push({
        id: crypto.randomUUID(),
        title: item.title.trim(),
        pageIndex,
      })
    }
    if (item.items?.length) {
      await flattenOutline(pdf, item.items, acc)
    }
  }
  return acc
}

export async function extractPdfOutline(file: File): Promise<TocEntry[]> {
  const buffer = await file.arrayBuffer()
  const pdf = await loadPdf(buffer)
  const outline = await pdf.getOutline()
  if (!outline?.length) return []
  return flattenOutline(pdf, outline)
}
