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
    { name: 'Cleansers', slug: 'cleansers', description: 'Gentle cleansers for radiant skin' },
    { name: 'Moisturizers', slug: 'moisturizers', description: 'Hydrating moisturizers for all skin types' },
    { name: 'Serums', slug: 'serums', description: 'Powerful serums for targeted skincare' },
    { name: 'Face Masks', slug: 'face-masks', description: 'Luxurious face masks for deep treatment' },
    { name: 'Body Care', slug: 'body-care', description: 'Premium body care products' },
    { name: 'Lip Care', slug: 'lip-care', description: 'Soft and supple lip care essentials' },
    { name: 'Gift Sets', slug: 'gift-sets', description: 'Beautifully curated gift sets' },
    { name: 'Accessories', slug: 'accessories', description: 'Skincare tools and accessories' },
    { name: 'Whitening Products', slug: 'whitening-products', description: 'Brightening and whitening skincare products' },
    { name: 'Vagina Care', slug: 'vagina-care', description: 'Intimate care products for vaginal health' },
    { name: 'Tea', slug: 'tea', description: 'Herbal and wellness teas for beauty from within' },
    { name: 'Skin Solutions', slug: 'skin-solutions', description: 'Specialized solutions for specific skin concerns' },
    { name: 'Organic', slug: 'organic', description: '100% organic and natural skincare products' },
    { name: 'Lipsticks', slug: 'lipsticks', description: 'Beautiful lip colors and finishes' },
    { name: 'Foundation', slug: 'foundation', description: 'Flawless foundation for every skin tone' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat })
  }

  const products = [
    {
      name: 'Rose Petal Cleansing Oil', slug: 'rose-petal-cleansing-oil',
      description: 'A luxurious cleansing oil infused with rose petal extract that melts away makeup and impurities while leaving your skin soft and hydrated. This gentle formula transforms from oil to milk upon contact with water, providing a deep yet gentle cleanse.',
      price: 55, comparePrice: 79, categorySlug: 'cleansers',
      images: JSON.stringify(['/images/products/cleanser-1.jpg']),
      benefits: JSON.stringify(['Deeply cleanses without stripping moisture', 'Removes waterproof makeup', 'Leaves skin soft and supple', 'Suitable for all skin types']),
      ingredients: 'Rosa Damascena Flower Oil, Caprylic/Capric Triglyceride, PEG-20 Glyceryl Triisostearate, Prunus Amygdalus Dulcis Oil, Tocopherol',
      howToUse: 'Apply 2-3 pumps to dry skin. Gently massage in circular motions. Add water to emulsify, then rinse thoroughly.',
      stock: 45, featured: true, newArrival: true, bestSeller: true,
    },
    {
      name: 'Honey Glow Moisturizer', slug: 'honey-glow-moisturizer',
      description: 'An ultra-hydrating moisturizer enriched with raw honey and hyaluronic acid. This lightweight yet deeply nourishing formula locks in moisture for up to 72 hours, giving your skin a natural, radiant glow.',
      price: 79, comparePrice: 99, categorySlug: 'moisturizers',
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
      price: 62, comparePrice: null, categorySlug: 'face-masks',
      images: JSON.stringify(['/images/products/mask-1.jpg']),
      benefits: JSON.stringify(['Overnight skin recovery', 'Deep hydration while you sleep', 'Calms and soothes irritated skin', 'Relaxing lavender scent']),
      ingredients: 'Aqua, Lavandula Angustifolia Oil, Ceramide NP, Glycerin, Squalane, Panthenol',
      howToUse: 'Apply as the last step of your nighttime routine. Leave on overnight and rinse off in the morning.',
      stock: 50, featured: false, newArrival: true, bestSeller: false,
    },
    {
      name: 'Shea Butter Body Lotion', slug: 'shea-butter-body-lotion',
      description: 'A rich and creamy body lotion formulated with raw shea butter and coconut oil. This ultra-nourishing formula absorbs quickly to leave your entire body feeling soft, smooth, and beautifully scented.',
      price: 42, comparePrice: 55, categorySlug: 'body-care',
      images: JSON.stringify(['/images/products/body-1.jpg']),
      benefits: JSON.stringify(['24-hour moisture', 'Non-greasy fast absorption', 'Improves skin elasticity', 'Suitable for sensitive skin']),
      ingredients: 'Aqua, Butyrospermum Parkii Butter, Cocos Nucifera Oil, Glycerin, Cetearyl Alcohol, Tocopherol',
      howToUse: 'Apply generously to clean, dry skin. Massage in circular motions until fully absorbed.',
      stock: 65, featured: true, newArrival: false, bestSeller: true,
    },
    {
      name: 'Rose Lip Treatment Oil', slug: 'rose-lip-treatment-oil',
      description: 'A luxurious lip treatment oil infused with rosehip oil and vitamin E. This non-sticky formula deeply nourishes, repairs, and protects dry, chapped lips while giving a beautiful subtle rose tint.',
      price: 29, comparePrice: null, categorySlug: 'lip-care',
      images: JSON.stringify(['/images/products/lip-1.jpg']),
      benefits: JSON.stringify(['Deeply nourishes dry lips', 'Natural rose tint', 'Non-sticky formula', 'Protects against environmental damage']),
      ingredients: 'Rosa Canina Fruit Oil, Castor Oil, Vitamin E, Jojoba Oil, Beeswax',
      howToUse: 'Apply directly to lips as needed throughout the day.',
      stock: 80, featured: false, newArrival: true, bestSeller: false,
    },
    {
      name: 'Radiance Gift Set', slug: 'radiance-gift-set',
      description: 'The perfect gift for someone special. This beautifully curated set includes our best-selling Vitamin C Serum, Honey Glow Moisturizer, and Rose Petal Cleanser in a luxurious gift box.',
      price: 185, comparePrice: 229, categorySlug: 'gift-sets',
      images: JSON.stringify(['/images/products/gift-1.jpg']),
      benefits: JSON.stringify(['Complete skincare routine', 'Premium gift packaging', 'Save 21% vs buying individually', 'Includes best-sellers']),
      ingredients: 'See individual products for full ingredient lists',
      howToUse: 'Follow the complete routine: Cleanse, treat with Vitamin C Serum, moisturize with Honey Glow Moisturizer.',
      stock: 15, featured: true, newArrival: false, bestSeller: true,
    },
    {
      name: 'Jade Facial Roller', slug: 'jade-facial-roller',
      description: 'A premium jade facial roller designed to reduce puffiness, improve circulation, and enhance product absorption. This beauty tool is a must-have for your daily skincare routine.',
      price: 49, comparePrice: 69, categorySlug: 'accessories',
      images: JSON.stringify(['/images/products/roller-1.jpg']),
      benefits: JSON.stringify(['Reduces facial puffiness', 'Improves blood circulation', 'Enhances product absorption', 'Promotes lymphatic drainage']),
      ingredients: 'Natural Jade Stone, Metal Handle',
      howToUse: 'Use after applying serum or moisturizer. Roll in upward and outward motions.',
      stock: 40, featured: false, newArrival: false, bestSeller: false,
    },
    {
      name: 'Aloe Vera Gentle Cleanser', slug: 'aloe-vera-gentle-cleanser',
      description: 'A soothing gel cleanser enriched with pure aloe vera extract. Perfect for sensitive and acne-prone skin.',
      price: 35, comparePrice: 45, categorySlug: 'cleansers',
      images: JSON.stringify(['/images/products/cleanser-2.jpg']),
      benefits: JSON.stringify(['Gentle on sensitive skin', 'Soothes irritation and redness', 'Deep pore cleansing', 'Anti-inflammatory properties']),
      ingredients: 'Aqua, Aloe Barbadensis Leaf Juice, Cocamidopropyl Betaine, Glycerin, Panthenol',
      howToUse: 'Wet face with lukewarm water. Apply a small amount and work into a lather. Rinse thoroughly.',
      stock: 55, featured: false, newArrival: false, bestSeller: false,
    },
    {
      name: 'Retinol Night Repair Cream', slug: 'retinol-night-repair-cream',
      description: 'An advanced night cream formulated with encapsulated retinol and peptides. Works while you sleep to reduce fine lines and improve skin texture.',
      price: 119, comparePrice: 149, categorySlug: 'moisturizers',
      images: JSON.stringify(['/images/products/night-cream-1.jpg']),
      benefits: JSON.stringify(['Reduces fine lines and wrinkles', 'Improves skin texture', 'Boosts collagen production', 'Visible results in 4 weeks']),
      ingredients: 'Aqua, Retinol (0.3%), Palmitoyl Tripeptide-1, Glycerin, Squalane, Shea Butter',
      howToUse: 'Apply a pea-sized amount to clean, dry skin in the evening. Start 2-3 times per week.',
      stock: 20, featured: false, newArrival: true, bestSeller: false,
    },
    {
      name: 'Hyaluronic Acid Hydrating Serum', slug: 'hyaluronic-acid-hydrating-serum',
      description: 'A multi-weight hyaluronic acid serum that hydrates at every layer of the skin. Holds 1000x its weight in water for intense moisture.',
      price: 72, comparePrice: null, categorySlug: 'serums',
      images: JSON.stringify(['/images/products/ha-serum-1.jpg']),
      benefits: JSON.stringify(['Multi-depth hydration', 'Plumps fine lines', 'Lightweight water-gel texture', 'Improves skin elasticity']),
      ingredients: 'Aqua, Sodium Hyaluronate (Low MW), Sodium Hyaluronate (Medium MW), Panthenol',
      howToUse: 'Apply 2-3 drops to slightly damp skin. Gently press into face. Follow with moisturizer.',
      stock: 38, featured: true, newArrival: false, bestSeller: false,
    },
    {
      name: 'Charcoal Detox Mask', slug: 'charcoal-detox-mask',
      description: 'A purifying clay mask infused with activated charcoal and kaolin clay. Draws out impurities, unclogs pores, and controls excess oil.',
      price: 45, comparePrice: 59, categorySlug: 'face-masks',
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

  console.log('Seed data created successfully!')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })
