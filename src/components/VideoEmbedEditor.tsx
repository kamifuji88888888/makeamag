import { useState } from 'react'
import type { VideoEmbed, VideoSizePreset } from '../../shared/flipbook'
import { createVideoEmbed } from '../lib/videoUtils'

interface VideoEmbedEditorProps {
  currentPage: number
  totalPages: number
  videoEmbeds: VideoEmbed[]
  onAdd: (embed: VideoEmbed) => void
  onRemove: (id: string) => void
  onAdjust?: (embed: VideoEmbed) => void
  onClose: () => void
}

export function VideoEmbedEditor({
  currentPage,
  totalPages,
  videoEmbeds,
  onAdd,
  onRemove,
  onAdjust,
  onClose,
}: VideoEmbedEditorProps) {
  const [pageIndex, setPageIndex] = useState(currentPage - 1)
  const [url, setUrl] = useState('')
  const [size, setSize] = useState<VideoSizePreset>('medium')
  const [error, setError] = useState('')

  function handleAdd() {
    const embed = createVideoEmbed(pageIndex, url, size)
    if (!embed) {
      setError('Enter a valid YouTube, Vimeo, or direct video URL (.mp4, .webm)')
      return
    }
    setError('')
    onAdd(embed)
    setUrl('')
    onAdjust?.(embed)
  }

  return (
    <div className="apple-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="apple-modal w-full max-w-lg">
        <div className="flex items-start justify-between border-b border-apple-border-light px-6 py-5">
          <div>
            <h3 className="text-[1.375rem] font-semibold tracking-tight text-apple-text">Add video</h3>
            <p className="mt-1 text-[1.0625rem] text-apple-muted">YouTube, Vimeo, or MP4</p>
          </div>
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

        <div className="space-y-4 px-6 py-6">
          <div>
            <label htmlFor="video-page" className="mb-2 block text-sm text-apple-muted">Page</label>
            <select id="video-page" value={pageIndex} onChange={(e) => setPageIndex(Number(e.target.value))} className="apple-input">
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i} value={i}>Page {i + 1}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="video-url" className="mb-2 block text-sm text-apple-muted">Video URL</label>
            <input
              id="video-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="apple-input"
            />
          </div>

          <div>
            <label htmlFor="video-size" className="mb-2 block text-sm text-apple-muted">Size</label>
            <select id="video-size" value={size} onChange={(e) => setSize(e.target.value as VideoSizePreset)} className="apple-input">
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="full">Full page</option>
            </select>
            <p className="mt-2 text-xs text-apple-muted">
              After adding, drag the video to move it and pull the corner handle to resize.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="button" onClick={handleAdd} className="apple-btn-primary w-full">
            Add video
          </button>

          {videoEmbeds.length > 0 && (
            <div className="border-t border-apple-border-light pt-5">
              <p className="apple-section-label mb-3">Videos ({videoEmbeds.length})</p>
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {videoEmbeds.map((embed) => (
                  <li key={embed.id} className="flex items-center justify-between rounded-xl bg-apple-gray px-3 py-2 text-sm">
                    <span className="truncate text-apple-text">
                      Page {embed.pageIndex + 1} · {embed.provider}
                    </span>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      {onAdjust && (
                        <button type="button" onClick={() => onAdjust(embed)} className="text-apple-blue hover:underline">
                          Resize
                        </button>
                      )}
                      <button type="button" onClick={() => onRemove(embed.id)} className="text-red-500 hover:underline">
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
