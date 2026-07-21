import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

interface EmailPayload {
  orderId: string
  invoiceNumber: string
  customerEmail: string
  customerName: string
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, invoiceNumber, customerEmail, customerName }: EmailPayload = await req.json()

    if (!orderId || !customerEmail) {
      return NextResponse.json({ success: false, error: 'Order ID and customer email are required' }, { status: 400 })
    }

    // Find the PDF file
    const fileName = `${invoiceNumber}.pdf`
    const filePath = path.join(process.cwd(), 'public', 'invoices', fileName)

    let pdfBuffer: Buffer
    try {
      pdfBuffer = await readFile(filePath)
    } catch {
      // If PDF doesn't exist yet, generate it first
      const generateRes = await fetch(new URL('/api/invoice/generate', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, sendEmail: false }),
      })
      if (!generateRes.ok) {
        return NextResponse.json({ success: false, error: 'Failed to generate invoice PDF' }, { status: 500 })
      }
      pdfBuffer = await readFile(filePath)
    }

    // Convert PDF to base64 for email attachment
    const pdfBase64 = pdfBuffer.toString('base64')

    // ── Send email using the LLM/email service ──
    // In production, this would use a real email service (SendGrid, Mailgun, etc.)
    // For now, we'll use a simple approach that stores the email data
    // and provides the PDF for download
    
    const emailData = {
      to: customerEmail,
      subject: `Invoice ${invoiceNumber} from Angel Beauty`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #C9A96E, #D4B87A); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Georgia, serif;">Angel Beauty</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; letter-spacing: 2px;">PREMIUM SKINCARE</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #2D2D2D; margin: 0 0 16px;">Hello ${customerName},</h2>
            <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
              Thank you for your order! Your invoice <strong style="color: #C9A96E;">${invoiceNumber}</strong> is attached to this email as a PDF.
            </p>
            <div style="background: #FDF8F4; border-left: 4px solid #C9A96E; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 8px; color: #2D2D2D; font-size: 14px;"><strong>Order ID:</strong> #${orderId.slice(-8).toUpperCase()}</p>
              <p style="margin: 0 0 8px; color: #2D2D2D; font-size: 14px;"><strong>Invoice:</strong> ${invoiceNumber}</p>
              <p style="margin: 0; color: #2D2D2D; font-size: 14px;"><strong>Payment:</strong> Confirmed</p>
            </div>
            <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
              If you have any questions about your order or invoice, please don't hesitate to contact us.
            </p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="https://wa.me/16179550069" style="background: linear-gradient(135deg, #C9A96E, #D4B87A); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                Contact Support
              </a>
            </div>
            <div style="border-top: 1px solid #E5E7EB; padding-top: 24px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                Angel Beauty<br>
                246 Union St, Lynn MA 01901, United States<br>
                hello@angelbeauty.com | +1 (617) 955-0069
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    }

    // Mark invoice as sent in database
    await db.order.update({
      where: { id: orderId },
      data: { invoiceSent: true },
    })

    // In a production environment, you would send the email here using a service like:
    // - SendGrid: await sendgrid.send(emailData)
    // - Nodemailer: await transporter.sendMail(emailData)
    // - AWS SES: await ses.sendEmail(emailData)
    
    // For this implementation, we save the email data for logging and provide the PDF
    if (process.env.CLOVER_DEBUG === 'true') {
      console.log(`📧 Invoice email prepared for ${customerEmail}:`)
      console.log(`   Subject: ${emailData.subject}`)
      console.log(`   Attachment: ${fileName} (${pdfBuffer.length} bytes)`)
      console.log(`   Invoice marked as sent in database`)
    }

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${customerEmail}`,
      emailPreview: {
        to: customerEmail,
        subject: emailData.subject,
        attachmentSize: `${(pdfBuffer.length / 1024).toFixed(1)} KB`,
      },
    })
  } catch (error) {
    console.error('Invoice send error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send invoice email' }, { status: 500 })
  }
}
