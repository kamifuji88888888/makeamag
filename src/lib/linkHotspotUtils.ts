import { LINK_HOTSPOT_PRESET, type LinkHotspot } from '../../shared/flipbook'

export function createLinkHotspot(
  pageIndex: number,
  url: string,
  label: string,
): LinkHotspot | null {
  const trimmedUrl = url.trim()
  if (!trimmedUrl) return null

  try {
    const parsed = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`)
    return {
      id: crypto.randomUUID(),
      pageIndex,
      url: parsed.toString(),
      label: label.trim() || parsed.hostname,
      ...LINK_HOTSPOT_PRESET,
    }
  } catch {
    return null
  }
}
