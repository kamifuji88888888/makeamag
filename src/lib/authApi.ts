import type { AuthSession, UserPublic } from '../../shared/auth'
import { getBillingAccountId } from './billingStorage'

const API_BASE = '/api'

const fetchOptions: RequestInit = {
  credentials: 'include',
}

export async function fetchAuthConfig(): Promise<{ magicLinkEnabled: boolean }> {
  const response = await fetch(`${API_BASE}/auth/config`, fetchOptions)
  if (!response.ok) {
    return { magicLinkEnabled: false }
  }
  return response.json() as Promise<{ magicLinkEnabled: boolean }>
}

export async function signUp(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      billingAccountId: getBillingAccountId(),
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to create account')
  }

  return response.json() as Promise<AuthSession>
}

export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to sign in')
  }

  return response.json() as Promise<AuthSession>
}

export async function requestMagicLink(email: string): Promise<{
  ok: boolean
  delivered: boolean
  devLink?: string
}> {
  const response = await fetch(`${API_BASE}/auth/magic-link`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      billingAccountId: getBillingAccountId(),
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to send sign-in link')
  }

  return response.json() as Promise<{ ok: boolean; delivered: boolean; devLink?: string }>
}

export async function verifyMagicLink(token: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/auth/verify`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      billingAccountId: getBillingAccountId(),
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to sign in')
  }

  return response.json() as Promise<AuthSession>
}

export async function fetchCurrentUser(): Promise<UserPublic | null> {
  const response = await fetch(`${API_BASE}/auth/me`, fetchOptions)
  if (response.status === 401) return null
  if (!response.ok) {
    throw new Error('Failed to load account')
  }
  const data = (await response.json()) as AuthSession
  return data.user
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    ...fetchOptions,
    method: 'POST',
  })
}

export interface PublishedFlipbookSummary {
  id: string
  fileName: string
  createdAt: string
  publication: { title: string; publisherName: string; issueLabel: string }
  isPasswordProtected: boolean
}

export async function fetchPublishedFlipbooks(): Promise<PublishedFlipbookSummary[]> {
  const response = await fetch(`${API_BASE}/auth/flipbooks`, fetchOptions)
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to load published flipbooks')
  }
  const data = (await response.json()) as { flipbooks: PublishedFlipbookSummary[] }
  return data.flipbooks
}
