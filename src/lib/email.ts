/**
 * Server-side email client using Resend.
 *
 * SECURITY: This file is server-only. Never import from client components.
 * The API key is read from process.env and never exposed to the browser.
 *
 * Environment variables (names only — never log values):
 *   RESEND_API_KEY         — Resend API key (required for sending)
 *   EMAIL_FROM             — Sender address (e.g., "Angels Beauty <no-reply@angelsbeauties.shop>")
 *   EMAIL_SUPPORT_TO       — Inbox for customer support/returns/complaints (e.g., "support@angelsbeauties.shop")
 *
 * If RESEND_API_KEY is not set, all functions return a simulated success
 * (email is logged to console but not actually sent). This allows the app
 * to function without email during development/testing.
 */

import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'Angels Beauty <no-reply@angelsbeauties.shop>'
const EMAIL_SUPPORT_TO = process.env.EMAIL_SUPPORT_TO || 'support@angelsbeauties.shop'

let _client: Resend | null = null

function getClient(): Resend | null {
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') return null
  if (!_client) _client = new Resend(RESEND_API_KEY)
  return _client
}

export function isEmailConfigured(): boolean {
  return !!(RESEND_API_KEY && RESEND_API_KEY.trim() !== '')
}

// ─── Send a transactional email ────────────────────────────────────────────
interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
  attachments?: Array<{ filename: string; content: Buffer }>
}

export async function sendEmail({ to, subject, html, from, attachments }: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const client = getClient()

  // If not configured, simulate success (dev mode)
  if (!client) {
    console.log(`[Email] (simulated) To: ${to} | Subject: ${subject}`)
    return { success: true, messageId: 'simulated-' + Date.now() }
  }

  try {
    const payload: any = {
      from: from || EMAIL_FROM,
      to,
      subject,
      html,
    }
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content.toString('base64'),
      }))
    }

    const { data, error } = await client.emails.send(payload)

    if (error) {
      console.error('[Email] Resend error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err: any) {
    console.error('[Email] Send failed:', err?.message || err)
    return { success: false, error: err?.message || 'Unknown email error' }
  }
}

// ─── Send order confirmation email with invoice PDF ───────────────────────
export async function sendOrderConfirmation(params: {
  customerEmail: string
  customerName: string
  orderId: string
  invoiceNumber: string
  invoicePdf?: Buffer
  total: number
  items: Array<{ name: string; quantity: number; price: number }>
}): Promise<{ success: boolean; error?: string }> {
  const { customerEmail, customerName, orderId, invoiceNumber, invoicePdf, total, items } = params

  const itemsHtml = items.map(item =>
    `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.price.toFixed(2)}</td></tr>`
  ).join('')

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #C9A96E; font-family: 'Playfair Display', Georgia, serif; font-size: 28px;">Angels Beauty</h1>
        <p style="color: #999; font-size: 14px;">Premium Skincare for Radiant Skin</p>
      </div>
      <h2 style="color: #333;">Order Confirmed!</h2>
      <p>Hi ${customerName},</p>
      <p>Thank you for your order. Your payment has been processed successfully.</p>
      <p><strong>Order ID:</strong> ${orderId}<br>
         <strong>Invoice:</strong> ${invoiceNumber}<br>
         <strong>Total:</strong> $${total.toFixed(2)}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead><tr style="background: #f9f5f0;">
          <th style="padding: 10px; text-align: left;">Product</th>
          <th style="padding: 10px; text-align: center;">Qty</th>
          <th style="padding: 10px; text-align: right;">Price</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        If you have any questions, please contact us at ${EMAIL_SUPPORT_TO}.<br>
        Thank you for choosing Angels Beauty!
      </p>
    </div>
  `

  const attachments = invoicePdf ? [{ filename: `${invoiceNumber}.pdf`, content: invoicePdf }] : undefined

  return sendEmail({
    to: customerEmail,
    subject: `Order Confirmation — ${invoiceNumber}`,
    html,
    attachments,
  })
}

// ─── Send password reset email ────────────────────────────────────────────
export async function sendPasswordReset(params: {
  customerEmail: string
  customerName: string
  resetUrl: string
}): Promise<{ success: boolean; error?: string }> {
  const { customerEmail, customerName, resetUrl } = params

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #C9A96E; font-family: 'Playfair Display', Georgia, serif; font-size: 28px;">Angels Beauty</h1>
      </div>
      <h2 style="color: #333;">Password Reset</h2>
      <p>Hi ${customerName || 'there'},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #C9A96E; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #999; font-size: 12px;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.<br><br>
        Or copy this link: ${resetUrl}
      </p>
    </div>
  `

  return sendEmail({
    to: customerEmail,
    subject: 'Password Reset — Angels Beauty',
    html,
  })
}

// ─── Send contact/support form submission ──────────────────────────────────
export async function sendContactForm(params: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<{ success: boolean; error?: string }> {
  const { name, email, subject, message } = params

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #C9A96E;">New Contact Form Submission</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; font-weight: bold; width: 100px;">Name:</td><td style="padding: 8px;">${name}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Subject:</td><td style="padding: 8px;">${subject}</td></tr>
      </table>
      <div style="margin-top: 20px; padding: 15px; background: #f9f5f0; border-radius: 8px;">
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 20px;">
        Reply directly to the customer at ${email}.
      </p>
    </div>
  `

  // Send to support inbox, reply-to customer's email
  const client = getClient()
  if (!client) {
    console.log(`[Email] (simulated) Contact form to: ${EMAIL_SUPPORT_TO} | From: ${email} | Subject: ${subject}`)
    return { success: true }
  }

  try {
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_SUPPORT_TO,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html,
    })

    if (error) {
      console.error('[Email] Contact form error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Email] Contact form failed:', err?.message || err)
    return { success: false, error: err?.message || 'Unknown error' }
  }
}
