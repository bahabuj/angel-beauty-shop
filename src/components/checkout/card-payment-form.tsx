'use client'

import React, { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Check,
  Loader2,
} from 'lucide-react'
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
} from '@/components/ui/payment-icons'

// ─── Card Type Detection ────────────────────────────────────────────────────

type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown'

function detectCardType(number: string): CardType {
  const cleaned = number.replace(/\s/g, '')
  if (/^4/.test(cleaned)) return 'visa'
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard'
  if (/^3[47]/.test(cleaned)) return 'amex'
  if (/^6(?:011|5)/.test(cleaned)) return 'discover'
  return 'unknown'
}

function getCardIcon(type: CardType) {
  switch (type) {
    case 'visa': return <VisaIcon className="h-7 w-auto" />
    case 'mastercard': return <MastercardIcon className="h-7 w-auto" />
    case 'amex': return <AmexIcon className="h-7 w-auto" />
    case 'discover': return <DiscoverIcon className="h-7 w-auto" />
    default: return <CreditCard className="h-5 w-5 text-muted-foreground" />
  }
}

// ─── Formatting Utilities ───────────────────────────────────────────────────

function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  const type = detectCardType(cleaned)
  const maxLength = type === 'amex' ? 15 : 16
  const trimmed = cleaned.slice(0, maxLength)

  if (type === 'amex') {
    // AMEX: XXXX XXXXXX XXXXX
    return trimmed.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    )
  }
  // Others: XXXX XXXX XXXX XXXX
  return trimmed.replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 4)
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 2) + ' / ' + cleaned.slice(2)
  }
  return cleaned
}

function formatCVV(value: string, cardType: CardType): string {
  const maxLength = cardType === 'amex' ? 4 : 3
  return value.replace(/\D/g, '').slice(0, maxLength)
}

// ─── Validation ─────────────────────────────────────────────────────────────

function luhnCheck(num: string): boolean {
  const cleaned = num.replace(/\s/g, '')
  if (!/^\d+$/.test(cleaned)) return false
  let sum = 0
  let isEven = false
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10)
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }
  return sum % 10 === 0
}

