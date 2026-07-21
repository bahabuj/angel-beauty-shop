'use client'

import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const WHATSAPP_NUMBER = '16179550069'

export default function WhatsAppButton() {
  const openWhatsApp = (message?: string) => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ''}`
    window.open(url, '_blank')
  }

  return (
    <motion.button
      className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl transition-shadow"
      onClick={() => openWhatsApp('Hi Angel Beauty! I have a question about your products.')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Chat with us on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 mx-auto" />
    </motion.button>
  )
}

export function ProductWhatsAppButton({ productName }: { productName: string }) {
  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I'm interested in the ${productName}. Can you provide more information?`)}`
    window.open(url, '_blank')
  }

  return (
    <button
      onClick={openWhatsApp}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:bg-[#20BD5A] transition-colors"
    >
      <MessageCircle className="w-4 h-4" />
      WhatsApp Inquiry
    </button>
  )
}
