import { uploadFlipbookCover } from './api'
import { createShareCoverFromDataUrl, dataUrlToBlob } from './thumbnail'

const SHARE_COVER_WIDTHS = [1200, 900, 600, 400] as const

export async function syncShareCover(
  flipbookId: string,
  coverDataUrl: string | undefined,
): Promise<void> {
  if (!coverDataUrl) return

  let lastError: Error | undefined

  for (const maxWidth of SHARE_COVER_WIDTHS) {
    try {
      const jpegDataUrl = await createShareCoverFromDataUrl(coverDataUrl, maxWidth)
      const blob = await dataUrlToBlob(jpegDataUrl)
      await uploadFlipbookCover(flipbookId, blob)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Failed to upload cover image')
    }
  }

  throw lastError ?? new Error('Failed to upload cover image')
}
