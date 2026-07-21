'use client'

import { useNavStore } from '@/store/nav-store'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Home, Search } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavStore((s) => s.navigate)

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        className="text-center max-w-md mx-auto px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-8xl font-bold gold-gradient-text mb-4" style={{ fontFamily: 'var(--font-playfair), serif' }}>
          404
        </div>
        <h2 className="text-2xl font-semibold mb-3">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('home')} className="bg-gold hover:bg-gold-light text-white">
            <Home className="w-4 h-4 mr-2" /> Go Home
          </Button>
          <Button onClick={() => navigate('shop')} variant="outline" className="border-gold/30 text-gold">
            <Search className="w-4 h-4 mr-2" /> Browse Shop
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
