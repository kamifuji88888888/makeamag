import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword, verifyPassword as verifyPasswordHash } from './auth.js'

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
  const usersDir = path.join(dataDir, 'users')
  const emailDir = path.join(usersDir, 'emails')

  async function ensureDirs() {
    await fs.mkdir(emailDir, { recursive: true })
    await fs.mkdir(usersDir, { recursive: true })
  }

  function userPath(id: string) {
    return path.join(usersDir, `${id}.json`)
  }

  function emailIndexPath(email: string) {
    return path.join(emailDir, `${emailKey(email)}.json`)
  }

  async function readUser(id: string): Promise<UserRecord | null> {
    try {
      const raw = await fs.readFile(userPath(id), 'utf-8')
      return JSON.parse(raw) as UserRecord
    } catch {
      return null
    }
  }

  async function writeUser(user: UserRecord) {
    await ensureDirs()
    await fs.writeFile(userPath(user.id), JSON.stringify(user, null, 2))
    await fs.writeFile(emailIndexPath(user.email), JSON.stringify({ userId: user.id }))
  }

  return {
    async findByEmail(email: string): Promise<UserRecord | null> {
      await ensureDirs()
      try {
        const raw = await fs.readFile(emailIndexPath(email), 'utf-8')
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
      await ensureDirs()
      try {
        const files = await fs.readdir(usersDir)
        for (const file of files) {
          if (!file.endsWith('.json')) continue
          const user = JSON.parse(await fs.readFile(path.join(usersDir, file), 'utf-8')) as UserRecord
          if (user.billingAccountId === billingAccountId) {
            return user
          }
        }
      } catch {
        return null
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
        throw new Error('An account with this email already exists. Sign in instead.')
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

    async authenticateWithPassword(email: string, password: string): Promise<UserRecord | null> {
      const user = await this.findByEmail(email)
      if (!user?.passwordHash) return null
      const valid = await verifyPasswordHash(password, user.passwordHash)
      return valid ? user : null
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
