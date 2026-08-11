import { normalizeDomain } from '../shared/flipbook.js'
import { getDurableStore } from './durableStore.js'

interface DomainRegistry {
  byHost: Record<string, string>
}

export function createDomainRegistry(dataDir: string) {
  const store = getDurableStore(dataDir)
  const key = 'domains.json'

  async function readRegistry(): Promise<DomainRegistry> {
    const raw = await store.readText(key)
    if (!raw) return { byHost: {} }
    try {
      return JSON.parse(raw) as DomainRegistry
    } catch {
      return { byHost: {} }
    }
  }

  async function writeRegistry(registry: DomainRegistry) {
    await store.writeText(key, JSON.stringify(registry, null, 2))
  }

  return {
    async resolve(host: string): Promise<string | null> {
      const normalized = normalizeDomain(host)
      if (!normalized) return null
      const registry = await readRegistry()
      return registry.byHost[normalized] ?? null
    },

    async assign(flipbookId: string, domain: string): Promise<void> {
      const normalized = normalizeDomain(domain)
      const registry = await readRegistry()

      for (const [host, id] of Object.entries(registry.byHost)) {
        if (id === flipbookId && host !== normalized) {
          delete registry.byHost[host]
        }
      }

      for (const [host, id] of Object.entries(registry.byHost)) {
        if (host !== normalized && id === flipbookId) {
          delete registry.byHost[host]
        }
      }

      if (normalized) {
        registry.byHost[normalized] = flipbookId
      }

      await writeRegistry(registry)
    },

    async clear(flipbookId: string): Promise<void> {
      const registry = await readRegistry()
      let changed = false

      for (const [host, id] of Object.entries(registry.byHost)) {
        if (id === flipbookId) {
          delete registry.byHost[host]
          changed = true
        }
      }

      if (changed) {
        await writeRegistry(registry)
      }
    },
  }
}
