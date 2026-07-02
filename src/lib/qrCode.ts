import QRCode from 'qrcode'

export async function createQrCodeDataUrl(text: string, size = 220): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#1d1d1f',
      light: '#ffffff',
    },
  })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}
