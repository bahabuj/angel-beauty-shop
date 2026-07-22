'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  ImageIcon,
  Star,
  Sparkles,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  Upload,
  Loader2,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { Card, CardContent } from '@/components/ui/card'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Variant {
  id?: string
  name: string
  sku: string | null
  price: number
  comparePrice: number | null
  stock: number
  weight: string | null
  active: boolean
  order: number
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  categorySlug: string
  images: string
  stock: number
  description: string
  benefits: string
  ingredients: string
  howToUse: string
  featured: boolean
  newArrival: boolean
  bestSeller: boolean
  variants?: Variant[]
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductsManagementProps {
  products: Product[]
  categories: Category[]
  onSave: (data: Record<string, unknown>, isEdit: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface VariantFormRow {
  id?: string
  name: string
  sku: string
  price: string
  comparePrice: string
  stock: string
  weight: string
  active: boolean
}

interface ProductForm {
  name: string
  slug: string
  categorySlug: string
  description: string
  benefits: string
  ingredients: string
  howToUse: string
  featured: boolean
  newArrival: boolean
  bestSeller: boolean
  images: string[]
  variants: VariantFormRow[]
}

const ITEMS_PER_PAGE = 10

function makeDefaultVariantRow(name = 'Standard'): VariantFormRow {
  return {
    name,
    sku: '',
    price: '',
    comparePrice: '',
    stock: '0',
    weight: '',
    active: true,
  }
}

const EMPTY_FORM: ProductForm = {
  name: '',
  slug: '',
  categorySlug: '',
  description: '',
  benefits: '',
  ingredients: '',
  howToUse: '',
  featured: false,
  newArrival: false,
  bestSeller: false,
  images: [],
  variants: [makeDefaultVariantRow()],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString()}`
}

function parseBenefitsToString(benefits: string): string {
  if (!benefits) return ''
  try {
    const parsed = JSON.parse(benefits)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return benefits
  } catch {
    return benefits
  }
}

function parseImagesToArray(images: string): string[] {
  if (!images) return []
  try {
    const parsed = JSON.parse(images)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function getCategoryName(categories: Category[], slug: string): string {
  return categories.find((c) => c.slug === slug)?.name ?? slug
}

// Detect whether a stored media URL is a video (used to render <video> preview)
function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|ogv|mov|mkv)$/i.test(url)
}

/** Count active variants for a product (used for the table badge). */
function getVariantCount(product: Product): number {
  if (!product.variants || product.variants.length === 0) return 0
  const active = product.variants.filter((v) => v.active)
  return active.length > 0 ? active.length : product.variants.length
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductsManagement({
  products,
  categories,
  onSave,
  onDelete,
}: ProductsManagementProps) {
  // ── Filter / search state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState(1)

  // ── Dialog state ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  // ── Image upload state ──
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Delete dialog state ──
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ── Slug auto-gen tracking ──
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // ── Derived data ──
  const filteredProducts = useMemo(() => {
    let result = products

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.categorySlug === categoryFilter)
    }

    return result
  }, [products, searchQuery, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, safeCurrentPage])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }

  // ── Form helpers ──
  const updateForm = useCallback(
    (patch: Partial<ProductForm>) => setForm((prev) => ({ ...prev, ...patch })),
    []
  )

  const handleNameChange = (name: string) => {
    updateForm({ name })
    if (!slugManuallyEdited) {
      updateForm({ name, slug: generateSlug(name) })
    }
  }

  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true)
    updateForm({ slug })
  }

  // ── Variant editor helpers ──
  const updateVariant = (index: number, patch: Partial<VariantFormRow>) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }))
  }

  const addVariant = (presetName?: string) => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, makeDefaultVariantRow(presetName)],
    }))
  }

  const removeVariant = (index: number) => {
    setForm((prev) => {
      const next = prev.variants.filter((_, i) => i !== index)
      // Always keep at least one row
      return { ...prev, variants: next.length > 0 ? next : [makeDefaultVariantRow()] }
    })
  }

  const moveVariant = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= prev.variants.length) return prev
      const next = [...prev.variants]
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return { ...prev, variants: next }
    })
  }

  // Computed variant summary for the form (min price, total stock)
  const variantSummary = useMemo(() => {
    const active = form.variants.filter((v) => v.active)
    const prices = active
      .map((v) => parseFloat(v.price) || 0)
      .filter((p) => p > 0)
    const stock = active.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    return { minPrice, totalStock: stock, activeCount: active.length }
  }, [form.variants])

  // ── Image / Video upload handler ──
  const handleImageUpload = async (files: FileList) => {
    const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    const allowedVideo = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']

    const validFiles = Array.from(files).filter((file) => {
      const isImage = allowedImage.includes(file.type)
      const isVideo = allowedVideo.includes(file.type)
      if (!isImage && !isVideo) {
        toast.error(`"${file.name}" is not a supported format (use images or videos)`)
        return false
      }
      const sizeLimit = isVideo ? 200 * 1024 * 1024 : 50 * 1024 * 1024
      if (file.size > sizeLimit) {
        toast.error(`"${file.name}" exceeds ${isVideo ? '200MB' : '50MB'} limit`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'products')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Failed to upload ${file.name}`)
        }
        const data = await res.json()
        return data.url as string
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }))
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`)
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Failed to upload one or more images')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
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

  // ── Dialog open/close ──
  const openAddDialog = () => {
    setForm({ ...EMPTY_FORM, variants: [makeDefaultVariantRow()] })
    setIsEdit(false)
    setEditingId(null)
    setSlugManuallyEdited(false)
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    // Load variants from the product, or fall back to a single Standard row
    const variantRows: VariantFormRow[] =
      product.variants && product.variants.length > 0
        ? [...product.variants]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku ?? '',
              price: v.price.toString(),
              comparePrice: v.comparePrice != null ? v.comparePrice.toString() : '',
              stock: v.stock.toString(),
              weight: v.weight ?? '',
              active: v.active,
            }))
        : [makeDefaultVariantRow()]

    setForm({
      name: product.name,
      slug: product.slug,
      categorySlug: product.categorySlug,
      description: product.description,
      benefits: parseBenefitsToString(product.benefits),
      ingredients: product.ingredients,
      howToUse: product.howToUse,
      featured: product.featured,
      newArrival: product.newArrival,
      bestSeller: product.bestSeller,
      images: parseImagesToArray(product.images),
      variants: variantRows,
    })
    setIsEdit(true)
    setEditingId(product.id)
    setSlugManuallyEdited(true)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setForm({ ...EMPTY_FORM, variants: [makeDefaultVariantRow()] })
    setIsEdit(false)
    setEditingId(null)
    setSlugManuallyEdited(false)
  }

  // ── Delete dialog ──
  const openDeleteDialog = (product: Product) => {
    setDeletingId(product.id)
    setDeletingName(product.name)
    setDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setDeletingId(null)
    setDeletingName('')
  }

  // ── Save handler ──
  const handleSave = async () => {
    // Validation
    if (!form.name.trim()) {
      toast.error('Product name is required')
      return
    }
    if (!form.categorySlug) {
      toast.error('Please select a category')
      return
    }
    if (!form.description.trim()) {
      toast.error('Product description is required')
      return
    }

    // Validate variants — at least one must have a name and a valid price
    const validVariants = form.variants.filter(
      (v) => v.name.trim() && parseFloat(v.price) > 0
    )
    if (validVariants.length === 0) {
      toast.error('At least one variant with a name and valid price is required')
      return
    }

    const slug = form.slug || generateSlug(form.name)
    const benefitsArray = form.benefits
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    // Build the variants payload for the API
    const variantsPayload = validVariants.map((v, idx) => ({
      id: v.id || undefined,
      name: v.name.trim(),
      sku: v.sku.trim() || null,
      price: parseFloat(v.price) || 0,
      comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
      stock: parseInt(v.stock) || 0,
      weight: v.weight.trim() || null,
      active: v.active,
      order: idx,
    }))

    const data: Record<string, unknown> = {
      name: form.name.trim(),
      slug,
      categorySlug: form.categorySlug,
      description: form.description.trim(),
      benefits: JSON.stringify(benefitsArray),
      ingredients: form.ingredients.trim(),
      howToUse: form.howToUse.trim(),
      featured: form.featured,
      newArrival: form.newArrival,
      bestSeller: form.bestSeller,
      images: JSON.stringify(form.images),
      // price/stock are denormalized caches — the API recomputes them from
      // variants. We send placeholder values that the backend will overwrite.
      price: variantsPayload[0].price,
      comparePrice: variantsPayload[0].comparePrice,
      stock: variantsPayload.reduce((sum, v) => sum + v.stock, 0),
      variants: variantsPayload,
    }

    if (isEdit && editingId) {
      data.id = editingId
    }

    setSaving(true)
    try {
      await onSave(data, isEdit)
      toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
      closeDialog()
    } catch {
      toast.error('Failed to save product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete handler ──
  const handleDelete = async () => {
    if (!deletingId) return

    setDeleting(true)
    try {
      await onDelete(deletingId)
      toast.success('Product deleted successfully')
      closeDeleteDialog()

      if (paginatedProducts.length === 1 && safeCurrentPage > 1) {
        setCurrentPage(safeCurrentPage - 1)
      }
    } catch {
      toast.error('Failed to delete product. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Pagination helpers ──
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = []
    const total = totalPages

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
      return pages
    }

    pages.push(1)

    if (safeCurrentPage > 3) pages.push('ellipsis')

    const start = Math.max(2, safeCurrentPage - 1)
    const end = Math.min(total - 1, safeCurrentPage + 1)

    for (let i = start; i <= end; i++) pages.push(i)

    if (safeCurrentPage < total - 2) pages.push('ellipsis')

    pages.push(total)

    return pages
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <Package className="h-5 w-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                Products
              </h2>
              <Badge className="bg-gold/10 text-gold border-gold/20 hover:bg-gold/20">
                {filteredProducts.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your product catalog
            </p>
          </div>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-gold hover:bg-gold-light text-white shadow-md transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 border-blush/30 bg-white focus-visible:border-gold/50 focus-visible:ring-gold/20"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
          <SelectTrigger className="w-full sm:w-[200px] border-blush/30 bg-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.slug} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Products Table ── */}
      <Card className="border-blush/30 overflow-hidden">
        <CardContent className="p-0">
          {paginatedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blush/30 mb-4">
                <Package className="h-8 w-8 text-gold/40" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No products found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by adding your first product'}
              </p>
              {!searchQuery && categoryFilter === 'all' && (
                <Button
                  onClick={openAddDialog}
                  className="mt-4 bg-gold hover:bg-gold-light text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Product
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-blush/10 hover:bg-blush/10">
                    <TableHead className="pl-4">Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => {
                    const variantCount = getVariantCount(product)
                    const isMultiVariant = variantCount > 1
                    const isLowStock = product.stock <= 10
                    const isOutOfStock = product.stock === 0
                    const productImages = parseImagesToArray(product.images)
                    const hasImage = productImages.length > 0

                    return (
                      <TableRow key={product.id} className="group">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-blush/20">
                              {hasImage ? (
                                <Image
                                  src={productImages[0]}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-gold/50" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[200px]">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {product.slug}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-blush/30 text-foreground/70 border-blush/20 capitalize"
                          >
                            {getCategoryName(categories, product.categorySlug)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div>
                            <span className="font-semibold text-sm text-gold">
                              {isMultiVariant ? 'From ' : ''}{formatPrice(product.price)}
                            </span>
                            {product.comparePrice && product.comparePrice > product.price && (
                              <p className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.comparePrice)}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {variantCount > 0 ? (
                            <Badge className="bg-gold/10 text-gold border-gold/20 hover:bg-gold/20 gap-1">
                              <Layers className="h-3 w-3" />
                              {variantCount} {variantCount === 1 ? 'size' : 'sizes'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isOutOfStock ? (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                <span className="text-sm font-medium text-red-600">
                                  Out of Stock
                                </span>
                              </>
                            ) : isLowStock ? (
                              <>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-sm font-medium text-amber-600">
                                  {product.stock} left
                                </span>
                              </>
                            ) : (
                              <span className="text-sm">{product.stock}</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {product.featured && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                <Star className="h-2.5 w-2.5 mr-0.5" />
                                Featured
                              </Badge>
                            )}
                            {product.newArrival && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                New
                              </Badge>
                            )}
                            {product.bestSeller && (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                                <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                Bestseller
                              </Badge>
                            )}
                            {!product.featured && !product.newArrival && !product.bestSeller && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-gold"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit {product.name}</span>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              onClick={() => openDeleteDialog(product)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete {product.name}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-blush/20 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing{' '}
                    <span className="font-medium">
                      {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredProducts.length)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{filteredProducts.length}</span> products
                  </p>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                          aria-label="Go to previous page"
                          className={`cursor-pointer ${
                            safeCurrentPage === 1
                              ? 'pointer-events-none opacity-50'
                              : 'hover:bg-blush/20'
                          }`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </PaginationLink>
                      </PaginationItem>

                      {getPageNumbers().map((page, idx) =>
                        page === 'ellipsis' ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <span className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground">
                              ...
                            </span>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={page === safeCurrentPage}
                              className={`cursor-pointer ${
                                page === safeCurrentPage
                                  ? 'bg-gold text-white hover:bg-gold-light border-gold'
                                  : 'hover:bg-blush/20'
                              }`}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationLink
                          onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                          aria-label="Go to next page"
                          className={`cursor-pointer ${
                            safeCurrentPage === totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'hover:bg-blush/20'
                          }`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </PaginationLink>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Product Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
                <Package className="h-4 w-4 text-gold" />
              </div>
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the product details below'
                : 'Fill in the details to create a new product'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* ── Image Upload Section ── */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Product Media{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (first item will be the main product photo — should be an image)
                </span>
              </Label>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
                  p-6 text-center cursor-pointer transition-all duration-200
                  ${uploading
                    ? 'border-gold/30 bg-gold/5 pointer-events-none'
                    : 'border-blush/30 bg-blush/5 hover:border-gold/50 hover:bg-gold/5'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      void handleImageUpload(e.target.files)
                      e.target.value = ''
                    }
                  }}
                />
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-gold animate-spin" />
                    <p className="text-sm font-medium text-gold">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                      <Upload className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Images (PNG, JPG, GIF, WebP, SVG — max 50MB) or Videos (MP4, WebM, MOV — max 200MB)
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Or paste image/video URL here (e.g., https://...)"
                  className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const url = e.currentTarget.value.trim()
                      if (url) {
                        setForm((prev) => ({ ...prev, images: [...prev.images, url] }))
                        e.currentTarget.value = ''
                        toast.success('Media URL added!')
                      }
                    }
                  }}
                />
                <Button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement
                    const url = input.value.trim()
                    if (url) {
                      setForm((prev) => ({ ...prev, images: [...prev.images, url] }))
                      input.value = ''
                      toast.success('Media URL added!')
                    }
                  }}
                  className="bg-gold hover:bg-gold-light text-white"
                >
                  Add
                </Button>
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {form.images.map((url, index) => {
                    const isVideo = isVideoUrl(url)
                    return (
                    <div
                      key={`${url}-${index}`}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-blush/30 bg-blush/10"
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          className="h-full w-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <Image
                          src={url}
                          alt={`Product image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      )}
                      {index === 0 && (
                        <div className="absolute top-1.5 left-1.5">
                          <Badge className="bg-gold text-white text-[10px] px-1.5 py-0.5 border-0 shadow-sm">
                            Main
                          </Badge>
                        </div>
                      )}
                      {isVideo && (
                        <div className="absolute top-1.5 left-1.5" style={index === 0 ? { left: '3rem' } : undefined}>
                          <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 border-0 shadow-sm">
                            Video
                          </Badge>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(index)
                        }}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <div className="absolute bottom-1.5 right-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-[10px] text-white font-medium">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Row 1: Name + Slug */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="product-name"
                  placeholder="e.g. Glow Radiance Serum"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-slug">
                  Slug{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (auto-generated)
                  </span>
                </Label>
                <Input
                  id="product-slug"
                  placeholder="glow-radiance-serum"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                />
              </div>
            </div>

            {/* Row 2: Category */}
            <div className="space-y-2">
              <Label>
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.categorySlug}
                onValueChange={(v) => updateForm({ categorySlug: v })}
              >
                <SelectTrigger className="w-full border-blush/30 focus:ring-gold/20">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="product-description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="product-description"
                placeholder="Describe your product..."
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                className="min-h-[100px] border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>

            {/* ── Variants Editor (replaces single price/stock) ── */}
            <div className="space-y-3 rounded-xl border border-blush/30 bg-blush/5 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Layers className="h-4 w-4 text-gold" />
                    Product Variants (Sizes)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Add different sizes (e.g. Small, Big, 250ml, 500ml) each with its own
                    price and stock. The product&apos;s displayed price will be the lowest
                    variant price.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-blush/30" onClick={() => addVariant('Small')}>
                    + Small
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-blush/30" onClick={() => addVariant('Big')}>
                    + Big
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-blush/30" onClick={() => addVariant()}>
                    + Custom
                  </Button>
                </div>
              </div>

              {/* Summary chip */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge className="bg-gold/10 text-gold border-gold/20">
                  {variantSummary.activeCount} active {variantSummary.activeCount === 1 ? 'variant' : 'variants'}
                </Badge>
                {variantSummary.minPrice > 0 && (
                  <Badge variant="secondary" className="bg-blush/30 border-blush/20">
                    From {formatPrice(variantSummary.minPrice)}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-blush/30 border-blush/20">
                  Total stock: {variantSummary.totalStock}
                </Badge>
              </div>

              {/* Variant rows */}
              <div className="space-y-2">
                {form.variants.map((variant, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 transition-colors ${
                      variant.active
                        ? 'border-blush/40 bg-white'
                        : 'border-blush/20 bg-blush/5 opacity-70'
                    }`}
                  >
                    {/* Top row: name, price, compare, stock */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Size Name *</Label>
                        <Input
                          placeholder="e.g. Small"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, { name: e.target.value })}
                          className="h-8 text-sm border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Price ($) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="0"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, { price: e.target.value })}
                          className="h-8 text-sm border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Compare $</Label>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="0"
                          value={variant.comparePrice}
                          onChange={(e) => updateVariant(index, { comparePrice: e.target.value })}
                          className="h-8 text-sm border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Stock</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, { stock: e.target.value })}
                          className="h-8 text-sm border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                        />
                      </div>
                    </div>

                    {/* Bottom row: sku, weight, active, reorder, delete */}
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div className="space-y-1 flex-1 min-w-[120px]">
                        <Label className="text-[11px] text-muted-foreground">SKU (optional)</Label>
                        <Input
                          placeholder="e.g. SER-SML-250"
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, { sku: e.target.value })}
                          className="h-8 text-sm border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                        />
                      </div>
                      <div className="space-y-1 flex-1 min-w-[100px]">
                        <Label className="text-[11px] text-muted-foreground">Weight (optional)</Label>
                        <Input
                          placeholder="e.g. 250ml"
                          value={variant.weight}
                          onChange={(e) => updateVariant(index, { weight: e.target.value })}
                          className="h-8 text-sm border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
                        />
                      </div>

                      {/* Active toggle */}
                      <label className="flex items-center gap-2 cursor-pointer h-8 px-2">
                        <Switch
                          checked={variant.active}
                          onCheckedChange={(v) => updateVariant(index, { active: v })}
                          className="data-[state=checked]:bg-gold"
                        />
                        <span className="text-xs font-medium">Active</span>
                      </label>

                      {/* Reorder + delete */}
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-gold"
                          disabled={index === 0}
                          onClick={() => moveVariant(index, -1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-gold"
                          disabled={index === form.variants.length - 1}
                          onClick={() => moveVariant(index, 1)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label htmlFor="product-benefits">
                Benefits{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  (comma-separated)
                </span>
              </Label>
              <Textarea
                id="product-benefits"
                placeholder="Hydrates skin, Reduces fine lines, Brightens complexion"
                value={form.benefits}
                onChange={(e) => updateForm({ benefits: e.target.value })}
                className="min-h-[70px] border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <Label htmlFor="product-ingredients">Ingredients</Label>
              <Textarea
                id="product-ingredients"
                placeholder="List the key ingredients..."
                value={form.ingredients}
                onChange={(e) => updateForm({ ingredients: e.target.value })}
                className="min-h-[70px] border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>

            {/* How to Use */}
            <div className="space-y-2">
              <Label htmlFor="product-how-to-use">How to Use</Label>
              <Textarea
                id="product-how-to-use"
                placeholder="Usage instructions..."
                value={form.howToUse}
                onChange={(e) => updateForm({ howToUse: e.target.value })}
                className="min-h-[70px] border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>

            {/* Toggle switches */}
            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => updateForm({ featured: v })}
                  className="data-[state=checked]:bg-gold"
                />
                <div>
                  <span className="text-sm font-medium">Featured</span>
                  <p className="text-xs text-muted-foreground">Show on featured section</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={form.newArrival}
                  onCheckedChange={(v) => updateForm({ newArrival: v })}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium">New Arrival</span>
                  <p className="text-xs text-muted-foreground">Mark as new product</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={form.bestSeller}
                  onCheckedChange={(v) => updateForm({ bestSeller: v })}
                  className="data-[state=checked]:bg-purple-500"
                />
                <div>
                  <span className="text-sm font-medium">Best Seller</span>
                  <p className="text-xs text-muted-foreground">Mark as top seller</p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDialog}
              className="border-blush/30"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="bg-gold hover:bg-gold-light text-white min-w-[120px]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </span>
              ) : isEdit ? (
                'Update Product'
              ) : (
                'Create Product'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation AlertDialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) closeDeleteDialog() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-4 w-4 text-red-600" />
              </div>
              Delete Product
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">&quot;{deletingName}&quot;</span>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="border-blush/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
