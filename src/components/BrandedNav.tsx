import { Link } from 'react-router-dom'
import type { BrandingConfig, PublicationInfo } from '../../shared/flipbook'
import { displayTitle } from '../../shared/flipbook'
import { resolveLogoUrl } from '../lib/branding'

interface BrandedNavProps {
  flipbookId?: string | null
  fileName: string
  publication: PublicationInfo
  branding: BrandingConfig
  isCustomDomain?: boolean
  subtitle?: string
}

export function BrandedNav({
  flipbookId,
  fileName,
  publication,
  branding,
  isCustomDomain = false,
  subtitle,
}: BrandedNavProps) {
  const title = displayTitle({ fileName, publication })
  const logoUrl = flipbookId ? resolveLogoUrl(flipbookId, branding) : branding.logoUrl
  const showPlatformBrand = !branding.hidePlatformChrome && !isCustomDomain

  return (
    <header className="apple-nav [@media(orientation:landscape)_and_(max-height:500px)]:hidden">
      <div className="mx-auto flex h-[52px] max-w-[980px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={title} className="h-8 max-w-[160px] object-contain object-left" />
          ) : showPlatformBrand ? (
            <Link to="/" className="shrink-0 text-[1.0625rem] font-semibold tracking-tight text-apple-text">
              MakeAMag
            </Link>
          ) : (
            <span className="truncate text-[1.0625rem] font-semibold tracking-tight text-apple-text">
              {title}
            </span>
          )}
        </div>
        <span className="max-w-[50vw] truncate text-sm text-apple-muted">
          {subtitle ?? title}
        </span>
      </div>
    </header>
  )
}
