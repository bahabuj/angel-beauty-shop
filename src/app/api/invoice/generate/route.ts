import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { getSiteUrl } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INV-${year}${month}-${random}`
}

interface OrderItem {
  name?: string
  productName?: string
  quantity?: number
  qty?: number
  price?: number
  image?: string
  variantName?: string | null
  sku?: string | null
  variantId?: string | null
  [key: string]: unknown
}

function parseItems(itemsStr: string): OrderItem[] {
  try {
    const parsed = JSON.parse(itemsStr)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    pay_on_delivery: 'Pay on Delivery',
    card: 'Card Payment',
    bank_transfer: 'Bank Transfer',
    paystack: 'Paystack',
  }
  return map[method] || method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Generate invoice PDF using jsPDF (works fully in memory, no file system needed for fonts)
async function generateInvoicePDF(order: {
  id: string
  customerName: string
  email: string
  phone: string | null
  address: string
  city: string
  state: string | null
  zipCode: string | null
  country: string
  items: string
  subtotal: number
  total: number
  paymentMethod: string
  invoiceNumber: string | null
  createdAt: Date
}): Promise<Buffer> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 50
  const contentWidth = pageWidth - margin * 2

  const gold = [201, 169, 110] as [number, number, number]
  const darkText = [45, 45, 45] as [number, number, number]
  const mutedText = [107, 114, 128] as [number, number, number]
  const white = [255, 255, 255] as [number, number, number]
  const lightBg = [253, 248, 244] as [number, number, number]

  // ── Gold header banner ──
  doc.setFillColor(...gold)
  doc.rect(0, 0, pageWidth, 100, 'F')

  // ── Logo image (top-left of gold banner) ──
  // Embed the invoice-optimized logo PNG. jsPDF addImage supports PNG with
  // alpha. The logo is placed at (margin, 20) with a height of 60pt — fits
  // neatly inside the 100pt gold banner. If the image read fails (e.g. file
  // missing in serverless), we fall back to text-only branding.
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-invoice.png')
    const logoBuffer = await fs.readFile(logoPath)
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
    // Logo: 60pt tall, preserve aspect ratio (logo-invoice.png is square-ish)
    // Place at left margin, vertically centered in the 100pt banner
    const logoHeight = 60
    const logoWidth = 60  // approximately square logo
    const logoY = 20
    doc.addImage(logoBase64, 'PNG', margin, logoY, logoWidth, logoHeight)
  } catch (logoError) {
    // Fallback: text-only branding if logo file can't be read
    console.warn('[invoice] Could not load logo image, using text-only header:', logoError instanceof Error ? logoError.message : logoError)
  }

  // Brand name (positioned to the right of the logo)
  doc.setTextColor(...white)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('Angel Beauty Supply', margin + 70, 42)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Premium Skincare', margin + 70, 62)

  // Website URL under the tagline
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(255, 255, 255)
  doc.text('angelsbeauty.com', margin + 70, 78)

  // Invoice label on right
  doc.setTextColor(...white)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - margin, 35, { align: 'right' })

  const invNum = order.invoiceNumber || `#${order.id.slice(-8).toUpperCase()}`
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(invNum, pageWidth - margin, 52, { align: 'right' })
  doc.text(formatDate(order.createdAt.toISOString()), pageWidth - margin, 66, { align: 'right' })

  // ── From / To section ──
  let y = 120
  const leftCol = margin
  const rightCol = pageWidth / 2 + 10

  // From
  doc.setTextColor(...gold)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FROM', leftCol, y)
  y += 14
  doc.setTextColor(...darkText)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Angel Beauty Supply', leftCol, y)
  y += 14
  doc.setTextColor(...mutedText)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('246 Union St, Lynn MA 01901', leftCol, y)
  y += 12
  doc.text('United States', leftCol, y)
  y += 12
  doc.text('hello@angelbeauty.com', leftCol, y)
  y += 12
  doc.text('+1 (617) 955-0069', leftCol, y)
  y += 12
  doc.text('angelsbeauty.com', leftCol, y)

  // To
  y = 120
  doc.setTextColor(...gold)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', rightCol, y)
  y += 14
  doc.setTextColor(...darkText)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(order.customerName, rightCol, y)
  y += 14
  doc.setTextColor(...mutedText)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(order.email, rightCol, y)
  y += 12
  if (order.phone) {
    doc.text(order.phone, rightCol, y)
    y += 12
  }
  doc.text(order.address, rightCol, y)
  y += 12
  const cityLine = `${order.city}${order.state ? `, ${order.state}` : ''}${order.zipCode ? ` ${order.zipCode}` : ''}`
  doc.text(cityLine, rightCol, y)
  y += 12
  doc.text(order.country, rightCol, y)

  // ── Divider ──
  y = Math.max(y, 230) + 20
  doc.setDrawColor(...gold)
  doc.setLineWidth(1.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 20

  // ── Order details ──
  const detailsY = y
  doc.setTextColor(...gold)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('ORDER DETAILS', leftCol, detailsY)
  doc.text('PAYMENT METHOD', rightCol, detailsY)

  doc.setTextColor(...darkText)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(formatPaymentMethod(order.paymentMethod), rightCol, detailsY + 14)

  y = detailsY + 14
  doc.setTextColor(...darkText)
  doc.setFontSize(10)
  doc.text(`Order #${order.id.slice(-8).toUpperCase()}`, leftCol, y)
  y += 14
  doc.setTextColor(...mutedText)
  doc.setFontSize(9)
  doc.text(`Invoice: ${invNum}`, leftCol, y)
  y += 12
  doc.text(`Date: ${formatDate(order.createdAt.toISOString())}`, leftCol, y)

  y += 28

  // ── Items table header ──
  doc.setFillColor(...lightBg)
  doc.rect(margin - 5, y - 5, contentWidth + 10, 22, 'F')

  doc.setTextColor(...mutedText)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('#', margin, y + 8)
  doc.text('DESCRIPTION', margin + 30, y + 8)
  doc.text('QTY', pageWidth - margin - 180, y + 8, { align: 'center' })
  doc.text('PRICE', pageWidth - margin - 90, y + 8, { align: 'right' })
  doc.text('TOTAL', pageWidth - margin, y + 8, { align: 'right' })

  y += 28

  // ── Items rows ──
  const items = parseItems(order.items)
  // Description column ends just before the QTY column (pageWidth - margin - 180).
  const descriptionMaxWidth = pageWidth - margin - 180 - (margin + 30)
  items.forEach((item, index) => {
    const baseName = item.name || item.productName || 'Unknown Product'
    const variantName =
      typeof item.variantName === 'string' && item.variantName.trim()
        ? item.variantName.trim()
        : null
    // When the customer ordered a specific variant (e.g. "Small"), surface it
    // in the line item description so the invoice reflects what was purchased.
    const name = variantName ? `${baseName} (${variantName})` : baseName
    const qty = item.quantity || item.qty || 1
    const price = item.price ? Number(item.price) : 0
    const lineTotal = price * qty

    if (index % 2 === 0) {
      doc.setFillColor(...lightBg)
      doc.rect(margin - 5, y - 5, contentWidth + 10, 20, 'F')
    }

    doc.setTextColor(...darkText)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(String(index + 1), margin, y + 6)
    // Wrap long descriptions (esp. when variant name is appended) so they
    // never overflow into the QTY / PRICE columns.
    const nameLines = doc.splitTextToSize(name, descriptionMaxWidth)
    doc.text(nameLines[0] || name, margin + 30, y + 6)
    doc.text(String(qty), pageWidth - margin - 180, y + 6, { align: 'center' })
    doc.text(formatCurrency(price), pageWidth - margin - 90, y + 6, { align: 'right' })
    doc.text(formatCurrency(lineTotal), pageWidth - margin, y + 6, { align: 'right' })

    y += 22
  })

  if (items.length === 0) {
    doc.setTextColor(...mutedText)
    doc.setFontSize(9)
    doc.text('No items details available', margin + 30, y + 6)
    y += 22
  }

  // ── Divider line ──
  y += 5
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  // ── Totals section ──
  const shipping = order.total > order.subtotal ? order.total - order.subtotal : 0
  const freeShipping = order.subtotal >= 100
  const totalsX = pageWidth - margin - 200
  const valueX = pageWidth - margin

  doc.setTextColor(...mutedText)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal', totalsX, y)
  doc.setTextColor(...darkText)
  doc.text(formatCurrency(order.subtotal), valueX, y, { align: 'right' })
  y += 16

  doc.setTextColor(...mutedText)
  doc.text('Shipping', totalsX, y)
  doc.setTextColor(...darkText)
  doc.text(freeShipping ? 'FREE' : formatCurrency(shipping), valueX, y, { align: 'right' })
  y += 16

  doc.setDrawColor(...gold)
  doc.setLineWidth(1)
  doc.line(totalsX, y, pageWidth - margin, y)
  y += 12

  doc.setTextColor(...gold)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Total', totalsX, y)
  doc.text(formatCurrency(order.total), valueX, y, { align: 'right' })
  y += 25

  // ── Footer ──
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  doc.setTextColor(...gold)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('THANK YOU FOR SHOPPING WITH ANGEL BEAUTY SUPPLY!', margin, y)
  y += 14
  doc.setTextColor(...mutedText)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('If you have any questions about this invoice, please contact us at hello@angelbeauty.com or +1 (617) 955-0069', margin, y, { maxWidth: contentWidth })
  y += 11
  doc.text('246 Union St, Lynn MA 01901, United States | angelsbeauty.com', margin, y, { maxWidth: contentWidth })

  // Get PDF as buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}

// ─── POST: Generate invoice and return PDF URL ───
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, sendEmail } = body

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const invoiceNumber = order.invoiceNumber || generateInvoiceNumber()
    const pdfBuffer = await generateInvoicePDF({ ...order, invoiceNumber })

    // Save PDF
    const invoicesDir = path.join(process.cwd(), 'public', 'invoices')
    await mkdir(invoicesDir, { recursive: true })
    const fileName = `${invoiceNumber}.pdf`
    const filePath = path.join(invoicesDir, fileName)
    await writeFile(filePath, pdfBuffer)

    // Update order
    await db.order.update({
      where: { id: orderId },
      data: {
        invoiceNumber,
        invoiceSent: sendEmail ? true : order.invoiceSent,
      },
    })

    // Send email if requested (non-blocking)
    if (sendEmail) {
      // Derive base URL from the incoming request so it works behind any proxy/domain
      const siteUrl = getSiteUrl()
      fetch(`${siteUrl}/api/invoice/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          invoiceNumber,
          customerEmail: order.email,
          customerName: order.customerName,
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      invoiceNumber,
      pdfUrl: `/invoices/${fileName}`,
      message: sendEmail ? 'Invoice generated and sent to customer email' : 'Invoice generated successfully',
    })
  } catch (error) {
    console.error('Invoice generation error:', error instanceof Error ? error.message : error)
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json({ success: false, error: `Failed to generate invoice: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}

// ─── GET: Download/view invoice PDF ───
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Generate on-the-fly if no invoice yet
    if (!order.invoiceNumber) {
      const invoiceNumber = generateInvoiceNumber()
      const pdfBuffer = await generateInvoicePDF({ ...order, invoiceNumber })

      const invoicesDir = path.join(process.cwd(), 'public', 'invoices')
      await mkdir(invoicesDir, { recursive: true })
      const fileName = `${invoiceNumber}.pdf`
      await writeFile(path.join(invoicesDir, fileName), pdfBuffer)

      await db.order.update({ where: { id: orderId }, data: { invoiceNumber } })

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${fileName}"`,
        },
      })
    }

    const fileName = `${order.invoiceNumber}.pdf`
    const filePath = path.join(process.cwd(), 'public', 'invoices', fileName)

    let pdfBuffer: Buffer
    try {
      pdfBuffer = await readFile(filePath)
    } catch {
      pdfBuffer = await generateInvoicePDF(order)
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(filePath, pdfBuffer)
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Invoice fetch error:', error)
    return NextResponse.json({ success: false, error: 'Invoice PDF not found' }, { status: 404 })
  }
}
