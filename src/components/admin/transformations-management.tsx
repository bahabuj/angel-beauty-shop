'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Loader2,
  Upload,
  X,
  GripVertical,
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

interface Transformation {
  id: string
  name: string
  duration: string
  result: string
  beforeImg: string
  afterImg: string
  active: boolean
  order: number
}

interface FormData {
  name: string
  duration: string
  result: string
  beforeImg: string
  afterImg: string
  order: number
  active: boolean
}

const EMPTY_FORM: FormData = {
  name: '',
  duration: '',
  result: '',
  beforeImg: '',
  afterImg: '',
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
  label,
}: {
  onUploadComplete: (url: string) => void
  currentUrl: string
  onClear: () => void
  label: string
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
      formData.append('folder', 'uploads/transformations')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success || data.url) {
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
        <Label className="text-muted-foreground text-xs">{label} Preview</Label>
        <div className="relative w-full aspect-video overflow-hidden rounded-lg border bg-muted/30 group">
          <Image
            src={currentUrl.trim()}
            alt={`${label} preview`}
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
      <Label className="text-muted-foreground text-xs">{label}</Label>
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

export function TransformationsManagement() {
  // ---- data state ----
  const [transformations, setTransformations] = useState<Transformation[]>([])
  const [loading, setLoading] = useState(true)

  // ---- dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Transformation | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // ---- delete confirmation state ----
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<Transformation | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---- toggle loading state (per-id) ----
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ---- data fetching ----
  const fetchTransformations = useCallback(async () => {
    try {
      const res = await fetch('/api/transformations')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setTransformations(data.data)
      } else if (Array.isArray(data)) {
        setTransformations(data)
      }
    } catch {
      toast.error('Failed to load transformations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransformations()
  }, [fetchTransformations])

  // ---- helpers ----

  const openAddDialog = useCallback(() => {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, order: transformations.length })
    setDialogOpen(true)
  }, [transformations.length])

  const openEditDialog = useCallback((item: Transformation) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      duration: item.duration,
      result: item.result,
      beforeImg: item.beforeImg,
      afterImg: item.afterImg,
      order: item.order,
      active: item.active,
    })
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
  }, [])

  const openDeleteDialog = useCallback((item: Transformation) => {
    setDeletingItem(item)
    setDeleteOpen(true)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteOpen(false)
    setDeletingItem(null)
  }, [])

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ---- handlers ----

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (!form.duration.trim()) {
      toast.error('Duration is required')
      return
    }
    if (!form.result.trim()) {
      toast.error('Result is required')
      return
    }
    if (!form.beforeImg.trim()) {
      toast.error('Before image is required')
      return
    }
    if (!form.afterImg.trim()) {
      toast.error('After image is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        duration: form.duration.trim(),
        result: form.result.trim(),
        beforeImg: form.beforeImg.trim(),
        afterImg: form.afterImg.trim(),
        order: form.order,
        active: form.active,
      }

      if (editingItem) {
        const res = await fetch(`/api/transformations/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) {
          toast.error(data.error || 'Failed to update transformation')
          return
        }
        toast.success('Transformation updated')
      } else {
        const res = await fetch('/api/transformations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) {
          toast.error(data.error || 'Failed to create transformation')
          return
        }
        toast.success('Transformation created')
      }
      await fetchTransformations()
      closeDialog()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/transformations/${deletingItem.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to delete transformation')
        return
      }
      toast.success('Transformation deleted')
      await fetchTransformations()
      closeDeleteDialog()
    } catch {
      toast.error('Failed to delete transformation. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (item: Transformation) => {
    setTogglingId(item.id)
    try {
      const res = await fetch(`/api/transformations/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to toggle status')
        return
      }
      toast.success(item.active ? 'Transformation deactivated' : 'Transformation activated')
      await fetchTransformations()
    } catch {
      toast.error('Failed to toggle transformation status.')
    } finally {
      setTogglingId(null)
    }
  }

  // ---- sorted transformations by order ----
  const sorted = [...transformations].sort((a, b) => a.order - b.order)

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
                Before and After Images
              </h2>
              <Badge className="bg-gold/15 text-gold border-gold/20 hover:bg-gold/20">
                {transformations.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage customer transformation entries with before &amp; after photos
            </p>
          </div>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-gold text-white shadow-md hover:bg-gold-light gap-2"
        >
          <Plus className="size-4" />
          Add Transformation
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Loading State                                                     */}
      {/* ----------------------------------------------------------------- */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 text-gold animate-spin" />
          <span className="ml-3 text-muted-foreground">Loading transformations...</span>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Empty State                                                       */}
      {/* ----------------------------------------------------------------- */}
      {!loading && sorted.length === 0 && (
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
                No transformations yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70 max-w-sm">
                Add before &amp; after image entries to showcase customer
                results and transformations.
              </p>
              <Button
                onClick={openAddDialog}
                variant="outline"
                className="mt-6 border-gold/30 text-gold hover:bg-gold/10 gap-2"
              >
                <Plus className="size-4" />
                Add Your First Transformation
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Transformations List (single column cards)                        */}
      {/* ----------------------------------------------------------------- */}
      {!loading && sorted.length > 0 && (
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {sorted.map((item, i) => (
              <motion.div
                key={item.id}
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
                    item.active
                      ? 'border-l-gold'
                      : 'border-l-muted-foreground/30'
                  )}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* ----- Before / After Images ----- */}
                    <div className="w-full sm:w-80 shrink-0">
                      <div className="flex items-stretch">
                        {/* Before Image */}
                        <div className="relative flex-1 aspect-square sm:aspect-auto sm:h-full overflow-hidden">
                          {item.beforeImg ? (
                            <Image
                              src={item.beforeImg}
                              alt={`Before - ${item.name}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, 160px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center bg-muted/30">
                              <ImageIcon className="size-6 text-muted-foreground/30" />
                            </div>
                          )}
                          <Badge
                            className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0 bg-black/60 text-white border-0 hover:bg-black/60"
                          >
                            Before
                          </Badge>
                        </div>

                        {/* Arrow Divider */}
                        <div className="flex items-center justify-center bg-muted/20 px-1.5 shrink-0">
                          <ArrowRight className="size-4 text-gold" />
                        </div>

                        {/* After Image */}
                        <div className="relative flex-1 aspect-square sm:aspect-auto sm:h-full overflow-hidden">
                          {item.afterImg ? (
                            <Image
                              src={item.afterImg}
                              alt={`After - ${item.name}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, 160px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center bg-muted/30">
                              <ImageIcon className="size-6 text-muted-foreground/30" />
                            </div>
                          )}
                          <Badge
                            className="absolute bottom-1.5 right-1.5 text-[9px] px-1.5 py-0 bg-gold/90 text-white border-0 hover:bg-gold/90"
                          >
                            After
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* ----- Content ----- */}
                    <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
                      <div className="space-y-3">
                        {/* Name + Order row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base leading-snug">
                              {item.name}
                            </CardTitle>
                            <CardDescription className="mt-1 text-sm">
                              {item.duration}
                            </CardDescription>
                          </div>

                          {/* Order badge */}
                          <div className="flex items-center gap-1 shrink-0">
                            <GripVertical className="size-3.5 text-muted-foreground/40" />
                            <span className="text-xs font-medium text-muted-foreground/60">
                              #{item.order}
                            </span>
                          </div>
                        </div>

                        {/* Result */}
                        <div className="flex items-start gap-2">
                          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50 text-[10px] px-1.5 py-0 shrink-0">
                            Result
                          </Badge>
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {item.result}
                          </span>
                        </div>

                        {/* Active toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                'text-[10px] px-1.5 py-0',
                                item.active
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50'
                                  : 'bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted'
                              )}
                            >
                              {item.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.active}
                              onCheckedChange={() => handleToggle(item)}
                              disabled={togglingId === item.id}
                              className={cn(
                                'data-[state=checked]:bg-gold',
                                togglingId === item.id && 'opacity-50'
                              )}
                            />
                            <span
                              className={cn(
                                'text-xs font-medium',
                                item.active
                                  ? 'text-gold'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {togglingId === item.id
                                ? '...'
                                : item.active
                                  ? 'Active'
                                  : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="flex-1 gap-1.5 text-xs"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(item)}
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
              {editingItem ? 'Edit Transformation' : 'Add Transformation'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the details of this before & after entry.'
                : 'Create a new before & after transformation entry.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="transformation-name">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="transformation-name"
                placeholder="e.g. Sarah J."
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            {/* Duration */}
            <div className="grid gap-2">
              <Label htmlFor="transformation-duration">
                Duration <span className="text-destructive">*</span>
              </Label>
              <Input
                id="transformation-duration"
                placeholder="e.g. 4 weeks"
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
              />
            </div>

            {/* Result */}
            <div className="grid gap-2">
              <Label htmlFor="transformation-result">
                Result <span className="text-destructive">*</span>
              </Label>
              <Input
                id="transformation-result"
                placeholder="e.g. Smoother, brighter skin"
                value={form.result}
                onChange={(e) => updateField('result', e.target.value)}
              />
            </div>

            {/* Before Image Upload */}
            <ImageUploadDropzone
              label="Before Image"
              onUploadComplete={(url) => updateField('beforeImg', url)}
              currentUrl={form.beforeImg}
              onClear={() => updateField('beforeImg', '')}
            />

            {/* OR divider for before image */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Before Image URL manual input */}
            <div className="grid gap-2">
              <Label htmlFor="before-img-url">
                Before Image URL <span className="text-muted-foreground text-xs">(manual)</span>
              </Label>
              <Input
                id="before-img-url"
                placeholder="Paste image URL or upload above"
                value={form.beforeImg}
                onChange={(e) => updateField('beforeImg', e.target.value)}
              />
            </div>

            {/* After Image Upload */}
            <ImageUploadDropzone
              label="After Image"
              onUploadComplete={(url) => updateField('afterImg', url)}
              currentUrl={form.afterImg}
              onClear={() => updateField('afterImg', '')}
            />

            {/* OR divider for after image */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* After Image URL manual input */}
            <div className="grid gap-2">
              <Label htmlFor="after-img-url">
                After Image URL <span className="text-muted-foreground text-xs">(manual)</span>
              </Label>
              <Input
                id="after-img-url"
                placeholder="Paste image URL or upload above"
                value={form.afterImg}
                onChange={(e) => updateField('afterImg', e.target.value)}
              />
            </div>

            {/* Order + Active */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="transformation-order">Order / Priority</Label>
                <Input
                  id="transformation-order"
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
              disabled={
                saving ||
                !form.name.trim() ||
                !form.duration.trim() ||
                !form.result.trim() ||
                !form.beforeImg.trim() ||
                !form.afterImg.trim()
              }
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
            <AlertDialogTitle>Delete Transformation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {deletingItem ? (
                <span className="font-semibold text-foreground">
                  {' "'}
                  {deletingItem.name}
                  {'" '}
                </span>
              ) : (
                ' this transformation'
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

export default TransformationsManagement
export type { Transformation, FormData as TransformationFormData }
