import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlanContext } from '../context/PlanContext'

function planBadgeClass(planId: string): string {
  switch (planId) {
    case 'publisher':
      return 'bg-purple-100 text-purple-800'
    case 'pro':
      return 'bg-blue-100 text-blue-800'
    case 'starter':
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-apple-gray text-apple-muted'
  }
}

function userInitials(email: string): string {
  const local = email.split('@')[0] ?? 'U'
  return local.slice(0, 2).toUpperCase()
}

interface AppNavProps {
  maxWidthClass?: string
  children?: ReactNode
}

export function AppNav({ maxWidthClass = 'max-w-[980px]', children }: AppNavProps) {
  const { user, signOut, loading } = useAuth()
  const { planId, plan } = usePlanContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="apple-nav">
      <div className={`mx-auto flex h-[52px] ${maxWidthClass} items-center justify-between px-6`}>
        <Link to="/" className="text-[1.0625rem] font-semibold tracking-tight text-apple-text">
          MakeAMag
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/pricing" className="apple-btn-ghost">
            Pricing
          </Link>

          <span
            className={[
              'hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline',
              planBadgeClass(planId),
            ].join(' ')}
          >
            {plan.name}
          </span>

          {children}

          {!loading && !user && (
            <Link to="/auth" className="apple-btn-secondary">
              Sign in
            </Link>
          )}

          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-black/4"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-apple-blue text-xs font-semibold text-white">
                  {userInitials(user.email)}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm text-apple-text sm:inline">
                  {user.email}
                </span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border border-apple-border-light bg-white py-2 shadow-[0_12px_40px_rgb(0_0_0_/_0.12)]"
                >
                  <div className="border-b border-apple-border-light px-4 py-3">
                    <p className="text-sm font-medium text-apple-text">{user.email}</p>
                    <p className="mt-0.5 text-xs text-apple-muted">Signed in</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void signOut().then(() => setMenuOpen(false))}
                    className="block w-full px-4 py-2.5 text-left text-sm text-apple-text transition hover:bg-apple-gray"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
