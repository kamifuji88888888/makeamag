import { useEffect, useState } from 'react'

export interface HostContext {
  type: 'editor' | 'flipbook'
  flipbookId?: string
}

export function useHostContext() {
  const [context, setContext] = useState<HostContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/host-context')
        if (!response.ok) {
          if (!cancelled) setContext({ type: 'editor' })
          return
        }
        const data = (await response.json()) as HostContext
        if (!cancelled) setContext(data)
      } catch {
        if (!cancelled) setContext({ type: 'editor' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { context, loading }
}
