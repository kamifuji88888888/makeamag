import type { VideoEmbed } from '../../shared/flipbook'
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
  if (embed.provider === 'direct') {
    return (
      <video
        src={embed.embedUrl}
        controls={interactive}
        className="h-full w-full bg-black object-cover"
        playsInline
        onPlay={onPlay}
      />
    )
  }

  return (
    <iframe
      src={embed.embedUrl}
      title={`Video on page ${embed.pageIndex + 1}`}
      className="h-full w-full bg-black"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
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
