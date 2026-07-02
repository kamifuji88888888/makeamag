import { useCallback, useRef, useState } from 'react'
import { displayTitle } from '../../shared/flipbook'
import type { LibraryEntry, LibraryFolder, LibraryFolderFilter } from '../lib/libraryStorage'

interface FlipbookLibraryProps {
  entries: LibraryEntry[]
  folders: LibraryFolder[]
  activeFolder: LibraryFolderFilter
  folderCounts: {
    all: number
    uncategorized: number
    byFolder: Record<string, number>
  }
  onOpen: (entry: LibraryEntry) => void
  onRemove: (id: string) => void
  onReorder: (order: string[]) => void
  onResetOrder?: () => void
  onSelectFolder: (folder: LibraryFolderFilter) => void
  onCreateFolder: (name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDeleteFolder: (id: string) => void
  onMoveToFolder: (entryId: string, folderId: string | null) => void
  loadingId?: string | null
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function folderLabel(activeFolder: LibraryFolderFilter, folders: LibraryFolder[]) {
  if (activeFolder === 'all') return 'All flipbooks'
  if (activeFolder === 'uncategorized') return 'Uncategorized'
  return folders.find((folder) => folder.id === activeFolder)?.name ?? 'Folder'
}

export function FlipbookLibrary({
  entries,
  folders,
  activeFolder,
  folderCounts,
  onOpen,
  onRemove,
  onReorder,
  onResetOrder,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveToFolder,
  loadingId,
}: FlipbookLibraryProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const dragIdRef = useRef<string | null>(null)

  const handleDragStart = useCallback((id: string) => {
    dragIdRef.current = id
    setDraggingId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null
    setDraggingId(null)
    setOverId(null)
  }, [])

  const handleDrop = useCallback(
    (targetId: string) => {
      const sourceId = dragIdRef.current
      if (!sourceId || sourceId === targetId) return

      const ids = entries.map((e) => e.id)
      const from = ids.indexOf(sourceId)
      const to = ids.indexOf(targetId)
      if (from < 0 || to < 0) return

      const next = [...ids]
      next.splice(from, 1)
      next.splice(to, 0, sourceId)
      onReorder(next)
      handleDragEnd()
    },
    [entries, onReorder, handleDragEnd],
  )

  function submitNewFolder() {
    const name = newFolderName.trim()
    if (!name) return
    onCreateFolder(name)
    setNewFolderName('')
    setCreatingFolder(false)
  }

  function submitRename() {
    if (!renamingFolderId) return
    const name = renameValue.trim()
    if (!name) return
    onRenameFolder(renamingFolderId, name)
    setRenamingFolderId(null)
    setRenameValue('')
  }

  const activeFolderIsCustom =
    activeFolder !== 'all' && activeFolder !== 'uncategorized'

  if (folderCounts.all === 0 && folders.length === 0) {
    return (
      <div className="apple-card-flat px-6 py-10 text-center">
        <p className="text-[1.0625rem] text-apple-muted">
          Your flipbooks will appear here after you upload a PDF.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.75rem] font-semibold tracking-tight text-apple-text">
            {folderLabel(activeFolder, folders)}
          </h2>
          <p className="mt-1 text-[1.0625rem] text-apple-muted">
            {entries.length} flipbook{entries.length === 1 ? '' : 's'}
            {activeFolder === 'all' ? ' · Drag to rearrange' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {activeFolderIsCustom && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRenamingFolderId(activeFolder)
                  setRenameValue(folderLabel(activeFolder, folders))
                }}
                className="apple-btn-ghost"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => onDeleteFolder(activeFolder)}
                className="apple-btn-ghost text-apple-muted hover:text-red-500"
              >
                Delete folder
              </button>
            </>
          )}
          {onResetOrder && activeFolder === 'all' && (
            <button type="button" onClick={onResetOrder} className="apple-btn-ghost">
              Sort by date
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FolderChip
          label="All"
          count={folderCounts.all}
          active={activeFolder === 'all'}
          onClick={() => onSelectFolder('all')}
        />
        {folders.map((folder) => (
          <FolderChip
            key={folder.id}
            label={folder.name}
            count={folderCounts.byFolder[folder.id] ?? 0}
            active={activeFolder === folder.id}
            onClick={() => onSelectFolder(folder.id)}
          />
        ))}
        {folderCounts.uncategorized > 0 && (
          <FolderChip
            label="Uncategorized"
            count={folderCounts.uncategorized}
            active={activeFolder === 'uncategorized'}
            onClick={() => onSelectFolder('uncategorized')}
          />
        )}
        {creatingFolder ? (
          <div className="flex items-center gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="apple-input h-9 w-40 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewFolder()
                if (e.key === 'Escape') {
                  setCreatingFolder(false)
                  setNewFolderName('')
                }
              }}
            />
            <button type="button" onClick={submitNewFolder} className="apple-btn-secondary text-sm">
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="apple-btn-ghost text-sm"
          >
            + New folder
          </button>
        )}
      </div>

