import { forwardRef } from 'react'
import type { LinkHotspot, VideoEmbed } from '../../shared/flipbook'
import { LinkHotspotOverlay } from './LinkHotspotOverlay'
import { VideoOverlay } from './VideoOverlay'

interface FlipbookPageProps {
  src: string
  pageNumber: number
  pageIndex: number
  spreadSpine?: 'left' | 'right' | 'single' | null
  videoEmbeds?: VideoEmbed[]
  linkHotspots?: LinkHotspot[]
  interactiveVideos?: boolean
  editableVideos?: boolean
  editableLinks?: boolean
  selectedEmbedId?: string | null
  selectedLinkId?: string | null
  onSelectEmbed?: (id: string) => void
  onSelectLink?: (id: string) => void
  onUpdateEmbed?: (embed: VideoEmbed) => void
  onUpdateLink?: (hotspot: LinkHotspot) => void
  onLinkClick?: (hotspot: LinkHotspot) => void
  onVideoPlay?: (embed: VideoEmbed) => void
}

export const FlipbookPage = forwardRef<HTMLDivElement, FlipbookPageProps>(
  (
    {
      src,
      pageNumber,
      pageIndex,
      spreadSpine = null,
      videoEmbeds = [],
      linkHotspots = [],
      interactiveVideos = true,
      editableVideos = false,
      editableLinks = false,
      selectedEmbedId = null,
      selectedLinkId = null,
      onSelectEmbed,
      onSelectLink,
      onUpdateEmbed,
      onUpdateLink,
      onLinkClick,
      onVideoPlay,
    },
    ref,
  ) => {
    const pageVideos = videoEmbeds.filter((embed) => embed.pageIndex === pageIndex)
    const pageLinks = linkHotspots.filter((hotspot) => hotspot.pageIndex === pageIndex)

    return (
      <div ref={ref} className="flipbook-page relative" data-density="soft">
        <img
          src={src}
          alt={`Page ${pageNumber}`}
          draggable={false}
          data-spine={spreadSpine ?? undefined}
        />
        {pageLinks.map((hotspot) => (
          <LinkHotspotOverlay
            key={hotspot.id}
            hotspot={hotspot}
            editable={editableLinks}
            selected={selectedLinkId === hotspot.id}
            onSelect={() => onSelectLink?.(hotspot.id)}
            onChange={onUpdateLink}
            onTrackClick={() => onLinkClick?.(hotspot)}
          />
        ))}
        {pageVideos.map((embed) => (
          <VideoOverlay
            key={embed.id}
            embed={embed}
            interactive={interactiveVideos}
            editable={editableVideos}
            selected={selectedEmbedId === embed.id}
            onSelect={() => onSelectEmbed?.(embed.id)}
            onChange={onUpdateEmbed}
            onPlay={() => onVideoPlay?.(embed)}
          />
        ))}
      </div>
    )
  },
)

FlipbookPage.displayName = 'FlipbookPage'
