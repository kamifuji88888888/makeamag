import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const clientUrl = (process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')

function authFromAddress(): string | null {
  return process.env.AUTH_EMAIL_FROM?.trim() || null
}

function resendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null
}

function awsRegion(): string {
  return process.env.SES_REGION?.trim() || process.env.AWS_REGION?.trim() || 'us-east-1'
}

function hasAwsCredentials(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim())
}

export function isSesConfigured(): boolean {
  return Boolean(authFromAddress() && hasAwsCredentials())
}

export function isResendConfigured(): boolean {
  return Boolean(authFromAddress() && resendApiKey())
}

export function isAuthEmailEnabled(): boolean {
  return isSesConfigured() || isResendConfigured()
}

export function authEmailProvider(): 'ses' | 'resend' | null {
  if (isSesConfigured()) return 'ses'
  if (isResendConfigured()) return 'resend'
  return null
}

export function isMagicLinkEnabled(): boolean {
  return isAuthEmailEnabled()
}

let sesClient: SESClient | null = null

function getSesClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({
      region: awsRegion(),
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
      },
    })
  }
  return sesClient
}

interface AuthEmailDelivery {
  delivered: boolean
  devLink?: string
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>[^<]*<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function sendAuthHtmlEmail(to: string, subject: string, html: string): Promise<void> {
  const from = authFromAddress()
  if (!from) {
    throw new Error('AUTH_EMAIL_FROM is not configured.')
  }

  const text = htmlToPlainText(html)

  if (isSesConfigured()) {
    try {
      const result = await getSesClient().send(
        new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: html, Charset: 'UTF-8' },
              Text: { Data: text, Charset: 'UTF-8' },
            },
          },
        }),
      )
      if (process.env.NODE_ENV === 'production') {
        console.log(`[auth] SES email sent to ${to} (messageId=${result.MessageId ?? 'unknown'})`)
      }
    } catch (error) {
      throw new Error(formatAuthEmailError(error))
    }
    return
  }

  if (isResendConfigured()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(body || 'Failed to send email via Resend')
    }
    return
  }

  throw new Error(
    'Email is not configured. Set AUTH_EMAIL_FROM and AWS credentials for Amazon SES.',
  )
}

function formatAuthEmailError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/not verified|MessageRejected|sandbox/i.test(message)) {
    return (
      'We could not deliver email to this address yet. On the sign-in page, try "Email me a sign-in link" instead, ' +
      'or contact support@makeamag.com for help.'
    )
  }
  return message || 'Failed to send email'
}

function handleUnconfiguredEmail(link: string, email: string, label: string): AuthEmailDelivery {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[auth] ${label} for ${email}: ${link}`)
    return { delivered: false, devLink: link }
  }
  throw new Error(
    'Email is not configured yet. Contact support@makeamag.com and we will help you regain access.',
  )
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

  if (!isAuthEmailEnabled()) {
    return handleUnconfiguredEmail(link, email, 'Magic link')
  }

  await sendAuthHtmlEmail(email, 'Sign in to MakeAMag', buildMagicLinkEmailHtml(link))
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

  if (!isAuthEmailEnabled()) {
    return handleUnconfiguredEmail(link, email, 'Password reset')
  }

  await sendAuthHtmlEmail(email, 'Reset your MakeAMag password', buildPasswordResetEmailHtml(link))
  return { delivered: true }
}