function validateExpiry(value: string): boolean {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length < 4) return false
  const month = parseInt(cleaned.slice(0, 2), 10)
  const year = parseInt('20' + cleaned.slice(2, 4), 10)
  if (month < 1 || month > 12) return false
  const now = new Date()
  const expDate = new Date(year, month)
  return expDate > now
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CardPaymentFormProps {
  onSubmit: (cardData: {
    cardNumber: string
    cardholderName: string
    expiry: string
    cvv: string
    cardType: CardType
    last4: string
  }) => void
  loading?: boolean
  total?: number
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CardPaymentForm({ onSubmit, loading = false, total }: CardPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [showCvv, setShowCvv] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const cardType = detectCardType(cardNumber)
  const cleanedNumber = cardNumber.replace(/\s/g, '')
  const last4 = cleanedNumber.slice(-4)

  // Validation states
  const isCardValid = cleanedNumber.length >= 15 && luhnCheck(cleanedNumber)
  const isNameValid = cardholderName.trim().length >= 2
  const isExpiryValid = validateExpiry(expiry)
  const cvvLength = cardType === 'amex' ? 4 : 3
  const isCvvValid = cvv.replace(/\D/g, '').length === cvvLength
  const isFormValid = isCardValid && isNameValid && isExpiryValid && isCvvValid

  const handleCardNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardNumber(formatted)
  }, [])

  const handleExpiryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value)
    setExpiry(formatted)
  }, [])

  const handleCvvChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCVV(e.target.value, cardType)
    setCvv(formatted)
  }, [cardType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || loading) return
    onSubmit({
      cardNumber: cleanedNumber,
      cardholderName: cardholderName.trim(),
      expiry: expiry.replace(/\s/g, ''),
      cvv,
      cardType,
      last4,
    })
  }

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ─── Card Number ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber" className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gold" />
          Card Number
        </Label>
        <div className="relative">
          <Input
            id="cardNumber"
            value={cardNumber}
            onChange={handleCardNumberChange}
            onBlur={() => markTouched('cardNumber')}
            placeholder="1234 5678 9012 3456"
            className={`pl-4 pr-20 h-12 text-base border-blush/40 bg-white focus:border-gold focus:ring-gold/20 font-mono tracking-wider ${
              touched.cardNumber && cleanedNumber.length > 0 && !isCardValid ? 'border-rose/50 focus:border-rose' : ''
            } ${isCardValid ? 'border-green-400 focus:border-green-500' : ''}`}
            inputMode="numeric"
            autoComplete="cc-number"
            disabled={loading}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {cardType !== 'unknown' && cleanedNumber.length > 0 ? (
              getCardIcon(cardType)
            ) : (
              <div className="flex items-center gap-1 opacity-40">
                <VisaIcon className="h-5 w-auto" />
                <MastercardIcon className="h-5 w-auto" />
                <AmexIcon className="h-5 w-auto" />
                <DiscoverIcon className="h-5 w-auto" />
              </div>
            )}
          </div>
        </div>
        {touched.cardNumber && cleanedNumber.length > 0 && !isCardValid && (
          <p className="text-xs text-rose flex items-center gap-1">Please enter a valid card number</p>
        )}
        {isCardValid && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="w-3 h-3" /> Valid {cardType !== 'unknown' ? cardType.charAt(0).toUpperCase() + cardType.slice(1) : ''} card
          </p>
        )}
      </div>

      {/* ─── Cardholder Name ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="cardholderName" className="text-sm font-medium">
          Cardholder Name
        </Label>
        <Input
          id="cardholderName"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          onBlur={() => markTouched('cardholderName')}
          placeholder="Name as shown on card"
          className={`h-11 border-blush/40 bg-white focus:border-gold focus:ring-gold/20 ${
            touched.cardholderName && cardholderName.length > 0 && !isNameValid ? 'border-rose/50' : ''
          } ${isNameValid ? 'border-green-400 focus:border-green-500' : ''}`}
          autoComplete="cc-name"
          disabled={loading}
        />
      </div>

      {/* ─── Expiry & CVV Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry" className="text-sm font-medium">
            Expiry Date
          </Label>
          <Input
            id="expiry"
            value={expiry}
            onChange={handleExpiryChange}
            onBlur={() => markTouched('expiry')}
            placeholder="MM / YY"
            className={`h-11 border-blush/40 bg-white focus:border-gold focus:ring-gold/20 font-mono tracking-wider ${
              touched.expiry && expiry.length > 0 && !isExpiryValid ? 'border-rose/50' : ''
            } ${isExpiryValid ? 'border-green-400 focus:border-green-500' : ''}`}
            inputMode="numeric"
            autoComplete="cc-exp"
            disabled={loading}
          />
          {touched.expiry && expiry.length > 0 && !isExpiryValid && (
            <p className="text-xs text-rose">Invalid date</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvv" className="text-sm font-medium flex items-center gap-1">
            CVV
            <button
              type="button"
              onClick={() => setShowCvv(!showCvv)}
              className="text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </Label>
          <Input
            id="cvv"
            value={cvv}
            onChange={handleCvvChange}
            onBlur={() => markTouched('cvv')}
            placeholder={cardType === 'amex' ? '1234' : '123'}
            type={showCvv ? 'text' : 'password'}
            className={`h-11 border-blush/40 bg-white focus:border-gold focus:ring-gold/20 font-mono tracking-widest text-center ${
              touched.cvv && cvv.length > 0 && !isCvvValid ? 'border-rose/50' : ''
            } ${isCvvValid ? 'border-green-400 focus:border-green-500' : ''}`}
            inputMode="numeric"
            autoComplete="cc-csc"
            disabled={loading}
          />
          {touched.cvv && cvv.length > 0 && !isCvvValid && (
            <p className="text-xs text-rose">{cardType === 'amex' ? '4 digits required' : '3 digits required'}</p>
          )}
        </div>
      </div>

      {/* ─── Card Preview ─────────────────────────────────────────────────── */}
      {cleanedNumber.length > 4 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 shadow-xl">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-8 w-16 h-16 rounded-full bg-gold/10" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-6 rounded bg-gradient-to-br from-gold to-gold-light" />
                <div className="w-6 h-6 rounded-full bg-white/20" />
              </div>
              {cardType !== 'unknown' && getCardIcon(cardType)}
            </div>

            <p className="font-mono text-lg tracking-[0.25em] text-white/90 mb-4">
              {cardNumber || '•••• •••• •••• ••••'}
            </p>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Cardholder</p>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {cardholderName || 'YOUR NAME'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Expires</p>
                <p className="text-sm text-white/80 font-mono">
                  {expiry || 'MM/YY'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Security Notice ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <Shield className="w-4 h-4 text-green-600 shrink-0" />
        <span>Your card details are encrypted with 256-bit SSL. We never store your full card number.</span>
      </div>

      {/* ─── Pay Button ───────────────────────────────────────────────────── */}
      <Button
        type="submit"
        disabled={!isFormValid || loading}
        className={`w-full h-13 text-base font-semibold transition-all duration-300 ${
          isFormValid && !loading
            ? 'bg-gradient-to-r from-gold via-gold-light to-gold hover:from-gold-light hover:via-gold hover:to-gold-light text-white shadow-lg shadow-gold/25 beauty-btn'
            : 'bg-blush/30 text-muted-foreground cursor-not-allowed'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            {total ? `Pay $${total.toLocaleString()}` : 'Pay Now'}
          </>
        )}
      </Button>

      {/* ─── Accepted Cards ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="text-[10px] text-muted-foreground">Accepted:</span>
        <VisaIcon className="h-5 w-auto opacity-60" />
        <MastercardIcon className="h-5 w-auto opacity-60" />
        <AmexIcon className="h-5 w-auto opacity-60" />
        <DiscoverIcon className="h-5 w-auto opacity-60" />
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-green-300 text-green-600 bg-green-50">
          <Shield className="w-2.5 h-2.5 mr-0.5" /> PCI DSS
        </Badge>
      </div>
    </form>
  )
}
