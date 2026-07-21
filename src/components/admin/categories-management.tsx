'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  ImageIcon,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
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

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  order: number
  active: boolean
  _count?: {
    products: number
  }
}

interface CategoriesManagementProps {
  categories: Category[]
  onSave: () => void
  onDelete: () => void
}

interface CategoryForm {
  name: string
  slug: string
  description: string
  image: string
  active: boolean
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  image: '',
  active: true,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function truncateText(text: string, maxLen: number = 60): string {
  if (!text) return '—'
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
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
      formData.append('folder', 'categories')

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
        <Label className="text-muted-foreground text-xs">Image Preview</Label>
        <div className="relative w-full aspect-video overflow-hidden rounded-lg border bg-muted/30 group">
          <Image
            src={currentUrl.trim()}
            alt="Category image preview"
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
        Category Image <span className="text-muted-foreground/60">(optional)</span>
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

export default function CategoriesManagement({
  categories,
  onSave,
  onDelete,
}: CategoriesManagementProps) {
  // ---- dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // ---- image upload state ----
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- delete confirmation state ----
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---- toggle loading state (per-id) ----
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ---- reorder loading state (per-id) ----
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  // ---- sorted categories by order ----
  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  )

  // ---- helpers ----

  const openAddDialog = useCallback(() => {
    setEditingCategory(null)
    setForm({ ...EMPTY_FORM })
    setSlugManuallyEdited(false)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((category: Category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      image: category.image ?? '',
      active: category.active,
    })
    setSlugManuallyEdited(true)
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingCategory(null)
    setForm(EMPTY_FORM)
    setSlugManuallyEdited(false)
  }, [])

  const openDeleteDialog = useCallback((category: Category) => {
    setDeletingCategory(category)
    setDeleteOpen(true)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteOpen(false)
    setDeletingCategory(null)
  }, [])

  const updateField = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleNameChange = (name: string) => {
    if (!slugManuallyEdited) {
      setForm((prev) => ({ ...prev, name, slug: generateSlug(name) }))
    } else {
      updateField('name', name)
    }
  }

  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true)
    updateField('slug', slug)
  }

  // ---- image upload handler ----
  const handleImageUpload = async (files: FileList) => {
    const file = files[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      toast.error('Please select a valid image file')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File exceeds 50MB limit')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'categories')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      const url = data.url || data.data?.url
      if (url) {
        updateField('image', url)
        toast.success('Image uploaded successfully')
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleImageUpload(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // ---- Save handler ----
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required')
      return
    }

    const slug = form.slug || generateSlug(form.name)

    setSaving(true)
    try {
      if (editingCategory) {
        // Update existing category
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            slug,
            description: form.description.trim() || null,
            image: form.image.trim() || null,
            active: form.active,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          toast.error(data.error || 'Failed to update category')
          return
        }
        toast.success('Category updated successfully')
      } else {
        // Create new category
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            slug,
            description: form.description.trim() || null,
            image: form.image.trim() || null,
            active: form.active,
            order: categories.length,
          }),
        })
        const data = await res.json()
        if (!data.success) {
          toast.error(data.error || 'Failed to create category')
          return
        }
        toast.success('Category created successfully')
      }
      onSave()
      closeDialog()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ---- Delete handler ----
  const handleDelete = async () => {
    if (!deletingCategory) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to delete category')
        return
      }
      toast.success('Category deleted')
      onDelete()
      closeDeleteDialog()
    } catch {
      toast.error('Failed to delete category. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- Toggle active handler ----
  const handleToggleActive = async (category: Category) => {
    setTogglingId(category.id)
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !category.active }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to toggle status')
        return
      }
      toast.success(category.active ? 'Category deactivated' : 'Category activated')
      onSave()
    } catch {
      toast.error('Failed to toggle category status.')
    } finally {
      setTogglingId(null)
    }
  }

  // ---- Reorder handler ----
  const handleReorder = async (category: Category, direction: 'up' | 'down') => {
    const idx = sorted.findIndex((c) => c.id === category.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return

    const swapCategory = sorted[direction === 'up' ? idx - 1 : idx + 1]

    setReorderingId(category.id)
    try {
      const res = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: [
            { id: category.id, order: swapCategory.order },
            { id: swapCategory.id, order: category.order },
          ],
        }),
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to reorder')
        return
      }
      toast.success('Category reordered')
      onSave()
    } catch {
      toast.error('Failed to reorder category.')
    } finally {
      setReorderingId(null)
    }
  }

  // ---- render ----

  return (
    <section className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gold/10">
            <Tag className="size-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-playfair), serif' }}
              >
                Categories
              </h2>
              <Badge className="bg-gold/15 text-gold border-gold/20 hover:bg-gold/20">
                {categories.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your product categories
            </p>
          </div>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-gold text-white shadow-md hover:bg-gold-light gap-2"
        >
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Categories Table                                                  */}
      {/* ----------------------------------------------------------------- */}
      <Card className="border-blush/30 overflow-hidden">
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-blush/30 mb-4">
                <Tag className="size-8 text-gold/40" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No categories yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Create your first category to organize your products.
              </p>
              <Button
                onClick={openAddDialog}
                variant="outline"
                className="mt-4 border-gold/30 text-gold hover:bg-gold/10 gap-2"
              >
                <Plus className="size-4" />
                Add Your First Category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-blush/10 hover:bg-blush/10">
                  <TableHead className="w-10 pl-4">
                    <span className="sr-only">Order</span>
                  </TableHead>
                  <TableHead className="w-14">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Order</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((category) => {
                  const productCount = category._count?.products ?? 0
                  const isReordering = reorderingId === category.id
                  const isToggling = togglingId === category.id

                  return (
                    <TableRow
                      key={category.id}
                      className={cn(
                        'group',
                        !category.active && 'opacity-60'
                      )}
                    >
                      {/* Drag handle / Order indicator */}
                      <TableCell className="pl-4">
                        <div className="flex items-center justify-center text-muted-foreground/40">
                          <GripVertical className="size-4" />
                        </div>
                      </TableCell>

                      {/* Image */}
                      <TableCell>
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-blush/20">
                          {category.image ? (
                            <Image
                              src={category.image}
                              alt={category.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="size-4 text-gold/50" />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <p className="font-medium text-sm truncate max-w-[180px]">
                          {category.name}
                        </p>
                      </TableCell>

                      {/* Slug */}
                      <TableCell className="hidden md:table-cell">
                        <p className="text-xs text-muted-foreground truncate max-w-[160px] font-mono">
                          {category.slug}
                        </p>
                      </TableCell>

                      {/* Description */}
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {truncateText(category.description ?? '', 50)}
                        </p>
                      </TableCell>

                      {/* Product count */}
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="bg-blush/30 text-foreground/70 border-blush/20 text-xs"
                        >
                          {productCount}
                        </Badge>
                      </TableCell>

                      {/* Active status toggle */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={category.active}
                            onCheckedChange={() => handleToggleActive(category)}
                            disabled={isToggling}
                            className={cn(
                              'data-[state=checked]:bg-gold',
                              isToggling && 'opacity-50'
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              category.active ? 'text-gold' : 'text-muted-foreground'
                            )}
                          >
                            {isToggling ? '...' : category.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Reorder arrows */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              'size-7 text-muted-foreground hover:text-gold',
                              isReordering && 'opacity-50 pointer-events-none'
                            )}
                            onClick={() => handleReorder(category, 'up')}
                            disabled={sorted.indexOf(category) === 0}
                          >
                            <ArrowUp className="size-3.5" />
                            <span className="sr-only">Move {category.name} up</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              'size-7 text-muted-foreground hover:text-gold',
                              isReordering && 'opacity-50 pointer-events-none'
                            )}
                            onClick={() => handleReorder(category, 'down')}
                            disabled={sorted.indexOf(category) === sorted.length - 1}
                          >
                            <ArrowDown className="size-3.5" />
                            <span className="sr-only">Move {category.name} down</span>
                          </Button>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-gold"
                            onClick={() => openEditDialog(category)}
                          >
                            <Edit className="size-3.5" />
                            <span className="sr-only">Edit {category.name}</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-red-600"
                            onClick={() => openDeleteDialog(category)}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Delete {category.name}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Add / Edit Dialog                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gold/10">
                <Tag className="size-4 text-gold" />
              </div>
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details below.'
                : 'Fill in the details to create a new product category.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* ── Image Upload Section ── */}
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
            <div className="space-y-2">
              <Label htmlFor="category-image-url">
                Image URL{' '}
                <span className="text-xs font-normal text-muted-foreground">(manual)</span>
              </Label>
              <Input
                id="category-image-url"
                placeholder="Paste image URL or upload above"
                value={form.image}
                onChange={(e) => updateField('image', e.target.value)}
                className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>

            {/* Name + Slug */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category-name"
                  placeholder="e.g. Skincare"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-slug">
                  Slug{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (auto-generated)
                  </span>
                </Label>
                <Input
                  id="category-slug"
                  placeholder="skincare"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20 font-mono text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="category-description">
                Description{' '}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="category-description"
                placeholder="Brief description of this category..."
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="min-h-[80px] border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-blush/20 bg-blush/5 p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive categories won&apos;t appear on the storefront
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => updateField('active', checked)}
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

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {deletingCategory ? (
                <span className="font-semibold text-foreground">
                  {' "'}
                  {deletingCategory.name}
                  {'" '}
                </span>
              ) : (
                ' this category'
              )}
              ?{' '}
              {deletingCategory && (deletingCategory._count?.products ?? 0) > 0 && (
                <span className="text-destructive font-medium">
                  This category has {deletingCategory._count?.products} product(s) associated with
                  it. Those products will lose their category.
                </span>
              )}
              This action cannot be undone.
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

export { CategoriesManagement }
export type { CategoriesManagementProps, Category }
