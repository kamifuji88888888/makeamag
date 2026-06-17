interface LoadingProgressProps {
  progress: number
  fileName: string
}

export function LoadingProgress({ progress, fileName }: LoadingProgressProps) {
  const percent = Math.round(progress * 100)

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <p className="mb-2 text-[3.5rem] font-semibold leading-none tracking-tight text-apple-text">
        {percent}%
      </p>
      <h3 className="mb-2 text-[1.375rem] font-semibold tracking-tight text-apple-text">
        Preparing your flipbook
      </h3>
      <p className="mb-8 truncate text-[1.0625rem] text-apple-muted">{fileName}</p>

      <div className="apple-progress-track">
        <div className="apple-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 text-sm text-apple-muted">Rendering pages…</p>
    </div>
  )
}
