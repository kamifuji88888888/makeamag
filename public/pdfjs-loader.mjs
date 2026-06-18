import * as pdfjs from '/pdfjs/pdf.min.mjs'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
window.__makeamagPdfjs = pdfjs
