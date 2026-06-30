import { useEffect } from 'react'
import type { BrandingConfig, PublicationInfo } from '../../shared/flipbook'
import { displayDescription, displayTitle } from '../../shared/flipbook'

interface FlipbookDocumentMetaInput {
  fileName: string
  publication: PublicationInfo
  flipbookId?: string | null
  branding?: BrandingConfig
  pagePath?: string
  enabled?: boolean
}

function upsertMetaTag(attribute: 'name' | 'property', key: string, content: string) {
  if (!content) return

  let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function useFlipbookDocumentMeta({
  fileName,
  publication,
  flipbookId,
  branding,
  pagePath,
  enabled = true,
}: FlipbookDocumentMetaInput) {
  useEffect(() => {
    if (!enabled || !fileName) return
    const meta = { fileName, publication }
    const title = displayTitle(meta)
    const description = displayDescription(meta)
    const url = pagePath
      ? `${window.location.origin}${pagePath}`
      : flipbookId
        ? `${window.location.origin}/view/${flipbookId}`
        : window.location.href

    const previousTitle = document.title
    document.title = title

    upsertMetaTag('name', 'description', description)
    upsertMetaTag('property', 'og:title', title)
    upsertMetaTag('property', 'og:description', description)
    upsertMetaTag('property', 'og:type', 'website')
    upsertMetaTag('property', 'og:url', url)
    upsertMetaTag('name', 'twitter:card', 'summary_large_image')
    upsertMetaTag('name', 'twitter:title', title)
    upsertMetaTag('name', 'twitter:description', description)

    const imageUrl =
      flipbookId && branding?.logoUrl
        ? `${window.location.origin}/api/flipbooks/${flipbookId}/logo`
        : ''
    if (imageUrl) {
      upsertMetaTag('property', 'og:image', imageUrl)
      upsertMetaTag('name', 'twitter:image', imageUrl)
    }

    return () => {
      document.title = previousTitle
    }
  }, [branding?.logoUrl, enabled, fileName, flipbookId, pagePath, publication])
}
