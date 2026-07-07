import type * as PdfJs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TocEntry } from '../../shared/flipbook'
import { extractPageText } from './pdfTextExtraction'

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

export interface RenderPdfOptions {
  maxRenderWidth?: number
  jpegQuality?: number
}

const MAX_RENDER_WIDTH = 1400
const MIN_READER_RENDER_WIDTH = 1200
const READER_MAX_DPR = 2

export function getReaderMaxRenderWidth(): number {
  if (typeof window === 'undefined') return MAX_RENDER_WIDTH

  const viewportWidth = window.innerWidth || 390
  const dpr = Math.min(window.devicePixelRatio || 1, READER_MAX_DPR)
  return Math.max(
    MIN_READER_RENDER_WIDTH,
    Math.min(MAX_RENDER_WIDTH, Math.ceil(viewportWidth * dpr)),
  )
}

export function getReaderRenderOptions(): RenderPdfOptions {
  return {
    maxRenderWidth: getReaderMaxRenderWidth(),
    jpegQuality: 0.88,
  }
}

async function loadPdf(data: ArrayBuffer) {
  const pdfjsLib = await getPdfJs()
  return pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  }).promise
}

function createPageCanvas(pageViewport: { width: number; height: number }) {
  const width = Math.max(1, Math.floor(pageViewport.width))
  const height = Math.max(1, Math.floor(pageViewport.height))

  const renderCanvas = document.createElement('canvas')
  renderCanvas.width = width
  renderCanvas.height = height

  const renderContext = renderCanvas.getContext('2d', { alpha: true })
  if (!renderContext) {
    throw new Error('Could not create canvas context for PDF rendering')
  }

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = width
  outputCanvas.height = height

  const outputContext = outputCanvas.getContext('2d', { alpha: false })
  if (!outputContext) {
    throw new Error('Could not create output canvas for PDF rendering')
  }

  outputContext.fillStyle = '#ffffff'
  outputContext.fillRect(0, 0, width, height)

  return { renderCanvas, renderContext, outputCanvas, outputContext }
}

function canvasToDataUrl(canvas: HTMLCanvasElement, jpegQuality = 0.88): string {
  const jpeg = canvas.toDataURL('image/jpeg', jpegQuality)
  if (jpeg.startsWith('data:image/jpeg')) {
    return jpeg
  }
  return canvas.toDataURL('image/png')
}

async function renderPageToDataUrl(
  page: PdfJs.PDFPageProxy,
  pageViewport: ReturnType<PdfJs.PDFPageProxy['getViewport']>,
  jpegQuality: number,
): Promise<string> {
  const pdfjsLib = await getPdfJs()
  const { renderCanvas, renderContext, outputCanvas, outputContext } = createPageCanvas(pageViewport)

  const renderTask = page.render({
    canvas: renderCanvas,
    canvasContext: renderContext,
    viewport: pageViewport,
    intent: 'print',
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    background: 'rgba(0, 0, 0, 0)',
  })

  await renderTask.promise

  outputContext.drawImage(renderCanvas, 0, 0)

  return canvasToDataUrl(outputCanvas, jpegQuality)
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
  options: RenderPdfOptions = {},
): Promise<PdfRenderResult> {
  const maxRenderWidth = options.maxRenderWidth ?? MAX_RENDER_WIDTH
  const jpegQuality = options.jpegQuality ?? 0.88
  const numPages = pdf.numPages
  const images: string[] = []
  const pageTexts: string[] = []

  const firstPage = await pdf.getPage(1)
  const baseViewport = firstPage.getViewport({ scale: 1 })
  const scale = Math.min(2, maxRenderWidth / baseViewport.width)

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum)
      const pageViewport = page.getViewport({ scale })
      images.push(await renderPageToDataUrl(page, pageViewport, jpegQuality))
      try {
        pageTexts.push(await extractPageText(page))
      } catch {
        pageTexts.push('')
      }
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
  options?: RenderPdfOptions,
): Promise<PdfRenderResult> {
  const arrayBuffer = await file.arrayBuffer()
  return renderPdfFromBuffer(arrayBuffer, onProgress, options)
}

export async function renderPdfFromBuffer(
  data: ArrayBuffer,
  onProgress?: (progress: number) => void,
  options?: RenderPdfOptions,
): Promise<PdfRenderResult> {
  const pdf = await loadPdf(data)
  try {
    return await renderPages(pdf, onProgress, options)
  } finally {
    await destroyPdf(pdf)
  }
}

export async function renderPdfFromUrl(
  url: string,
  onProgress?: (progress: number) => void,
  options?: RenderPdfOptions,
): Promise<PdfRenderResult> {
  const pdfjsLib = await getPdfJs()
  const pdf = await pdfjsLib.getDocument({ url, useSystemFonts: true }).promise
  try {
    return await renderPages(pdf, onProgress, options)
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
