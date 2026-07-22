'use client'

import Image from 'next/image'
import { useNavStore } from '@/store/nav-store'
import { useAuthStore } from '@/store/auth-store'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useSecretAdminAccess } from '@/hooks/use-secret-admin-access'
import { Mail, Phone, MapPin, Instagram, Facebook, Youtube } from 'lucide-react'
import { PaymentIconsRow } from '@/components/ui/payment-icons'

export default function Footer() {
  const navigate = useNavStore((s) => s.navigate)
  const { setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  // 🔒 Hidden admin entry — tap the footer logo 5× within 1.5s to auto-sign-in
  // as admin and jump to the dashboard. Taps 1-4 still navigate home normally.
  const handleFooterLogoClick = useSecretAdminAccess(() => navigate('home'))

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setSubscribed(true)
        setEmail('')
      }
    } catch {}
  }

  return (
    <footer className="bg-gradient-to-b from-nude/30 to-blush/20 mt-auto">
      {/* Newsletter section */}
      <div className="bg-gradient-to-r from-gold/10 via-gold/5 to-rose/10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-xl mx-auto">
            <h3
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-playfair), serif' }}
            >
              Join the Angelsbeauty Family
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Subscribe to get exclusive offers, beauty tips, and new product updates.
            </p>
            {subscribed ? (
              <p className="text-gold font-medium">✨ Welcome to the family! Check your inbox for a special gift.</p>
            ) : (
              <form onSubmit={handleNewsletter} className="flex gap-2 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-gold/30 focus:border-gold bg-white/80"
                  required
                />
                <button
                  type="submit"
                  className="bg-gold hover:bg-gold-light text-white px-6 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand — tap logo 5× within 1.5s to access hidden admin entry */}
          <div>
            <button
              onClick={handleFooterLogoClick}
              className="flex items-center gap-2 mb-4 group select-none"
              aria-label="Angelsbeauty home"
            >
              <Image
                src="/images/logo.png"
                alt="Angelsbeauty"
                width={36}
                height={36}
                className="object-contain"
              />
              <h3
                className="text-xl font-bold gold-gradient-text"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
              >
                Angelsbeauty
              </h3>
            </button>
            <p className="text-sm text-muted-foreground mb-4">
              Premium skincare products designed to help you feel confident, radiant and beautiful.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/angelsbskincare/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-blush/50 flex items-center justify-center text-foreground/60 hover:bg-gold hover:text-white transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/@angelsbeautyskincare?is_from_webapp=1&sender_device=pc"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-full bg-blush/50 flex items-center justify-center text-foreground/60 hover:bg-gold hover:text-white transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M21 7.5a5.7 5.7 0 0 1-4.6-2.4v9.8a6.6 6.6 0 1 1-6.6-6.6c.4 0 .7 0 1.1.1v3.4a3.2 3.2 0 1 0 2.2 3.1V2h3.1c.3 2.4 2.2 4.3 4.8 4.5v3z" />
                </svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-blush/50 flex items-center justify-center text-foreground/60 hover:bg-gold hover:text-white transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/16179550069"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-blush/50 flex items-center justify-center text-foreground/60 hover:bg-[#25D366] hover:text-white transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-blush/50 flex items-center justify-center text-foreground/60 hover:bg-gold hover:text-white transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: 'Home', page: 'home' as const },
                { label: 'Shop All', page: 'shop' as const },
                { label: 'About Us', page: 'about' as const },
                { label: 'Contact', page: 'contact' as const },
                { label: 'My Account', page: 'account' as const },
              ].map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider">Customer Service</h4>
            <ul className="space-y-2">
              {[
                { label: 'Shipping & Returns', page: 'shipping' as const },
                { label: 'Privacy Policy', page: 'privacy' as const },
                { label: 'Terms & Conditions', page: 'terms' as const },
              ].map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                <span>246 Union St, Lynn MA 01901, United States</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-gold shrink-0" />
                <span>+1 (617) 955-0069</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-gold shrink-0" />
                <span>hello@angelbeauty.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment icons & bottom */}
        <div className="border-t border-blush/40 mt-10 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Angelsbeauty. All rights reserved.
            </p>
            <PaymentIconsRow />
          </div>
        </div>
      </div>
    </footer>
  )
}
