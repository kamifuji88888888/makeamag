import type { VideoEmbed } from '../../shared/flipbook'
import { resolveVideoEmbed } from '../lib/videoUtils'
import { VideoDragOverlay } from './VideoDragOverlay'

interface VideoOverlayProps {
  embed: VideoEmbed
  interactive?: boolean
  editable?: boolean
  selected?: boolean
  onSelect?: () => void
  onChange?: (embed: VideoEmbed) => void
  onPlay?: () => void
}

function VideoContent({
  embed,
  interactive,
  onPlay,
}: {
  embed: VideoEmbed
  interactive: boolean
  onPlay?: () => void
}) {
  const resolved = resolveVideoEmbed(embed)

  if (resolved.provider === 'direct') {
    return (
      <video
        src={resolved.embedUrl}
        controls={interactive}
        className="h-full w-full bg-black object-cover"
        playsInline
        onPlay={onPlay}
      />
    )
  }

  return (
    <iframe
      src={resolved.embedUrl}
      title={`Video on page ${resolved.pageIndex + 1}`}
      className="h-full w-full bg-black"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    />
  )
}

export function VideoOverlay({
  embed,
  interactive = true,
  editable = false,
  selected = false,
  onSelect,
  onChange,
  onPlay,
}: VideoOverlayProps) {
  const content = (
    <VideoContent embed={embed} interactive={interactive && !editable} onPlay={onPlay} />
  )

  if (editable) {
    return (
      <VideoDragOverlay
        embed={embed}
        editable
        selected={selected}
        onSelect={onSelect}
        onChange={onChange}
      >
        {content}
      </VideoDragOverlay>
    )
  }

  return (
    <VideoDragOverlay embed={embed}>
      {content}
    </VideoDragOverlay>
  )
}
