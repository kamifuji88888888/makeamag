import type { FlipbookStoredMeta } from '../../shared/flipbook.js'

export interface LogoAsset {
  buffer: Buffer
  contentType: string
}

export interface StorageProvider {
  savePdf(id: string, buffer: Buffer): Promise<string>
  readPdf(id: string): Promise<Buffer>
  getPdfRedirectUrl(id: string): Promise<string | null>
  saveMeta(meta: FlipbookStoredMeta): Promise<void>
  readMeta(id: string): Promise<FlipbookStoredMeta | null>
  listAllMeta(): Promise<FlipbookStoredMeta[]>
  saveLogo(id: string, buffer: Buffer, contentType: string): Promise<string>
  readLogo(id: string): Promise<LogoAsset | null>
  deleteLogo(id: string): Promise<void>
  saveCover(id: string, buffer: Buffer, contentType: string): Promise<string>
  readCover(id: string): Promise<LogoAsset | null>
  deleteCover(id: string): Promise<void>
}
