'use client'

import { Badge } from '@/components/ui/badge'

function PolicyLayout({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-cream via-blush/10 to-cream py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-gold/10 text-gold border-gold/20 mb-4">{badge}</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>{title}</h1>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-sm max-w-none text-foreground/80 space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy Policy" badge="Legal">
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <h3 className="text-lg font-semibold text-foreground">1. Information We Collect</h3>
      <p>We collect information you provide when placing an order, creating an account, or contacting us. This includes your name, email, phone number, and delivery address.</p>
      <h3 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h3>
      <p>We use your information to process orders, deliver products, communicate about your purchases, send promotional emails (with your consent), and improve our services.</p>
      <h3 className="text-lg font-semibold text-foreground">3. Data Protection</h3>
      <p>We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure. Your payment information is encrypted and secure.</p>
      <h3 className="text-lg font-semibold text-foreground">4. Cookies</h3>
      <p>We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. You can disable cookies through your browser settings.</p>
      <h3 className="text-lg font-semibold text-foreground">5. Third-Party Services</h3>
      <p>We may share limited information with trusted third parties to facilitate order delivery and payment processing. We do not sell your personal information.</p>
      <h3 className="text-lg font-semibold text-foreground">6. Your Rights</h3>
      <p>You have the right to access, update, or delete your personal information. Contact us at hello@angelbeauty.com for any privacy-related requests.</p>
    </PolicyLayout>
  )
}

export function TermsPage() {
  return (
    <PolicyLayout title="Terms & Conditions" badge="Legal">
      <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <h3 className="text-lg font-semibold text-foreground">1. General</h3>
      <p>By accessing and using the Angel Beauty website, you agree to be bound by these terms and conditions. Please read them carefully before making any purchases.</p>
      <h3 className="text-lg font-semibold text-foreground">2. Products</h3>
      <p>We strive to display our products accurately on the website. However, we cannot guarantee that colors displayed on your screen will exactly match the actual products.</p>
      <h3 className="text-lg font-semibold text-foreground">3. Pricing</h3>
      <p>All prices are displayed in US Dollars ($). We reserve the right to change prices at any time without prior notice. The price at the time of order placement will apply.</p>
      <h3 className="text-lg font-semibold text-foreground">4. Orders</h3>
      <p>Placing an order constitutes an offer to purchase. We reserve the right to refuse or cancel any order for any reason, including product availability or pricing errors.</p>
      <h3 className="text-lg font-semibold text-foreground">5. Payment</h3>
      <p>We accept payment on delivery and select online payment methods. Payment must be received in full before products are dispatched.</p>
      <h3 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h3>
      <p>Angel Beauty shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website.</p>
    </PolicyLayout>
  )
}

export function ShippingPage() {
  return (
    <PolicyLayout title="Shipping & Returns" badge="Customer Service">
      <h3 className="text-lg font-semibold text-foreground">Shipping</h3>
      <p>We deliver across the United States with the following options:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Standard Delivery (3-5 business days)</strong> - Free on orders over $100 | $15 for orders under $100</li>
        <li><strong>Express Delivery (1-2 business days)</strong> - $25 (available nationwide)</li>
      </ul>
      <h3 className="text-lg font-semibold text-foreground">Order Processing</h3>
      <p>Orders are processed within 24 hours on business days. You will receive a confirmation email with tracking details once your order has been dispatched.</p>
      <h3 className="text-lg font-semibold text-foreground">Returns Policy</h3>
      <p>We accept returns within 7 days of delivery if:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>The product is unused and in its original packaging</li>
        <li>You have proof of purchase (order confirmation or receipt)</li>
        <li>The product is damaged or defective upon delivery</li>
      </ul>
      <h3 className="text-lg font-semibold text-foreground">How to Return</h3>
      <p>Contact us at hello@angelbeauty.com or call +1 (617) 955-0069 to initiate a return. We will provide a return shipping label and process your refund within 5-7 business days after receiving the returned product.</p>
      <h3 className="text-lg font-semibold text-foreground">Non-Returnable Items</h3>
      <p>Opened or used products, gift sets, and items purchased during sale events are not eligible for returns unless they are defective.</p>
    </PolicyLayout>
  )
}

// Default export for dynamic import support
export default function PolicyPagesWrapper({ page }: { page?: string }) {
  switch (page) {
    case 'privacy': return <PrivacyPage />
    case 'terms': return <TermsPage />
    case 'shipping': return <ShippingPage />
    default: return <PrivacyPage />
  }
}
