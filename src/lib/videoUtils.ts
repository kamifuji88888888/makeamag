import type { VideoEmbed, VideoProvider, VideoSizePreset } from '../../shared/flipbook'
import { VIDEO_SIZE_PRESETS } from '../../shared/flipbook'

/** Extract a Vimeo video id from common share, embed, and dashboard URLs. */
export function extractVimeoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim())
    const host = parsed.hostname.replace(/^www\./, '')
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null

    // player.vimeo.com/video/123, vimeo.com/123, vimeo.com/manage/videos/123,
    // vimeo.com/video/123, vimeo.com/channels/x/123, vimeo.com/groups/x/videos/123
    const match = parsed.pathname.match(
      /(?:\/(?:manage\/)?videos?|\/channels\/[^/]+|\/groups\/[^/]+\/videos)?\/(\d+)(?:\/|$)/,
    )
    return match?.[1] ?? null
  } catch {
    return null
  }
}

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

  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
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

/** Heal embeds saved before manage/dashboard Vimeo URLs were supported. */
export function resolveVideoEmbed(embed: VideoEmbed): VideoEmbed {
  const fromSource = parseVideoUrl(embed.url)
  if (fromSource?.provider === 'vimeo') {
    return {
      ...embed,
      provider: 'vimeo',
      embedUrl: fromSource.embedUrl,
    }
  }

  const fromEmbed = extractVimeoId(embed.embedUrl)
  if (fromEmbed) {
    return {
      ...embed,
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${fromEmbed}`,
    }
  }

  return embed
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
