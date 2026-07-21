'use client'

import React from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Lock, Shield, Check, Clock, CreditCard, Smartphone, Sparkles } from 'lucide-react'
import {
  CloverIcon,
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
  PayPalIcon,
  ApplePayIcon,
  KlarnaIcon,
  AffirmIcon,
  ZipIcon,
  SezzleIcon,
  ShopPayIcon,
} from '@/components/ui/payment-icons'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaymentMethodId =
  | 'clover'
  | 'paypal'
  | 'apple_pay'
  | 'klarna'
  | 'affirm'
  | 'zip'
  | 'sezzle'
  | 'shop_pay'

export interface PaymentMethod {
  id: PaymentMethodId
  label: string
  description: string
  status: 'active' | 'coming_soon' | 'subject_to_availability'
  icon: React.ReactNode
  group: 'primary' | 'digital_wallet' | 'bnpl'
}

// ─── Payment Methods Data ────────────────────────────────────────────────────

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'clover',
    label: 'Clover',
    description: 'Secure card payment via Clover — Visa, Mastercard, Amex, Discover accepted',
    status: 'active',
    icon: (
      <div className="flex items-center gap-1.5">
        <CloverIcon className="h-8 w-auto" />
        <div className="hidden sm:flex items-center gap-1">
          <VisaIcon className="h-6 w-auto" />
          <MastercardIcon className="h-6 w-auto" />
          <AmexIcon className="h-6 w-auto" />
          <DiscoverIcon className="h-6 w-auto" />
        </div>
      </div>
    ),
    group: 'primary',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    description: 'Pay with your PayPal account',
    status: 'coming_soon',
    icon: <PayPalIcon className="h-8 w-auto" />,
    group: 'digital_wallet',
  },
  {
    id: 'apple_pay',
    label: 'Apple Pay',
    description: 'Quick and secure Apple Pay',
    status: 'coming_soon',
    icon: <ApplePayIcon className="h-8 w-auto" />,
    group: 'digital_wallet',
  },
  {
    id: 'klarna',
    label: 'Klarna',
    description: 'Pay in 4 interest-free installments',
    status: 'subject_to_availability',
    icon: <KlarnaIcon className="h-8 w-auto" />,
    group: 'bnpl',
  },
  {
    id: 'affirm',
    label: 'Affirm',
    description: 'Monthly payments with Affirm',
    status: 'subject_to_availability',
    icon: <AffirmIcon className="h-8 w-auto" />,
    group: 'bnpl',
  },
  {
    id: 'zip',
    label: 'Zip',
    description: 'Pay in 4 with Zip',
    status: 'subject_to_availability',
    icon: <ZipIcon className="h-8 w-auto" />,
    group: 'bnpl',
  },
  {
    id: 'sezzle',
    label: 'Sezzle',
    description: 'Buy now, pay later with Sezzle',
    status: 'subject_to_availability',
    icon: <SezzleIcon className="h-8 w-auto" />,
    group: 'bnpl',
  },
  {
    id: 'shop_pay',
    label: 'Shop Pay',
    description: 'Fast checkout with Shop Pay',
    status: 'subject_to_availability',
    icon: <ShopPayIcon className="h-8 w-auto" />,
    group: 'bnpl',
  },
]

// ─── Trust Badges ────────────────────────────────────────────────────────────

