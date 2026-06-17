import type { TocEntry } from '../../shared/flipbook'

interface TocSidebarProps {
  entries: TocEntry[]
  currentPage: number
  onGoToPage: (pageIndex: number) => void
  onClose: () => void
}

export function TocSidebar({ entries, currentPage, onGoToPage, onClose }: TocSidebarProps) {
  if (entries.length === 0) return null

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex justify-start p-0">
      <button
        type="button"
        aria-label="Close table of contents"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-apple-border-light px-5 py-4">
          <h3 className="text-[1.125rem] font-semibold text-apple-text">Contents</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-apple-muted hover:bg-apple-gray"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1">
            {entries.map((entry) => {
              const isActive = currentPage === entry.pageIndex + 1
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onGoToPage(entry.pageIndex)
                      onClose()
                    }}
                    className={[
                      'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition',
                      isActive
                        ? 'bg-apple-blue/10 font-medium text-apple-blue'
                        : 'text-apple-text hover:bg-apple-gray',
                    ].join(' ')}
                  >
                    <span className="min-w-0 truncate pr-3">{entry.title}</span>
                    <span className="shrink-0 tabular-nums text-apple-muted">{entry.pageIndex + 1}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </div>
  )
}
