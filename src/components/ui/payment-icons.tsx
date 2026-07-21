'use client'

import React from 'react'

// ─── Credit Card & Payment Processors ───────────────────────────────────────

// Clover icon (Primary Payment Processor)
export function CloverIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1DA159" />
      {/* Clover leaf shape */}
      <circle cx="24" cy="14" r="6" fill="white" />
      <ellipse cx="18" cy="18" rx="5" ry="4.5" fill="white" transform="rotate(-30 18 18)" />
      <ellipse cx="30" cy="18" rx="5" ry="4.5" fill="white" transform="rotate(30 30 18)" />
      <circle cx="24" cy="14" r="3.5" fill="#1DA159" />
      <ellipse cx="19.5" cy="17.5" rx="3" ry="2.8" fill="#1DA159" transform="rotate(-30 19.5 17.5)" />
      <ellipse cx="28.5" cy="17.5" rx="3" ry="2.8" fill="#1DA159" transform="rotate(30 28.5 17.5)" />
      <text x="24" y="27" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="700" fontFamily="system-ui">CLOVER</text>
    </svg>
  )
}

// Visa icon
export function VisaIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path d="M19.5 22H16.2L18.3 10H21.6L19.5 22Z" fill="white" />
      <path d="M30.3 10.3C29.6 10 28.5 9.7 27.1 9.7C23.8 9.7 21.5 11.4 21.5 13.8C21.5 15.6 23.2 16.6 24.4 17.2C25.7 17.8 26.1 18.2 26.1 18.8C26.1 19.7 25 20.1 23.9 20.1C22.5 20.1 21.7 19.9 20.5 19.4L20 19.2L19.5 22.2C20.3 22.6 21.8 22.9 23.4 23C26.9 23 29.1 21.3 29.1 18.8C29.1 17.4 28.2 16.3 26.3 15.5C25.2 14.9 24.5 14.5 24.5 13.9C24.5 13.3 25.1 12.7 26.3 12.7C27.3 12.7 28 12.9 28.6 13.1L28.9 13.3L30.3 10.3Z" fill="white" />
      <path d="M35.3 10H32.7C31.9 10 31.3 10.2 31 11L26.1 22H29.5L30.2 20.1H34.1L34.5 22H37.5L35.3 10ZM31.1 17.7L32.4 14.2L33 12.6L33.4 14.1L34.1 17.7H31.1Z" fill="white" />
      <path d="M14 10L11 18.3L10.6 16.3C10 14 8 11.5 5.7 10.3L8.5 22L12 22L17.5 10H14Z" fill="white" />
      <path d="M8.3 10H3L3 10.3C7.1 11.3 9.8 13.8 10.9 16.4L9.7 11.1C9.5 10.3 9 10.1 8.3 10Z" fill="#F9A51A" />
    </svg>
  )
}

// Mastercard icon
export function MastercardIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="9" fill="#EB001B" />
      <circle cx="29" cy="16" r="9" fill="#F79E1B" />
      <path d="M24 10.3C25.6 11.6 26.6 13.6 26.6 15.8V16.2C26.6 18.4 25.6 20.4 24 21.7C22.4 20.4 21.4 18.4 21.4 16.2V15.8C21.4 13.6 22.4 11.6 24 10.3Z" fill="#FF5F00" />
    </svg>
  )
}

// American Express icon
export function AmexIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#2E77BC" />
      <text x="24" y="18" textAnchor="middle" fill="white" fontSize="7" fontWeight="700" fontFamily="system-ui" letterSpacing="0.5">AMEX</text>
    </svg>
  )
}

// Discover icon
export function DiscoverIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#FF6000" />
      <circle cx="34" cy="22" r="8" fill="#FFA000" opacity="0.6" />
      <text x="20" y="18" textAnchor="middle" fill="white" fontSize="6" fontWeight="700" fontFamily="system-ui">DISCOVER</text>
    </svg>
  )
}

// PayPal icon
export function PayPalIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#003087" />
      <path d="M20 7h6c3 0 5 1.5 4.5 4.5C30 14.5 28 16 25 16h-2l-1 6h-3l2-12-1 6z" fill="#0070E0" />
      <path d="M22 7h6c3 0 5 1.5 4.5 4.5C32 14.5 30 16 27 16h-2l-1 6h-3l1-6z" fill="#00A0E9" />
      <text x="24" y="27" textAnchor="middle" fill="white" fontSize="5" fontWeight="700" fontFamily="system-ui">PayPal</text>
    </svg>
  )
}

// Apple Pay icon
export function ApplePayIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#000000" />
      {/* Apple logo */}
      <path d="M22 9c0-1.5 1.2-3 2.8-3 .1 1.6-1.2 3-2.8 3zm-1.5 1.5c-.8-.5-1.8-.3-2.3.2-.5.4-.8 1-.6 1.6.7 0 1.5-.4 2-1 .3-.3.5-.6.9-.8zm1.2 14c-.6 0-1-.3-1.6-.3-.7 0-1.2.3-1.8.3-.8 0-1.5-.5-2-1.3-1.2-2-.3-5 1-6.5.7-.8 1.6-1.3 2.5-1.3.7 0 1.3.4 1.8.4.5 0 1.1-.5 2-.4.7 0 1.4.3 1.9 1-.1.1-1.3.8-1.3 2.3 0 1.8 1.4 2.4 1.5 2.4-.1.4-.5 1.3-.8 1.7-.4.6-.9 1.1-1.4 1.2-.5 0-1-.3-1.5-.3-.5 0-1 .3-1.3.3z" fill="white" />
      <text x="36" y="19" textAnchor="middle" fill="white" fontSize="7" fontWeight="500" fontFamily="system-ui">Pay</text>
    </svg>
  )
}

