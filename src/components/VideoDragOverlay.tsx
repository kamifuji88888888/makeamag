import { useCallback, useRef, type ReactNode } from 'react'
import type { VideoEmbed } from '../../shared/flipbook'
import { clampEmbedBounds } from '../lib/videoBounds'

interface DragState {
  embedId: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: Pick<VideoEmbed, 'x' | 'y' | 'width' | 'height'>
}

interface VideoDragOverlayProps {
  embed: VideoEmbed
  editable?: boolean
  selected?: boolean
  onSelect?: () => void
  onChange?: (embed: VideoEmbed) => void
  children?: ReactNode
}

export function VideoDragOverlay({
  embed,
  editable = false,
  selected = false,
  onSelect,
  onChange,
  children,
}: VideoDragOverlayProps) {
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
        embedId: embed.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origin: { x: embed.x, y: embed.y, width: embed.width, height: embed.height },
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [editable, embed, onChange, onSelect],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      const page = containerRef.current?.closest('.flipbook-page') as HTMLElement | null
      if (!drag || drag.embedId !== embed.id || !page || !onChange) return

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
        onChange({ ...embed, ...next })
      } else {
        const next = clampEmbedBounds({
          x: drag.origin.x,
          y: drag.origin.y,
          width: drag.origin.width + dx,
          height: drag.origin.height + dy,
        })
        onChange({ ...embed, ...next })
      }
    },
    [embed, onChange],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      className={[
        'absolute z-10 overflow-hidden rounded-sm shadow-lg',
        editable
          ? 'touch-none select-none ring-2 ' +
            (selected ? 'ring-apple-blue ring-offset-1 ring-offset-apple-blue/20' : 'ring-apple-blue/40')
          : 'ring-1 ring-black/10',
      ].join(' ')}
      style={{
        left: `${embed.x}%`,
        top: `${embed.y}%`,
        width: `${embed.width}%`,
        height: `${embed.height}%`,
      }}
      onPointerMove={editable ? handlePointerMove : undefined}
      onPointerUp={editable ? handlePointerUp : undefined}
      onPointerCancel={editable ? handlePointerUp : undefined}
      onMouseDown={editable ? stopFlip : stopFlip}
      onPointerDown={editable ? undefined : stopFlip}
      onClick={stopFlip}
    >
      {editable ? (
        <>
          <div
            className="relative h-full w-full cursor-move bg-black/20"
            onPointerDown={handlePointerDown('move')}
          >
            <div
              className={[
                'h-full w-full',
                editable ? 'pointer-events-none' : '',
              ].join(' ')}
            >
              {children}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-apple-blue/90 px-1 py-0.5 text-center text-[9px] font-medium text-white">
              Drag to move
            </div>
          </div>
          <div
            className="absolute bottom-0 right-0 z-20 h-4 w-4 cursor-se-resize rounded-tl bg-apple-blue shadow"
            onPointerDown={handlePointerDown('resize')}
          />
        </>
      ) : (
        children
      )}
    </div>
  )
}
