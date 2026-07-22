import { v2 as cloudinary } from 'cloudinary'

let configured = false
function ensureConfigured() {
  if (configured) return
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.')
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })
  configured = true
}

export interface CloudinaryUploadResult {
  success: true
  url: string
  publicId: string
  secureUrl: string
  width?: number
  height?: number
  format: string
  resourceType: 'image' | 'video'
  bytes: number
  folder: string
}

export interface CloudinaryUploadOptions {
  folder: string
  tags?: string[]
}

function sanitizeFolder(raw: string): string {
  const DEFAULT = 'uploads'
  if (!raw) return DEFAULT
  let s = String(raw).trim()
  if (!s) return DEFAULT
  s = s.replace(/^\/+uploads\/+/i, '').replace(/^uploads\/+/i, '')
  if (/^uploads$/i.test(s)) return DEFAULT
  s = s.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '/')
  if (s.split('/').some((seg) => seg === '..' || seg === '.')) throw new Error('Invalid folder path')
  s = s.replace(/[^a-zA-Z0-9/_-]+/g, '-')
  return s || DEFAULT
}

export async function uploadFileToCloudinary(
  file: File,
  options: CloudinaryUploadOptions,
): Promise<CloudinaryUploadResult> {
  ensureConfigured()
  const folder = sanitizeFolder(options.folder)
  const resourceType: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image'
  const buffer = Buffer.from(await file.arrayBuffer())

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, tags: [folder, ...(options.tags ?? [])], secure: true },
      (error, result) => {
        if (error) { reject(error); return }
        if (!result) { reject(new Error('Cloudinary returned no result')); return }
        resolve({
          success: true,
          url: result.secure_url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          resourceType,
          bytes: result.bytes,
          folder,
        })
      },
    )
    uploadStream.end(buffer)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  ensureConfigured()
  await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' })
}

export function isCloudinaryConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
}

export { cloudinary }
