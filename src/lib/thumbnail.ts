export function createThumbnailFromDataUrl(dataUrl: string, maxWidth = 120): Promise<string> {
  return resizeDataUrl(dataUrl, maxWidth, 0.72)
}

export function createShareCoverFromDataUrl(dataUrl: string, maxWidth = 1200): Promise<string> {
  return resizeDataUrl(dataUrl, maxWidth, 0.88)
}

function resizeDataUrl(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not create cover image'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Could not load page image'))
    img.src = dataUrl
  })
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}
