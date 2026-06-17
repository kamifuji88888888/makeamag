import type { VideoEmbed } from '../../shared/flipbook'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function clampEmbedBounds(
  embed: Pick<VideoEmbed, 'x' | 'y' | 'width' | 'height'>,
): Pick<VideoEmbed, 'x' | 'y' | 'width' | 'height'> {
  const width = clamp(embed.width, 12, 100)
  const height = clamp(embed.height, 12, 100)
  return {
    x: clamp(embed.x, 0, 100 - width),
    y: clamp(embed.y, 0, 100 - height),
    width,
    height,
  }
}
