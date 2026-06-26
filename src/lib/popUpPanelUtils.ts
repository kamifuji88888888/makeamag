import {
  POP_UP_PANEL_KIND_DEFAULTS,
  POP_UP_PANEL_PRESET,
  type PopUpPanel,
  type PopUpPanelKind,
} from '../../shared/flipbook'

export function createPopUpPanel(
  pageIndex: number,
  kind: PopUpPanelKind,
  triggerLabel: string,
  title: string,
  body: string,
): PopUpPanel | null {
  const trimmedBody = body.trim()
  if (!trimmedBody) return null

  const defaults = POP_UP_PANEL_KIND_DEFAULTS[kind]

  return {
    id: crypto.randomUUID(),
    pageIndex,
    kind,
    triggerLabel: triggerLabel.trim() || defaults.triggerLabel,
    title: title.trim() || defaults.title,
    body: trimmedBody,
    ...POP_UP_PANEL_PRESET,
  }
}
