import { NextRequest, NextResponse } from 'next/server'
import { uploadFileToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'] as const
const MAX_IMAGE_BYTES = 50 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

function sanitizeFolderLocal(raw: string): string {
  const DEFAULT = 'uploads'
  if (!raw) return DEFAULT
  let s = String(raw).trim().replace(/^\/+/, '').replace(/\/+$/, '')
  if (!s) return DEFAULT
  s = s.replace(/[^a-zA-Z0-9/_-]+/g, '-')
  if (s.split('/').some((seg) => seg === '..' || seg === '.')) return DEFAULT
  return s || DEFAULT
}

function pickExtension(filename: string, mime: string): string {
  const fromName = path.extname(filename || '').toLowerCase()
  if (fromName && /^\.[a-z0-9]{1,8}$/.test(fromName)) return fromName
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/svg+xml': '.svg',
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogv',
    'video/quicktime': '.mov', 'video/x-matroska': '.mkv',
  }
  return map[mime] || ''
}

async function saveToLocalDisk(file: File, folderRaw: string) {
  const folder = sanitizeFolderLocal(folderRaw)
  const isVideo = file.type.startsWith('video/')
  const resourceType: 'image' | 'video' = isVideo ? 'video' : 'image'
  const ext = pickExtension(file.name || '', file.type)
  const id = randomUUID()
  const filename = `${id}${ext}`
  const publicRoot = path.join(process.cwd(), 'public')
  const dir = path.join(publicRoot, 'uploads', folder)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  const fullPath = path.join(dir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)
  const url = `/uploads/${folder}/${filename}`
  const publicId = `local/${folder}/${id}`
  return { url, publicId, folder, format: ext.replace(/^\./, '') || (isVideo ? 'mp4' : 'jpg'), resourceType, bytes: buffer.length }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const folderRaw = formData.get('folder')
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 })
    if (file.size === 0) return NextResponse.json({ success: false, error: 'File is empty (0 bytes).' }, { status: 400 })
    const mime = file.type || ''
    const isAllowed = ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))
    if (!isAllowed) return NextResponse.json({ success: false, error: `Unsupported file type: "${mime || 'unknown'}". Only images and videos are allowed.` }, { status: 400 })
    const isVideo = mime.startsWith('video/')
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (file.size > maxBytes) return NextResponse.json({ success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum for ${isVideo ? 'videos' : 'images'} is ${maxBytes / 1024 / 1024} MB.` }, { status: 400 })
    const folder = folderRaw instanceof File ? '' : String(folderRaw || '')

    if (isCloudinaryConfigured()) {
      try {
        const result = await uploadFileToCloudinary(file, { folder })
        return NextResponse.json({ success: true, url: result.url, secureUrl: result.secureUrl, publicId: result.publicId, folder: result.folder, format: result.format, resourceType: result.resourceType, width: result.width, height: result.height, size: result.bytes, mimeType: mime, storage: 'cloudinary' }, { status: 200 })
      } catch (err) {
        console.error('[upload] Cloudinary upload failed, falling back to local disk:', err)
      }
    }

    try {
      const local = await saveToLocalDisk(file, folder)
      return NextResponse.json({ success: true, url: local.url, secureUrl: local.url, publicId: local.publicId, folder: local.folder, format: local.format, resourceType: local.resourceType, size: local.bytes, mimeType: mime, storage: 'local' }, { status: 200 })
    } catch (err) {
      console.error('[upload] Local disk upload failed:', err)
      const message = err instanceof Error ? err.message : 'Upload failed.'
      return NextResponse.json({ success: false, error: `Local disk upload failed: ${message}` }, { status: 500 })
    }
  } catch (error) {
    console.error('[upload] unhandled error:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, endpoint: 'POST /api/upload', accepts: 'multipart/form-data with "file" (File) and optional "folder" (string)', response: { success: true, url: '/uploads/products/<uuid>.jpg' }, storage: isCloudinaryConfigured() ? 'cloudinary' : 'local-disk-fallback', configured: isCloudinaryConfigured(), limits: { maxImageBytes: MAX_IMAGE_BYTES, maxVideoBytes: MAX_VIDEO_BYTES, allowedMimePrefixes: [...ALLOWED_MIME_PREFIXES] } })
}
