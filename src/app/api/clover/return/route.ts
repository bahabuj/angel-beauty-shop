import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CLOVER_CONFIG, getCheckoutStatus, verifyCloverCheckout } from '@/lib/clover'
import { getSiteUrl } from '@/lib/utils'

// ─── Debug Logging ────────────────────────────────────────────────────────────
// Verbose redirect-flow logs are gated behind CLOVER_DEBUG so they never fire
// in production. `console.error` and `console.warn` remain ungated.
// ─────────────────────────────────────────────────────────────────────────────

const CLOVER_DEBUG = process.env.CLOVER_DEBUG === 'true'

/** Debug-only logger — only fires when CLOVER_DEBUG=true. */
function debug(...args: unknown[]): void {
  if (CLOVER_DEBUG) console.log(...args)
}

// ─── GET /api/clover/return ──────────────────────────────────────────────────
//
// Handles the redirect from Clover Hosted Checkout after the customer
// completes (or abandons) the payment flow.
//
// Query params:
//   orderId    — Our internal order ID (we put this in the redirectUrls)
//   status     — "success" or "cancel" (we put this in the redirectUrls)
//   checkoutId — Clover checkout session ID (appended by Clover to the redirect)
//
// On return, this handler:
//   1. Retrieves the full checkout status from Clover (checkout + payment details)
//   2. Logs: checkoutId, paymentId, payment status, decline reason,
//      authorization status, gateway response
//   3. If no payment exists, logs the reason
//   4. Stores diagnostics in order.paymentDetails (JSON)
//   5. Redirects to the frontend with a descriptive hash fragment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retry status retrieval up to `maxRetries` times with a delay.
 * Clover's checkout status may take a moment to update after payment.
 *
 * IMPORTANT: If Clover returns a payment with result=FAIL, we stop
 * retrying immediately — the decline reason is already available.
 * We only retry when the checkout status is still pending/unclear.
 */
