import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const { name, slug, description, image, order, active } = body

    // If slug is being changed, check for duplicates
    if (slug !== undefined && slug.trim() !== existing.slug) {
      const duplicate = await db.category.findUnique({
        where: { slug: slug.trim() },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'A category with this slug already exists' },
          { status: 409 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (slug !== undefined) data.slug = slug.trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (image !== undefined) data.image = image?.trim() || null
    if (order !== undefined) data.order = order
    if (active !== undefined) data.active = active

    const category = await db.category.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Failed to update category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    await db.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
