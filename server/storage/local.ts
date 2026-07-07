import fs from 'fs/promises'
import path from 'path'
import type { FlipbookStoredMeta } from '../../shared/flipbook.js'
import type { StorageProvider } from './types.js'

export function createLocalStorage(dataDir: string): StorageProvider {
  const pdfDir = path.join(dataDir, 'pdfs')
  const metaDir = path.join(dataDir, 'meta')
  const logoDir = path.join(dataDir, 'logos')
  const coverDir = path.join(dataDir, 'covers')

  async function ensureDirs() {
    await fs.mkdir(pdfDir, { recursive: true })
    await fs.mkdir(metaDir, { recursive: true })
    await fs.mkdir(logoDir, { recursive: true })
    await fs.mkdir(coverDir, { recursive: true })
  }

  function logoPath(id: string) {
    return path.join(logoDir, `${id}.logo`)
  }

  function logoMetaPath(id: string) {
    return path.join(logoDir, `${id}.meta.json`)
  }

  function coverPath(id: string) {
    return path.join(coverDir, `${id}.cover`)
  }

  function coverMetaPath(id: string) {
    return path.join(coverDir, `${id}.meta.json`)
  }

  return {
    async savePdf(id, buffer) {
      await ensureDirs()
      const key = `${id}.pdf`
      await fs.writeFile(path.join(pdfDir, key), buffer)
      return key
    },

    async readPdf(id) {
      const meta = await this.readMeta(id)
      if (!meta) throw new Error('Flipbook not found')
      return fs.readFile(path.join(pdfDir, meta.pdfKey))
    },

    async getPdfRedirectUrl() {
      return null
    },

    async saveMeta(meta) {
      await ensureDirs()
      await fs.writeFile(
        path.join(metaDir, `${meta.id}.json`),
        JSON.stringify(meta, null, 2),
      )
    },

    async readMeta(id) {
      try {
        const raw = await fs.readFile(path.join(metaDir, `${id}.json`), 'utf-8')
        return JSON.parse(raw) as FlipbookStoredMeta
      } catch {
        return null
      }
    },

    async listAllMeta() {
      await ensureDirs()
      let files: string[]
      try {
        files = await fs.readdir(metaDir)
      } catch {
        return []
      }

      const metas: FlipbookStoredMeta[] = []
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        try {
          const raw = await fs.readFile(path.join(metaDir, file), 'utf-8')
          metas.push(JSON.parse(raw) as FlipbookStoredMeta)
        } catch {
          // skip corrupt meta files
        }
      }
      return metas
    },

    async saveLogo(id, buffer, contentType) {
      await ensureDirs()
      await fs.writeFile(logoPath(id), buffer)
      await fs.writeFile(logoMetaPath(id), JSON.stringify({ contentType }))
      return `${id}.logo`
    },

    async readLogo(id) {
      try {
        const metaRaw = await fs.readFile(logoMetaPath(id), 'utf-8')
        const meta = JSON.parse(metaRaw) as { contentType: string }
        const buffer = await fs.readFile(logoPath(id))
        return { buffer, contentType: meta.contentType }
      } catch {
        return null
      }
    },

    async deleteLogo(id) {
      await fs.rm(logoPath(id), { force: true })
      await fs.rm(logoMetaPath(id), { force: true })
    },

    async saveCover(id, buffer, contentType) {
      await ensureDirs()
      await fs.writeFile(coverPath(id), buffer)
      await fs.writeFile(coverMetaPath(id), JSON.stringify({ contentType }))
      return `${id}.cover`
    },

    async readCover(id) {
      try {
        const metaRaw = await fs.readFile(coverMetaPath(id), 'utf-8')
        const meta = JSON.parse(metaRaw) as { contentType: string }
        const buffer = await fs.readFile(coverPath(id))
        return { buffer, contentType: meta.contentType }
      } catch {
        return null
      }
    },

    async deleteCover(id) {
      await fs.rm(coverPath(id), { force: true })
      await fs.rm(coverMetaPath(id), { force: true })
    },
  }
}
