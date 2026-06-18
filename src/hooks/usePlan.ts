import { useCallback, useEffect, useState } from 'react'
import type { PlanFeature, PlanId } from '../../shared/plans'
import { getPlan, maxPdfUploadBytes, PLANS } from '../../shared/plans'
import { fetchBillingStatus } from '../lib/billingApi'
import { getBillingAccountId } from '../lib/billingStorage'
import { useAuth } from '../context/AuthContext'
import {
  analyticsDaysForPlan,
  canAddFlipbook,
  canAddFolder,
  canUsePlanFeature,
  getPlanUsage,
  getStoredPlan,
  isPageCountAllowed,
  isPdfSizeAllowed,
  isVideoEmbedAllowed,
  maxVideoEmbedsForPlan,
  setStoredPlan,
  type PlanUsage,
} from '../lib/planStorage'

export function usePlan() {
  const { user, loading: authLoading } = useAuth()
  const [planId, setPlanId] = useState<PlanId>(() => getStoredPlan())
  const [usage, setUsage] = useState<PlanUsage>(() => getPlanUsage())
  const [billingLoaded, setBillingLoaded] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)

  const refreshUsage = useCallback(() => {
    setUsage(getPlanUsage())
  }, [])

  const applyPlan = useCallback((next: PlanId) => {
    setStoredPlan(next)
    setPlanId(next)
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false
    const accountId = user?.billingAccountId ?? getBillingAccountId()

    void fetchBillingStatus(accountId)
      .then((status) => {
        if (cancelled) return
        applyPlan(status.planId)
        setHasSubscription(status.hasSubscription)
      })
      .catch(() => {
        if (cancelled) return
        applyPlan(getStoredPlan())
      })
      .finally(() => {
        if (!cancelled) setBillingLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [applyPlan, authLoading, user?.billingAccountId])

  const setPlan = useCallback(
    (next: PlanId) => {
      if (import.meta.env.PROD && next !== 'free') {
        return
      }
      applyPlan(next)
    },
    [applyPlan],
  )

  const syncFromBilling = useCallback((plan: PlanId, subscription = false) => {
    applyPlan(plan)
    setHasSubscription(subscription)
  }, [applyPlan])

  const plan = getPlan(planId)

  return {
    planId,
    plan,
    plans: PLANS,
    usage,
    billingLoaded,
    hasSubscription,
    refreshUsage,
    setPlan,
    syncFromBilling,
    can: (feature: PlanFeature) => canUsePlanFeature(planId, feature),
    canAddFlipbook: () => canAddFlipbook(planId, usage),
    canAddFolder: () => canAddFolder(planId, usage),
    canAddPages: (pageCount: number) => isPageCountAllowed(planId, pageCount),
    canAddVideoEmbed: (currentCount: number) => isVideoEmbedAllowed(planId, currentCount),
    canUploadPdf: (byteSize: number) => isPdfSizeAllowed(planId, byteSize),
    maxPdfUploadMb: plan.limits.maxPdfUploadMb,
    maxPdfUploadBytes: maxPdfUploadBytes(planId),
    maxVideoEmbeds: maxVideoEmbedsForPlan(planId),
    analyticsDays: analyticsDaysForPlan(planId),
  }
}