      {renamingFolderId && (
        <div className="apple-card-flat mb-4 flex items-center gap-2 px-4 py-3">
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="apple-input flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename()
              if (e.key === 'Escape') {
                setRenamingFolderId(null)
                setRenameValue('')
              }
            }}
          />
          <button type="button" onClick={submitRename} className="apple-btn-secondary">
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setRenamingFolderId(null)
              setRenameValue('')
            }}
            className="apple-btn-ghost"
          >
            Cancel
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="apple-card-flat px-6 py-10 text-center">
          <p className="text-[1.0625rem] text-apple-muted">No flipbooks in this folder yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const isDragging = draggingId === entry.id
            const isOver = overId === entry.id && draggingId !== entry.id
            const isLoading = loadingId === entry.id

            return (
              <li
                key={entry.id}
                draggable={activeFolder === 'all'}
                onDragStart={() => handleDragStart(entry.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverId(entry.id)
                }}
                onDragLeave={() => setOverId((current) => (current === entry.id ? null : current))}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(entry.id)
                }}
                className={[
                  'apple-card flex items-center gap-3 px-4 py-3 transition',
                  isDragging ? 'opacity-50' : '',
                  isOver ? 'ring-2 ring-apple-blue/30' : '',
                ].join(' ')}
              >
                {activeFolder === 'all' && (
                  <button
                    type="button"
                    aria-label="Drag to reorder"
                    className="flex h-10 w-6 shrink-0 cursor-grab items-center justify-center text-apple-muted active:cursor-grabbing"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="4" r="1.2" />
                      <circle cx="11" cy="4" r="1.2" />
                      <circle cx="5" cy="8" r="1.2" />
                      <circle cx="11" cy="8" r="1.2" />
                      <circle cx="5" cy="12" r="1.2" />
                      <circle cx="11" cy="12" r="1.2" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpen(entry)}
                  disabled={Boolean(loadingId)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                >
                  <div className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-apple-gray">
                    {entry.thumbnail ? (
                      <img src={entry.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <svg className="h-5 w-5 text-apple-blue" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5z" />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.0625rem] font-medium text-apple-text">
                      {displayTitle({
                        fileName: entry.fileName,
                        publication: entry.publication ?? {
                          title: '',
                          publisherName: '',
                          issueLabel: '',
                          description: '',
                        },
                      })}
                    </p>
                    <p className="mt-0.5 text-sm text-apple-muted">
                      {entry.pageCount} pages · {formatDate(entry.updatedAt)}
                      {entry.type === 'draft' ? ' · Draft' : ''}
                      {entry.isPasswordProtected ? ' · Protected' : ''}
                      {entry.visibility === 'unlisted' ? ' · Unlisted' : ''}
                    </p>
                  </div>

                  {isLoading && (
                    <span className="shrink-0 text-sm text-apple-blue">Opening…</span>
                  )}
                </button>

                {folders.length > 0 && (
                  <select
                    value={entry.folderId ?? ''}
                    onChange={(e) =>
                      onMoveToFolder(entry.id, e.target.value ? e.target.value : null)
                    }
                    className="apple-input max-w-[9rem] shrink-0 text-sm"
                    aria-label={`Move ${entry.fileName} to folder`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Uncategorized</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  aria-label={`Remove ${entry.fileName}`}
                  className="apple-btn-ghost shrink-0 text-apple-muted hover:text-red-500"
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FolderChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-apple-blue text-white'
          : 'bg-apple-gray text-apple-text hover:bg-apple-border-light',
      ].join(' ')}
    >
      <span>{label}</span>
      <span
        className={[
          'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
          active ? 'bg-white/20 text-white' : 'bg-white text-apple-muted',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  )
}
