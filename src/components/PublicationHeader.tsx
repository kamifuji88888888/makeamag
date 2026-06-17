import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicationInfo } from '../../shared/flipbook'
import { displayTitle } from '../../shared/flipbook'

interface PublicationHeaderProps {
  fileName: string
  publication: PublicationInfo
  compact?: boolean
  editable?: boolean
  onTitleChange?: (title: string) => void
}

export function PublicationHeader({
  fileName,
  publication,
  compact,
  editable = false,
  onTitleChange,
}: PublicationHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const title = displayTitle({ fileName, publication })
  const placeholder = fileName.replace(/\.pdf$/i, '')
  const hasMeta = publication.publisherName || publication.issueLabel
  const canEdit = editable && Boolean(onTitleChange)

  const startEditing = useCallback(() => {
    if (!canEdit) return
    setDraft(publication.title || placeholder)
    setEditing(true)
  }, [canEdit, placeholder, publication.title])

  const commitTitle = useCallback(() => {
    if (!canEdit) return
    onTitleChange?.(draft.trim())
    setEditing(false)
  }, [canEdit, draft, onTitleChange])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setDraft(publication.title || placeholder)
  }, [placeholder, publication.title])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  if (!canEdit && !publication.title && !hasMeta) {
    return (
      <p className={['max-w-md truncate text-apple-muted', compact ? 'text-sm' : 'text-[1.0625rem]'].join(' ')}>
        {fileName}
      </p>
    )
  }

  const titleClass = [
    'font-semibold tracking-tight text-apple-text',
    compact ? 'text-base' : 'mt-2 text-[1.75rem]',
  ].join(' ')

  return (
    <div className="max-w-lg text-center">
      {!compact && <p className="apple-section-label">Now reading</p>}

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTitle()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancelEditing()
            }
          }}
          placeholder={placeholder}
          className={[
            titleClass,
            'w-full max-w-md rounded-lg border border-apple-blue/30 bg-white px-3 py-1 text-center outline-none ring-apple-blue/20 focus:ring-4',
          ].join(' ')}
          aria-label="Flipbook title"
        />
      ) : canEdit ? (
        <button
          type="button"
          onClick={startEditing}
          className={[
            titleClass,
            'group mx-auto flex max-w-md items-center justify-center gap-2 rounded-lg px-2 py-0.5 transition hover:bg-black/[0.04]',
          ].join(' ')}
          aria-label="Edit flipbook title"
        >
          <span className="truncate">{title}</span>
          <svg
            className="h-4 w-4 shrink-0 text-apple-muted opacity-0 transition group-hover:opacity-100"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
            />
          </svg>
        </button>
      ) : (
        <h2 className={titleClass}>{title}</h2>
      )}

      {canEdit && !editing && (
        <p className="mt-1 text-xs text-apple-muted">Click title to rename</p>
      )}

      {hasMeta && (
        <p className={['text-apple-muted', compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'].join(' ')}>
          {[publication.publisherName, publication.issueLabel].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}
