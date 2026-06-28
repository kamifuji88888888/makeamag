import type { BrandingConfig, PopUpPanel, PopUpPanelStyle } from '../../shared/flipbook'
import { POP_UP_PANEL_KIND_LABELS } from '../../shared/flipbook'
import { resolvePopUpPanelStyle } from '../lib/popUpPanelStyle'

interface PopUpPanelModalProps {
  panel: PopUpPanel
  popUpPanelStyle?: PopUpPanelStyle
  branding?: BrandingConfig
  onClose: () => void
}

export function PopUpPanelModal({
  panel,
  popUpPanelStyle,
  branding,
  onClose,
}: PopUpPanelModalProps) {
  const resolved = resolvePopUpPanelStyle(panel, popUpPanelStyle, branding)

  return (
    <div
      className="apple-modal-overlay popup-panel-overlay-enter fixed inset-0 z-[60] flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        className={[
          'apple-modal popup-panel-enter w-full',
          resolved.modalMaxWidthClass,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-panel-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between border-b px-5 py-4"
          style={{ borderColor: `${resolved.colors.badge}22` }}
        >
          <div className="min-w-0 pr-4">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: resolved.colors.badge }}
            >
              {POP_UP_PANEL_KIND_LABELS[panel.kind]}
            </p>
            <h3 id="popup-panel-title" className="mt-1 text-[1.125rem] font-semibold text-apple-text">
              {panel.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-apple-muted hover:bg-apple-gray"
            aria-label="Close panel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-5 py-5">
          <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-apple-text">
            {panel.body}
          </p>
        </div>
      </div>
    </div>
  )
}
