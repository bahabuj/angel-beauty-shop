import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@angelbeauty.com' },
    update: {},
    create: { email: 'admin@angelbeauty.com', name: 'Admin', password: 'admin123', role: 'admin' },
  })

  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: { email: 'customer@example.com', name: 'Sarah Johnson', password: 'customer123', role: 'customer', phone: '+1 617 555 0456' },
  })

  const categories = [
    // ── Standard Categories ──────────────────────────────────────────────────
    { name: 'Face cream', slug: 'face-cream', description: 'Nourishing facial creams and moisturizers' },
    { name: 'Lotion', slug: 'lotion', description: 'Hydrating body lotions' },
    { name: 'Scrubs', slug: 'scrubs', description: 'Exfoliating body and face scrubs' },
    { name: 'Soap and Cleansers', slug: 'soap-and-cleansers', description: 'Cleansing bars and gentle facial cleansers' },
    { name: 'Masks', slug: 'masks', description: 'Deep treatment face and body masks' },
    { name: 'Body Oils', slug: 'body-oils', description: 'Nourishing and restorative body oils' },
    { name: 'Serums', slug: 'serums', description: 'Powerful targeted skincare serums' },
    { name: 'Toners', slug: 'toners', description: 'Balancing and clarifying skin toners' },
    { name: 'Sunscreen', slug: 'sunscreen', description: 'Daily protective sunscreen formulations' },

    // ── Bundles ───────────────────────────────────────────────────────────────
    { name: 'Acne Bundle', slug: 'acne-bundle', description: 'Targeted care routines for clear skin' },
    { name: 'Brightening Glow', slug: 'brightening-glow', description: 'Complete routine for radiant skin' },
    { name: 'Caramel Lush', slug: 'caramel-lush', description: 'Warming complexion care sets' },
    { name: 'Lavishing Light', slug: 'lavishing-light', description: 'Illuminating skincare bundles' },
    { name: 'Whitening Lust', slug: 'whitening-lust', description: 'Tone-evening skincare collections' },
    { name: 'Luxury Snow White', slug: 'luxury-snow-white', description: 'Premium brightening collections' },

    // ── Collections ──────────────────────────────────────────────────────────
    { name: 'Tumeric Glow Collection', slug: 'tumeric-glow-collection', description: 'Golden turmeric-infused products' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    })
  }

  const products = [
    {
      name: 'Rose Petal Cleansing Oil', slug: 'rose-petal-cleansing-oil',
      description: 'A luxurious cleansing oil infused with rose petal extract that melts away makeup and impurities while leaving your skin soft and hydrated. This gentle formula transforms from oil to milk upon contact with water, providing a deep yet gentle cleanse.',
      price: 55, comparePrice: 79, categorySlug: 'soap-and-cleansers',
      images: JSON.stringify(['/images/products/cleanser-1.jpg']),
      benefits: JSON.stringify(['Deeply cleanses without stripping moisture', 'Removes waterproof makeup', 'Leaves skin soft and supple', 'Suitable for all skin types']),
      ingredients: 'Rosa Damascena Flower Oil, Caprylic/Capric Triglyceride, PEG-20 Glyceryl Triisostearate, Prunus Amygdalus Dulcis Oil, Tocopherol',
      howToUse: 'Apply 2-3 pumps to dry skin. Gently massage in circular motions. Add water to emulsify, then rinse thoroughly.',
      stock: 45, featured: true, newArrival: true, bestSeller: true,
    },
    {
      name: 'Honey Glow Moisturizer', slug: 'honey-glow-moisturizer',
      description: 'An ultra-hydrating moisturizer enriched with raw honey and hyaluronic acid. This lightweight yet deeply nourishing formula locks in moisture for up to 72 hours, giving your skin a natural, radiant glow.',
      price: 79, comparePrice: 99, categorySlug: 'face-cream',
      images: JSON.stringify(['/images/products/moisturizer-1.jpg']),
      benefits: JSON.stringify(['72-hour hydration', 'Lightweight non-greasy formula', 'Plumps and firms skin', 'Natural radiant glow']),
      ingredients: 'Aqua, Honey Extract, Sodium Hyaluronate, Glycerin, Cetearyl Alcohol, Shea Butter, Niacinamide',
      howToUse: 'Apply a generous amount to clean, toned skin. Gently massage in upward circular motions until fully absorbed.',
      stock: 32, featured: true, newArrival: false, bestSeller: true,
    },
    {
      name: 'Vitamin C Brightening Serum', slug: 'vitamin-c-brightening-serum',
      description: 'A powerful brightening serum with 20% Vitamin C and ferulic acid. This antioxidant-rich formula targets dark spots, uneven skin tone, and dullness to reveal your most radiant complexion.',
      price: 99, comparePrice: 129, categorySlug: 'serums',
      images: JSON.stringify(['/images/products/serum-1.jpg']),
      benefits: JSON.stringify(['Brightens dull skin', 'Reduces dark spots', 'Powerful antioxidant protection', 'Boosts collagen production']),
      ingredients: 'Aqua, Ascorbic Acid (20%), Ferulic Acid, Hyaluronic Acid, Vitamin E, Propanediol',
      howToUse: 'Apply 3-4 drops to clean, dry skin. Gently press into face and neck. Use in the morning followed by SPF.',
      stock: 28, featured: true, newArrival: true, bestSeller: true,
    },
    {
      name: 'Lavender Dream Sleep Mask', slug: 'lavender-dream-sleep-mask',
      description: 'An overnight recovery mask infused with lavender essential oil and ceramides. Wake up to visibly softer, smoother, and more rejuvenated skin after just one use.',
      price: 62, comparePrice: null, categorySlug: 'masks',
      images: JSON.stringify(['/images/products/mask-1.jpg']),
      benefits: JSON.stringify(['Overnight skin recovery', 'Deep hydration while you sleep', 'Calms and soothes irritated skin', 'Relaxing lavender scent']),
      ingredients: 'Aqua, Lavandula Angustifolia Oil, Ceramide NP, Glycerin, Squalane, Panthenol',
      howToUse: 'Apply as the last step of your nighttime routine. Leave on overnight and rinse off in the morning.',
      stock: 50, featured: false, newArrival: true, bestSeller: false,
    },
    {
      name: 'Shea Butter Body Lotion', slug: 'shea-butter-body-lotion',
      description: 'A rich and creamy body lotion formulated with raw shea butter and coconut oil. This ultra-nourishing formula absorbs quickly to leave your entire body feeling soft, smooth, and beautifully scented.',
      price: 42, comparePrice: 55, categorySlug: 'lotion',
      images: JSON.stringify(['/images/products/body-1.jpg']),
      benefits: JSON.stringify(['24-hour moisture', 'Non-greasy fast absorption', 'Improves skin elasticity', 'Suitable for sensitive skin']),
      ingredients: 'Aqua, Butyrospermum Parkii Butter, Cocos Nucifera Oil, Glycerin, Cetearyl Alcohol, Tocopherol',
      howToUse: 'Apply generously to clean, dry skin. Massage in circular motions until fully absorbed.',
      stock: 65, featured: true, newArrival: false, bestSeller: true,
    },
    {
      name: 'Aloe Vera Gentle Cleanser', slug: 'aloe-vera-gentle-cleanser',
      description: 'A soothing gel cleanser enriched with pure aloe vera extract. Perfect for sensitive and acne-prone skin.',
      price: 35, comparePrice: 45, categorySlug: 'soap-and-cleansers',
      images: JSON.stringify(['/images/products/cleanser-2.jpg']),
      benefits: JSON.stringify(['Gentle on sensitive skin', 'Soothes irritation and redness', 'Deep pore cleansing', 'Anti-inflammatory properties']),
      ingredients: 'Aqua, Aloe Barbadensis Leaf Juice, Cocamidopropyl Betaine, Glycerin, Panthenol',
      howToUse: 'Wet face with lukewarm water. Apply a small amount and work into a lather. Rinse thoroughly.',
      stock: 55, featured: false, newArrival: false, bestSeller: false,
    },
    {
      name: 'Charcoal Detox Mask', slug: 'charcoal-detox-mask',
      description: 'A purifying clay mask infused with activated charcoal and kaolin clay. Draws out impurities, unclogs pores, and controls excess oil.',
      price: 45, comparePrice: 59, categorySlug: 'masks',
      images: JSON.stringify(['/images/products/charcoal-mask-1.jpg']),
      benefits: JSON.stringify(['Deep pore cleansing', 'Controls excess oil', 'Draws out impurities', 'Mattifies shiny skin']),
      ingredients: 'Aqua, Kaolin, Activated Charcoal, Bentonite, Aloe Vera, Tea Tree Oil',
      howToUse: 'Apply an even layer to clean, dry skin. Leave on for 10-15 minutes. Rinse with warm water.',
      stock: 42, featured: false, newArrival: false, bestSeller: false,
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({ where: { slug: product.slug }, update: {}, create: product })
  }

  const promos = [
    { title: 'Black Friday Sale', subtitle: 'Up to 40% off on all skincare essentials', ctaText: 'Shop Sale', ctaLink: 'shop', active: true, order: 1 },
    { title: 'New Arrivals', subtitle: 'Discover our latest skincare innovations', ctaText: 'Explore Now', ctaLink: 'shop', active: true, order: 2 },
    { title: 'Free Delivery', subtitle: 'Free shipping on orders over $100', ctaText: 'Start Shopping', ctaLink: 'shop', active: true, order: 3 },
  ]
  for (const promo of promos) {
    await prisma.promoBanner.create({ data: promo })
  }

  const orders = [
    { customerName: 'Jessica Williams', email: 'jessica@email.com', phone: '+1 617 555 0123', address: '246 Union St', city: 'Lynn', state: 'MA', zipCode: '01901', country: 'United States', items: JSON.stringify([{ name: 'Rose Petal Cleansing Oil', price: 55, quantity: 2 }]), subtotal: 110, total: 110, status: 'delivered', paymentMethod: 'pay_on_delivery' },
    { customerName: 'Sarah Johnson', email: 'sarah@email.com', phone: '+1 617 555 0456', address: '100 Market St', city: 'Boston', state: 'MA', zipCode: '02101', country: 'United States', items: JSON.stringify([{ name: 'Vitamin C Brightening Serum', price: 99, quantity: 1 }]), subtotal: 99, total: 99, status: 'shipped', paymentMethod: 'pay_on_delivery' },
    { customerName: 'Emily Davis', email: 'emily@email.com', phone: '+1 617 555 0789', address: '50 Congress St', city: 'Salem', state: 'MA', zipCode: '01970', country: 'United States', items: JSON.stringify([{ name: 'Radiance Gift Set', price: 185, quantity: 1 }]), subtotal: 185, total: 185, status: 'pending', paymentMethod: 'pay_on_delivery' },
  ]
  for (const order of orders) {
    await prisma.order.create({ data: order })
  }

  const subscribers = [
    { email: 'subscriber1@email.com' }, { email: 'subscriber2@email.com' },
    { email: 'subscriber3@email.com' }, { email: 'subscriber4@email.com' }, { email: 'subscriber5@email.com' },
  ]
  for (const sub of subscribers) {
    await prisma.newsletterSubscriber.upsert({ where: { email: sub.email }, update: {}, create: sub })
  }

  console.log('Seed data updated successfully!')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })