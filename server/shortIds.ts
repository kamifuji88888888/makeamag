import { getDurableStore } from './durableStore.js'

interface ShortIdRegistry {
  /** shortId -> flipbook storage id */
  byShortId: Record<string, string>
}

export function createShortIdRegistry(dataDir: string) {
  const store = getDurableStore(dataDir)
  const key = 'short-ids.json'

  async function readRegistry(): Promise<ShortIdRegistry> {
    const raw = await store.readText(key)
    if (!raw) return { byShortId: {} }
    try {
      const parsed = JSON.parse(raw) as ShortIdRegistry
      return { byShortId: parsed.byShortId ?? {} }
    } catch {
      return { byShortId: {} }
    }
  }

  async function writeRegistry(registry: ShortIdRegistry) {
    await store.writeText(key, JSON.stringify(registry, null, 2))
  }

  return {
    async resolve(shortId: string): Promise<string | null> {
      const id = shortId.trim()
      if (!id) return null
      const registry = await readRegistry()
      return registry.byShortId[id] ?? null
    },

    async assign(shortId: string, flipbookId: string): Promise<void> {
      const id = shortId.trim()
      if (!id) return
      const registry = await readRegistry()

      for (const [existingShort, storageId] of Object.entries(registry.byShortId)) {
        if (storageId === flipbookId && existingShort !== id) {
          delete registry.byShortId[existingShort]
        }
      }

      registry.byShortId[id] = flipbookId
      await writeRegistry(registry)
    },

    async isTaken(shortId: string): Promise<boolean> {
      const id = shortId.trim()
      if (!id) return true
      const registry = await readRegistry()
      return Boolean(registry.byShortId[id])
    },
  }
}
