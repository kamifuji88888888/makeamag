declare global {
  interface Window {
    __makeamagPdfjs?: typeof import('pdfjs-dist/legacy/build/pdf.mjs')
  }
}

export function bootstrapPdfJs(): Promise<void> {
  if (window.__makeamagPdfjs) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
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

    const existing = document.querySelector('script[data-makeamag-pdfjs]')
    if (existing) {
      waitForPdfJs()
      return
    }

    const script = document.createElement('script')
    script.type = 'module'
    script.src = '/pdfjs-loader.mjs'
    script.dataset.makeamagPdfjs = 'true'
    script.addEventListener('load', waitForPdfJs)
    script.addEventListener('error', () => {
      window.clearTimeout(timeout)
      reject(new Error('PDF engine failed to load'))
    })
    document.head.appendChild(script)
  })
}
