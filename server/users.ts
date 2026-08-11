import { v4 as uuidv4 } from 'uuid'
import { hashPassword, verifyPassword as verifyPasswordHash } from './auth.js'
import { getDurableStore, type DurableStore } from './durableStore.js'

export interface UserRecord {
  id: string
  email: string
  billingAccountId: string
  passwordHash?: string
  createdAt: string
  updatedAt: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function emailKey(email: string): string {
  return encodeURIComponent(normalizeEmail(email))
}

export function createUsersStore(dataDir: string) {
  const store: DurableStore = getDurableStore(dataDir)

  function userKey(id: string) {
    return `users/${id}.json`
  }

  function emailIndexKey(email: string) {
    return `users/emails/${emailKey(email)}.json`
  }

  async function readUser(id: string): Promise<UserRecord | null> {
    const raw = await store.readText(userKey(id))
    if (!raw) return null
    try {
      return JSON.parse(raw) as UserRecord
    } catch {
      return null
    }
  }

  async function writeUser(user: UserRecord) {
    await store.writeText(userKey(user.id), JSON.stringify(user, null, 2))
    await store.writeText(emailIndexKey(user.email), JSON.stringify({ userId: user.id }))
  }

  return {
    async findByEmail(email: string): Promise<UserRecord | null> {
      const raw = await store.readText(emailIndexKey(email))
      if (!raw) return null
      try {
        const { userId } = JSON.parse(raw) as { userId?: string }
        if (!userId) return null
        return readUser(userId)
      } catch {
        return null
      }
    },

    async findById(id: string): Promise<UserRecord | null> {
      return readUser(id)
    },

    async findByBillingAccountId(billingAccountId: string): Promise<UserRecord | null> {
      const keys = await store.list('users/')
      for (const key of keys) {
        if (!key.endsWith('.json') || key.includes('/emails/')) continue
        const raw = await store.readText(key)
        if (!raw) continue
        try {
          const user = JSON.parse(raw) as UserRecord
          if (user.billingAccountId === billingAccountId) {
            return user
          }
        } catch {
          // skip corrupt records
        }
      }
      return null
    },

    async findOrCreate(email: string, billingAccountId?: string): Promise<UserRecord> {
      const normalized = normalizeEmail(email)
      if (!normalized || !normalized.includes('@')) {
        throw new Error('A valid email address is required')
      }

      const existing = await this.findByEmail(normalized)
      if (existing) {
        return existing
      }

      const now = new Date().toISOString()
      const user: UserRecord = {
        id: uuidv4(),
        email: normalized,
        billingAccountId: billingAccountId?.trim() || uuidv4(),
        createdAt: now,
        updatedAt: now,
      }
      await writeUser(user)
      return user
    },

    async createWithPassword(
      email: string,
      password: string,
      billingAccountId?: string,
    ): Promise<UserRecord> {
      const normalized = normalizeEmail(email)
      if (!normalized || !normalized.includes('@')) {
        throw new Error('A valid email address is required')
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }

      const existing = await this.findByEmail(normalized)
      if (existing) {
        if (existing.passwordHash) {
          throw new Error('An account with this email already exists. Sign in instead.')
        }

        const upgraded: UserRecord = {
          ...existing,
          passwordHash: await hashPassword(password),
          updatedAt: new Date().toISOString(),
        }
        await writeUser(upgraded)
        return upgraded
      }

      const now = new Date().toISOString()
      const user: UserRecord = {
        id: uuidv4(),
        email: normalized,
        billingAccountId: billingAccountId?.trim() || uuidv4(),
        passwordHash: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      }
      await writeUser(user)
      return user
    },

    async authenticateWithPassword(
      email: string,
      password: string,
    ): Promise<'invalid' | 'no-password' | UserRecord> {
      const user = await this.findByEmail(normalizeEmail(email))
      if (!user) return 'invalid'
      if (!user.passwordHash) return 'no-password'
      const valid = await verifyPasswordHash(password, user.passwordHash)
      return valid ? user : 'invalid'
    },

    async updatePassword(email: string, password: string): Promise<UserRecord | null> {
      const normalized = normalizeEmail(email)
      if (!normalized || !normalized.includes('@')) {
        throw new Error('A valid email address is required')
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }

      const user = await this.findByEmail(normalized)
      if (!user) return null

      const updated: UserRecord = {
        ...user,
        passwordHash: await hashPassword(password),
        updatedAt: new Date().toISOString(),
      }
      await writeUser(updated)
      return updated
    },

    toPublic(user: UserRecord) {
      return {
        id: user.id,
        email: user.email,
        billingAccountId: user.billingAccountId,
        createdAt: user.createdAt,
      }
    },
  }
}
