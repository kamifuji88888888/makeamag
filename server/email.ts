const clientUrl = (process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')

export function isMagicLinkEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim())
}

function authFromAddress(): string | null {
  return process.env.AUTH_EMAIL_FROM?.trim() || null
}

function resendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null
}

function buildMagicLinkEmailHtml(link: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1d1d1f;">
      <p style="font-size: 15px; line-height: 1.5; color: #6e6e73;">Sign in to MakeAMag</p>
      <h1 style="font-size: 28px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 16px;">Your sign-in link is ready</h1>
      <p style="font-size: 17px; line-height: 1.5; margin: 0 0 24px;">Tap the button below to continue. This link expires in 15 minutes.</p>
      <a href="${link}" style="display: inline-block; background: #0071e3; color: #fff; text-decoration: none; border-radius: 980px; padding: 12px 22px; font-size: 15px;">Sign in to MakeAMag</a>
      <p style="font-size: 13px; line-height: 1.5; color: #6e6e73; margin: 28px 0 0;">If you didn't request this email, you can safely ignore it.</p>
    </div>
  `.trim()
}

export interface MagicLinkDelivery {
  delivered: boolean
  devLink?: string
}

export async function sendMagicLinkEmail(email: string, token: string): Promise<MagicLinkDelivery> {
  const link = `${clientUrl}/auth/verify?token=${encodeURIComponent(token)}`
  const apiKey = resendApiKey()
  const from = authFromAddress()

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[auth] Magic link for ${email}: ${link}`)
      return { delivered: false, devLink: link }
    }
    throw new Error('Email is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Sign in to MakeAMag',
      html: buildMagicLinkEmailHtml(link),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || 'Failed to send sign-in email')
  }

  return { delivered: true }
}

function buildPasswordResetEmailHtml(link: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1d1d1f;">
      <p style="font-size: 15px; line-height: 1.5; color: #6e6e73;">Reset your MakeAMag password</p>
      <h1 style="font-size: 28px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 16px;">Choose a new password</h1>
      <p style="font-size: 17px; line-height: 1.5; margin: 0 0 24px;">Tap the button below to reset your password. This link expires in 15 minutes.</p>
      <a href="${link}" style="display: inline-block; background: #0071e3; color: #fff; text-decoration: none; border-radius: 980px; padding: 12px 22px; font-size: 15px;">Reset password</a>
      <p style="font-size: 13px; line-height: 1.5; color: #6e6e73; margin: 28px 0 0;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `.trim()
}

export interface PasswordResetDelivery {
  delivered: boolean
  devLink?: string
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<PasswordResetDelivery> {
  const link = `${clientUrl}/auth/reset-password?token=${encodeURIComponent(token)}`
  const apiKey = resendApiKey()
  const from = authFromAddress()

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[auth] Password reset for ${email}: ${link}`)
      return { delivered: false, devLink: link }
    }
    return { delivered: false }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Reset your MakeAMag password',
      html: buildPasswordResetEmailHtml(link),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || 'Failed to send password reset email')
  }

  return { delivered: true }
}
