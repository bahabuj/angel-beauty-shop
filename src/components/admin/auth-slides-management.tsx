'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Image as ImageIcon,
  Video,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  GripVertical,
  Copy,
  Check,
  Upload,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthSlide {
  id: string
  title: string
  subtitle: string | null
  mediaUrl: string
  mediaType: string
  active: boolean
  order: number
}

interface AuthSlidesManagementProps {
  slides: Array<{
    id: string
    title: string
    subtitle: string | null
    mediaUrl: string
    mediaType: string
    active: boolean
    order: number
  }>
  onSave: (data: Record<string, unknown>, isEdit: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleActive: (id: string, active: boolean) => Promise<void>
}

interface FormData {
  title: string
  subtitle: string
  mediaUrl: string
  mediaType: string
  order: number
  active: boolean
}

const EMPTY_FORM: FormData = {
  title: '',
  subtitle: '',
  mediaUrl: '',
  mediaType: 'image',
  order: 0,
  active: true,
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate a URL for display */
function truncateUrl(url: string, maxLen = 40): string {
  if (url.length <= maxLen) return url
  return url.slice(0, maxLen - 3) + '...'
}

// ---------------------------------------------------------------------------
// Upload Dropzone Component
// ---------------------------------------------------------------------------

function MediaUploadDropzone({
  mediaType,
  onUploadComplete,
  currentUrl,
  onClear,
}: {
  mediaType: string
  onUploadComplete: (url: string) => void
  currentUrl: string
  onClear: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const uploadFile = async (file: File) => {
    // Validate type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']

    if (mediaType === 'image' && !allowedImageTypes.includes(file.type)) {
      toast.error('Please select an image file (JPEG, PNG, GIF, WebP, SVG)')
      return
    }
    if (mediaType === 'video' && !allowedVideoTypes.includes(file.type)) {
      toast.error('Please select a video file (MP4, WebM, OGG)')
      return
    }
    if (!allowedImageTypes.includes(file.type) && !allowedVideoTypes.includes(file.type)) {
      toast.error('Unsupported file type')
      return
    }

    // Validate size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'uploads/auth-slides')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        onUploadComplete(data.url)
        toast.success('File uploaded successfully!')
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  // If there's already a URL, show preview with option to change
  if (currentUrl.trim()) {
    return (
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Media Preview</Label>
        <div className="relative w-full aspect-video overflow-hidden rounded-lg border bg-muted/30 group">
          {mediaType === 'image' ? (
            <Image
              src={currentUrl.trim()}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 480px"
              unoptimized
            />
          ) : (
            <video
              src={currentUrl.trim()}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className="size-full object-cover"
            />
          )}
          {/* Overlay with change/remove buttons */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 text-xs"
            >
              <Upload className="size-3.5" />
              Change
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onClear}
              className="gap-1.5 text-xs"
            >
              <X className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{currentUrl}</p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={mediaType === 'image' ? 'image/*' : 'video/*'}
          onChange={handleFileSelect}
        />
      </div>
    )
  }

  // No URL yet — show upload dropzone
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">
        Upload {mediaType === 'image' ? 'Image' : 'Video'}
      </Label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          'relative w-full aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3',
          dragOver
            ? 'border-gold bg-gold/5 scale-[1.02]'
            : 'border-muted-foreground/25 hover:border-gold/50 hover:bg-blush/20',
          uploading && 'pointer-events-none opacity-60'
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="size-8 text-gold animate-spin" />
            <p className="text-sm font-medium text-gold">Uploading...</p>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-blush">
              {mediaType === 'image' ? (
                <ImageIcon className="size-6 text-gold/60" />
              ) : (
                <Video className="size-6 text-purple-500/60" />
              )}
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-foreground/70">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {mediaType === 'image'
                  ? 'JPEG, PNG, GIF, WebP, SVG'
                  : 'MP4, WebM, OGG — Max 50MB'}
              </p>
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={mediaType === 'image' ? 'image/*' : 'video/*'}
        onChange={handleFileSelect}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthSlidesManagement({
  slides,
  onSave,
  onDelete,
  onToggleActive,
}: AuthSlidesManagementProps) {
  // ---- dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<AuthSlide | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // ---- delete confirmation state ----
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingSlide, setDeletingSlide] = useState<AuthSlide | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---- toggle loading state (per-id) ----
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ---- copy state ----
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ---- helpers ----

  const openAddDialog = useCallback(() => {
    setEditingSlide(null)
    setForm({ ...EMPTY_FORM, order: slides.length })
    setDialogOpen(true)
  }, [slides.length])

  const openEditDialog = useCallback((slide: AuthSlide) => {
    setEditingSlide(slide)
    setForm({
      title: slide.title,
      subtitle: slide.subtitle ?? '',
      mediaUrl: slide.mediaUrl,
      mediaType: slide.mediaType,
      order: slide.order,
      active: slide.active,
    })
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingSlide(null)
    setForm(EMPTY_FORM)
  }, [])

  const openDeleteDialog = useCallback((slide: AuthSlide) => {
    setDeletingSlide(slide)
    setDeleteOpen(true)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteOpen(false)
    setDeletingSlide(null)
  }, [])

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('URL copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Failed to copy URL')
    }
  }, [])

