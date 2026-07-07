import fs from 'fs/promises'
import path from 'path'
import type { AdminAccountMetric, AdminMetricsSummary } from '../shared/adminMetrics.js'
import type { BillingRecord } from './billing.js'
import type { StorageProvider } from './storage/types.js'
import type { PlanId } from '../shared/plans.js'
import { isPlanOverrideEmail } from './founderAccess.js'

const UNASSIGNED_ACCOUNT = '__unassigned__'

function emptyPlanBreakdown(): Record<PlanId, number> {
  return { free: 0, starter: 0, pro: 0, publisher: 0 }
}

async function readAllBillingRecords(billingDir: string): Promise<BillingRecord[]> {
  let files: string[]
  try {
    files = await fs.readdir(billingDir)
  } catch {
    return []
  }

  const records: BillingRecord[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await fs.readFile(path.join(billingDir, file), 'utf-8')
      records.push(JSON.parse(raw) as BillingRecord)
    } catch {
      // skip corrupt billing files
    }
  }
  return records
}

export async function buildAdminMetrics(
  storage: StorageProvider,
  billingDir: string,
): Promise<AdminMetricsSummary> {
  let flipbooks: Awaited<ReturnType<StorageProvider['listAllMeta']>> = []
  let warning: string | undefined

  try {
    flipbooks = await storage.listAllMeta()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Storage listing failed'
    if (message.includes('bucket does not exist') || message.includes('NoSuchBucket')) {
      warning =
        'Could not read flipbooks from S3 — check S3_BUCKET in Railway Variables (yours should be makeamag-production). Billing data below is still shown.'
    } else {
      warning = `Could not read flipbooks from storage: ${message}`
    }
  }

  const billingRecords = await readAllBillingRecords(billingDir)

  const billingByAccount = new Map(billingRecords.map((record) => [record.accountId, record]))
  const accountStats = new Map<string, { flipbookCount: number; storageBytes: number }>()

  for (const flipbook of flipbooks) {
    const accountId = flipbook.billingAccountId?.trim() || UNASSIGNED_ACCOUNT
    const current = accountStats.get(accountId) ?? { flipbookCount: 0, storageBytes: 0 }
    current.flipbookCount += 1
    current.storageBytes += flipbook.pdfSizeBytes ?? 0
    accountStats.set(accountId, current)
  }

  const accounts: AdminAccountMetric[] = []

  for (const [accountId, stats] of accountStats) {
    if (accountId === UNASSIGNED_ACCOUNT) continue

    const billing = billingByAccount.get(accountId)
    accounts.push({
      accountId,
      planId: billing?.planId ?? 'free',
      billingStatus: billing?.status ?? 'none',
      flipbookCount: stats.flipbookCount,
      storageBytes: stats.storageBytes,
      billingUpdatedAt: billing?.updatedAt ?? null,
    })
  }

  for (const billing of billingRecords) {
    if (accountStats.has(billing.accountId)) continue
    accounts.push({
      accountId: billing.accountId,
      planId: billing.planId,
      billingStatus: billing.status,
      flipbookCount: 0,
      storageBytes: 0,
      billingUpdatedAt: billing.updatedAt,
    })
  }

  accounts.sort((a, b) => b.storageBytes - a.storageBytes || b.flipbookCount - a.flipbookCount)

  const unassigned = accountStats.get(UNASSIGNED_ACCOUNT)
  const planBreakdown = emptyPlanBreakdown()
  for (const account of accounts) {
    if (account.billingStatus === 'active' || account.billingStatus === 'trialing') {
      planBreakdown[account.planId] += 1
    } else {
      planBreakdown.free += 1
    }
  }

  const totalStorageBytes =
    accounts.reduce((sum, account) => sum + account.storageBytes, 0) + (unassigned?.storageBytes ?? 0)

  return {
    generatedAt: new Date().toISOString(),
    ...(warning ? { warning } : {}),
    totals: {
      flipbooks: flipbooks.length,
      storageBytes: totalStorageBytes,
      billingAccounts: billingRecords.length,
      unassignedFlipbooks: unassigned?.flipbookCount ?? 0,
    },
    planBreakdown,
    accounts,
  }
}

export function isAdminAuthorized(
  authHeader: string | undefined,
  adminSecret: string | undefined,
  sessionEmail?: string | null,
): boolean {
  const secret = adminSecret?.trim()
  if (secret && authHeader?.startsWith('Bearer ') && authHeader.slice(7) === secret) {
    return true
  }
  return isPlanOverrideEmail(sessionEmail)
}
