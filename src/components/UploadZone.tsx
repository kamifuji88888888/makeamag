import { useCallback, useRef, useState } from 'react'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  maxUploadMb?: number
}

function UploadMagIcon({ active }: { active: boolean }) {
  return (
    <div className={['upload-mag-icon mb-6', active ? 'upload-mag-icon--active' : ''].join(' ')}>
      <div className="upload-mag-icon__glow" aria-hidden />
      <div className="upload-mag-icon__pages" aria-hidden>
        <div className="upload-mag-icon__page upload-mag-icon__page--back">
          <span className="upload-mag-icon__page-line" />
          <span className="upload-mag-icon__page-line upload-mag-icon__page-line--short" />
        </div>
        <div className="upload-mag-icon__page upload-mag-icon__page--mid">
          <span className="upload-mag-icon__page-line upload-mag-icon__page-line--blue" />
          <span className="upload-mag-icon__page-line" />
          <span className="upload-mag-icon__page-line upload-mag-icon__page-line--short" />
        </div>
        <div className="upload-mag-icon__page upload-mag-icon__page--front">
          <span className="upload-mag-icon__page-line" />
          <span className="upload-mag-icon__page-line" />
        </div>
      </div>
      <div className="upload-mag-icon__arrow" aria-hidden>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3m0 0L7.5 7.5M12 3l4.5 4.5M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5" />
        </svg>
      </div>
    </div>
  )
}

export function UploadZone({ onFileSelect, disabled, maxUploadMb }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
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

      <UploadMagIcon active={isDragging} />

      <h3 className="mb-2 text-[1.375rem] font-semibold tracking-tight text-apple-text">
        Drop or Upload Your PDF Here
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
