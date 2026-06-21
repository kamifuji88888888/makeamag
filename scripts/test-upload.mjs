import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pdfPath = path.join(__dirname, '..', 'test-minimal.pdf')
const target = process.argv[2] ?? 'http://localhost:3099/'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()))
page.on('pageerror', (err) => console.log('PAGEERROR', err.message))

await page.goto(target)
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.getByRole('button', { name: /Drop or Upload Your PDF/i }).click(),
])
await fileChooser.setFiles(pdfPath)
await page.waitForTimeout(10000)

const body = await page.locator('body').innerText()
console.log('BODY SNIPPET:', body.slice(0, 800))
await browser.close()
