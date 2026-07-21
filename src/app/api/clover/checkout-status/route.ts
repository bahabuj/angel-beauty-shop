import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCheckoutStatus } from '@/lib/clover'
import { primeSettingsCache } from '@/lib/settings-db'

// ─── GET /api/clover/checkout-status ─────────────────────────────────────────
//
// Retrieves the full payment status for an order from both our database
// and the Clover API. This endpoint is called by the frontend after a
// customer returns from Hosted Checkout to get detailed diagnostics.
//
// Query params:
//   orderId — Our internal order ID (required)
//
// Returns:
//   - Order payment status from our DB
//   - Payment details stored during the return handler (from paymentDetails JSON)
//   - Fresh checkout status from Clover API (if checkoutId is available)
//   - Human-readable decline reason and customer message
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Prime DB settings cache so Clover API calls (getCheckoutStatus) can
    // authenticate using DB-backed credentials if .env.local is missing.
    await primeSettingsCache()

    const { searchParams } = request.nextUrl
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      )
    }

    // ─── Fetch order from DB ────────────────────────────────────────────
    const order = await db.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // ─── Parse stored payment details ───────────────────────────────────
    let storedDetails: any = {}
    try {
      storedDetails = JSON.parse(order.paymentDetails || '{}')
    } catch {
      storedDetails = {}
    }

    // ─── Build response from DB data ────────────────────────────────────
    const result: any = {
      success: true,
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      total: order.total,
      customerName: order.customerName,
      invoiceNumber: order.invoiceNumber,
      // Stored payment details
      checkoutId: order.cloverCheckoutId || storedDetails.checkoutId || null,
      cloverOrderId: storedDetails.cloverOrderId || null,
      paymentId: order.cloverPaymentId || storedDetails.paymentId || null,
      checkoutStatus: storedDetails.checkoutStatus || null,
      declineReason: storedDetails.declineReason || null,
      noPaymentReason: storedDetails.noPaymentReason || null,
      customerMessage: storedDetails.customerMessage || null,
      errorCode: storedDetails.errorCode || null,
      errorMessage: storedDetails.errorMessage || null,
      // Detailed payment info
      paymentResult: storedDetails.paymentResult || null,
      resultInfo: storedDetails.resultInfo || null,
      authCode: storedDetails.authCode || null,
      authStatus: storedDetails.authStatus || null,
      gatewayResponseCode: storedDetails.gatewayResponseCode || null,
      gatewayResponseMessage: storedDetails.gatewayResponseMessage || null,
      processorResponseCode: storedDetails.processorResponseCode || null,
      processorResponseMessage: storedDetails.processorResponseMessage || null,
      cardType: storedDetails.cardType || null,
      last4: storedDetails.last4 || null,
      amount: storedDetails.amount || null,
      traceId: storedDetails.traceId || null,
      // Raw Clover responses
      rawCheckout: storedDetails.rawCheckout || null,
      rawPayment: storedDetails.rawPayment || null,
      rawOrder: storedDetails.rawOrder || null,
    }

    // ─── If order is still processing, try a fresh Clover API lookup ───
    if (
      order.paymentStatus === 'processing' &&
      order.cloverCheckoutId &&
      !storedDetails.declineReason
    ) {
      if (process.env.CLOVER_DEBUG === 'true') {
        console.log(`[Checkout Status] Order ${orderId} still processing — fetching fresh status from Clover`)
      }

      const freshStatus = await getCheckoutStatus(order.cloverCheckoutId)

      if (freshStatus.paid) {
        // Payment confirmed! Update DB
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            status: 'confirmed',
            cloverPaymentId: freshStatus.payment?.paymentId || null,
            paymentDetails: JSON.stringify({
              ...storedDetails,
              checkoutId: freshStatus.checkoutId,
              checkoutStatus: freshStatus.checkoutStatus,
              paid: true,
              cloverOrderId: freshStatus.cloverOrderId || null,
              paymentId: freshStatus.payment?.paymentId || null,
              paymentResult: freshStatus.payment?.result || null,
              resultInfo: freshStatus.payment?.resultInfo || null,
              authCode: freshStatus.payment?.authCode || null,
              authStatus: freshStatus.payment?.authStatus || null,
              gatewayResponseCode: freshStatus.payment?.gatewayResponseCode || null,
              gatewayResponseMessage: freshStatus.payment?.gatewayResponseMessage || null,
              processorResponseCode: freshStatus.payment?.processorResponseCode || null,
              processorResponseMessage: freshStatus.payment?.processorResponseMessage || null,
              cardType: freshStatus.payment?.cardType || null,
              last4: freshStatus.payment?.last4 || null,
              declineReason: null,
              customerMessage: freshStatus.customerMessage,
              timestamp: new Date().toISOString(),
              rawCheckout: freshStatus.rawCheckout || null,
              rawPayment: freshStatus.rawPayment || null,
              rawOrder: freshStatus.rawOrder || null,
            }),
          },
        })

        // Update response
        result.paymentStatus = 'paid'
        result.orderStatus = 'confirmed'
        result.cloverOrderId = freshStatus.cloverOrderId || null
        result.paymentId = freshStatus.payment?.paymentId || null
        result.authCode = freshStatus.payment?.authCode || null
        result.authStatus = freshStatus.payment?.authStatus || null
        result.cardType = freshStatus.payment?.cardType || null
        result.last4 = freshStatus.payment?.last4 || null
        result.customerMessage = freshStatus.customerMessage
        result.declineReason = null
      } else if (!freshStatus.paid && freshStatus.declineReason) {
        // Payment failed — update DB with details
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'failed',
            status: 'cancelled',
            paymentDetails: JSON.stringify({
              ...storedDetails,
              checkoutId: freshStatus.checkoutId,
              checkoutStatus: freshStatus.checkoutStatus,
              paid: false,
              cloverOrderId: freshStatus.cloverOrderId || null,
              paymentResult: freshStatus.payment?.result || null,
              resultInfo: freshStatus.payment?.resultInfo || null,
              authCode: freshStatus.payment?.authCode || null,
              authStatus: freshStatus.payment?.authStatus || null,
              gatewayResponseCode: freshStatus.payment?.gatewayResponseCode || null,
              gatewayResponseMessage: freshStatus.payment?.gatewayResponseMessage || null,
              processorResponseCode: freshStatus.payment?.processorResponseCode || null,
              processorResponseMessage: freshStatus.payment?.processorResponseMessage || null,
              declineReason: freshStatus.declineReason,
              noPaymentReason: freshStatus.noPaymentReason || null,
              errorCode: freshStatus.errorCode || null,
              errorMessage: freshStatus.errorMessage || null,
              customerMessage: freshStatus.customerMessage,
              timestamp: new Date().toISOString(),
              rawCheckout: freshStatus.rawCheckout || null,
              rawPayment: freshStatus.rawPayment || null,
              rawOrder: freshStatus.rawOrder || null,
            }),
          },
        })

        result.paymentStatus = 'failed'
        result.orderStatus = 'cancelled'
        result.cloverOrderId = freshStatus.cloverOrderId || null
        result.declineReason = freshStatus.declineReason
        result.noPaymentReason = freshStatus.noPaymentReason || null
        result.customerMessage = freshStatus.customerMessage
        result.paymentResult = freshStatus.payment?.result || null
        result.resultInfo = freshStatus.payment?.resultInfo || null
        result.gatewayResponseCode = freshStatus.payment?.gatewayResponseCode || null
        result.gatewayResponseMessage = freshStatus.payment?.gatewayResponseMessage || null
        result.processorResponseCode = freshStatus.payment?.processorResponseCode || null
        result.processorResponseMessage = freshStatus.payment?.processorResponseMessage || null
        result.errorCode = freshStatus.errorCode || null
        result.errorMessage = freshStatus.errorMessage || null
        result.rawCheckout = freshStatus.rawCheckout || null
        result.rawPayment = freshStatus.rawPayment || null
        result.rawOrder = freshStatus.rawOrder || null
      }

      // Merge fresh Clover data into response
      result.freshLookup = true
      result.checkoutStatus = freshStatus.checkoutStatus
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Checkout Status Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve checkout status' },
      { status: 500 }
    )
  }
}
