import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })

    // Get product counts grouped by categorySlug
    const productCounts = await db.product.groupBy({
      by: ['categorySlug'],
      _count: { id: true },
    })

    const countMap = new Map(
      productCounts.map((item) => [item.categorySlug, item._count.id])
    )

    const categoriesWithCount = categories.map((category) => ({
      ...category,
      productCount: countMap.get(category.slug) ?? 0,
      _count: {
        products: countMap.get(category.slug) ?? 0,
      },
    }))

    return NextResponse.json({ success: true, categories: categoriesWithCount })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug, description, image, order, active } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const finalSlug = slug?.trim() || slugify(name)

    // Check for duplicate slug
    const existing = await db.category.findUnique({ where: { slug: finalSlug } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A category with this slug already exists' },
        { status: 409 }
      )
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        image: image?.trim() || null,
        order: typeof order === 'number' ? order : 0,
        active: typeof active === 'boolean' ? active : true,
      },
    })

    return NextResponse.json({ success: true, category }, { status: 201 })
  } catch (error) {
    console.error('Failed to create category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
