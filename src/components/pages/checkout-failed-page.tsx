'use client'

import { useState, useEffect } from 'react'
import { useNavStore } from '@/store/nav-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import {
  XCircle, ShoppingCart, ArrowLeft, Store, AlertTriangle,
  CreditCard, Ban, Clock, ShieldAlert, Loader2, RefreshCw,
  Info, ChevronDown, ChevronUp, FileText, AlertCircle
} from 'lucide-react'

// ─── Reason code to display configuration ──────────────────────────────────
// Maps decline reason codes to specific icons, colors, titles and messages.
const REASON_CONFIG: Record<string, {
  icon: typeof CreditCard
  color: string
  bgColor: string
  borderColor: string
  title: string
  message: string
}> = {
  INSUFFICIENT_FUNDS: {
    icon: CreditCard,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    title: 'Insufficient Funds',
    message: 'Your card does not have enough balance for this transaction. Please try a different card or add funds to your account.',
  },
  CARD_DECLINED: {
    icon: Ban,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    title: 'Card Declined',
    message: 'Your bank declined this transaction. Please try a different card or contact your bank for more information.',
  },
  DO_NOT_HONOR: {
    icon: Ban,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    title: 'Card Declined',
    message: 'Your bank did not approve this transaction. This is a common decline reason — please try a different card or contact your bank.',
  },
  CARD_EXPIRED: {
    icon: CreditCard,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    title: 'Card Expired',
    message: 'The card you used has expired. Please try a different card with a valid expiration date.',
  },
  INVALID_CARD: {
    icon: CreditCard,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    title: 'Invalid Card Number',
    message: 'The card number you entered appears to be invalid. Please check your card details and try again.',
  },
  INVALID_CVV: {
    icon: ShieldAlert,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    title: 'Invalid Security Code',
    message: 'The CVV/CVC security code you entered is incorrect. Please check the 3-digit code on the back of your card and try again.',
  },
  LIMIT_EXCEEDED: {
    icon: CreditCard,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    title: 'Transaction Limit Exceeded',
    message: 'This transaction exceeds your card limit. Please try a smaller amount or a different card.',
  },
  FRAUD_SUSPECTED: {
    icon: ShieldAlert,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    title: 'Transaction Flagged',
    message: 'This transaction was flagged as potentially fraudulent by your bank. Please contact your bank or try a different payment method.',
  },
  AUTH_FAILED: {
    icon: ShieldAlert,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    title: 'Authentication Failed',
    message: 'The card authentication could not be verified. This may be due to 3D Secure verification failure. Please try again.',
  },
  CANCELLED: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    title: 'Payment Cancelled',
    message: 'You cancelled the payment before it was completed. No charge has been made to your card.',
  },
  CHECKOUT_EXPIRED: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    title: 'Checkout Session Expired',
    message: 'The payment session expired before completion. This can happen if the checkout page is left idle too long. Please try again.',
  },
  ABANDONED: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    title: 'Payment Not Completed',
    message: 'The checkout was not completed. No payment was attempted — you may have left the payment page before entering card details.',
  },
  NO_PAYMENT_CREATED: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    title: 'Payment Not Created',
    message: 'Clover did not create a payment for this checkout. This can happen if the card was rejected before authorization, or due to a technical issue.',
  },
  TIMEOUT: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    title: 'Payment Timed Out',
    message: 'The payment session expired before completion. This can happen if the checkout page is left idle. Please try again.',
  },
  PAYMENT_FAILED: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
    title: 'Payment Failed',
    message: 'The transaction was not approved. Please try a different payment method or contact your bank.',
  },
  UNVERIFIED: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    title: 'Payment Could Not Be Verified',
    message: 'We were unable to verify your payment status. If you were charged, please contact support with your order number.',
  },
}

