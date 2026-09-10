import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── POST /api/user/avatar ──────────────────────────────────────────────────
// Uploads an avatar image for the currently-logged-in user (customer or admin).
//
// Accepts multipart/form-data:
//   file: File (the image — JPG, PNG, WebP, GIF up to 5MB)
//
// The image is uploaded to Cloudinary (or local disk fallback via /api/upload)
// and the resulting URL is stored on the User record in both `avatar` and
// `image` fields. The updated user object is returned.
//
// Auth: requires a valid NextAuth session. The user is identified by the
// session's user.id — no client-supplied user ID is trusted.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'You must be signed in to upload an avatar.' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file provided.' },
        { status: 400 }
      )
    }
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty.' },
        { status: 400 }
      )
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${file.type}. Use JPG, PNG, WebP, or GIF.` },
        { status: 400 }
      )
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.` },
        { status: 400 }
      )
    }

    // Upload via the existing /api/upload endpoint (Cloudinary or local fallback)
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('folder', 'avatars')

    const uploadRes = await fetch(`${req.nextUrl.origin}/api/upload`, {
      method: 'POST',
      body: uploadFormData,
    })
    const uploadData = await uploadRes.json()

    if (!uploadData.success || !uploadData.url) {
      return NextResponse.json(
        { success: false, error: uploadData.error || 'Image upload failed.' },
        { status: 500 }
      )
    }

    const avatarUrl = uploadData.url as string

    // Update the user record (both avatar + image fields, since some code reads one, some the other)
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        avatar: avatarUrl,
        image: avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        image: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: updated,
      avatar: avatarUrl,
    })
  } catch (error: any) {
    console.error('[User Avatar POST] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload avatar.' },
      { status: 500 }
    )
  }
}

// ─── GET /api/user/avatar ───────────────────────────────────────────────────
// Returns the current user's avatar URL.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not signed in.' },
        { status: 401 }
      )
    }
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true, image: true },
    })
    return NextResponse.json({
      success: true,
      avatar: user?.avatar || user?.image || null,
    })
  } catch (error: any) {
    console.error('[User Avatar GET] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch avatar.' },
      { status: 500 }
    )
  }
}
