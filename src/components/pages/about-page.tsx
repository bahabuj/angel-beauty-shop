'use client'

import { useNavStore } from '@/store/nav-store'
import { motion } from 'framer-motion'
import { Heart, Leaf, Shield, Award, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

export default function AboutPage() {
  const navigate = useNavStore((s) => s.navigate)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-cream via-blush/10 to-cream py-16 sm:py-24">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-gold/10 text-gold border-gold/20 mb-4">Our Story</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair), serif' }}>
              About <span className="gold-gradient-text">Angel Beauty</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We believe every woman deserves to feel confident, radiant, and beautiful. Our premium skincare products are carefully crafted with the finest natural ingredients to help you reveal your natural glow.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'var(--font-playfair), serif' }}>Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                At Angel Beauty, we are passionate about creating skincare products that truly make a difference. Founded with a vision to provide premium, effective skincare solutions, we source the finest natural ingredients from around the world.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Every product in our collection has been meticulously formulated, dermatologist-tested, and proven to deliver real results. We don&apos;t just sell skincare &mdash; we empower women to embrace their natural beauty with confidence.
              </p>
            </div>
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-gold/10 via-rose/5 to-blush/20 flex items-center justify-center">
              <Sparkles className="w-24 h-24 text-gold/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-cream/50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-playfair), serif' }}>Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Leaf, title: 'Natural Ingredients', desc: 'We carefully select the finest natural ingredients for gentle yet effective formulas.' },
              { icon: Heart, title: 'Cruelty Free', desc: 'Never tested on animals. Beauty without cruelty is our promise.' },
              { icon: Shield, title: 'Dermatologist Tested', desc: 'Every product is rigorously tested and approved by skincare professionals.' },
              { icon: Award, title: 'Premium Quality', desc: 'Only the best ingredients and formulations make it into our products.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <item.icon className="w-8 h-8 text-gold" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CEO */}
      <section className="py-16 bg-gradient-to-b from-cream/30 to-transparent">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <Badge className="bg-gold/10 text-gold border-gold/20 mb-3">Leadership</Badge>
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Our Founder</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-lg mx-auto text-center">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden shadow-lg shadow-gold/10 ring-4 ring-gold/20">
              <Image src="/images/team/ceo-nina-angel.png" alt="Nina Angel - Founder & CEO" width={128} height={128} className="w-full h-full object-cover" />
            </div>
            <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair), serif' }}>Nina Angel</h3>
            <p className="text-gold font-semibold text-sm tracking-wide uppercase mb-4">Founder & CEO</p>
            <p className="text-muted-foreground leading-relaxed">
              With a passion for beauty and a commitment to quality, Nina Angel founded Angel&apos;s Beauty Skincare to empower women to embrace their natural radiance. Her vision drives every product we create, ensuring that premium skincare is accessible to all.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
