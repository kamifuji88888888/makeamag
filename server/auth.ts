import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'

const JWT_SECRET = process.env.JWT_SECRET ?? 'makeamag-dev-secret-change-in-production'
const TOKEN_TTL = '7d'
const SESSION_TTL = '30d'
const MAGIC_LINK_TTL = '15m'
export const SESSION_COOKIE = 'makeamag_session'

export interface SessionPayload {
  type: 'session'
  userId: string
  email: string
  billingAccountId: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createAccessToken(flipbookId: string): string {
  return jwt.sign({ flipbookId }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export function createMonetizationToken(flipbookId: string): string {
  return jwt.sign({ flipbookId, monetization: true }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export function createLeadCaptureToken(flipbookId: string): string {
  return jwt.sign({ flipbookId, leadCapture: true }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export function createMagicLinkToken(email: string): string {
  return jwt.sign({ type: 'magic-link', email: email.trim().toLowerCase() }, JWT_SECRET, {
    expiresIn: MAGIC_LINK_TTL,
  })
}

export function verifyMagicLinkToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { type?: string; email?: string }
    if (payload.type !== 'magic-link' || !payload.email?.trim()) return null
    return payload.email.trim().toLowerCase()
  } catch {
    return null
  }
}

export function createSessionToken(payload: Omit<SessionPayload, 'type'>): string {
  return jwt.sign({ type: 'session', ...payload }, JWT_SECRET, { expiresIn: SESSION_TTL })
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload
    if (payload.type !== 'session' || !payload.userId || !payload.email || !payload.billingAccountId) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export function verifyAccessToken(token: string, flipbookId: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      flipbookId?: string
      monetization?: boolean
      leadCapture?: boolean
    }
    return payload.flipbookId === flipbookId && !payload.monetization && !payload.leadCapture
  } catch {
    return false
  }
}

export function verifyMonetizationToken(token: string, flipbookId: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      flipbookId?: string
      monetization?: boolean
      leadCapture?: boolean
    }
    return payload.flipbookId === flipbookId && payload.monetization === true
  } catch {
    return false
  }
}

export function verifyLeadCaptureToken(token: string, flipbookId: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      flipbookId?: string
      leadCapture?: boolean
    }
    return payload.flipbookId === flipbookId && payload.leadCapture === true
  } catch {
    return false
  }
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const cookies: Record<string, string> = {}
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1)
    cookies[key] = decodeURIComponent(value)
  }
  return cookies
}

export function readSessionFromRequest(req: { headers: { cookie?: string } }): SessionPayload | null {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (!token) return null
  return verifySessionToken(token)
}

export function setSessionCookie(res: Response, token: string, isProduction: boolean) {
  const maxAge = 30 * 24 * 60 * 60
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (isProduction) {
    parts.push('Secure')
  }
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: Response, isProduction: boolean) {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (isProduction) {
    parts.push('Secure')
  }
  res.setHeader('Set-Cookie', parts.join('; '))
}
