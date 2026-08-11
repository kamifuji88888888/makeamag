import type { CapturedLead } from '../shared/flipbook.js'
import { getDurableStore } from './durableStore.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidLeadEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}

export function createLeadsStore(dataDir: string) {
  const store = getDurableStore(dataDir)

  function leadsKey(flipbookId: string) {
    return `leads/${flipbookId}.json`
  }

  async function readLeads(flipbookId: string): Promise<CapturedLead[]> {
    const raw = await store.readText(leadsKey(flipbookId))
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as CapturedLead[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  async function writeLeads(flipbookId: string, leads: CapturedLead[]) {
    await store.writeText(leadsKey(flipbookId), JSON.stringify(leads, null, 2))
  }

  return {
    async addLead(flipbookId: string, email: string, referrer?: string): Promise<CapturedLead> {
      const normalized = email.trim().toLowerCase()
      const leads = await readLeads(flipbookId)
      const existing = leads.find((lead) => lead.email === normalized)
      if (existing) return existing

      const lead: CapturedLead = {
        email: normalized,
        capturedAt: new Date().toISOString(),
        ...(referrer ? { referrer } : {}),
      }
      leads.unshift(lead)
      await writeLeads(flipbookId, leads)
      return lead
    },

    async listLeads(flipbookId: string): Promise<CapturedLead[]> {
      return readLeads(flipbookId)
    },
  }
}
