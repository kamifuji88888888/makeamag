import { Link } from 'react-router-dom'
import type { PlanId } from '../../shared/plans'
import { minimumPlanForFeature, planDisplayName, type PlanFeature } from '../../shared/plans'

interface UpgradePromptProps {
  title: string
  message: string
  feature?: PlanFeature
  onClose: () => void
}

export function UpgradePrompt({ title, message, feature, onClose }: UpgradePromptProps) {
  const requiredPlan = feature ? minimumPlanForFeature(feature) : null

  return (
    <div className="apple-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="apple-modal w-full max-w-md">
        <div className="border-b border-apple-border-light px-6 py-5">
          <h3 className="text-[1.375rem] font-semibold tracking-tight text-apple-text">{title}</h3>
          <p className="mt-2 text-[1.0625rem] text-apple-muted">{message}</p>
          {requiredPlan && (
            <p className="mt-2 text-sm text-apple-blue">
              Available on {planDisplayName(requiredPlan)} and above
            </p>
          )}
        </div>
        <div className="flex gap-3 px-6 py-5">
          <button type="button" onClick={onClose} className="apple-btn-ghost flex-1">
            Not now
          </button>
          <Link to="/pricing" onClick={onClose} className="apple-btn-primary flex-1 text-center">
            View plans
          </Link>
        </div>
      </div>
    </div>
  )
}

export function planBadgeClass(planId: PlanId): string {
  switch (planId) {
    case 'free':
      return 'bg-apple-gray text-apple-muted'
    case 'starter':
      return 'bg-sky-100 text-sky-700'
    case 'pro':
      return 'bg-apple-blue/10 text-apple-blue'
    case 'publisher':
      return 'bg-violet-100 text-violet-700'
    default:
      return 'bg-apple-gray text-apple-muted'
  }
}