  // ---- handlers ----

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.mediaUrl.trim()) {
      toast.error('Please upload an image/video or enter a media URL')
      return
    }

    setSaving(true)
    try {
      const data: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        mediaUrl: form.mediaUrl.trim(),
        mediaType: form.mediaType,
        order: form.order,
        active: form.active,
      }
      if (editingSlide) {
        data.id = editingSlide.id
      }
      await onSave(data, !!editingSlide)
      toast.success(editingSlide ? 'Slide updated' : 'Slide created')
      closeDialog()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingSlide) return
    setDeleting(true)
    try {
      await onDelete(deletingSlide.id)
      toast.success('Slide deleted')
      closeDeleteDialog()
    } catch {
      toast.error('Failed to delete slide. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (slide: AuthSlide) => {
    setTogglingId(slide.id)
    try {
      await onToggleActive(slide.id, !slide.active)
      toast.success(slide.active ? 'Slide deactivated' : 'Slide activated')
    } catch {
      toast.error('Failed to toggle slide status.')
    } finally {
      setTogglingId(null)
    }
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ---- sorted slides ----
  const sorted = [...slides].sort((a, b) => a.order - b.order)

  // ---- render ----

  return (
    <section className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gold/10">
            <ImageIcon className="size-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Auth Page Slides
              </h2>
              <Badge className="bg-gold/15 text-gold border-gold/20 hover:bg-gold/20">
                {slides.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage the background slideshow on the login &amp; signup page
            </p>
          </div>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-gold text-white shadow-md hover:bg-gold-light gap-2"
        >
          <Plus className="size-4" />
          Add Slide
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Slides List (single column cards)                                 */}
      {/* ----------------------------------------------------------------- */}
      {sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-dashed border-2 border-muted-foreground/20 bg-cream/40">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blush">
                <ImageIcon className="size-8 text-gold/50" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">
                No auth slides yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70 max-w-sm">
                Add background slides to make your login &amp; signup pages
                visually stunning with images or videos.
              </p>
              <Button
                onClick={openAddDialog}
                variant="outline"
                className="mt-6 border-gold/30 text-gold hover:bg-gold/10 gap-2"
              >
                <Plus className="size-4" />
                Add Your First Slide
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {sorted.map((slide, i) => (
              <motion.div
                key={slide.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <Card
                  className={cn(
                    'relative overflow-hidden transition-shadow hover:shadow-md border-l-4',
                    slide.active
                      ? 'border-l-gold'
                      : 'border-l-muted-foreground/30'
                  )}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* ----- Preview ----- */}
                    <div className="w-full sm:w-64 shrink-0">
                      <div className="relative w-full aspect-video sm:h-full sm:aspect-auto overflow-hidden rounded-t-lg sm:rounded-t-none sm:rounded-l-lg">
                        {slide.mediaType === 'image' ? (
                          <Image
                            src={slide.mediaUrl}
                            alt={slide.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 256px"
                            unoptimized
                          />
                        ) : (
                          <video
                            src={slide.mediaUrl}
                            muted
                            loop
                            autoPlay
                            playsInline
                            preload="metadata"
                            className="size-full object-cover"
                          />
                        )}
                      </div>
                    </div>

                    {/* ----- Content ----- */}
                    <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
                      <div className="space-y-3">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base leading-snug">
                              {slide.title}
                            </CardTitle>
                            {slide.subtitle && (
                              <CardDescription className="mt-1 line-clamp-2 text-sm">
                                {slide.subtitle}
                              </CardDescription>
                            )}
                          </div>

                          {/* Order badge */}
                          <div className="flex items-center gap-1 shrink-0">
                            <GripVertical className="size-3.5 text-muted-foreground/40" />
                            <span className="text-xs font-medium text-muted-foreground/60">
                              #{slide.order}
                            </span>
                          </div>
                        </div>

                        {/* Media URL row */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate max-w-[220px] sm:max-w-[300px]">
                            {truncateUrl(slide.mediaUrl)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(slide.mediaUrl, slide.id)
                            }
                            className="shrink-0 inline-flex items-center justify-center size-6 rounded-md hover:bg-muted transition-colors"
                            title="Copy URL"
                          >
                            {copiedId === slide.id ? (
                              <Check className="size-3.5 text-green-600" />
                            ) : (
                              <Copy className="size-3.5 text-muted-foreground" />
                            )}
                          </button>
                          <a
                            href={slide.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center justify-center size-6 rounded-md hover:bg-muted transition-colors"
                            title="Open URL"
                          >
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          </a>
                        </div>

                        {/* Media type badge + Active toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Media type badge */}
                            <Badge
                              className={cn(
                                'text-[10px] px-1.5 py-0 gap-1',
                                slide.mediaType === 'image'
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50'
                                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50'
                              )}
                            >
                              {slide.mediaType === 'image' ? (
                                <ImageIcon className="size-3" />
                              ) : (
                                <Video className="size-3" />
                              )}
                              {slide.mediaType === 'image' ? 'Image' : 'Video'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={slide.active}
                              onCheckedChange={() => handleToggle(slide)}
                              disabled={togglingId === slide.id}
                              className={cn(
                                'data-[state=checked]:bg-gold',
                                togglingId === slide.id && 'opacity-50'
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs font-medium',
                                slide.active
                                  ? 'text-gold'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {slide.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(slide)}
                          className="flex-1 gap-1.5 text-xs"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(slide)}
                          className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Add / Edit Dialog                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-5 text-gold" />
              {editingSlide ? 'Edit Auth Slide' : 'Add Auth Slide'}
            </DialogTitle>
            <DialogDescription>
              {editingSlide
                ? 'Update the details of this background slide.'
                : 'Create a new background slide for the login & signup page.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="slide-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slide-title"
                placeholder="e.g. Luxury Interior"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>

            {/* Subtitle */}
            <div className="grid gap-2">
              <Label htmlFor="slide-subtitle">Subtitle</Label>
              <Input
                id="slide-subtitle"
                placeholder="e.g. Experience elegance at every turn"
                value={form.subtitle}
                onChange={(e) => updateField('subtitle', e.target.value)}
              />
            </div>

            {/* Media Type */}
            <div className="grid gap-2">
              <Label>
                Media Type <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={form.mediaType}
                onValueChange={(value) => updateField('mediaType', value)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="image" id="type-image" />
                  <Label
                    htmlFor="type-image"
                    className="flex items-center gap-1.5 cursor-pointer font-normal"
                  >
                    <ImageIcon className="size-4 text-green-600" />
                    Image
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="video" id="type-video" />
                  <Label
                    htmlFor="type-video"
                    className="flex items-center gap-1.5 cursor-pointer font-normal"
                  >
                    <Video className="size-4 text-purple-600" />
                    Video
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Upload Dropzone */}
            <MediaUploadDropzone
              mediaType={form.mediaType}
              onUploadComplete={(url) => updateField('mediaUrl', url)}
              currentUrl={form.mediaUrl}
              onClear={() => updateField('mediaUrl', '')}
            />

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Media URL manual input */}
            <div className="grid gap-2">
              <Label htmlFor="slide-media-url">
                Media URL <span className="text-muted-foreground text-xs">(manual)</span>
              </Label>
              <Input
                id="slide-media-url"
                placeholder={
                  form.mediaType === 'image'
                    ? 'Paste image URL or upload above'
                    : 'Paste video URL (YouTube, Vimeo, or .mp4) or upload above'
                }
                value={form.mediaUrl}
                onChange={(e) => updateField('mediaUrl', e.target.value)}
              />
            </div>

            {/* Order + Active */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="slide-order">Order / Priority</Label>
                <Input
                  id="slide-order"
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) =>
                    updateField('order', parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Active</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      updateField('active', checked)
                    }
                    className="data-[state=checked]:bg-gold"
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      form.active ? 'text-gold' : 'text-muted-foreground'
                    )}
                  >
                    {form.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.mediaUrl.trim()}
              className="bg-gold text-white hover:bg-gold-light gap-2 min-w-[100px]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </span>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Delete Confirmation                                               */}
      {/* ----------------------------------------------------------------- */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Auth Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {deletingSlide ? (
                <span className="font-semibold text-foreground">
                  {' "'}
                  {deletingSlide.title}
                  {'" '}
                </span>
              ) : (
                ' this slide'
              )}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90 gap-2"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Deleting…
                </span>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export default AuthSlidesManagement
