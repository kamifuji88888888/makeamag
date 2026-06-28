import {
  POP_UP_PANEL_CIRCLE_PRESET,
  POP_UP_PANEL_KIND_DEFAULTS,
  POP_UP_PANEL_KIND_STYLE_DEFAULTS,
  POP_UP_PANEL_PRESET,
  type PopUpPanel,
  type PopUpPanelKind,
  type PopUpPanelModalSize,
  type PopUpPanelTheme,
  type PopUpPanelTriggerShape,
} from '../../shared/flipbook'

export interface CreatePopUpPanelOptions {
  theme?: PopUpPanelTheme
  triggerShape?: PopUpPanelTriggerShape
  modalSize?: PopUpPanelModalSize
}

export function createPopUpPanel(
  pageIndex: number,
  kind: PopUpPanelKind,
  triggerLabel: string,
  title: string,
  body: string,
  options: CreatePopUpPanelOptions = {},
): PopUpPanel | null {
  const trimmedBody = body.trim()
  if (!trimmedBody) return null

  const defaults = POP_UP_PANEL_KIND_DEFAULTS[kind]
  const kindStyle = POP_UP_PANEL_KIND_STYLE_DEFAULTS[kind]
  const theme = options.theme ?? kindStyle.theme
  const triggerShape = options.triggerShape ?? kindStyle.triggerShape
  const modalSize = options.modalSize ?? kindStyle.modalSize
  const bounds = triggerShape === 'circle' ? POP_UP_PANEL_CIRCLE_PRESET : POP_UP_PANEL_PRESET

  return {
    id: crypto.randomUUID(),
    pageIndex,
    kind,
    triggerLabel: triggerLabel.trim() || defaults.triggerLabel,
    title: title.trim() || defaults.title,
    body: trimmedBody,
    theme,
    triggerShape,
    modalSize,
    ...bounds,
  }
}
