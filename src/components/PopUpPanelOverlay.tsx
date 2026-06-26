import { useCallback, useRef } from 'react'
import type { PopUpPanel } from '../../shared/flipbook'
import { clampEmbedBounds } from '../lib/videoBounds'

interface DragState {
  panelId: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: Pick<PopUpPanel, 'x' | 'y' | 'width' | 'height'>
}

interface PopUpPanelOverlayProps {
  panel: PopUpPanel
  editable?: boolean
  selected?: boolean
  onSelect?: () => void
  onChange?: (panel: PopUpPanel) => void
  onOpen?: (panel: PopUpPanel) => void
}

export function PopUpPanelOverlay({
  panel,
  editable = false,
  selected = false,
  onSelect,
  onChange,
  onOpen,
}: PopUpPanelOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)

  const stopFlip = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
  }

  const handlePointerDown = useCallback(
    (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
      if (!editable || !onChange) return
      e.stopPropagation()
      e.preventDefault()
      onSelect?.()
      dragRef.current = {
        panelId: panel.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origin: { x: panel.x, y: panel.y, width: panel.width, height: panel.height },
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [editable, onChange, onSelect, panel],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      const page = containerRef.current?.closest('.flipbook-page') as HTMLElement | null
      if (!drag || drag.panelId !== panel.id || !page || !onChange) return

      const rect = page.getBoundingClientRect()
      const dx = ((e.clientX - drag.startX) / rect.width) * 100
      const dy = ((e.clientY - drag.startY) / rect.height) * 100

      if (drag.mode === 'move') {
        const next = clampEmbedBounds({
          x: drag.origin.x + dx,
          y: drag.origin.y + dy,
          width: drag.origin.width,
          height: drag.origin.height,
        })
        onChange({ ...panel, ...next })
      } else {
        const next = clampEmbedBounds({
          x: drag.origin.x,
          y: drag.origin.y,
          width: drag.origin.width + dx,
          height: drag.origin.height + dy,
        })
        onChange({ ...panel, ...next })
      }
    },
    [onChange, panel],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const style = {
    left: `${panel.x}%`,
    top: `${panel.y}%`,
    width: `${panel.width}%`,
    height: `${panel.height}%`,
  }

  if (editable) {
    return (
      <div
        ref={containerRef}
        className={[
          'absolute z-10 touch-none select-none overflow-hidden rounded-md',
          'ring-2 ' +
            (selected
              ? 'ring-violet-600 ring-offset-1 ring-offset-violet-600/20'
              : 'ring-violet-600/40'),
        ].join(' ')}
        style={style}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseDown={stopFlip}
        onClick={stopFlip}
      >
        <div
          className="relative h-full w-full cursor-move bg-violet-500/25"
          onPointerDown={handlePointerDown('move')}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center text-[9px] font-semibold text-violet-900">
            {panel.triggerLabel}
          </div>
        </div>
        <div
          className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-se-resize rounded-tl bg-violet-600 shadow"
          onPointerDown={handlePointerDown('resize')}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      title={panel.title}
      aria-label={`Open ${panel.title}`}
      className="absolute z-10 flex items-center justify-center rounded-md bg-violet-600/90 px-1 text-[9px] font-semibold text-white shadow-md ring-1 ring-violet-700/30 transition hover:bg-violet-600"
      style={style}
      onMouseDown={stopFlip}
      onClick={(e) => {
        stopFlip(e)
        onOpen?.(panel)
      }}
    >
      <span className="pointer-events-none truncate">{panel.triggerLabel}</span>
    </button>
  )
}