// ─── Buy Now, Pay Later ─────────────────────────────────────────────────────

// Klarna icon
export function KlarnaIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#FFB3C7" />
      <text x="24" y="19" textAnchor="middle" fill="#000" fontSize="8" fontWeight="800" fontFamily="system-ui" letterSpacing="0.5">Klarna</text>
    </svg>
  )
}

// Affirm icon
export function AffirmIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#0FA0EA" />
      <text x="24" y="19" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="800" fontFamily="system-ui" letterSpacing="0.3">affirm</text>
    </svg>
  )
}

// Zip icon
export function ZipIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#5B2D8E" />
      <text x="24" y="19" textAnchor="middle" fill="white" fontSize="9" fontWeight="800" fontFamily="system-ui" letterSpacing="1">zip</text>
    </svg>
  )
}

// Sezzle icon
export function SezzleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#7B2D8E" />
      <text x="24" y="19" textAnchor="middle" fill="white" fontSize="7" fontWeight="800" fontFamily="system-ui" letterSpacing="0.5">sezzle</text>
    </svg>
  )
}

// Shop Pay icon
export function ShopPayIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#5A31F4" />
      <text x="24" y="18.5" textAnchor="middle" fill="white" fontSize="6.5" fontWeight="800" fontFamily="system-ui" letterSpacing="0.2">Shop Pay</text>
    </svg>
  )
}

// ─── Legacy Icons (backward compatibility) ───────────────────────────────────

// Verve icon (Nigerian card brand)
export function VerveIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#1B1B1B" />
      <path d="M10 20.5V11.5H16.5V13.5H12.2V15H16V17H12.2V18.5H16.5V20.5H10Z" fill="#E31937" />
      <path d="M18 20.5V11.5H24.5V13.5H20.2V15H24V17H20.2V18.5H24.5V20.5H18Z" fill="#E31937" />
      <path d="M26 20.5V11.5H28.2V18.5H32.5V20.5H26Z" fill="#E31937" />
      <path d="M34 11.5L37 16L34 20.5H36.5L39 17.5L41.5 20.5H44L41 16L44 11.5H41.5L39 14.5L36.5 11.5H34Z" fill="#E31937" />
      <path d="M8 14L7 16L8 18" stroke="#E31937" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Paystack icon (Nigerian payment gateway)
export function PaystackIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#0BA4DB" />
      <rect x="10" y="8" width="22" height="3" rx="1.5" fill="white" />
      <rect x="10" y="13" width="22" height="3" rx="1.5" fill="white" />
      <rect x="10" y="18" width="14" height="3" rx="1.5" fill="white" />
      <rect x="10" y="23" width="8" height="3" rx="1.5" fill="white" />
    </svg>
  )
}

// Bank Transfer icon
export function BankTransferIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#2D5F2D" />
      <path d="M24 6L36 14H12L24 6Z" fill="white" />
      <rect x="13" y="14" width="3" height="10" fill="white" />
      <rect x="19" y="14" width="3" height="10" fill="white" />
      <rect x="26" y="14" width="3" height="10" fill="white" />
      <rect x="32" y="14" width="3" height="10" fill="white" />
      <rect x="11" y="24" width="26" height="2.5" rx="0.5" fill="white" />
    </svg>
  )
}

// Pay on Delivery / Cash icon
export function CashOnDeliveryIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#5B4A3F" />
      <rect x="6" y="10" width="36" height="14" rx="2" fill="#7C6B5D" />
      <rect x="8" y="12" width="32" height="10" rx="1" fill="#A89080" />
      <circle cx="24" cy="17" r="3.5" fill="#5B4A3F" />
      <text x="24" y="18.5" textAnchor="middle" fill="#D4C4B0" fontSize="5" fontWeight="bold">$</text>
      <path d="M30 24L34 20H38L40 22V26H30V24Z" fill="#5B4A3F" />
      <circle cx="33" cy="26" r="1.5" fill="#D4C4B0" />
      <circle cx="38" cy="26" r="1.5" fill="#D4C4B0" />
    </svg>
  )
}

// ─── Combined Rows ───────────────────────────────────────────────────────────

// Compact row of accepted payment icons for footer
export function PaymentIconsRow() {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <CloverIcon className="h-6 w-auto" />
      <VisaIcon className="h-6 w-auto" />
      <MastercardIcon className="h-6 w-auto" />
      <AmexIcon className="h-6 w-auto" />
      <DiscoverIcon className="h-6 w-auto" />
      <PayPalIcon className="h-6 w-auto" />
      <ApplePayIcon className="h-6 w-auto" />
    </div>
  )
}

// BNPL row for footer
export function BNPLIconsRow() {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <KlarnaIcon className="h-6 w-auto" />
      <AffirmIcon className="h-6 w-auto" />
      <ZipIcon className="h-6 w-auto" />
      <SezzleIcon className="h-6 w-auto" />
      <ShopPayIcon className="h-6 w-auto" />
    </div>
  )
}
