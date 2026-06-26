import { forwardRef } from 'react'
import type { LinkHotspot, PopUpPanel, VideoEmbed } from '../../shared/flipbook'
import { LinkHotspotOverlay } from './LinkHotspotOverlay'
import { PopUpPanelOverlay } from './PopUpPanelOverlay'
import { VideoOverlay } from './VideoOverlay'

interface FlipbookPageProps {
  src: string
  pageNumber: number
  pageIndex: number
  spreadSpine?: 'left' | 'right' | 'single' | null
  videoEmbeds?: VideoEmbed[]
  linkHotspots?: LinkHotspot[]
  popUpPanels?: PopUpPanel[]
  interactiveVideos?: boolean
  editableVideos?: boolean
  editableLinks?: boolean
  editablePanels?: boolean
  selectedEmbedId?: string | null
  selectedLinkId?: string | null
  selectedPanelId?: string | null
  onSelectEmbed?: (id: string) => void
  onSelectLink?: (id: string) => void
  onSelectPanel?: (id: string) => void
  onUpdateEmbed?: (embed: VideoEmbed) => void
  onUpdateLink?: (hotspot: LinkHotspot) => void
  onUpdatePanel?: (panel: PopUpPanel) => void
  onLinkClick?: (hotspot: LinkHotspot) => void
  onPanelOpen?: (panel: PopUpPanel) => void
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
      popUpPanels = [],
      interactiveVideos = true,
      editableVideos = false,
      editableLinks = false,
      editablePanels = false,
      selectedEmbedId = null,
      selectedLinkId = null,
      selectedPanelId = null,
      onSelectEmbed,
      onSelectLink,
      onSelectPanel,
      onUpdateEmbed,
      onUpdateLink,
      onUpdatePanel,
      onLinkClick,
      onPanelOpen,
      onVideoPlay,
    },
    ref,
  ) => {
    const pageVideos = videoEmbeds.filter((embed) => embed.pageIndex === pageIndex)
    const pageLinks = linkHotspots.filter((hotspot) => hotspot.pageIndex === pageIndex)
    const pagePanels = popUpPanels.filter((panel) => panel.pageIndex === pageIndex)

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
        {pagePanels.map((panel) => (
          <PopUpPanelOverlay
            key={panel.id}
            panel={panel}
            editable={editablePanels}
            selected={selectedPanelId === panel.id}
            onSelect={() => onSelectPanel?.(panel.id)}
            onChange={onUpdatePanel}
            onOpen={onPanelOpen}
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
