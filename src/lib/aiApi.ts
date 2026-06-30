import type { AiAnalysisResult, AiAnalyzeRequest } from '../../shared/ai'

const API_BASE = '/api'

export async function fetchAiConfig(): Promise<{ enabled: boolean; provider: 'openai' | 'heuristic' }> {
  const response = await fetch(`${API_BASE}/ai/config`)
  if (!response.ok) {
    return { enabled: true, provider: 'heuristic' }
  }
  return response.json() as Promise<{ enabled: boolean; provider: 'openai' | 'heuristic' }>
}

export async function analyzePublication(request: AiAnalyzeRequest): Promise<AiAnalysisResult> {
  const response = await fetch(`${API_BASE}/ai/analyze-publication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to analyze publication')
  }

  return response.json() as Promise<AiAnalysisResult>
}
