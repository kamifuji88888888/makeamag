import { forwardRef } from 'react'
import { useFlipbookOverlays } from './FlipbookOverlayContext'
import { LinkHotspotOverlay } from './LinkHotspotOverlay'
import { PopUpPanelOverlay } from './PopUpPanelOverlay'
import { VideoOverlay } from './VideoOverlay'

interface FlipbookPageProps {
  src: string
  pageNumber: number
  pageIndex: number
  spreadSpine?: 'left' | 'right' | 'single' | null
}

export const FlipbookPage = forwardRef<HTMLDivElement, FlipbookPageProps>(
  ({ src, pageNumber, pageIndex, spreadSpine = null }, ref) => {
    const {
      videoEmbeds,
      linkHotspots,
      popUpPanels,
      popUpPanelStyle,
      branding,
      interactiveVideos,
      editableVideos,
      editableLinks,
      editablePanels,
      selectedEmbedId,
      selectedLinkId,
      selectedPanelId,
      onSelectEmbed,
      onSelectLink,
      onSelectPanel,
      onUpdateEmbed,
      onUpdateLink,
      onUpdatePanel,
      onLinkClick,
      onPanelOpen,
      onVideoPlay,
    } = useFlipbookOverlays()

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
            popUpPanelStyle={popUpPanelStyle}
            branding={branding}
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
