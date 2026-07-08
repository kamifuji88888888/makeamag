import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build')
const targetDir = path.join(root, 'public', 'pdfjs')

const pdfPkg = JSON.parse(
  await fs.readFile(path.join(root, 'node_modules', 'pdfjs-dist', 'package.json'), 'utf8'),
)
const version = pdfPkg.version

const files = ['pdf.min.mjs', 'pdf.worker.min.mjs']

await fs.mkdir(targetDir, { recursive: true })

for (const file of files) {
  await fs.copyFile(path.join(sourceDir, file), path.join(targetDir, file))
}

const loaderContent = `import * as pdfjs from '/pdfjs/pdf.min.mjs?v=${version}'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs?v=${version}'
window.__makeamagPdfjs = pdfjs
`

await fs.writeFile(path.join(root, 'public', 'pdfjs-loader.mjs'), loaderContent)

console.log(`Copied ${files.join(', ')} to public/pdfjs/ (pdfjs-dist ${version})`)
