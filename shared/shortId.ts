import { randomBytes } from 'node:crypto'

/** Unambiguous URL-safe alphabet (no 0/O/1/l/I). */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export const SHORT_ID_LENGTH = 8

export function createShortId(length = SHORT_ID_LENGTH): string {
  const bytes = randomBytes(length)
  let id = ''
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return id
}

export function isLikelyShortId(value: string): boolean {
  if (!value || value.length < 6 || value.length > 12) return false
  for (const char of value) {
    if (!ALPHABET.includes(char)) return false
  }
  return true
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
