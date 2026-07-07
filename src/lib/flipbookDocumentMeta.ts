import { useEffect } from 'react'
import type { FlipbookVisibility, PublicationInfo } from '../../shared/flipbook'
import { displayDescription, displayTitle, flipbookCoverImageUrl, shouldNoindexFlipbook } from '../../shared/flipbook'

interface FlipbookDocumentMetaInput {
  fileName: string
  publication: PublicationInfo
  flipbookId?: string | null
  pagePath?: string
  enabled?: boolean
  visibility?: FlipbookVisibility
  isPasswordProtected?: boolean
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

function removeMetaTag(attribute: 'name' | 'property', key: string) {
  const element = document.head.querySelector(`meta[${attribute}="${key}"]`)
  element?.remove()
}

export function useFlipbookDocumentMeta({
  fileName,
  publication,
  flipbookId,
  pagePath,
  enabled = true,
  visibility = 'public',
  isPasswordProtected = false,
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
    upsertMetaTag('property', 'og:type', 'article')
    upsertMetaTag('property', 'og:url', url)
    upsertMetaTag('name', 'twitter:card', 'summary_large_image')
    upsertMetaTag('name', 'twitter:title', title)
    upsertMetaTag('name', 'twitter:description', description)

    if (shouldNoindexFlipbook({ visibility, isPasswordProtected })) {
      upsertMetaTag('name', 'robots', 'noindex, nofollow')
    } else {
      removeMetaTag('name', 'robots')
    }

    if (flipbookId) {
      const imageUrl = flipbookCoverImageUrl(window.location.origin, flipbookId)
      upsertMetaTag('property', 'og:image', imageUrl)
      upsertMetaTag('name', 'twitter:image', imageUrl)
    }

    return () => {
      document.title = previousTitle
      removeMetaTag('name', 'robots')
    }
  }, [
    enabled,
    fileName,
    flipbookId,
    isPasswordProtected,
    pagePath,
    publication,
    visibility,
  ])
}
