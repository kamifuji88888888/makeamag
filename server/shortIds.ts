import fs from 'fs/promises'
import path from 'path'

interface ShortIdRegistry {
  /** shortId -> flipbook storage id */
  byShortId: Record<string, string>
}

export function createShortIdRegistry(dataDir: string) {
  const filePath = path.join(dataDir, 'short-ids.json')

  async function readRegistry(): Promise<ShortIdRegistry> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(raw) as ShortIdRegistry
      return { byShortId: parsed.byShortId ?? {} }
    } catch {
      return { byShortId: {} }
    }
  }

  async function writeRegistry(registry: ShortIdRegistry) {
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(registry, null, 2))
  }

  return {
    async resolve(shortId: string): Promise<string | null> {
      const key = shortId.trim()
      if (!key) return null
      const registry = await readRegistry()
      return registry.byShortId[key] ?? null
    },

    async assign(shortId: string, flipbookId: string): Promise<void> {
      const key = shortId.trim()
      if (!key) return
      const registry = await readRegistry()

      for (const [existingShort, id] of Object.entries(registry.byShortId)) {
        if (id === flipbookId && existingShort !== key) {
          delete registry.byShortId[existingShort]
        }
      }

      registry.byShortId[key] = flipbookId
      await writeRegistry(registry)
    },

    async isTaken(shortId: string): Promise<boolean> {
      const key = shortId.trim()
      if (!key) return true
      const registry = await readRegistry()
      return Boolean(registry.byShortId[key])
    },
  }
}
