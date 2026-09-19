import { createContext, useContext, type ReactNode } from 'react'
import type {
  BrandingConfig,
  LinkHotspot,
  PopUpPanel,
  PopUpPanelStyle,
  VideoEmbed,
} from '../../shared/flipbook'

export interface FlipbookOverlayContextValue {
  videoEmbeds: VideoEmbed[]
  linkHotspots: LinkHotspot[]
  popUpPanels: PopUpPanel[]
  popUpPanelStyle?: PopUpPanelStyle
  branding?: BrandingConfig
  interactiveVideos: boolean
  editableVideos: boolean
  editableLinks: boolean
  editablePanels: boolean
  selectedEmbedId: string | null
  selectedLinkId: string | null
  selectedPanelId: string | null
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

const FlipbookOverlayContext = createContext<FlipbookOverlayContextValue | null>(null)

export function FlipbookOverlayProvider({
  value,
  children,
}: {
  value: FlipbookOverlayContextValue
  children: ReactNode
}) {
  return (
    <FlipbookOverlayContext.Provider value={value}>{children}</FlipbookOverlayContext.Provider>
  )
}

export function useFlipbookOverlays(): FlipbookOverlayContextValue {
  const value = useContext(FlipbookOverlayContext)
  if (!value) {
    return {
      videoEmbeds: [],
      linkHotspots: [],
      popUpPanels: [],
      interactiveVideos: true,
      editableVideos: false,
      editableLinks: false,
      editablePanels: false,
      selectedEmbedId: null,
      selectedLinkId: null,
      selectedPanelId: null,
    }
  }
  return value
}
