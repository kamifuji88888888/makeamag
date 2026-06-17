import type {
  AnalyticsEventInput,
  AnalyticsViewerMode,
} from '../../shared/analytics'

const API_BASE = '/api'
const SESSION_PREFIX = 'makeamag_analytics_session_'
const queues = new Map<string, AnalyticsEventInput[]>()
const flushTimers = new Map<string, ReturnType<typeof setTimeout>>()

function queueKey(flipbookId: string) {
  return flipbookId
}

export function getAnalyticsSessionId(flipbookId: string): string {
  const key = SESSION_PREFIX + flipbookId
  let sessionId = sessionStorage.getItem(key)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem(key, sessionId)
  }
  return sessionId
}

export async function sendAnalyticsEvents(
  flipbookId: string,
  events: AnalyticsEventInput[],
): Promise<void> {
  if (events.length === 0) return

  const payload = JSON.stringify({ events })
  const url = `${API_BASE}/flipbooks/${flipbookId}/events`

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    if (navigator.sendBeacon(url, blob)) return
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  })
}

async function flushQueue(flipbookId: string) {
  const key = queueKey(flipbookId)
  const events = queues.get(key)
  if (!events?.length) return

  queues.set(key, [])
  try {
    await sendAnalyticsEvents(flipbookId, events)
  } catch {
    queues.set(key, [...events, ...(queues.get(key) ?? [])])
  }
}

function scheduleFlush(flipbookId: string) {
  const existing = flushTimers.get(flipbookId)
  if (existing) clearTimeout(existing)

  flushTimers.set(
    flipbookId,
    setTimeout(() => {
      flushTimers.delete(flipbookId)
      void flushQueue(flipbookId)
    }, 1500),
  )
}

export function trackFlipbookEvent(
  flipbookId: string,
  event: Omit<AnalyticsEventInput, 'sessionId' | 'timestamp'>,
) {
  const key = queueKey(flipbookId)
  const fullEvent: AnalyticsEventInput = {
    ...event,
    sessionId: getAnalyticsSessionId(flipbookId),
    timestamp: new Date().toISOString(),
  }

  const queue = queues.get(key) ?? []
  queue.push(fullEvent)
  queues.set(key, queue)
  scheduleFlush(flipbookId)
}

export function flushFlipbookAnalytics(flipbookId: string) {
  const timer = flushTimers.get(flipbookId)
  if (timer) {
    clearTimeout(timer)
    flushTimers.delete(flipbookId)
  }
  void flushQueue(flipbookId)
}

export function viewerModeFromFlipbookMode(mode: 'shared' | 'embed'): AnalyticsViewerMode {
  return mode === 'embed' ? 'embed' : 'view'
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    for (const flipbookId of queues.keys()) {
      flushFlipbookAnalytics(flipbookId)
    }
  })
}