function TrustBadges() {
  const badges = [
    {
      icon: <Lock className="w-4 h-4" />,
      title: 'SSL Secure Checkout',
      desc: '256-bit encryption',
    },
    {
      icon: <Shield className="w-4 h-4" />,
      title: 'Secure Payment Processing',
      desc: 'PCI compliant',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      title: 'Fast Shipping',
      desc: 'Quick delivery',
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Customer Support',
      desc: 'Always here for you',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {badges.map((badge) => (
        <div
          key={badge.title}
          className="flex flex-col items-center text-center p-3 rounded-xl bg-gradient-to-b from-gold/5 to-transparent border border-gold/10 hover:border-gold/25 transition-all duration-300 group"
        >
          <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-2 group-hover:bg-gold/20 transition-colors">
            {badge.icon}
          </div>
          <span className="text-xs font-semibold text-foreground/80 leading-tight">{badge.title}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">{badge.desc}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Accepted Cards Grid ─────────────────────────────────────────────────────

function AcceptedCardsGrid() {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-muted-foreground font-medium mr-1">Accepted Cards:</span>
      <CloverIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <VisaIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <MastercardIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <AmexIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <DiscoverIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <PayPalIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <ApplePayIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ─── BNPL Grid ───────────────────────────────────────────────────────────────

function BNPLGrid() {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-muted-foreground font-medium mr-1">Buy Now, Pay Later:</span>
      <KlarnaIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <AffirmIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <ZipIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <SezzleIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
      <ShopPayIcon className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ─── Payment Method Card ─────────────────────────────────────────────────────

function PaymentMethodCard({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod
  selected: boolean
  onSelect: (id: PaymentMethodId) => void
}) {
  const isDisabled = method.status !== 'active'
  const statusLabel =
    method.status === 'coming_soon'
      ? 'Coming Soon'
      : method.status === 'subject_to_availability'
      ? 'Subject to Availability'
      : null

  return (
    <label
      className={`
        relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
        ${selected
          ? 'border-gold bg-gradient-to-r from-gold/[0.08] via-gold/[0.04] to-transparent shadow-md shadow-gold/10'
          : 'border-blush/30 hover:border-gold/40 hover:bg-gold/[0.03]'
        }
        ${isDisabled ? 'opacity-60' : ''}
      `}
    >
      <RadioGroupItem
        value={method.id}
        id={`payment-${method.id}`}
        disabled={isDisabled}
        className="data-[state=checked]:border-gold data-[state=checked]:text-gold"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {method.icon}
          {statusLabel && (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0 h-5 border-gold/30 text-gold bg-gold/5 whitespace-nowrap"
            >
              {statusLabel}
            </Badge>
          )}
          {selected && method.status === 'active' && (
            <Badge className="text-[10px] px-2 py-0 h-5 bg-green-100 text-green-700 border-green-200 whitespace-nowrap">
              <Check className="w-3 h-3 mr-0.5" /> Active
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{method.description}</p>
      </div>
      {selected && method.status === 'active' && (
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gold flex items-center justify-center shadow-lg">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}
    </label>
  )
}

// ─── Main Payment Selector Component ─────────────────────────────────────────

export interface PaymentSelectorProps {
  value: PaymentMethodId
  onChange: (method: PaymentMethodId) => void
  total?: number
}

export default function PaymentSelector({ value, onChange, total }: PaymentSelectorProps) {
  const primaryMethods = PAYMENT_METHODS.filter((m) => m.group === 'primary')
  const digitalWallets = PAYMENT_METHODS.filter((m) => m.group === 'digital_wallet')
  const bnplMethods = PAYMENT_METHODS.filter((m) => m.group === 'bnpl')

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Payment Method
          </h3>
          <p className="text-xs text-muted-foreground">Choose your preferred payment option</p>
        </div>
      </div>

      {/* ─── Primary Payment (Clover) ────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gold">Primary Payment</span>
          <div className="flex-1 h-px bg-gradient-to-r from-gold/30 to-transparent" />
        </div>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as PaymentMethodId)}
          className="space-y-2"
        >
          {primaryMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              selected={value === method.id}
              onSelect={onChange}
            />
          ))}
        </RadioGroup>
      </div>

      {/* ─── Digital Wallets ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Digital Wallets</span>
          <div className="flex-1 h-px bg-gradient-to-r from-blush/50 to-transparent" />
        </div>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as PaymentMethodId)}
          className="space-y-2"
        >
          {digitalWallets.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              selected={value === method.id}
              onSelect={onChange}
            />
          ))}
        </RadioGroup>
      </div>

      {/* ─── Buy Now, Pay Later ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Buy Now, Pay Later</span>
          <div className="flex-1 h-px bg-gradient-to-r from-blush/50 to-transparent" />
        </div>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as PaymentMethodId)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {bnplMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              selected={value === method.id}
              onSelect={onChange}
            />
          ))}
        </RadioGroup>
      </div>

      {/* ─── BNPL Installment Preview ────────────────────────────────────── */}
      {total && total > 0 && value === 'clover' && (
        <div className="bg-gradient-to-r from-gold/5 via-blush/10 to-gold/5 rounded-xl p-4 border border-gold/15">
          <div className="flex items-center gap-2 mb-2">
            <KlarnaIcon className="h-5 w-auto" />
            <span className="text-xs text-muted-foreground">Pay in 4 interest-free payments of</span>
            <span className="text-sm font-bold text-gold">${(total / 4).toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Available with select BNPL providers. Subject to approval.
          </p>
        </div>
      )}

      {/* ─── Accepted Cards Display ──────────────────────────────────────── */}
      <div className="space-y-2">
        <AcceptedCardsGrid />
        <BNPLGrid />
      </div>

      {/* ─── Secure Checkout Notice ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0d1f0d] via-[#132613] to-[#0d1f0d] p-4">
        {/* Decorative gold line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-900/50 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/90">
              Secure checkout powered by <span className="text-[#1DA159] font-bold">Clover</span>
            </p>
            <p className="text-xs text-white/50 mt-1">
              Flexible payment options available where eligible. Your payment information is encrypted and secure.
            </p>
          </div>
        </div>
        {/* Decorative bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>

      {/* ─── Trust Badges ────────────────────────────────────────────────── */}
      <TrustBadges />
    </div>
  )
}
