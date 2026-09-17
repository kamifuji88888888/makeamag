import { useCallback, useEffect, useState } from 'react'
import type { VideoEmbed } from '../../shared/flipbook'
import { isFullPageVideo } from '../lib/videoBounds'
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
  const fullPage = isFullPageVideo(embed)
  const [engaged, setEngaged] = useState(false)

  useEffect(() => {
    if (editable) setEngaged(false)
  }, [editable])

  // Full-page videos cover flip targets — stay passive until the reader taps Play.
  const tapToPlay = fullPage && !editable
  const videoInteractive = interactive && (!tapToPlay || engaged)
  const blockPageFlip = editable || !tapToPlay || engaged

  const stopFlip = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
  }, [])

  const content = (
    <VideoContent embed={embed} interactive={videoInteractive} onPlay={onPlay} />
  )

  if (editable) {
    return (
      <VideoDragOverlay
        embed={embed}
        editable
        selected={selected}
        onSelect={onSelect}
        onChange={onChange}
        blockPageFlip
      >
        {content}
      </VideoDragOverlay>
    )
  }

  return (
    <VideoDragOverlay embed={embed} blockPageFlip={blockPageFlip}>
      {content}
      {tapToPlay && !engaged && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-apple-text shadow-lg"
            onMouseDown={stopFlip}
            onPointerDown={stopFlip}
            onClick={(e) => {
              stopFlip(e)
              setEngaged(true)
              onPlay?.()
            }}
          >
            Tap to play
          </button>
        </div>
      )}
      {tapToPlay && engaged && (
        <button
          type="button"
          className="absolute right-2 top-2 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow"
          onMouseDown={stopFlip}
          onPointerDown={stopFlip}
          onClick={(e) => {
            stopFlip(e)
            setEngaged(false)
          }}
        >
          Done
        </button>
      )}
    </VideoDragOverlay>
  )
}
