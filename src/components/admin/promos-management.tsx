'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  GripVertical,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

interface Promo {
  id: string
  title: string
  subtitle: string | null
  image: string | null
  ctaText: string | null
  ctaLink: string | null
  active: boolean
  order: number
}

interface PromosManagementProps {
  promos: Promo[]
  onSave: (data: Record<string, unknown>, isEdit: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleActive: (id: string, active: boolean) => Promise<void>
}

interface FormData {
  title: string
  subtitle: string
  image: string
  ctaText: string
  ctaLink: string
  order: number
  active: boolean
}

const EMPTY_FORM: FormData = {
  title: '',
  subtitle: '',
  image: '',
  ctaText: '',
  ctaLink: '',
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
// Image Upload Dropzone Component
// ---------------------------------------------------------------------------

function ImageUploadDropzone({
  onUploadComplete,
  currentUrl,
  onClear,
}: {
  onUploadComplete: (url: string) => void
  currentUrl: string
  onClear: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const uploadFile = async (file: File) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

    if (!allowedImageTypes.includes(file.type)) {
      toast.error('Please select an image file (JPEG, PNG, GIF, WebP, SVG)')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'uploads/promos')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        onUploadComplete(data.url)
        toast.success('Image uploaded successfully!')
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
        <Label className="text-muted-foreground text-xs">Image Preview</Label>
        <div className="relative w-full aspect-video overflow-hidden rounded-lg border bg-muted/30 group">
          <Image
            src={currentUrl.trim()}
            alt="Promo image preview"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 480px"
            unoptimized
          />
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
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
      </div>
    )
  }

  // No URL yet — show upload dropzone
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">
        Banner Image <span className="text-destructive">*</span>
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
              <ImageIcon className="size-6 text-gold/60" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-foreground/70">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, GIF, WebP, SVG — Max 50MB
              </p>
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromosManagement({
  promos,
  onSave,
  onDelete,
  onToggleActive,
}: PromosManagementProps) {
  // ---- dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // ---- delete confirmation state ----
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingPromo, setDeletingPromo] = useState<Promo | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---- toggle loading state (per-id) ----
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ---- helpers ----

  const openAddDialog = useCallback(() => {
    setEditingPromo(null)
    setForm({ ...EMPTY_FORM, order: promos.length })
    setDialogOpen(true)
  }, [promos.length])

  const openEditDialog = useCallback((promo: Promo) => {
    setEditingPromo(promo)
    setForm({
      title: promo.title,
      subtitle: promo.subtitle ?? '',
      image: promo.image ?? '',
      ctaText: promo.ctaText ?? '',
      ctaLink: promo.ctaLink ?? '',
      order: promo.order,
      active: promo.active,
    })
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingPromo(null)
    setForm(EMPTY_FORM)
  }, [])

  const openDeleteDialog = useCallback((promo: Promo) => {
    setDeletingPromo(promo)
    setDeleteOpen(true)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteOpen(false)
    setDeletingPromo(null)
  }, [])

  // ---- handlers ----

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)
    try {
      const data: Record<string, unknown> = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image: form.image.trim() || null,
        ctaText: form.ctaText.trim() || null,
        ctaLink: form.ctaLink.trim() || null,
        order: form.order,
        active: form.active,
      }
      if (editingPromo) {
        data.id = editingPromo.id
      }
      await onSave(data, !!editingPromo)
      toast.success(editingPromo ? 'Promo updated' : 'Promo created')
      closeDialog()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingPromo) return
    setDeleting(true)
    try {
      await onDelete(deletingPromo.id)
      toast.success('Promo deleted')
      closeDeleteDialog()
    } catch {
      toast.error('Failed to delete promo. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (promo: Promo) => {
    setTogglingId(promo.id)
    try {
      await onToggleActive(promo.id, !promo.active)
      toast.success(promo.active ? 'Promo deactivated' : 'Promo activated')
    } catch {
      toast.error('Failed to toggle promo status.')
    } finally {
      setTogglingId(null)
    }
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ---- sorted promos ----
  const sorted = [...promos].sort((a, b) => a.order - b.order)

  // ---- render ----

  return (
    <section className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gold/10">
            <Megaphone className="size-5 text-gold" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Promo Banners</h2>
            <Badge className="bg-gold/15 text-gold border-gold/20 hover:bg-gold/20">
              {promos.length}
            </Badge>
          </div>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-gold text-white shadow-md hover:bg-gold-light gap-2"
        >
          <Plus className="size-4" />
          Add Promo
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Promo Cards Grid                                                  */}
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
                <Megaphone className="size-8 text-gold/50" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">
                No promo banners yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70 max-w-sm">
                Create your first promo banner to highlight special offers,
                announcements, or featured content.
              </p>
              <Button
                onClick={openAddDialog}
                variant="outline"
                className="mt-6 border-gold/30 text-gold hover:bg-gold/10 gap-2"
              >
                <Plus className="size-4" />
                Add Your First Promo
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {sorted.map((promo, i) => (
              <motion.div
                key={promo.id}
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
                    promo.active
                      ? 'border-l-gold'
                      : 'border-l-muted-foreground/30'
                  )}
                >
                  {/* Image Preview */}
                  {promo.image ? (
                    <div className="relative w-full aspect-[2/1] overflow-hidden">
                      <Image
                        src={promo.image}
                        alt={promo.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      {/* Title overlay on image */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1">
                          {promo.title}
                        </h3>
                        {promo.subtitle && (
                          <p className="text-white/80 text-xs mt-0.5 line-clamp-1">
                            {promo.subtitle}
                          </p>
                        )}
                      </div>
                      {/* Order badge */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <GripVertical className="size-3 text-white/60" />
                        <span className="text-[10px] font-medium text-white/80">
                          #{promo.order}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base leading-snug pr-8">
                          {promo.title}
                        </CardTitle>
                        <div className="flex items-center gap-1 shrink-0">
                          <GripVertical className="size-3.5 text-muted-foreground/40" />
                          <span className="text-xs font-medium text-muted-foreground/60">
                            #{promo.order}
                          </span>
                        </div>
                      </div>
                      {promo.subtitle && (
                        <CardDescription className="line-clamp-2 text-sm">
                          {promo.subtitle}
                        </CardDescription>
                      )}
                    </CardHeader>
                  )}

                  <CardContent className="space-y-3 pb-2 pt-3">
                    {/* CTA info */}
                    {(promo.ctaText || promo.ctaLink) && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blush px-2 py-0.5 text-xs font-medium text-gold">
                          {promo.ctaText || 'CTA'}
                        </span>
                        {promo.ctaLink && (
                          <a
                            href={promo.ctaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold transition-colors truncate max-w-[160px]"
                          >
                            <ExternalLink className="size-3 shrink-0" />
                            <span className="truncate">
                              {promo.ctaLink.replace(/^https?:\/\//, '')}
                            </span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={promo.active}
                          onCheckedChange={() => handleToggle(promo)}
                          disabled={togglingId === promo.id}
                          className={cn(
                            'data-[state=checked]:bg-gold',
                            togglingId === promo.id && 'opacity-50'
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs font-medium',
                            promo.active
                              ? 'text-gold'
                              : 'text-muted-foreground'
                          )}
                        >
                          {promo.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <Badge
                        variant={promo.active ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          promo.active
                            ? 'bg-gold/15 text-gold border-gold/20'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {promo.active ? 'LIVE' : 'OFF'}
                      </Badge>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(promo)}
                      className="flex-1 gap-1.5 text-xs"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(promo)}
                      className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </CardFooter>
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
              <Megaphone className="size-5 text-gold" />
              {editingPromo ? 'Edit Promo Banner' : 'Add Promo Banner'}
            </DialogTitle>
            <DialogDescription>
              {editingPromo
                ? 'Update the details of this promo banner.'
                : 'Create a new promo banner to display on your site.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="promo-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="promo-title"
                placeholder="e.g. Summer Sale 50% Off"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>

            {/* Subtitle */}
            <div className="grid gap-2">
              <Label htmlFor="promo-subtitle">Subtitle</Label>
              <Input
                id="promo-subtitle"
                placeholder="e.g. Limited time offer on all services"
                value={form.subtitle}
                onChange={(e) => updateField('subtitle', e.target.value)}
              />
            </div>

            {/* Image Upload */}
            <ImageUploadDropzone
              onUploadComplete={(url) => updateField('image', url)}
              currentUrl={form.image}
              onClear={() => updateField('image', '')}
            />

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Image URL manual input */}
            <div className="grid gap-2">
              <Label htmlFor="promo-image-url">
                Image URL <span className="text-muted-foreground text-xs">(manual)</span>
              </Label>
              <Input
                id="promo-image-url"
                placeholder="Paste image URL or upload above"
                value={form.image}
                onChange={(e) => updateField('image', e.target.value)}
              />
            </div>

            {/* CTA Text + Link */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="promo-cta-text">CTA Text</Label>
                <Input
                  id="promo-cta-text"
                  placeholder="e.g. Shop Now"
                  value={form.ctaText}
                  onChange={(e) => updateField('ctaText', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-cta-link">CTA Link</Label>
                <Input
                  id="promo-cta-link"
                  placeholder="e.g. /services"
                  value={form.ctaLink}
                  onChange={(e) => updateField('ctaLink', e.target.value)}
                />
              </div>
            </div>

            {/* Order + Active */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="promo-order">Order / Priority</Label>
                <Input
                  id="promo-order"
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
              disabled={saving || !form.title.trim()}
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
      <AlertDialog open={deleteOpen} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this promo banner
              {deletingPromo ? (
                <span className="font-semibold text-foreground">
                  {' "'}
                  {deletingPromo.title}
                  {'" '}
                </span>
              ) : (
                ''
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

export default PromosManagement