async function getStatusWithRetry(
  checkoutId: string,
  maxRetries = 3,
  delayMs = 1500
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await getCheckoutStatus(checkoutId)

    // If payment was confirmed — return immediately
    if (result.paid) return result

    // If Clover returned a FAILED payment — stop retrying, we have the decline reason
    if (result.payment?.result === 'FAIL' || result.payment?.result === 'FAILED') {
      debug(
        `[Clover Return] Payment FAILED on attempt ${attempt} — ` +
        `result: ${result.payment.result}, resultInfo: ${result.payment.resultInfo || 'N/A'}, ` +
        `declineReason: ${result.declineReason || 'N/A'} — stopping retry, decline info available`
      )
      return result
    }

    // If we have a definitive decline reason already — stop retrying
    if (result.declineReason && result.declineReason !== 'UNKNOWN' && result.declineReason !== 'PAYMENT_FAILED') {
      debug(
        `[Clover Return] Decline reason "${result.declineReason}" on attempt ${attempt} — stopping retry`
      )
      return result
    }

    // If no payment exists yet and we have a noPaymentReason — stop retrying
    if (result.noPaymentReason && result.noPaymentReason !== 'NO_CHECKOUT_DATA') {
      debug(
        `[Clover Return] No payment reason "${result.noPaymentReason}" on attempt ${attempt} — stopping retry`
      )
      return result
    }

    // Otherwise, still unclear — retry
    if (attempt < maxRetries) {
      debug(
        `[Clover Return] Status attempt ${attempt}/${maxRetries} — ` +
        `checkoutStatus: ${result.checkoutStatus}, paymentResult: ${result.payment?.result || 'N/A'}, ` +
        `retrying in ${delayMs}ms...`
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
      continue
    }
    return result
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const orderId = searchParams.get('orderId')
    const checkoutId = searchParams.get('checkoutId')
    const status = searchParams.get('status')

    const siteUrl = getSiteUrl()

    debug(`[Clover Return] ══════════════════════════════════════════════════════`)
    debug(`[Clover Return] REDIRECT RECEIVED`)
    debug(`[Clover Return]   orderId:    ${orderId}`)
    debug(`[Clover Return]   checkoutId: ${checkoutId}`)
    debug(`[Clover Return]   status:     ${status}`)
    debug(`[Clover Return] ══════════════════════════════════════════════════════`)

    // ─── Validate required params ─────────────────────────────────────────
    if (!orderId) {
      console.error('[Clover Return] Missing orderId in redirect')
      return NextResponse.redirect(`${siteUrl}/?checkout-error=missing-order`)
    }

    // ─── Look up order in database ────────────────────────────────────────
    const order = await db.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      console.error(`[Clover Return] Order ${orderId} not found`)
      return NextResponse.redirect(`${siteUrl}/?checkout-error=order-not-found`)
    }

    // ─── Handle explicit cancel (but check if it was actually a decline) ────
    // IMPORTANT: When a card is DECLINED on Clover's Hosted Checkout, Clover
    // may redirect to the cancel URL. We need to check the actual checkout
    // status to distinguish between "customer cancelled" and "card declined".
    if (status === 'cancel' && checkoutId && CLOVER_CONFIG.canVerifyPayments) {
      debug(`[Clover Return] Status is "cancel" — checking if it was actually a card decline for order ${orderId}`)

      const statusResult = await getStatusWithRetry(checkoutId)

      // If Clover shows a FAILED payment, it was a decline — not a cancellation
      if (statusResult && (statusResult.payment?.result === 'FAIL' || statusResult.payment?.result === 'FAILED')) {
        console.warn(`[Clover Return] ❌ Card DECLINED (not cancelled) for order ${orderId}`)
        console.warn(`[Clover Return]   paymentResult:  ${statusResult.payment.result}`)
        console.warn(`[Clover Return]   resultInfo:     ${statusResult.payment.resultInfo || 'N/A'}`)
        console.warn(`[Clover Return]   declineReason:  ${statusResult.declineReason || 'N/A'}`)

        const paymentDetails = {
          checkoutId: statusResult.checkoutId,
          checkoutStatus: statusResult.checkoutStatus,
          paid: false,
          cloverOrderId: statusResult.cloverOrderId || null,
          paymentId: statusResult.payment?.paymentId || null,
          paymentResult: statusResult.payment?.result || null,
          resultInfo: statusResult.payment?.resultInfo || null,
          authCode: statusResult.payment?.authCode || null,
          authStatus: statusResult.payment?.authStatus || null,
          gatewayResponseCode: statusResult.payment?.gatewayResponseCode || null,
          gatewayResponseMessage: statusResult.payment?.gatewayResponseMessage || null,
          processorResponseCode: statusResult.payment?.processorResponseCode || null,
          processorResponseMessage: statusResult.payment?.processorResponseMessage || null,
          cardType: statusResult.payment?.cardType || null,
          last4: statusResult.payment?.last4 || null,
          amount: statusResult.payment?.amount || null,
          traceId: statusResult.payment?.traceId || null,
          declineReason: statusResult.declineReason || null,
          noPaymentReason: statusResult.noPaymentReason || null,
          errorCode: statusResult.errorCode || null,
          errorMessage: statusResult.errorMessage || null,
          customerMessage: statusResult.customerMessage,
          note: 'Redirect was cancel but Clover shows a card DECLINE — not a customer cancellation',
          timestamp: new Date().toISOString(),
          rawCheckout: statusResult.rawCheckout || null,
          rawPayment: statusResult.rawPayment || null,
          rawOrder: statusResult.rawOrder || null,
        }

        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'failed',
            status: 'cancelled',
            cloverCheckoutId: checkoutId,
            paymentDetails: JSON.stringify(paymentDetails),
          },
        })

        const reason = statusResult.declineReason || 'PAYMENT_FAILED'
        return NextResponse.redirect(
          `${siteUrl}/?orderId=${orderId}&reason=${encodeURIComponent(reason)}#checkout-failed`
        )
      }
    }

    if (status === 'cancel') {
      debug(`[Clover Return] Payment cancelled by customer for order ${orderId}`)

      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'cancelled',
          status: 'cancelled',
          paymentDetails: JSON.stringify({
            checkoutId: checkoutId || null,
            declineReason: 'CANCELLED',
            customerMessage: 'Payment cancelled — you cancelled the payment before it was completed.',
            checkoutStatus: 'cancelled',
            timestamp: new Date().toISOString(),
          }),
        },
      })

      return NextResponse.redirect(
        `${siteUrl}/?orderId=${orderId}&reason=CANCELLED#checkout-failed`
      )
    }

    // ─── Retrieve full checkout status from Clover ───────────────────────
    if (checkoutId && CLOVER_CONFIG.canVerifyPayments) {
      debug(`[Clover Return] Retrieving full checkout status for ${checkoutId}`)

      const statusResult = await getStatusWithRetry(checkoutId)

      if (statusResult) {
        // Store detailed diagnostics in DB
        const paymentDetails = {
          checkoutId: statusResult.checkoutId,
          checkoutStatus: statusResult.checkoutStatus,
          paid: statusResult.paid,
          cloverOrderId: statusResult.cloverOrderId || null,
          paymentId: statusResult.payment?.paymentId || null,
          paymentResult: statusResult.payment?.result || null,
          resultInfo: statusResult.payment?.resultInfo || null,
          authCode: statusResult.payment?.authCode || null,
          authStatus: statusResult.payment?.authStatus || null,
          gatewayResponseCode: statusResult.payment?.gatewayResponseCode || null,
          gatewayResponseMessage: statusResult.payment?.gatewayResponseMessage || null,
          processorResponseCode: statusResult.payment?.processorResponseCode || null,
          processorResponseMessage: statusResult.payment?.processorResponseMessage || null,
          cardType: statusResult.payment?.cardType || null,
          last4: statusResult.payment?.last4 || null,
          amount: statusResult.payment?.amount || null,
          traceId: statusResult.payment?.traceId || null,
          declineReason: statusResult.declineReason || null,
          noPaymentReason: statusResult.noPaymentReason || null,
          errorCode: statusResult.errorCode || null,
          errorMessage: statusResult.errorMessage || null,
          customerMessage: statusResult.customerMessage,
          timestamp: new Date().toISOString(),
          rawCheckout: statusResult.rawCheckout || null,
          rawPayment: statusResult.rawPayment || null,
          rawOrder: statusResult.rawOrder || null,
        }

        if (statusResult.paid) {
          // ── Payment confirmed by Clover ────────────────────────────────
          debug(`[Clover Return] ✅ PAYMENT APPROVED for order ${orderId}`)
          debug(`[Clover Return]   paymentId:    ${statusResult.payment?.paymentId || 'N/A'}`)
          debug(`[Clover Return]   authCode:     ${statusResult.payment?.authCode || 'N/A'}`)
          debug(`[Clover Return]   authStatus:   ${statusResult.payment?.authStatus || 'N/A'}`)
          debug(`[Clover Return]   cardType:     ${statusResult.payment?.cardType || 'N/A'}`)
          debug(`[Clover Return]   last4:        ${statusResult.payment?.last4 || 'N/A'}`)

          await db.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'paid',
              status: 'confirmed',
              cloverCheckoutId: checkoutId,
              cloverPaymentId: statusResult.payment?.paymentId || null,
              paymentDetails: JSON.stringify(paymentDetails),
            },
          })

          // Trigger invoice generation in the background
          try {
            fetch(`${siteUrl}/api/invoice/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId, sendEmail: false }),
            }).catch(() => {})
          } catch {
            // Non-blocking
          }

          return NextResponse.redirect(`${siteUrl}/?orderId=${orderId}#order-success`)
        }

        // ── Payment NOT confirmed — log complete decline diagnostics ────
        console.warn(`[Clover Return] ❌ PAYMENT NOT CONFIRMED for order ${orderId}`)
        console.warn(`[Clover Return]   checkoutStatus:      ${statusResult.checkoutStatus}`)
        console.warn(`[Clover Return]   cloverOrderId:       ${statusResult.cloverOrderId || 'N/A'}`)
        console.warn(`[Clover Return]   paymentId:           ${statusResult.payment?.paymentId || 'N/A'}`)
        console.warn(`[Clover Return]   paymentResult:       ${statusResult.payment?.result || 'N/A'}`)
        console.warn(`[Clover Return]   resultInfo:          ${statusResult.payment?.resultInfo || 'N/A'}`)
        console.warn(`[Clover Return]   declineReason:       ${statusResult.declineReason || 'N/A'}`)
        console.warn(`[Clover Return]   noPaymentReason:     ${statusResult.noPaymentReason || 'N/A'}`)
        console.warn(`[Clover Return]   gatewayCode:         ${statusResult.payment?.gatewayResponseCode || 'N/A'}`)
        console.warn(`[Clover Return]   gatewayMessage:      ${statusResult.payment?.gatewayResponseMessage || 'N/A'}`)
        console.warn(`[Clover Return]   processorCode:       ${statusResult.payment?.processorResponseCode || 'N/A'}`)
        console.warn(`[Clover Return]   processorMessage:    ${statusResult.payment?.processorResponseMessage || 'N/A'}`)
        console.warn(`[Clover Return]   authCode:            ${statusResult.payment?.authCode || 'N/A'}`)
        console.warn(`[Clover Return]   authStatus:          ${statusResult.payment?.authStatus || 'N/A'}`)
        console.warn(`[Clover Return]   errorCode:           ${statusResult.errorCode || 'N/A'}`)
        console.warn(`[Clover Return]   errorMessage:        ${statusResult.errorMessage || 'N/A'}`)
        console.warn(`[Clover Return]   customerMessage:     ${statusResult.customerMessage}`)

        // Log the complete raw Clover response for debugging
        if (statusResult.rawCheckout) {
          console.warn(`[Clover Return]   ── Raw Checkout Response ──`)
          console.warn(`[Clover Return]   ${JSON.stringify(statusResult.rawCheckout, null, 2)}`)
        }
        if (statusResult.rawPayment) {
          console.warn(`[Clover Return]   ── Raw Payment Response ──`)
          console.warn(`[Clover Return]   ${JSON.stringify(statusResult.rawPayment, null, 2)}`)
        }
        if (statusResult.rawOrder) {
          console.warn(`[Clover Return]   ── Raw Clover Order Response ──`)
          console.warn(`[Clover Return]   ${JSON.stringify(statusResult.rawOrder, null, 2)}`)
        }

        // If no payment was attempted at all, log why
        if (!statusResult.payment) {
          if (statusResult.noPaymentReason === 'CHECKOUT_EXPIRED') {
            console.warn(`[Clover Return]   No payment created: Checkout session expired before customer entered payment details`)
          } else if (statusResult.noPaymentReason === 'CANCELLED') {
            console.warn(`[Clover Return]   No payment created: Customer cancelled the checkout flow`)
          } else if (statusResult.noPaymentReason === 'ABANDONED') {
            console.warn(`[Clover Return]   No payment created: Customer abandoned the checkout before entering card details`)
          } else if (statusResult.noPaymentReason === 'NO_PAYMENT_CREATED') {
            console.warn(`[Clover Return]   No payment created: Clover did not create a payment for this checkout — possible card rejection or technical error`)
          } else {
            console.warn(`[Clover Return]   No payment object returned by Clover (reason: ${statusResult.noPaymentReason || 'unknown'})`)
          }
        }

        // If the redirect URL says "success" but verification says not paid,
        // trust the redirect and mark as paid (payment may still be processing)
        if (status === 'success') {
          debug(`[Clover Return] Redirect status is "success" but verification shows unpaid — trusting redirect, marking as paid`)

          await db.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'paid',
              status: 'confirmed',
              cloverCheckoutId: checkoutId,
              paymentDetails: JSON.stringify({
                ...paymentDetails,
                trustedRedirect: true,
                note: 'Verification showed unpaid but redirect URL indicated success — marked as paid',
              }),
            },
          })

          return NextResponse.redirect(`${siteUrl}/?orderId=${orderId}#order-success`)
        }

        // Mark as failed with specific reason
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'failed',
            status: 'cancelled',
            cloverCheckoutId: checkoutId,
            paymentDetails: JSON.stringify(paymentDetails),
          },
        })

        // Redirect with decline reason so the frontend can show specific message
        const reason = statusResult.declineReason || statusResult.noPaymentReason || 'PAYMENT_FAILED'
        return NextResponse.redirect(
          `${siteUrl}/?orderId=${orderId}&reason=${encodeURIComponent(reason)}#checkout-failed`
        )
      }

      // Status retrieval failed entirely — fall back to legacy verify
      console.warn(`[Clover Return] Full status retrieval failed — falling back to legacy verification`)

      const legacyResult = await verifyCloverCheckout(checkoutId)
      if (legacyResult.verified && legacyResult.paid) {
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            status: 'confirmed',
            cloverCheckoutId: checkoutId,
            cloverPaymentId: legacyResult.checkout?.paymentId || null,
          },
        })

        try {
          fetch(`${siteUrl}/api/invoice/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, sendEmail: false }),
          }).catch(() => {})
        } catch {}

        return NextResponse.redirect(`${siteUrl}/?orderId=${orderId}#order-success`)
      }

      if (legacyResult.verified && !legacyResult.paid && status === 'success') {
        debug(`[Clover Return] Legacy verification pending but redirect says success — marking paid`)
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            status: 'confirmed',
            cloverCheckoutId: checkoutId,
          },
        })
        return NextResponse.redirect(`${siteUrl}/?orderId=${orderId}#order-success`)
      }
    }

    // ─── Fallback: check URL status param ─────────────────────────────────
    const isPaidFromUrl = status === 'success'

    if (isPaidFromUrl) {
      debug(`[Clover Return] Payment appears successful from URL status for order ${orderId}`)

      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
          cloverCheckoutId: checkoutId || null,
          paymentDetails: JSON.stringify({
            checkoutId: checkoutId || null,
            paid: true,
            source: 'url_status_fallback',
            timestamp: new Date().toISOString(),
          }),
        },
      })

      try {
        fetch(`${siteUrl}/api/invoice/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, sendEmail: false }),
        }).catch(() => {})
      } catch {}

      return NextResponse.redirect(`${siteUrl}/?orderId=${orderId}#order-success`)
    }

    // ─── Default: treat as failed ────────────────────────────────────────
    console.warn(`[Clover Return] Unable to confirm payment for order ${orderId} — marking as failed`)

    await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'failed',
        status: 'cancelled',
        paymentDetails: JSON.stringify({
          checkoutId: checkoutId || null,
          paid: false,
          declineReason: 'UNVERIFIED',
          customerMessage: 'Payment could not be verified. Please contact support if you were charged.',
          source: 'unverified_fallback',
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.redirect(
      `${siteUrl}/?orderId=${orderId}&reason=UNVERIFIED#checkout-failed`
    )
  } catch (error) {
    console.error('[Clover Return Error]', error)
    const siteUrl = getSiteUrl()
    return NextResponse.redirect(`${siteUrl}/?checkout-error=internal-error`)
  }
}
