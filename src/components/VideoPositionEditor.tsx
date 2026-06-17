import { useCallback, useRef, useState } from 'react'
import type { VideoEmbed } from '../../shared/flipbook'
import { clampEmbedBounds } from '../lib/videoBounds'

interface DragState {
  embedId: string
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: Pick<VideoEmbed, 'x' | 'y' | 'width' | 'height'>
}

interface VideoPositionEditorProps {
  pageImage: string
  pageIndex: number
  totalPages: number
  videoEmbeds: VideoEmbed[]
  onPageChange: (pageIndex: number) => void
  onUpdateEmbed: (embed: VideoEmbed) => void
  onClose: () => void
}

function PreviewDraggableBox({
  embed,
  selected,
  onSelect,
  onChange,
  containerRef,
}: {
  embed: VideoEmbed
  selected: boolean
  onSelect: () => void
  onChange: (next: VideoEmbed) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const dragRef = useRef<DragState | null>(null)

  const handlePointerDown = useCallback(
    (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onSelect()
      dragRef.current = {
        embedId: embed.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        origin: { x: embed.x, y: embed.y, width: embed.width, height: embed.height },
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [embed, onSelect],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      const container = containerRef.current
      if (!drag || drag.embedId !== embed.id || !container) return

      const rect = container.getBoundingClientRect()
      const dx = ((e.clientX - drag.startX) / rect.width) * 100
      const dy = ((e.clientY - drag.startY) / rect.height) * 100

      if (drag.mode === 'move') {
        onChange({
          ...embed,
          ...clampEmbedBounds({
            x: drag.origin.x + dx,
            y: drag.origin.y + dy,
            width: drag.origin.width,
            height: drag.origin.height,
          }),
        })
      } else {
        onChange({
          ...embed,
          ...clampEmbedBounds({
            x: drag.origin.x,
            y: drag.origin.y,
            width: drag.origin.width + dx,
            height: drag.origin.height + dy,
          }),
        })
      }
    },
    [containerRef, embed, onChange],
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  return (
    <div
      className={[
        'absolute touch-none select-none overflow-hidden rounded border-2 bg-black/40 backdrop-blur-sm',
        selected ? 'border-apple-blue ring-2 ring-apple-blue/20' : 'border-apple-border',
      ].join(' ')}
      style={{
        left: `${embed.x}%`,
        top: `${embed.y}%`,
        width: `${embed.width}%`,
        height: `${embed.height}%`,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="flex h-full cursor-move flex-col items-center justify-center gap-1 p-2"
        onPointerDown={handlePointerDown('move')}
      >
        <svg className="h-6 w-6 text-white/80" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        <span className="text-center text-[10px] font-medium uppercase tracking-wide text-white/70">
          {embed.provider}
        </span>
      </div>
      <div
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl bg-apple-blue"
        onPointerDown={handlePointerDown('resize')}
      />
    </div>
  )
}

export function VideoPositionEditor({
  pageImage,
  pageIndex,
  totalPages,
  videoEmbeds,
  onPageChange,
  onUpdateEmbed,
  onClose,
}: VideoPositionEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageVideos = videoEmbeds.filter((e) => e.pageIndex === pageIndex)

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="apple-modal flex max-h-[90vh] w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between border-b border-apple-border-light px-6 py-5">
          <div>
            <h3 className="text-[1.375rem] font-semibold tracking-tight text-apple-text">Position preview</h3>
            <p className="text-[1.0625rem] text-apple-muted">Fine-tune on a static page</p>
          </div>
          <button type="button" onClick={onClose} className="apple-btn-primary">
            Done
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 border-b border-apple-border-light px-6 py-3">
          <button
            type="button"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(pageIndex - 1)}
            className="apple-btn-ghost disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-sm text-apple-muted">
            Page {pageIndex + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => onPageChange(pageIndex + 1)}
            className="apple-btn-ghost disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="overflow-auto p-6">
          <div
            ref={containerRef}
            className="apple-flipbook-frame relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden bg-white"
          >
            <img src={pageImage} alt={`Page ${pageIndex + 1}`} className="h-full w-full object-contain" />
            {pageVideos.map((embed) => (
              <PreviewDraggableBox
                key={embed.id}
                embed={embed}
                selected={selectedId === embed.id}
                onSelect={() => setSelectedId(embed.id)}
                onChange={onUpdateEmbed}
                containerRef={containerRef}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
