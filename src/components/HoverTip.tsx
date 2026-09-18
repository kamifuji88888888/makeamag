import type { ReactNode } from 'react'

interface HoverTipProps {
  label: string
  children: ReactNode
  className?: string
}

/** Lightweight hover caption — sits above the control, light surface (not inverted). */
export function HoverTip({ label, children, className }: HoverTipProps) {
  return (
    <span className={['group relative inline-flex', className].filter(Boolean).join(' ')}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-apple-border-light bg-white px-2.5 py-1.5 text-xs font-medium text-apple-text opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}
