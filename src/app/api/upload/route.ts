import { NextRequest, NextResponse } from 'next/server'
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary'

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'] as const
const MAX_IMAGE_BYTES = 50 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export async function POST(request: NextRequest) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.' },
      { status: 500 },
    )
  }
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const folderRaw = formData.get('folder')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ success: false, error: 'File is empty (0 bytes).' }, { status: 400 })
    }
    const mime = file.type || ''
    const isAllowed = ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: `Unsupported file type: "${mime || 'unknown'}". Only images and videos are allowed.` }, { status: 400 })
    }
    const isVideo = mime.startsWith('video/')
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (file.size > maxBytes) {
      return NextResponse.json({ success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum for ${isVideo ? 'videos' : 'images'} is ${maxBytes / 1024 / 1024} MB.` }, { status: 400 })
    }
    const folder = folderRaw instanceof File ? '' : String(folderRaw || '')
    let result
    try {
      result = await uploadFileToCloudinary(file, { folder })
    } catch (err) {
      console.error('[upload] Cloudinary upload failed:', err)
      const message = err instanceof Error ? err.message : 'Upload failed.'
      return NextResponse.json({ success: false, error: `Cloudinary upload failed: ${message}` }, { status: 500 })
    }
    return NextResponse.json({
      success: true,
      url: result.url,
      secureUrl: result.secureUrl,
      publicId: result.publicId,
      folder: result.folder,
      format: result.format,
      resourceType: result.resourceType,
      width: result.width,
      height: result.height,
      size: result.bytes,
      mimeType: mime,
    }, { status: 200 })
  } catch (error) {
    console.error('[upload] unhandled error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    endpoint: 'POST /api/upload',
    accepts: 'multipart/form-data with "file" (File) and optional "folder" (string)',
    response: { success: true, url: 'https://res.cloudinary.com/<cloud>/...' },
    storage: 'Cloudinary',
    configured: isCloudinaryConfigured(),
    limits: { maxImageBytes: MAX_IMAGE_BYTES, maxVideoBytes: MAX_VIDEO_BYTES, allowedMimePrefixes: [...ALLOWED_MIME_PREFIXES] },
  })
}
