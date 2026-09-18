interface ConfirmReplacePdfDialogProps {
  fileName: string
  published: boolean
  onCancel: () => void
  /** Must open the file picker synchronously in this click handler. */
  onChoosePdf: () => void
}

export function ConfirmReplacePdfDialog({
  fileName,
  published,
  onCancel,
  onChoosePdf,
}: ConfirmReplacePdfDialogProps) {
  return (
    <div className="apple-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-replace-pdf-title"
        className="apple-modal w-full max-w-md"
      >
        <div className="px-6 py-5">
          <h3
            id="confirm-replace-pdf-title"
            className="text-[1.25rem] font-semibold tracking-tight text-apple-text"
          >
            Replace “{fileName}”?
          </h3>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-apple-muted">
            {published
              ? 'Your share link stays the same. If the new PDF has a different page count, review hotspots, videos, and the table of contents.'
              : 'Hotspots and videos may need repositioning if the page count changes.'}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-apple-border-light px-6 py-4">
          <button type="button" onClick={onCancel} className="apple-btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={onChoosePdf} className="apple-btn-primary">
            Choose PDF
          </button>
        </div>
      </div>
    </div>
  )
}
