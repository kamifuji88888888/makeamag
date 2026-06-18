import type * as PdfJs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TocEntry } from '../../shared/flipbook'

type PdfJsModule = typeof PdfJs

declare global {
  interface Window {
    __makeamagPdfjs?: PdfJsModule
  }
}

async function getPdfJs(): Promise<PdfJsModule> {
  if (window.__makeamagPdfjs) {
    return window.__makeamagPdfjs
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('PDF engine failed to load'))
    }, 15000)

    const waitForPdfJs = () => {
      if (window.__makeamagPdfjs) {
        window.clearTimeout(timeout)
        resolve()
        return
      }
      window.requestAnimationFrame(waitForPdfJs)
    }

    waitForPdfJs()
  })

  return window.__makeamagPdfjs!
}

export interface PdfRenderResult {
  images: string[]
  aspectRatio: number
  pageCount: number
  pageTexts: string[]
}

const MAX_RENDER_WIDTH = 1400

async function loadPdf(data: ArrayBuffer) {
  const pdfjsLib = await getPdfJs()
  return pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  }).promise
}

function createPageCanvas(pageViewport: { width: number; height: number }) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(pageViewport.width))
  canvas.height = Math.max(1, Math.floor(pageViewport.height))

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    throw new Error('Could not create canvas context for PDF rendering')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  return { canvas, context }
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  const jpeg = canvas.toDataURL('image/jpeg', 0.88)
  if (jpeg.startsWith('data:image/jpeg')) {
    return jpeg
  }
  return canvas.toDataURL('image/png')
}

async function renderPageToDataUrl(
  page: PdfJs.PDFPageProxy,
  pageViewport: ReturnType<PdfJs.PDFPageProxy['getViewport']>,
): Promise<string> {
  const pdfjsLib = await getPdfJs()
  const { canvas, context } = createPageCanvas(pageViewport)

  const renderTask = page.render({
    canvas,
    canvasContext: context,
    viewport: pageViewport,
    intent: 'display',
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    background: '#ffffff',
  })

  await renderTask.promise

  return canvasToDataUrl(canvas)
}

async function destroyPdf(pdf: PdfJs.PDFDocumentProxy) {
  try {
    if (typeof pdf.destroy === 'function') {
      await pdf.destroy()
    }
  } catch {
    // Ignore cleanup failures after a successful render.
  }
}

async function renderPages(
  pdf: PdfJs.PDFDocumentProxy,
  onProgress?: (progress: number) => void,
): Promise<PdfRenderResult> {
  const numPages = pdf.numPages
  const images: string[] = []
  const pageTexts: string[] = []

  const firstPage = await pdf.getPage(1)
  const baseViewport = firstPage.getViewport({ scale: 1 })
  const scale = Math.min(2, MAX_RENDER_WIDTH / baseViewport.width)

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum)
      const pageViewport = page.getViewport({ scale })
      images.push(await renderPageToDataUrl(page, pageViewport))
      pageTexts.push('')
      onProgress?.(pageNum / numPages)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to render page ${pageNum}: ${detail}`)
    }
  }

  const aspectViewport = firstPage.getViewport({ scale })
  const aspectRatio = aspectViewport.width / aspectViewport.height

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
  try {
    return await renderPages(pdf, onProgress)
  } finally {
    await destroyPdf(pdf)
  }
}

export async function renderPdfFromUrl(
  url: string,
  onProgress?: (progress: number) => void,
): Promise<PdfRenderResult> {
  const pdfjsLib = await getPdfJs()
  const pdf = await pdfjsLib.getDocument({ url, useSystemFonts: true }).promise
  try {
    return await renderPages(pdf, onProgress)
  } finally {
    await destroyPdf(pdf)
  }
}

async function resolveOutlinePageIndex(
  pdf: PdfJs.PDFDocumentProxy,
  item: { dest?: string | unknown[] | null; title?: string },
): Promise<number | null> {
  if (!item.dest) return null

  try {
    let dest: unknown = item.dest
    if (typeof dest === 'string') {
      dest = await pdf.getDestination(dest)
    }
    if (!Array.isArray(dest) || !dest[0]) return null
    return await pdf.getPageIndex(dest[0] as Parameters<PdfJs.PDFDocumentProxy['getPageIndex']>[0])
  } catch {
    return null
  }
}

async function flattenOutline(
  pdf: PdfJs.PDFDocumentProxy,
  items: NonNullable<Awaited<ReturnType<PdfJs.PDFDocumentProxy['getOutline']>>>,
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
  try {
    const outline = await pdf.getOutline()
    if (!outline?.length) return []
    return flattenOutline(pdf, outline)
  } finally {
    await destroyPdf(pdf)
  }
}
