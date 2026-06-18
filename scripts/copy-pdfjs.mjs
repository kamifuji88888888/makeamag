import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build')
const targetDir = path.join(root, 'public', 'pdfjs')

const files = ['pdf.min.mjs', 'pdf.worker.min.mjs']

await fs.mkdir(targetDir, { recursive: true })

for (const file of files) {
  await fs.copyFile(path.join(sourceDir, file), path.join(targetDir, file))
}

console.log(`Copied ${files.join(', ')} to public/pdfjs/`)
