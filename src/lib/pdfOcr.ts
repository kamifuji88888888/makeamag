import { createWorker, type Worker } from 'tesseract.js'

const OCR_MAX_WIDTH = 1400

let workerPromise: Promise<Worker> | null = null

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng')
      return worker
    })()
  }
  return workerPromise
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return
  const worker = await workerPromise
  await worker.terminate()
  workerPromise = null
}

async function downscaleDataUrl(dataUrl: string, maxWidth = OCR_MAX_WIDTH): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width)
      const width = Math.max(1, Math.floor(image.width * scale))
      const height = Math.max(1, Math.floor(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Could not prepare page image for OCR'))
        return
      }
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    image.onerror = () => reject(new Error('Could not load page image for OCR'))
    image.src = dataUrl
  })
}

export async function ocrPageImage(
  dataUrl: string,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) {
    throw new DOMException('OCR aborted', 'AbortError')
  }

  const worker = await getOcrWorker()
  const scaled = await downscaleDataUrl(dataUrl)

  if (signal?.aborted) {
    throw new DOMException('OCR aborted', 'AbortError')
  }

  const result = await worker.recognize(scaled)
  return result.data.text.replace(/\s+/g, ' ').trim()
}
