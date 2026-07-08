declare global {
  interface Window {
    __makeamagPdfjs?: typeof import('pdfjs-dist/legacy/build/pdf.mjs')
  }
}

declare const __PDFJS_VERSION__: string

const PDFJS_VERSION = __PDFJS_VERSION__

export function bootstrapPdfJs(): Promise<void> {
  if (window.__makeamagPdfjs?.version === PDFJS_VERSION) {
    return Promise.resolve()
  }

  delete window.__makeamagPdfjs
  document.querySelectorAll('script[data-makeamag-pdfjs]').forEach((node) => node.remove())

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('PDF engine failed to load'))
    }, 15000)

    const waitForPdfJs = () => {
      if (window.__makeamagPdfjs?.version === PDFJS_VERSION) {
        window.clearTimeout(timeout)
        resolve()
        return
      }
      window.requestAnimationFrame(waitForPdfJs)
    }

    const script = document.createElement('script')
    script.type = 'module'
    script.src = `/pdfjs-loader.mjs?v=${PDFJS_VERSION}`
    script.dataset.makeamagPdfjs = PDFJS_VERSION
    script.addEventListener('load', waitForPdfJs)
    script.addEventListener('error', () => {
      window.clearTimeout(timeout)
      reject(new Error('PDF engine failed to load'))
    })
    document.head.appendChild(script)
  })
}
