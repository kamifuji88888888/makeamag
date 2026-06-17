import { useCallback, useRef, useState } from 'react'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  maxUploadMb?: number
}

export function UploadZone({ onFileSelect, disabled, maxUploadMb }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.')
        return
      }
      if (maxUploadMb !== undefined && file.size > maxUploadMb * 1024 * 1024) {
        alert(`This PDF is too large. Your plan allows up to ${maxUploadMb} MB.`)
        return
      }
      onFileSelect(file)
    },
    [disabled, maxUploadMb, onFileSelect],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFile(e.dataTransfer.files[0])
    },
    [handleFile],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={[
        'apple-card group relative cursor-pointer border-2 border-dashed p-14 text-center transition-all duration-300',
        isDragging
          ? 'scale-[1.01] border-apple-blue bg-apple-blue/5'
          : 'border-apple-border bg-apple-surface hover:border-apple-blue/50 hover:shadow-lg',
        disabled ? 'pointer-events-none opacity-50' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-apple-gray">
        <svg
          className="h-9 w-9 text-apple-blue transition-transform duration-300 group-hover:scale-105"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.25}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </div>

      <h3 className="mb-2 text-[1.375rem] font-semibold tracking-tight text-apple-text">
        Drop your PDF here
      </h3>
      <p className="mb-6 text-[1.0625rem] text-apple-muted">
        or click to browse — brochures, magazines, catalogs
      </p>
      <span className="inline-flex items-center rounded-full bg-apple-gray px-4 py-1.5 text-sm text-apple-muted">
        PDF only{maxUploadMb !== undefined ? ` · up to ${maxUploadMb} MB` : ''}
      </span>
    </div>
  )
}
