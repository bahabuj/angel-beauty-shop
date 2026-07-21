import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CLOVER_CONFIG, getCheckoutStatus, verifyCloverCheckout, type CloverWebhookEvent } from '@/lib/clover'
import { getSiteUrl } from '@/lib/utils'

// ─── Debug Logging ────────────────────────────────────────────────────────────
// Verbose webhook-flow logs are gated behind CLOVER_DEBUG so they never fire
// in production. `console.error` and `console.warn` remain ungated.
// ─────────────────────────────────────────────────────────────────────────────

const CLOVER_DEBUG = process.env.CLOVER_DEBUG === 'true'

/** Debug-only logger — only fires when CLOVER_DEBUG=true. */
function debug(...args: unknown[]): void {
  if (CLOVER_DEBUG) console.log(...args)
}

// ─── POST /api/clover/webhook ────────────────────────────────────────────────
//
// Receives webhook events from Clover and updates order/payment status
// accordingly.
//
// Handled event types:
//   CHECKOUT_COMPLETED  — Verify with Clover API, mark order as paid
//   CHECKOUT_EXPIRED    — Mark order payment as failed
//   PAYMENT_CREATED     — Payment was attempted (may be success or decline)
//   PAYMENT_REFUNDED    — Mark order as refunded
//   PAYMENT_UPDATED     — Update payment status from Clover data
//
// IMPORTANT: Always returns 200 to acknowledge receipt. Clover retries
// webhooks that don't receive a 2xx response.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: CloverWebhookEvent = await request.json()

    debug(
      `[Clover Webhook] Received event — type: ${body.type}, id: ${body.id}`
    )

    switch (body.type) {
      // ─── Checkout Completed ────────────────────────────────────────────
      case 'CHECKOUT_COMPLETED': {
        const checkoutId = body.data.checkoutId || body.data.orderId
        if (!checkoutId) {
          console.warn('[Clover Webhook] CHECKOUT_COMPLETED — missing checkoutId')
          break
        }

        // Verify with Clover API before marking as paid
        const result = await verifyCloverCheckout(checkoutId)

        if (result.verified && result.paid) {
          // Find order by cloverCheckoutId
          const order = await db.order.findFirst({
            where: { cloverCheckoutId: checkoutId },
          })

          if (order) {
            await db.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'paid',
                status: 'confirmed',
                cloverPaymentId: result.checkout?.paymentId || body.data.paymentId || null,
              },
            })
            debug(
              `[Clover Webhook] Order ${order.id} marked as paid via CHECKOUT_COMPLETED`
            )

            // Trigger invoice generation
            try {
              const siteUrl = getSiteUrl()
              fetch(`${siteUrl}/api/invoice/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id, sendEmail: false }),
              }).catch(() => {})
            } catch {
              // Non-blocking
            }
          } else {
            console.warn(
              `[Clover Webhook] No order found for checkoutId ${checkoutId}`
            )
          }
        } else {
          console.warn(
            `[Clover Webhook] CHECKOUT_COMPLETED but verification failed or not paid — checkoutId: ${checkoutId}, error: ${result.error || 'not paid'}`
          )
        }
        break
      }

      // ─── Payment Created (may be SUCCESS or DECLINE) ────────────────────
      case 'PAYMENT_CREATED': {
        const paymentId = body.data.paymentId
        const paymentStatus = body.data.status
        if (!paymentId) {
          console.warn('[Clover Webhook] PAYMENT_CREATED — missing paymentId')
          break
        }

        debug(`[Clover Webhook] PAYMENT_CREATED — paymentId: ${paymentId}, status: ${paymentStatus || 'N/A'}`)

        // Try to find the order by paymentId or by Clover checkout
        const orderByPayment = await db.order.findFirst({
          where: { cloverPaymentId: paymentId },
        })

        if (orderByPayment) {
          // Already have this payment linked to an order
          if (paymentStatus === 'FAILED' || paymentStatus === 'DECLINED') {
            console.warn(`[Clover Webhook] Payment ${paymentId} was DECLINED for order ${orderByPayment.id}`)

            // Retrieve full payment details to get the decline reason
            if (orderByPayment.cloverCheckoutId && CLOVER_CONFIG.canVerifyPayments) {
              const statusResult = await getCheckoutStatus(orderByPayment.cloverCheckoutId)
              await db.order.update({
                where: { id: orderByPayment.id },
                data: {
                  paymentStatus: 'failed',
                  status: 'cancelled',
                  paymentDetails: JSON.stringify({
                    checkoutId: statusResult.checkoutId,
                    checkoutStatus: statusResult.checkoutStatus,
                    paid: false,
                    paymentId: statusResult.payment?.paymentId || paymentId,
                    paymentResult: statusResult.payment?.result || paymentStatus,
                    resultInfo: statusResult.payment?.resultInfo || null,
                    declineReason: statusResult.declineReason || null,
                    noPaymentReason: statusResult.noPaymentReason || null,
                    customerMessage: statusResult.customerMessage,
                    gatewayResponseCode: statusResult.payment?.gatewayResponseCode || null,
                    gatewayResponseMessage: statusResult.payment?.gatewayResponseMessage || null,
                    processorResponseCode: statusResult.payment?.processorResponseCode || null,
                    processorResponseMessage: statusResult.payment?.processorResponseMessage || null,
                    cardType: statusResult.payment?.cardType || null,
                    last4: statusResult.payment?.last4 || null,
                    source: 'webhook:PAYMENT_CREATED',
                    timestamp: new Date().toISOString(),
                  }),
                },
              })
            } else {
              await db.order.update({
                where: { id: orderByPayment.id },
                data: {
                  paymentStatus: 'failed',
                  status: 'cancelled',
                },
              })
            }
          }
        } else {
          // Payment not yet linked — try to find order by checkoutId
          const checkoutId = body.data.checkoutId || body.data.orderId
          if (checkoutId) {
            const orderByCheckout = await db.order.findFirst({
              where: { cloverCheckoutId: checkoutId },
            })
            if (orderByCheckout) {
              await db.order.update({
                where: { id: orderByCheckout.id },
                data: {
                  cloverPaymentId: paymentId,
                },
              })
              debug(`[Clover Webhook] Linked payment ${paymentId} to order ${orderByCheckout.id}`)
            }
          }
        }
        break
      }

      // ─── Checkout Expired ──────────────────────────────────────────────
      case 'CHECKOUT_EXPIRED': {
        const checkoutId = body.data.checkoutId || body.data.orderId
        if (!checkoutId) {
          console.warn('[Clover Webhook] CHECKOUT_EXPIRED — missing checkoutId')
          break
        }

        const order = await db.order.findFirst({
          where: { cloverCheckoutId: checkoutId },
        })

        if (order) {
          // Only mark as failed if the order is still in processing/pending
          if (order.paymentStatus === 'processing' || order.paymentStatus === 'pending') {
            await db.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'failed',
                status: 'cancelled',
                paymentDetails: JSON.stringify({
                  checkoutId,
                  noPaymentReason: 'CHECKOUT_EXPIRED',
                  customerMessage: 'Checkout session expired — customer did not complete payment within the time limit.',
                  source: 'webhook:CHECKOUT_EXPIRED',
                  timestamp: new Date().toISOString(),
                }),
              },
            })
            debug(
              `[Clover Webhook] Order ${order.id} marked as failed via CHECKOUT_EXPIRED`
            )
          }
        } else {
          console.warn(
            `[Clover Webhook] No order found for expired checkoutId ${checkoutId}`
          )
        }
        break
      }

      // ─── Payment Refunded ─────────────────────────────────────────────
      case 'PAYMENT_REFUNDED': {
        const paymentId = body.data.paymentId
        if (!paymentId) {
          console.warn('[Clover Webhook] PAYMENT_REFUNDED — missing paymentId')
          break
        }

        const order = await db.order.findFirst({
          where: { cloverPaymentId: paymentId },
        })

        if (order) {
          await db.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'refunded',
              status: 'refunded',
            },
          })
          debug(
            `[Clover Webhook] Order ${order.id} marked as refunded via PAYMENT_REFUNDED`
          )
        } else {
          console.warn(
            `[Clover Webhook] No order found for refunded paymentId ${paymentId}`
          )
        }
        break
      }

      // ─── Payment Updated ──────────────────────────────────────────────
      case 'PAYMENT_UPDATED': {
        const paymentId = body.data.paymentId
        const newStatus = body.data.status
        if (!paymentId || !newStatus) {
          console.warn('[Clover Webhook] PAYMENT_UPDATED — missing paymentId or status')
          break
        }

        const order = await db.order.findFirst({
          where: { cloverPaymentId: paymentId },
        })

        if (order) {
          // Map Clover payment status to our internal payment status
          const statusMap: Record<string, string> = {
            'AUTHORIZED': 'processing',
            'CAPTURED': 'paid',
            'VOIDED': 'cancelled',
            'REFUNDED': 'refunded',
            'PARTIAL_REFUND': 'partially_refunded',
            'FAILED': 'failed',
            'DECLINED': 'failed',
          }

          const mappedStatus = statusMap[newStatus]
          if (mappedStatus) {
            const updateData: any = {
              paymentStatus: mappedStatus,
            }
            // If payment failed, also update order status
            if (mappedStatus === 'failed') {
              updateData.status = 'cancelled'
            }

            await db.order.update({
              where: { id: order.id },
              data: updateData,
            })
            debug(
              `[Clover Webhook] Order ${order.id} paymentStatus updated to ${mappedStatus} via PAYMENT_UPDATED`
            )
          } else {
            console.warn(
              `[Clover Webhook] Unmapped Clover status "${newStatus}" for order ${order.id}`
            )
          }
        } else {
          console.warn(
            `[Clover Webhook] No order found for updated paymentId ${paymentId}`
          )
        }
        break
      }

      default:
        debug(`[Clover Webhook] Unhandled event type: ${body.type}`)
    }
  } catch (error) {
    console.error('[Clover Webhook Error]', error)
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true })
}
