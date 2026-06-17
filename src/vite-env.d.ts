/// <reference types="vite/client" />

declare module 'react-pageflip' {
  import { ReactNode, Ref, HTMLAttributes } from 'react'

  export interface FlipEvent {
    data: number
    object: unknown
  }

  export interface FlipBookProps extends HTMLAttributes<HTMLDivElement> {
    width: number
    height: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startZIndex?: number
    autoSize?: boolean
    maxShadowOpacity?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    swipeDistance?: number
    clickEventForward?: boolean
    useMouseEvents?: boolean
    renderOnlyPageLengthChange?: boolean
    className?: string
    style?: React.CSSProperties
    children?: ReactNode
    ref?: Ref<HTMLFlipBookRef>
    onFlip?: (e: FlipEvent) => void
    onChangeOrientation?: (e: { data: string }) => void
    onChangeState?: (e: { data: string }) => void
  }

  export interface HTMLFlipBookRef {
    pageFlip: () => {
      getPageCount: () => number
      getCurrentPageIndex: () => number
      flipNext: (corner?: 'top' | 'bottom') => void
      flipPrev: (corner?: 'top' | 'bottom') => void
      turnToPage: (pageNum: number) => void
      flip: (pageNum: number, corner?: 'top' | 'bottom') => void
    }
  }

  const HTMLFlipBook: React.ForwardRefExoticComponent<
    FlipBookProps & React.RefAttributes<HTMLFlipBookRef>
  >

  export default HTMLFlipBook
}
