import { useCallback, useEffect, useState } from 'react'
import type { PlanFeature, PlanId } from '../../shared/plans'
import { getPlan, maxPdfUploadBytes, PLANS } from '../../shared/plans'
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
  const [planId, setPlanId] = useState<PlanId>(() => getStoredPlan())
  const [usage, setUsage] = useState<PlanUsage>(() => getPlanUsage())

  const refreshUsage = useCallback(() => {
    setUsage(getPlanUsage())
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  const setPlan = useCallback((next: PlanId) => {
    setStoredPlan(next)
    setPlanId(next)
  }, [])

  const plan = getPlan(planId)

  return {
    planId,
    plan,
    plans: PLANS,
    usage,
    refreshUsage,
    setPlan,
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
