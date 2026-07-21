'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Instagram,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspirationItem {
  id: string
  label: string
  tip: string
  image: string
  icon: string
  color: string
  active: boolean
  order: number
}

interface FormData {
  label: string
  tip: string
  image: string
  icon: string
  color: string
  active: boolean
  order: number
}

const EMPTY_FORM: FormData = {
  label: '',
  tip: '',
  image: '',
  icon: 'Sparkles',
  color: 'from-gold/80',
  active: true,
  order: 0,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_OPTIONS = [
  { value: 'Sun', label: '\u2600\uFE0F Sun' },
  { value: 'Sparkles', label: '\u2728 Sparkles' },
  { value: 'Droplets', label: '\uD83D\uDCA7 Droplets' },
  { value: 'Heart', label: '\u2764\uFE0F Heart' },
  { value: 'Leaf', label: '\uD83C\uDF43 Leaf' },
  { value: 'Check', label: '\u2713 Check' },
]

const COLOR_OPTIONS = [
  { value: 'from-amber-500/80', label: 'Amber', preview: 'bg-amber-500' },
  { value: 'from-gold/80', label: 'Gold', preview: 'bg-amber-400' },
  { value: 'from-rose-500/80', label: 'Rose', preview: 'bg-rose-500' },
  { value: 'from-emerald-500/80', label: 'Emerald', preview: 'bg-emerald-500' },
  { value: 'from-yellow-600/80', label: 'Yellow', preview: 'bg-yellow-600' },
  { value: 'from-pink-500/80', label: 'Pink', preview: 'bg-pink-500' },
  { value: 'from-orange-500/80', label: 'Orange', preview: 'bg-orange-500' },
  { value: 'from-green-500/80', label: 'Green', preview: 'bg-green-500' },
]

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
// Upload Dropzone Component
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

    if (!allowedTypes.includes(file.type)) {
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
      formData.append('folder', 'uploads/inspiration')

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
        <div className="relative w-full aspect-square overflow-hidden rounded-lg border bg-muted/30 group">
          <Image
            src={currentUrl.trim()}
            alt="Preview"
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
        <p className="text-[10px] text-muted-foreground truncate">{currentUrl}</p>
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
      <Label className="text-muted-foreground text-xs">Upload Image</Label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          'relative w-full aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3',
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
                Click to upload or drag &amp; drop
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

export function InspirationManagement() {
  // ---- data state ----
  const [items, setItems] = useState<InspirationItem[]>([])
  const [loading, setLoading] = useState(true)

  // ---- dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InspirationItem | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // ---- delete confirmation state ----
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<InspirationItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---- toggle loading state (per-id) ----
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ---- fetch data ----
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/inspiration-items')
      const data = await res.json()
      if (data.success) {
        setItems(data.items)
      } else {
        toast.error('Failed to load inspiration items')
      }
    } catch {
      toast.error('Failed to load inspiration items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ---- helpers ----

  const openAddDialog = useCallback(() => {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, order: items.length })
    setDialogOpen(true)
  }, [items.length])

  const openEditDialog = useCallback((item: InspirationItem) => {
    setEditingItem(item)
    setForm({
      label: item.label,
      tip: item.tip,
      image: item.image,
      icon: item.icon,
      color: item.color,
      active: item.active,
      order: item.order,
    })
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
  }, [])

  const openDeleteDialog = useCallback((item: InspirationItem) => {
    setDeletingItem(item)
    setDeleteOpen(true)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteOpen(false)
    setDeletingItem(null)
  }, [])

  // ---- handlers ----

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Label is required')
      return
    }
    if (!form.tip.trim()) {
      toast.error('Tip is required')
      return
    }
    if (!form.image.trim()) {
      toast.error('Please upload an image')
      return
    }

    setSaving(true)
    try {
      const payload = {
        label: form.label.trim(),
        tip: form.tip.trim(),
        image: form.image.trim(),
        icon: form.icon,
        color: form.color,
        active: form.active,
        order: form.order,
      }

      if (editingItem) {
        const res = await fetch(`/api/inspiration-items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        toast.success('Inspiration item updated')
      } else {
        const res = await fetch('/api/inspiration-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        toast.success('Inspiration item created')
      }
      closeDialog()
      fetchItems()
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
      const res = await fetch(`/api/inspiration-items/${deletingItem.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success('Inspiration item deleted')
      closeDeleteDialog()
      fetchItems()
    } catch {
      toast.error('Failed to delete inspiration item. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (item: InspirationItem) => {
    setTogglingId(item.id)
    try {
      const res = await fetch(`/api/inspiration-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(item.active ? 'Item deactivated' : 'Item activated')
      fetchItems()
    } catch {
      toast.error('Failed to toggle item status.')
    } finally {
      setTogglingId(null)
    }
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ---- sorted items ----
  const sorted = [...items].sort((a, b) => a.order - b.order)

  // ---- render ----

  return (
    <section className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gold/10">
            <Instagram className="size-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Inspiration Hub
              </h2>
              <Badge className="bg-gold/15 text-gold border-gold/20 hover:bg-gold/20">
                {items.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage beauty inspiration social feed items
            </p>
          </div>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-gold text-white shadow-md hover:bg-gold-light gap-2"
        >
          <Plus className="size-4" />
          Add Inspiration
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Loading State                                                     */}
      {/* ----------------------------------------------------------------- */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 text-gold animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        /* ------------------------------------------------------------- */
        /* Empty State                                                    */
        /* ------------------------------------------------------------- */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-dashed border-2 border-muted-foreground/20 bg-cream/40">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blush">
                <Instagram className="size-8 text-gold/50" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">
                No inspiration items yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/70 max-w-sm">
                Add beauty inspiration items to create a stunning social feed
                experience for your customers.
              </p>
              <Button
                onClick={openAddDialog}
                variant="outline"
                className="mt-6 border-gold/30 text-gold hover:bg-gold/10 gap-2"
              >
                <Plus className="size-4" />
                Add Your First Inspiration
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* ------------------------------------------------------------- */
        /* Items Grid                                                     */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  {/* ----- Image with Label Overlay ----- */}
                  <div className="relative w-full aspect-square overflow-hidden rounded-t-lg">
                    <Image
                      src={item.image}
                      alt={item.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                    {/* Gradient overlay */}
                    <div className={cn(
                      'absolute inset-0 bg-gradient-to-t',
                      item.color,
                      'to-transparent opacity-60'
                    )} />
                    {/* Label badge overlay */}
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-white/90 text-foreground border-0 shadow-sm backdrop-blur-sm hover:bg-white/90">
                        {item.label}
                      </Badge>
                    </div>
                    {/* Order badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <GripVertical className="size-3.5 text-white/60" />
                      <span className="text-xs font-medium text-white/80 bg-black/30 rounded px-1.5 py-0.5 backdrop-blur-sm">
                        #{item.order}
                      </span>
                    </div>
                  </div>

                  {/* ----- Content ----- */}
                  <CardContent className="p-4 space-y-3">
                    {/* Tip */}
                    <CardDescription className="line-clamp-2 text-sm">
                      {item.tip}
                    </CardDescription>

                    {/* Icon + Color badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 gap-1 bg-muted/50"
                      >
                        {ICON_OPTIONS.find((o) => o.value === item.icon)?.label ?? item.icon}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 gap-1 bg-muted/50"
                      >
                        <span className={cn(
                          'size-2.5 rounded-full',
                          COLOR_OPTIONS.find((o) => o.value === item.color)?.preview ?? 'bg-gray-400'
                        )} />
                        {COLOR_OPTIONS.find((o) => o.value === item.color)?.label ?? item.color}
                      </Badge>
                    </div>

                    {/* Active toggle + Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
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
                          {item.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="size-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(item)}
                          className="size-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
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
              <Instagram className="size-5 text-gold" />
              {editingItem ? 'Edit Inspiration Item' : 'Add Inspiration Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the details of this inspiration item.'
                : 'Create a new inspiration item for the social feed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Label */}
            <div className="grid gap-2">
              <Label htmlFor="inspiration-label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inspiration-label"
                placeholder="e.g. Daily Essentials, Glowing Skin"
                value={form.label}
                onChange={(e) => updateField('label', e.target.value)}
              />
            </div>

            {/* Tip */}
            <div className="grid gap-2">
              <Label htmlFor="inspiration-tip">
                Tip <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inspiration-tip"
                placeholder="e.g. Start your day with a gentle cleanser & SPF moisturizer"
                value={form.tip}
                onChange={(e) => updateField('tip', e.target.value)}
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
              <Label htmlFor="inspiration-image-url">
                Image URL <span className="text-muted-foreground text-xs">(manual)</span>
              </Label>
              <Input
                id="inspiration-image-url"
                placeholder="Paste image URL or upload above"
                value={form.image}
                onChange={(e) => updateField('image', e.target.value)}
              />
            </div>

            {/* Icon + Color selects */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Icon</Label>
                <Select
                  value={form.icon}
                  onValueChange={(value) => updateField('icon', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <Select
                  value={form.color}
                  onValueChange={(value) => updateField('color', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span className={cn('size-3 rounded-full', option.preview)} />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order + Active */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="inspiration-order">Order / Priority</Label>
                <Input
                  id="inspiration-order"
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
              disabled={saving || !form.label.trim() || !form.tip.trim() || !form.image.trim()}
              className="bg-gold text-white hover:bg-gold-light gap-2 min-w-[100px]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving&hellip;
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
            <AlertDialogTitle>Delete Inspiration Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {deletingItem ? (
                <span className="font-semibold text-foreground">
                  {' "'}
                  {deletingItem.label}
                  {'" '}
                </span>
              ) : (
                ' this item'
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
                  Deleting&hellip;
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

export default InspirationManagement
