'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, Clock, Sparkles } from 'lucide-react'
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

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
}

export default function PaymentShowcaseSection() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-cream/50 via-blush/10 to-transparent">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div {...fadeInUp} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-gold" />
            <span className="text-sm font-semibold tracking-wider uppercase text-gold">Secure & Flexible Payments</span>
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Premium Payment Options
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Shop with confidence using our secure checkout powered by Clover. Multiple payment options available to suit your needs.
          </p>
        </motion.div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Accepted Payment Methods */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-gold/15 bg-gradient-to-br from-white via-gold/[0.02] to-blush/5 p-6"
          >
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-gold" />
              </div>
              Accepted Payment Methods
            </h3>

            {/* Primary: Clover */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <CloverIcon className="h-9 w-auto" />
                <div>
                  <p className="text-sm font-bold text-[#1DA159]">Clover</p>
                  <p className="text-[10px] text-muted-foreground">Primary Payment Processor</p>
                </div>
              </div>
            </div>

            {/* Card Networks */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground font-medium mb-2">Credit & Debit Cards</p>
              <div className="flex flex-wrap items-center gap-2">
                <VisaIcon className="h-7 w-auto" />
                <MastercardIcon className="h-7 w-auto" />
                <AmexIcon className="h-7 w-auto" />
                <DiscoverIcon className="h-7 w-auto" />
              </div>
            </div>

            {/* Digital Wallets */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Digital Wallets</p>
              <div className="flex flex-wrap items-center gap-2">
                <PayPalIcon className="h-7 w-auto opacity-60" />
                <ApplePayIcon className="h-7 w-auto opacity-60" />
                <span className="text-[10px] text-gold/70 ml-1">Coming Soon</span>
              </div>
            </div>
          </motion.div>

          {/* Buy Now, Pay Later */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-gold/15 bg-gradient-to-br from-white via-gold/[0.02] to-blush/5 p-6"
          >
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

            <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-gold" />
              </div>
              Buy Now, Pay Later
            </h3>

            <p className="text-xs text-muted-foreground mb-4">
              Split your purchase into manageable payments. No hidden fees, no surprises.
            </p>

            <div className="grid grid-cols-1 gap-3">
              {[
                { Icon: KlarnaIcon, name: 'Klarna', desc: 'Pay in 4 interest-free installments', color: '#FFB3C7' },
                { Icon: AffirmIcon, name: 'Affirm', desc: 'Flexible monthly payments', color: '#0FA0EA' },
                { Icon: ZipIcon, name: 'Zip', desc: 'Pay in 4 — no impact on credit', color: '#5B2D8E' },
                { Icon: SezzleIcon, name: 'Sezzle', desc: 'Split into 4 payments over 6 weeks', color: '#7B2D8E' },
                { Icon: ShopPayIcon, name: 'Shop Pay', desc: 'Fast, secure checkout with installments', color: '#5A31F4' },
              ].map((bnpl) => (
                <div
                  key={bnpl.name}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-blush/20 hover:border-gold/25 hover:bg-gold/[0.03] transition-all duration-200"
                >
                  <bnpl.Icon className="h-7 w-auto shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{bnpl.name}</p>
                    <p className="text-[10px] text-muted-foreground">{bnpl.desc}</p>
                  </div>
                  <span className="text-[9px] text-gold/60 shrink-0 font-medium bg-gold/5 px-2 py-0.5 rounded-full">
                    Where Eligible
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Secure Checkout Notice */}
        <motion.div {...fadeInUp} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1f0d] via-[#162516] to-[#0d1f0d] p-6 sm:p-8 mb-10">
          {/* Decorative gold lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-900/40 flex items-center justify-center shrink-0">
              <Shield className="w-7 h-7 text-green-400" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <p className="text-base sm:text-lg font-semibold text-white/90 mb-1">
                Secure checkout powered by <span className="text-[#1DA159] font-bold">Clover</span>
              </p>
              <p className="text-xs sm:text-sm text-white/50">
                Flexible payment options available where eligible. Your payment information is encrypted and secure.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <CloverIcon className="h-10 w-auto opacity-80" />
            </div>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div {...fadeInUp}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Lock, title: 'SSL Secure Checkout', desc: '256-bit encryption protects your data' },
              { icon: Shield, title: 'Secure Payment Processing', desc: 'PCI DSS compliant & verified' },
              { icon: Clock, title: 'Fast Shipping', desc: 'Quick & reliable delivery' },
              { icon: Sparkles, title: 'Customer Support', desc: 'Dedicated help when you need it' },
            ].map((badge, i) => (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-b from-gold/5 to-transparent border border-gold/10 hover:border-gold/25 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-3 group-hover:bg-gold/20 transition-colors">
                  <badge.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-foreground/80 leading-tight">{badge.title}</span>
                <span className="text-[11px] text-muted-foreground mt-1">{badge.desc}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
