import { useCallback, useRef } from 'react'
import type { LinkHotspot } from '../../shared/flipbook'
import { clampEmbedBounds } from '../lib/videoBounds'

interface DragState {
  hotspotId: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: Pick<LinkHotspot, 'x' | 'y' | 'width' | 'height'>
}

interface LinkHotspotOverlayProps {
  hotspot: LinkHotspot
  editable?: boolean
  selected?: boolean
  onSelect?: () => void
  onChange?: (hotspot: LinkHotspot) => void
  onTrackClick?: () => void
}

export function LinkHotspotOverlay({
  hotspot,
  editable = false,
  selected = false,
  onSelect,
  onChange,
  onTrackClick,
}: LinkHotspotOverlayProps) {
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
        hotspotId: hotspot.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origin: { x: hotspot.x, y: hotspot.y, width: hotspot.width, height: hotspot.height },
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [editable, hotspot, onChange, onSelect],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      const page = containerRef.current?.closest('.flipbook-page') as HTMLElement | null
      if (!drag || drag.hotspotId !== hotspot.id || !page || !onChange) return

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
        onChange({ ...hotspot, ...next })
      } else {
        const next = clampEmbedBounds({
          x: drag.origin.x,
          y: drag.origin.y,
          width: drag.origin.width + dx,
          height: drag.origin.height + dy,
        })
        onChange({ ...hotspot, ...next })
      }
    },
    [hotspot, onChange],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const style = {
    left: `${hotspot.x}%`,
    top: `${hotspot.y}%`,
    width: `${hotspot.width}%`,
    height: `${hotspot.height}%`,
  }

  if (editable) {
    return (
      <div
        ref={containerRef}
        className={[
          'absolute z-10 touch-none select-none overflow-hidden rounded-sm',
          'ring-2 ' +
            (selected ? 'ring-emerald-600 ring-offset-1 ring-offset-emerald-600/20' : 'ring-emerald-600/40'),
        ].join(' ')}
        style={style}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseDown={stopFlip}
        onClick={stopFlip}
      >
        <div
          className="relative h-full w-full cursor-move bg-emerald-500/25"
          onPointerDown={handlePointerDown('move')}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-emerald-600/90 px-1 py-0.5 text-center text-[9px] font-medium text-white">
            {hotspot.label || 'Link'}
          </div>
        </div>
        <div
          className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-se-resize rounded-tl bg-emerald-600 shadow"
          onPointerDown={handlePointerDown('resize')}
        />
      </div>
    )
  }

  return (
    <a
      href={hotspot.url}
      target="_blank"
      rel="noopener noreferrer"
      title={hotspot.label || hotspot.url}
      className="absolute z-10 rounded-sm bg-emerald-500/10 ring-1 ring-emerald-600/30 transition hover:bg-emerald-500/20"
      style={style}
      onMouseDown={stopFlip}
      onClick={(e) => {
        stopFlip(e)
        onTrackClick?.()
      }}
    >
      {hotspot.label && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-emerald-600/85 px-1 py-0.5 text-center text-[9px] font-medium text-white">
          {hotspot.label}
        </span>
      )}
    </a>
  )
}
