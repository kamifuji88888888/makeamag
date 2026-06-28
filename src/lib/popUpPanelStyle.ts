import type {
  BrandingConfig,
  PopUpPanel,
  PopUpPanelModalSize,
  PopUpPanelStyle,
  PopUpPanelTheme,
  PopUpPanelTriggerShape,
} from '../../shared/flipbook'
import { DEFAULT_POP_UP_PANEL_STYLE, normalizePopUpPanelStyle } from '../../shared/flipbook'
import { normalizeBranding } from '../../shared/flipbook'

export interface ResolvedPopUpPanelColors {
  triggerBg: string
  triggerText: string
  triggerRing: string
  badge: string
  editorRing: string
  editorBg: string
  editorText: string
}

export interface ResolvedPopUpPanelStyle {
  theme: PopUpPanelTheme
  triggerShape: PopUpPanelTriggerShape
  modalSize: PopUpPanelModalSize
  colors: ResolvedPopUpPanelColors
  modalMaxWidthClass: string
}

const FALLBACK_BRAND = '#0071e3'

const STATIC_THEMES: Record<Exclude<PopUpPanelTheme, 'brand'>, ResolvedPopUpPanelColors> = {
  violet: {
    triggerBg: '#7c3aed',
    triggerText: '#ffffff',
    triggerRing: 'rgb(109 40 217 / 0.35)',
    badge: '#7c3aed',
    editorRing: '#7c3aed',
    editorBg: 'rgb(139 92 246 / 0.25)',
    editorText: '#4c1d95',
  },
  slate: {
    triggerBg: '#475569',
    triggerText: '#ffffff',
    triggerRing: 'rgb(51 65 85 / 0.35)',
    badge: '#475569',
    editorRing: '#475569',
    editorBg: 'rgb(100 116 139 / 0.25)',
    editorText: '#1e293b',
  },
  amber: {
    triggerBg: '#d97706',
    triggerText: '#ffffff',
    triggerRing: 'rgb(180 83 9 / 0.35)',
    badge: '#d97706',
    editorRing: '#d97706',
    editorBg: 'rgb(245 158 11 / 0.25)',
    editorText: '#78350f',
  },
  emerald: {
    triggerBg: '#059669',
    triggerText: '#ffffff',
    triggerRing: 'rgb(4 120 87 / 0.35)',
    badge: '#059669',
    editorRing: '#059669',
    editorBg: 'rgb(16 185 129 / 0.25)',
    editorText: '#064e3b',
  },
}

const MODAL_SIZE_CLASSES: Record<PopUpPanelModalSize, string> = {
  narrow: 'max-w-sm',
  standard: 'max-w-md',
  wide: 'max-w-xl',
}

function brandColors(accentColor: string): ResolvedPopUpPanelColors {
  return {
    triggerBg: accentColor,
    triggerText: '#ffffff',
    triggerRing: `${accentColor}59`,
    badge: accentColor,
    editorRing: accentColor,
    editorBg: `${accentColor}33`,
    editorText: accentColor,
  }
}

export function resolvePopUpPanelStyle(
  panel: PopUpPanel,
  publicationStyle: PopUpPanelStyle | undefined,
  branding: BrandingConfig | undefined,
): ResolvedPopUpPanelStyle {
  const defaults = normalizePopUpPanelStyle(publicationStyle)
  const theme = panel.theme ?? defaults.theme
  const triggerShape = panel.triggerShape ?? defaults.triggerShape
  const modalSize = panel.modalSize ?? defaults.modalSize
  const accentColor = normalizeBranding(branding).accentColor || FALLBACK_BRAND

  const colors =
    theme === 'brand' ? brandColors(accentColor) : STATIC_THEMES[theme]

  return {
    theme,
    triggerShape,
    modalSize,
    colors,
    modalMaxWidthClass: MODAL_SIZE_CLASSES[modalSize],
  }
}

export function publicationPopUpPanelStyle(
  style: PopUpPanelStyle | undefined,
): PopUpPanelStyle {
  return normalizePopUpPanelStyle(style ?? DEFAULT_POP_UP_PANEL_STYLE)
}
