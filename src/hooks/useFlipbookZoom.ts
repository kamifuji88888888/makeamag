import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 3

function clampPan(x: number, y: number, viewWidth: number, viewHeight: number, zoom: number) {
  if (zoom <= 1) return { x: 0, y: 0 }
  const maxX = (viewWidth * (zoom - 1)) / 2
  const maxY = (viewHeight * (zoom - 1)) / 2
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  }
}

export function useFlipbookZoom(viewWidth: number, viewHeight: number) {
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const clampedPan = useCallback(
    (x: number, y: number, level = zoom) => clampPan(x, y, viewWidth, viewHeight, level),
    [viewWidth, viewHeight, zoom],
  )

  const setZoomLevel = useCallback(
    (level: number) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level))
      setZoom(next)
      setPan((current) => clampPan(current.x, current.y, viewWidth, viewHeight, next))
    },
    [viewWidth, viewHeight],
  )

  const resetZoom = useCallback(() => {
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    setPan((current) => clampPan(current.x, current.y, viewWidth, viewHeight, zoom))
  }, [viewWidth, viewHeight, zoom])

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1 || e.button !== 0) return
      dragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    },
    [pan.x, pan.y, zoom],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      setPan(clampedPan(dragStart.current.panX + dx, dragStart.current.panY + dy))
      e.preventDefault()
    },
    [clampedPan],
  )

  const endDrag = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  const viewportStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  }

  return {
    zoom,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    isZoomed: zoom > 1,
    setZoomLevel,
    resetZoom,
    resetPan,
    viewportStyle,
    viewportHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
    },
  }
}
