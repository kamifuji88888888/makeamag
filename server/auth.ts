import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'makeamag-dev-secret-change-in-production'
const TOKEN_TTL = '7d'

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
