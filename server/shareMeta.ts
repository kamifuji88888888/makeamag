import fs from 'fs/promises'
import path from 'path'
import type { FlipbookStoredMeta } from '../shared/flipbook.js'
import { displayDescription, displayTitle } from '../shared/flipbook.js'
import { SITE_NAME } from '../shared/site.js'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function metaTag(attribute: 'name' | 'property', key: string, content: string): string {
  if (!content.trim()) return ''
  return `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`
}

export function buildShareMetaTags(
  meta: FlipbookStoredMeta,
  options: {
    canonicalUrl: string
    siteOrigin: string
  },
): string {
  const publicationMeta = { fileName: meta.fileName, publication: meta.publication }
  const title = displayTitle(publicationMeta)
  const description = displayDescription(publicationMeta)
  const imageUrl = meta.branding?.logoUrl
    ? `${options.siteOrigin}/api/flipbooks/${meta.id}/logo`
    : ''

  return [
    `<title>${escapeHtml(title)}</title>`,
    metaTag('name', 'description', description),
    metaTag('property', 'og:title', title),
    metaTag('property', 'og:description', description),
    metaTag('property', 'og:type', 'website'),
    metaTag('property', 'og:url', options.canonicalUrl),
    metaTag('property', 'og:site_name', SITE_NAME),
    metaTag('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary'),
    metaTag('name', 'twitter:title', title),
    metaTag('name', 'twitter:description', description),
    imageUrl ? metaTag('property', 'og:image', imageUrl) : '',
    imageUrl ? metaTag('name', 'twitter:image', imageUrl) : '',
  ]
    .filter(Boolean)
    .join('\n    ')
}

export function injectShareMetaHtml(baseHtml: string, metaTags: string): string {
  if (baseHtml.includes('<title>MakeAMag</title>')) {
    return baseHtml.replace('<title>MakeAMag</title>', metaTags)
  }

  if (baseHtml.includes('</head>')) {
    return baseHtml.replace('</head>', `    ${metaTags}\n  </head>`)
  }

  return baseHtml
}

export async function readIndexHtml(distPath: string): Promise<string> {
  return fs.readFile(path.join(distPath, 'index.html'), 'utf-8')
}
