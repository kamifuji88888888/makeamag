import type { VideoEmbed, VideoProvider, VideoSizePreset } from '../../shared/flipbook'
import { VIDEO_SIZE_PRESETS } from '../../shared/flipbook'

export function parseVideoUrl(rawUrl: string): {
  provider: VideoProvider
  embedUrl: string
} | null {
  const url = rawUrl.trim()
  if (!url) return null

  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ]

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${match[1]}?rel=0`,
      }
    }
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeoMatch?.[1]) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    }
  }

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.startsWith('blob:')) {
    return { provider: 'direct', embedUrl: url }
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { provider: 'direct', embedUrl: url }
    }
  } catch {
    return null
  }

  return null
}

export function createVideoEmbed(
  pageIndex: number,
  url: string,
  size: VideoSizePreset,
): VideoEmbed | null {
  const parsed = parseVideoUrl(url)
  if (!parsed) return null

  const preset = VIDEO_SIZE_PRESETS[size]

  return {
    id: crypto.randomUUID(),
    pageIndex,
    url: url.trim(),
    embedUrl: parsed.embedUrl,
    provider: parsed.provider,
    ...preset,
  }
}
