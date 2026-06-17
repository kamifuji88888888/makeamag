export function buildTwitterShareUrl(url: string, text: string): string {
  const params = new URLSearchParams({ url, text })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

export function buildLinkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  await img.decode()
  return img
}

export async function pageImageBlob(src: string): Promise<Blob> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare image')
  ctx.drawImage(img, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not export image')
  return blob
}

export async function downloadPageImage(src: string, filename: string): Promise<void> {
  const blob = await pageImageBlob(src)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

export function canUseNativeShare(): boolean {
  return typeof navigator.share === 'function'
}

export async function sharePageNative(options: {
  title: string
  text: string
  url: string
  imageSrc?: string
}): Promise<boolean> {
  if (!canUseNativeShare()) return false

  if (options.imageSrc && navigator.canShare) {
    try {
      const file = new File([await pageImageBlob(options.imageSrc)], 'flipbook-page.png', {
        type: 'image/png',
      })
      const payload = { title: options.title, text: options.text, url: options.url, files: [file] }
      if (navigator.canShare(payload)) {
        await navigator.share(payload)
        return true
      }
    } catch {
      // Fall back to link-only share.
    }
  }

  await navigator.share({
    title: options.title,
    text: options.text,
    url: options.url,
  })
  return true
}

export function openShareWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=640')
}
