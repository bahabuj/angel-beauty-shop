'use client'

import { useUIStore } from '@/store/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, X, Send } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  text: string
  isBot: boolean
}

const quickQuestions = [
  'How do I place an order?',
  'What are the delivery options?',
  'How do I track my order?',
  'What payment methods do you accept?',
  'How do I contact support?',
]

const botResponses: Record<string, string> = {
  'how do i place an order?': 'To place an order: 1) Browse our shop, 2) Add items to your cart, 3) Proceed to checkout, 4) Fill in your details and place your order. It\'s that easy! 🛍️',
  'what are the delivery options?': 'We offer: 📦 Standard Delivery (3-5 business days) - Free on orders over $100 | 🚀 Express Delivery (1-2 business days) - $20',
  'how do i track my order?': 'After placing your order, you\'ll receive a confirmation email with tracking details. You can also check your order status in your account dashboard.',
  'what payment methods do you accept?': 'We accept: 💳 Debit/Credit Cards (Visa, Mastercard, Verve) | 🏦 Bank Transfer | 💰 Pay on Delivery | 📱 Mobile Money',
  'how do i contact support?': 'You can reach us through: 📞 Phone: +1 (617) 955-0069 | 📧 Email: hello@angelbeauty.com | 💬 Chat: Use this chat for quick help | 🕐 Mon-Fri: 9AM - 6PM EST',
}

export default function Chatbot() {
  const isChatOpen = useUIStore((s) => s.isChatOpen)
  const setChatOpen = useUIStore((s) => s.setChatOpen)
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hi there! 👋 Welcome to Angel Beauty! How can I help you today?', isBot: true }
  ])
  const [input, setInput] = useState('')

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now().toString(), text, isBot: false }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    setTimeout(() => {
      const key = text.toLowerCase().trim()
      const response = botResponses[key] || 'Thank you for your question! For more detailed assistance, please contact us at hello@angelbeauty.com or call +1 (617) 955-0069. We\'re here to help! 💕'
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: response, isBot: true }
      setMessages(prev => [...prev, botMsg])
    }, 800)
  }

  return (
    <>
      {/* Chat button */}
      <motion.button
        className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-rose to-rose-light text-white shadow-lg hover:shadow-xl transition-shadow"
        onClick={() => setChatOpen(!isChatOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isChatOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6 mx-auto" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-6 h-6 mx-auto" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-blush/40 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-gold to-gold-light p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">AB</div>
                <div>
                  <p className="font-semibold text-sm">Angel Beauty</p>
                  <p className="text-xs opacity-80">We typically reply in minutes</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="h-72 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        msg.isBot
                          ? 'bg-blush/30 text-foreground rounded-tl-sm'
                          : 'bg-gold text-white rounded-tr-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Quick questions */}
            <div className="px-4 py-2 border-t border-blush/20">
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full bg-blush/30 text-foreground/70 hover:bg-gold hover:text-white transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-blush/20">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="border-blush/30 focus:border-gold text-sm"
                />
                <Button type="submit" size="icon" className="bg-gold hover:bg-gold-light text-white shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
