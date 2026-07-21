'use client'

import { useNavStore } from '@/store/nav-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
    toast.success('Message sent! We\'ll get back to you soon.')
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-cream via-blush/10 to-cream py-16">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-gold/10 text-gold border-gold/20 mb-4">Get In Touch</Badge>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair), serif' }}>Contact Us</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">Have a question or need help? We&apos;d love to hear from you.</p>
        </div>
      </section>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>We&apos;re Here to Help</h2>
            <p className="text-muted-foreground">Whether you have a question about our products, need skincare advice, or just want to say hello, we&apos;re here for you.</p>

            <div className="space-y-4">
              {[
                { icon: Phone, label: 'Phone', value: '+1 (617) 955-0069' },
                { icon: Mail, label: 'Email', value: 'hello@angelbeauty.com' },
                { icon: MapPin, label: 'Address', value: '246 Union St, Lynn MA 01901, United States' },
                { icon: Clock, label: 'Hours', value: 'Mon-Fri: 9AM - 6PM EST' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4 p-4 rounded-xl bg-blush/10">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => window.open('mailto:hello@angelbeauty.com', '_blank')}
              className="bg-gold hover:bg-gold-light text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Email Us
            </Button>
          </div>

          {/* Contact form */}
          <Card className="border-blush/30">
            <CardContent className="p-6 sm:p-8">
              {sent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground text-sm mb-4">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
                  <Button onClick={() => setSent(false)} variant="outline" className="border-gold/30 text-gold">Send Another Message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Your Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border-blush/30 mt-1" required /></div>
                    <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="border-blush/30 mt-1" required /></div>
                  </div>
                  <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="border-blush/30 mt-1" required /></div>
                  <div><Label>Message</Label><Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="border-blush/30 mt-1 min-h-[120px]" required /></div>
                  <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-white beauty-btn">Send Message</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
