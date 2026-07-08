import * as pdfjs from '/pdfjs/pdf.min.mjs?v=6.1.200'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs?v=6.1.200'
window.__makeamagPdfjs = pdfjs