const DEFAULT_CONFIG = {
  icon: XCircle,
  color: 'text-red-600',
  bgColor: 'bg-red-100',
  borderColor: 'border-red-200',
  title: 'Payment Not Completed',
  message: 'The transaction could not be finalized. No charge has been made. Please try again or use a different payment method.',
}

interface PaymentDetails {
  checkoutId?: string
  cloverOrderId?: string
  paymentId?: string
  declineReason?: string
  noPaymentReason?: string
  customerMessage?: string
  paymentResult?: string
  resultInfo?: string
  authStatus?: string
  gatewayResponseCode?: string
  gatewayResponseMessage?: string
  processorResponseCode?: string
  processorResponseMessage?: string
  cardType?: string
  last4?: string
  errorCode?: string
  errorMessage?: string
  traceId?: string
  amount?: number
  checkoutStatus?: string
  rawCheckout?: any
  rawPayment?: any
  rawOrder?: any
}

type PagePhase = 'loading' | 'loaded' | 'error'

export default function CheckoutFailedPage() {
  const navigate = useNavStore((s) => s.navigate)

  const [orderId] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('orderId')
  })

  const [reasonCode] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('reason')
  })

  const [phase, setPhase] = useState<PagePhase>(() => orderId ? 'loading' : 'loaded')
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({})
  const [orderInfo, setOrderInfo] = useState<{ total?: number; invoiceNumber?: string } | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [showRawResponse, setShowRawResponse] = useState(false)

  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/clover/checkout-status?orderId=${orderId}`)
        const data = await res.json()

        if (cancelled) return

        if (data.success) {
          setPaymentDetails({
            checkoutId: data.checkoutId,
            cloverOrderId: data.cloverOrderId,
            paymentId: data.paymentId,
            declineReason: data.declineReason || reasonCode || undefined,
            noPaymentReason: data.noPaymentReason || undefined,
            customerMessage: data.customerMessage || undefined,
            paymentResult: data.paymentResult || undefined,
            resultInfo: data.resultInfo || undefined,
            authStatus: data.authStatus || undefined,
            gatewayResponseCode: data.gatewayResponseCode || undefined,
            gatewayResponseMessage: data.gatewayResponseMessage || undefined,
            processorResponseCode: data.processorResponseCode || undefined,
            processorResponseMessage: data.processorResponseMessage || undefined,
            cardType: data.cardType || undefined,
            last4: data.last4 || undefined,
            errorCode: data.errorCode || undefined,
            errorMessage: data.errorMessage || undefined,
            traceId: data.traceId || undefined,
            amount: data.amount || undefined,
            checkoutStatus: data.checkoutStatus || undefined,
            rawCheckout: data.rawCheckout || undefined,
            rawPayment: data.rawPayment || undefined,
            rawOrder: data.rawOrder || undefined,
          })
          setOrderInfo({
            total: data.total,
            invoiceNumber: data.invoiceNumber,
          })
        }
      } catch {
        // Silently fail — we'll use the reasonCode from URL
      }

      if (!cancelled) setPhase('loaded')
    }

    fetchDetails()
    return () => { cancelled = true }
  }, [orderId, reasonCode])

  // Determine the reason config
  const effectiveReason = paymentDetails.declineReason || paymentDetails.noPaymentReason || reasonCode || 'UNKNOWN'
  const config = REASON_CONFIG[effectiveReason] || DEFAULT_CONFIG
  const IconComponent = config.icon

  const handleRefresh = async () => {
    if (!orderId) return
    setPhase('loading')
    try {
      const res = await fetch(`/api/clover/checkout-status?orderId=${orderId}`)
      const data = await res.json()
      if (data.success) {
        setPaymentDetails({
          checkoutId: data.checkoutId,
          cloverOrderId: data.cloverOrderId,
          paymentId: data.paymentId,
          declineReason: data.declineReason || reasonCode || undefined,
          noPaymentReason: data.noPaymentReason || undefined,
          customerMessage: data.customerMessage || undefined,
          paymentResult: data.paymentResult || undefined,
          resultInfo: data.resultInfo || undefined,
          authStatus: data.authStatus || undefined,
          gatewayResponseCode: data.gatewayResponseCode || undefined,
          gatewayResponseMessage: data.gatewayResponseMessage || undefined,
          processorResponseCode: data.processorResponseCode || undefined,
          processorResponseMessage: data.processorResponseMessage || undefined,
          cardType: data.cardType || undefined,
          last4: data.last4 || undefined,
          errorCode: data.errorCode || undefined,
          errorMessage: data.errorMessage || undefined,
          traceId: data.traceId || undefined,
          amount: data.amount || undefined,
          checkoutStatus: data.checkoutStatus || undefined,
          rawCheckout: data.rawCheckout || undefined,
          rawPayment: data.rawPayment || undefined,
          rawOrder: data.rawOrder || undefined,
        })
        // If payment is now confirmed, redirect to success
        if (data.paymentStatus === 'paid') {
          navigate('order-success', { orderId })
          return
        }
        setOrderInfo({
          total: data.total,
          invoiceNumber: data.invoiceNumber,
        })
      }
    } catch {
      // ignore
    }
    setPhase('loaded')
  }

  // Build a summary of the Clover response for the diagnostics section
  const hasDiagnostics = !!(
    paymentDetails.checkoutId ||
    paymentDetails.cloverOrderId ||
    paymentDetails.paymentId ||
    paymentDetails.paymentResult ||
    paymentDetails.resultInfo ||
    paymentDetails.gatewayResponseCode ||
    paymentDetails.gatewayResponseMessage ||
    paymentDetails.processorResponseCode ||
    paymentDetails.processorResponseMessage ||
    paymentDetails.authStatus ||
    paymentDetails.errorCode ||
    paymentDetails.traceId
  )

  // Determine the best raw response to show
  const rawResponse = paymentDetails.rawPayment || paymentDetails.rawCheckout || paymentDetails.rawOrder

  // ─── Loading State ────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-gold" />
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Retrieving payment details...
          </h2>
          <p className="text-muted-foreground text-sm">
            Please wait while we check your payment status with Clover.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        className="max-w-lg w-full mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Status icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="text-center"
        >
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${config.bgColor} flex items-center justify-center`}>
            <IconComponent className={`w-10 h-10 ${config.color}`} />
          </div>
        </motion.div>

        {/* Title & message */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            {config.title}
          </h1>
          <p className="text-muted-foreground">
            {paymentDetails.customerMessage || config.message}
          </p>
        </div>

        {/* Payment details card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-blush/30 mb-4">
            <CardContent className="p-5 space-y-3">
              {/* Order reference */}
              {orderId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Order Reference</span>
                  <span className="font-mono font-medium">{orderInfo?.invoiceNumber || orderId}</span>
                </div>
              )}

              {/* Amount */}
              {orderInfo?.total != null && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">${orderInfo.total.toFixed(2)}</span>
                </div>
              )}

              {/* Divider */}
              {(orderId || orderInfo?.total != null) && hasDiagnostics && (
                <div className="border-t border-border/50 my-2" />
              )}

              {/* Checkout ID */}
              {paymentDetails.checkoutId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Checkout ID</span>
                  <span className="font-mono text-xs">{paymentDetails.checkoutId.length > 24 ? `${paymentDetails.checkoutId.substring(0, 24)}…` : paymentDetails.checkoutId}</span>
                </div>
              )}

              {/* Clover Order ID */}
              {paymentDetails.cloverOrderId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Clover Order ID</span>
                  <span className="font-mono text-xs">{paymentDetails.cloverOrderId.length > 24 ? `${paymentDetails.cloverOrderId.substring(0, 24)}…` : paymentDetails.cloverOrderId}</span>
                </div>
              )}

              {/* Payment ID */}
              {paymentDetails.paymentId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Payment ID</span>
                  <span className="font-mono text-xs">{paymentDetails.paymentId.length > 24 ? `${paymentDetails.paymentId.substring(0, 24)}…` : paymentDetails.paymentId}</span>
                </div>
              )}

              {/* Checkout status from Clover */}
              {paymentDetails.checkoutStatus && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Checkout Status</span>
                  <span className="font-mono text-xs font-medium">{paymentDetails.checkoutStatus}</span>
                </div>
              )}

              {/* Payment result */}
              {paymentDetails.paymentResult && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Payment Result</span>
                  <span className={`font-mono text-xs font-medium ${paymentDetails.paymentResult === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}`}>
                    {paymentDetails.paymentResult}
                  </span>
                </div>
              )}

              {/* Card info */}
              {(paymentDetails.cardType || paymentDetails.last4) && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Card</span>
                  <span className="font-medium">
                    {paymentDetails.cardType || 'Card'} •••• {paymentDetails.last4 || '****'}
                  </span>
                </div>
              )}

              {/* Auth status */}
              {paymentDetails.authStatus && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Authorization</span>
                  <span className="font-medium">{paymentDetails.authStatus}</span>
                </div>
              )}

              {/* Decline reason code */}
              {effectiveReason && effectiveReason !== 'UNKNOWN' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Reason Code</span>
                  <span className="font-mono text-xs font-medium text-red-500">{effectiveReason}</span>
                </div>
              )}

              {/* Trace ID */}
              {paymentDetails.traceId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Trace ID</span>
                  <span className="font-mono text-xs">{paymentDetails.traceId}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Clover Response Details — always show if we have any diagnostic data */}
        {hasDiagnostics && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm font-medium text-gray-700">Clover Response Details</span>
              </div>
              {showDiagnostics ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showDiagnostics && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                {/* Result Info — the primary decline/failure reason from Clover */}
                {paymentDetails.resultInfo && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Result Info</span>
                    <p className="text-sm text-gray-800 bg-white rounded px-3 py-2 border border-gray-200">
                      {paymentDetails.resultInfo}
                    </p>
                  </div>
                )}

                {/* Gateway response */}
                {(paymentDetails.gatewayResponseCode || paymentDetails.gatewayResponseMessage) && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Gateway Response</span>
                    <div className="bg-white rounded px-3 py-2 border border-gray-200 space-y-1">
                      {paymentDetails.gatewayResponseCode && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Code:</span> {paymentDetails.gatewayResponseCode}
                        </p>
                      )}
                      {paymentDetails.gatewayResponseMessage && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Message:</span> {paymentDetails.gatewayResponseMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Processor response */}
                {(paymentDetails.processorResponseCode || paymentDetails.processorResponseMessage) && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">Processor Response</span>
                    <div className="bg-white rounded px-3 py-2 border border-gray-200 space-y-1">
                      {paymentDetails.processorResponseCode && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Code:</span> {paymentDetails.processorResponseCode}
                        </p>
                      )}
                      {paymentDetails.processorResponseMessage && (
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Message:</span> {paymentDetails.processorResponseMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Error code/message from Clover */}
                {(paymentDetails.errorCode || paymentDetails.errorMessage) && (
                  <div>
                    <span className="text-xs font-medium text-red-500 block mb-1">Error</span>
                    <div className="bg-red-50 rounded px-3 py-2 border border-red-200 space-y-1">
                      {paymentDetails.errorCode && (
                        <p className="text-xs text-red-700">
                          <span className="font-medium">Code:</span> {paymentDetails.errorCode}
                        </p>
                      )}
                      {paymentDetails.errorMessage && (
                        <p className="text-xs text-red-700">
                          <span className="font-medium">Message:</span> {paymentDetails.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* No payment reason */}
                {paymentDetails.noPaymentReason && (
                  <div>
                    <span className="text-xs font-medium text-amber-600 block mb-1">No Payment Created</span>
                    <div className="bg-amber-50 rounded px-3 py-2 border border-amber-200">
                      <p className="text-xs text-amber-800">
                        {paymentDetails.noPaymentReason === 'CHECKOUT_EXPIRED'
                          ? 'Checkout session expired before payment was attempted.'
                          : paymentDetails.noPaymentReason === 'ABANDONED'
                            ? 'Customer left the checkout before entering payment details.'
                            : paymentDetails.noPaymentReason === 'CANCELLED'
                              ? 'Customer cancelled the checkout flow.'
                              : paymentDetails.noPaymentReason === 'NO_PAYMENT_CREATED'
                                ? 'Clover did not create a payment — possible card rejection or technical error.'
                                : paymentDetails.noPaymentReason === 'ORDER_LOOKUP_FAILED'
                                  ? 'Could not retrieve the Clover order to determine the failure reason.'
                                  : paymentDetails.noPaymentReason === 'NO_CHECKOUT_DATA'
                                    ? 'No checkout data returned by Clover — the checkout may have been rejected at creation.'
                                    : `Reason: ${paymentDetails.noPaymentReason}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Raw Clover Response — collapsible JSON viewer */}
        {rawResponse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <button
              onClick={() => setShowRawResponse(!showRawResponse)}
              className="w-full flex items-center justify-between bg-gray-100 border border-gray-300 rounded-lg p-3 mb-4 hover:bg-gray-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-600 shrink-0" />
                <span className="text-sm font-medium text-gray-700">Raw Clover Response</span>
              </div>
              {showRawResponse ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showRawResponse && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4 max-h-80 overflow-y-auto">
                <pre className="text-xs text-green-400 whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </div>
            )}
          </motion.div>
        )}

        {/* Helpful suggestions based on reason */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-medium text-blue-800">What you can do</span>
            </div>
            <ul className="text-xs text-blue-700 space-y-1 ml-6 list-disc">
              {effectiveReason === 'INSUFFICIENT_FUNDS' ? (
                <>
                  <li>Try a different card with sufficient balance</li>
                  <li>Add funds to your account and try again</li>
                  <li>Use a different payment method</li>
                </>
              ) : effectiveReason === 'CANCELLED' || effectiveReason === 'ABANDONED' ? (
                <>
                  <li>Your cart has been preserved — try again when ready</li>
                  <li>The checkout session is still available</li>
                </>
              ) : effectiveReason === 'CARD_EXPIRED' ? (
                <>
                  <li>Check your card&apos;s expiration date</li>
                  <li>Try a card with a valid expiration date</li>
                </>
              ) : effectiveReason === 'FRAUD_SUSPECTED' ? (
                <>
                  <li>Contact your bank to authorize the transaction</li>
                  <li>Try a different payment method</li>
                  <li>Call the number on the back of your card</li>
                </>
              ) : effectiveReason === 'CHECKOUT_EXPIRED' ? (
                <>
                  <li>Start a new checkout — the previous session has expired</li>
                  <li>Complete payment promptly to avoid expiration</li>
                </>
              ) : effectiveReason === 'NO_PAYMENT_CREATED' ? (
                <>
                  <li>The card may have been rejected before authorization</li>
                  <li>Try a different card or payment method</li>
                  <li>Contact support if the problem persists</li>
                </>
              ) : (
                <>
                  <li>Double-check your card details and try again</li>
                  <li>Try a different card or payment method</li>
                  <li>Contact your bank if the problem persists</li>
                </>
              )}
            </ul>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={() => navigate('checkout')}
            className="bg-gold hover:bg-gold-light text-white"
          >
            Try Again
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-gold/30 text-gold"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
          </Button>
          <Button
            onClick={() => navigate('shop')}
            variant="ghost"
            className="text-muted-foreground"
          >
            <Store className="w-4 h-4 mr-2" /> Continue Shopping
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
