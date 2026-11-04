'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Truck,
  Search,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Filter,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface BulkVariant {
  id: string
  name: string
  price: number
  weightOz: number | null
  lengthIn: number | null
  widthIn: number | null
  heightIn: number | null
  editWeightOz: string
  editLengthIn: string
  editWidthIn: string
  editHeightIn: string
  dirty: boolean
}

interface BulkProduct {
  id: string
  name: string
  slug: string
  categorySlug: string
  price: number
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  freeShipping: boolean
  // Edit buffer — user types here, saves on submit
  editWeight: string
  editLength: string
  editWidth: string
  editHeight: string
  editFreeShipping: boolean
  dirty: boolean // true if any field changed from DB value
  // Variants
  variants: BulkVariant[]
  expanded: boolean // UI state — expanded to show variant fields
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function BulkShippingEditor() {
  const [products, setProducts] = useState<BulkProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'complete'>('incomplete')
  const [filterCategory, setFilterCategory] = useState('all')
  const [categories, setCategories] = useState<{id: string; name: string; slug: string}[]>([])

  // ── Load products ────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/products?sort=newest')
      const data = await res.json()
      if (data.success) {
        const mapped: BulkProduct[] = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          categorySlug: p.categorySlug,
          price: p.price,
          weight: p.weight,
          length: p.length,
          width: p.width,
          height: p.height,
          freeShipping: p.freeShipping || false,
          editWeight: p.weight != null ? String(p.weight) : '',
          editLength: p.length != null ? String(p.length) : '',
          editWidth: p.width != null ? String(p.width) : '',
          editHeight: p.height != null ? String(p.height) : '',
          editFreeShipping: p.freeShipping || false,
          dirty: false,
          variants: (p.variants || []).map((v: any) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            weightOz: v.weightOz ?? null,
            lengthIn: v.lengthIn ?? null,
            widthIn: v.widthIn ?? null,
            heightIn: v.heightIn ?? null,
            editWeightOz: v.weightOz != null ? String(v.weightOz) : '',
            editLengthIn: v.lengthIn != null ? String(v.lengthIn) : '',
            editWidthIn: v.widthIn != null ? String(v.widthIn) : '',
            editHeightIn: v.heightIn != null ? String(v.heightIn) : '',
            dirty: false,
          })),
          expanded: false,
        }))
        setProducts(mapped)

        // Extract unique categories
        const cats = [...new Set(mapped.map((p) => p.categorySlug))].map((slug) => ({
          id: slug,
          name: slug,
          slug,
        }))
        setCategories(cats)
      }
    } catch (e) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // ── Check if a product is complete ────────────────────────────────────────
  const isComplete = (p: BulkProduct): boolean => {
    if (p.editFreeShipping) return true
    const w = parseFloat(p.editWeight)
    const l = parseFloat(p.editLength)
    const wd = parseFloat(p.editWidth)
    const h = parseFloat(p.editHeight)
    return !isNaN(w) && w > 0 && !isNaN(l) && l > 0 && !isNaN(wd) && wd > 0 && !isNaN(h) && h > 0
  }

  // ── Check if a variant is complete ──────────────────────────────────────
  const isVariantComplete = (v: BulkVariant): boolean => {
    const w = parseFloat(v.editWeightOz)
    const l = parseFloat(v.editLengthIn)
    const wd = parseFloat(v.editWidthIn)
    const h = parseFloat(v.editHeightIn)
    return !isNaN(w) && w > 0 && !isNaN(l) && l > 0 && !isNaN(wd) && wd > 0 && !isNaN(h) && h > 0
  }

  // ── Handle product field change ──────────────────────────────────────────
  const handleChange = (id: string, field: string, value: string | boolean) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const updated = { ...p, [field]: value }
        const orig = prev.find((x) => x.id === id)!
        updated.dirty =
          updated.editWeight !== orig.editWeight ||
          updated.editLength !== orig.editLength ||
          updated.editWidth !== orig.editWidth ||
          updated.editHeight !== orig.editHeight ||
          updated.editFreeShipping !== orig.editFreeShipping
        return updated
      })
    )
  }

  // ── Handle variant field change ───────────────────────────────────────────
  const handleVariantChange = (productId: string, variantId: string, field: string, value: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        const variants = p.variants.map((v) => {
          if (v.id !== variantId) return v
          const updated = { ...v, [field]: value }
          const orig = p.variants.find((x) => x.id === variantId)!
          updated.dirty =
            updated.editWeightOz !== orig.editWeightOz ||
            updated.editLengthIn !== orig.editLengthIn ||
            updated.editWidthIn !== orig.editWidthIn ||
            updated.editHeightIn !== orig.editHeightIn
          return updated
        })
        return { ...p, variants }
      })
    )
  }

  // ── Toggle product expansion ─────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, expanded: !p.expanded } : p))
  }

  // ── Save a single variant ─────────────────────────────────────────────────
  const saveVariant = async (productId: string, v: BulkVariant) => {
    setSavingIds((prev) => new Set(prev).add(v.id))
    try {
      const weightOz = v.editWeightOz.trim() ? parseFloat(v.editWeightOz) : null
      const lengthIn = v.editLengthIn.trim() ? parseFloat(v.editLengthIn) : null
      const widthIn = v.editWidthIn.trim() ? parseFloat(v.editWidthIn) : null
      const heightIn = v.editHeightIn.trim() ? parseFloat(v.editHeightIn) : null

      // Save via PUT /api/products/:id with variant data
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: [{
            id: v.id,
            name: v.name,
            price: v.price,
            stock: 0,
            active: true,
            weightOz, lengthIn, widthIn, heightIn,
          }],
        }),
      })
      const data = await res.json()
      if (data.success) {
        setProducts((prev) => prev.map((p) => {
          if (p.id !== productId) return p
          return { ...p, variants: p.variants.map((x) => x.id === v.id ? { ...x, weightOz, lengthIn, widthIn, heightIn, dirty: false } : x) }
        }))
        toast.success(`Variant "${v.name}" shipping info saved`)
      } else {
        toast.error(`Failed to save variant "${v.name}"`)
      }
    } catch {
      toast.error(`Failed to save variant "${v.name}"`)
    } finally {
      setSavingIds((prev) => { const n = new Set(prev); n.delete(v.id); return n })
    }
  }

  // ── Save a single product ───────────────────────────────────────────────
  const saveProduct = async (p: BulkProduct) => {
    setSavingIds((prev) => new Set(prev).add(p.id))
    try {
      const weight = p.editWeight.trim() ? parseFloat(p.editWeight) : null
      const length = p.editLength.trim() ? parseFloat(p.editLength) : null
      const width = p.editWidth.trim() ? parseFloat(p.editWidth) : null
      const height = p.editHeight.trim() ? parseFloat(p.editHeight) : null

      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight,
          length,
          width,
          height,
          freeShipping: p.editFreeShipping,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Update the local state to reflect saved values
        setProducts((prev) =>
          prev.map((x) =>
            x.id === p.id
              ? {
                  ...x,
                  weight,
                  length,
                  width,
                  height,
                  freeShipping: p.editFreeShipping,
                  dirty: false,
                }
              : x
          )
        )
        toast.success(`"${p.name}" shipping info saved`)
      } else {
        toast.error(`Failed to save "${p.name}"`)
      }
    } catch {
      toast.error(`Failed to save "${p.name}"`)
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(p.id)
        return next
      })
    }
  }

  // ── Save all dirty products ──────────────────────────────────────────────
  const saveAll = async () => {
    const dirty = products.filter((p) => p.dirty)
    if (dirty.length === 0) {
      toast.info('No changes to save')
      return
    }
    setSaving(true)
    let success = 0
    let fail = 0
    for (const p of dirty) {
      try {
        const weight = p.editWeight.trim() ? parseFloat(p.editWeight) : null
        const length = p.editLength.trim() ? parseFloat(p.editLength) : null
        const width = p.editWidth.trim() ? parseFloat(p.editWidth) : null
        const height = p.editHeight.trim() ? parseFloat(p.editHeight) : null

        const res = await fetch(`/api/products/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weight, length, width, height, freeShipping: p.editFreeShipping }),
        })
        const data = await res.json()
        if (data.success) {
          success++
        } else {
          fail++
        }
      } catch {
        fail++
      }
    }
    setSaving(false)
    if (fail === 0) {
      toast.success(`${success} product(s) saved successfully`)
      await loadProducts()
    } else {
      toast.error(`${success} saved, ${fail} failed. Please try again for the failed ones.`)
      await loadProducts()
    }
  }

  // ── Filtered products ─────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory !== 'all' && p.categorySlug !== filterCategory) return false
    if (filterStatus === 'incomplete' && isComplete(p)) return false
    if (filterStatus === 'complete' && !isComplete(p)) return false
    return true
  })

  const incompleteCount = products.filter((p) => !isComplete(p)).length
  const completeCount = products.length - incompleteCount
  const dirtyCount = products.filter((p) => p.dirty).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Bulk Shipping Editor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and update shipping weight + dimensions for all products in one place.
          </p>
        </div>
        {dirtyCount > 0 && (
          <Button onClick={saveAll} disabled={saving} className="bg-gold hover:bg-gold/90">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : `Save All (${dirtyCount})`}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Products</p>
            <p className="text-lg font-bold">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" /> Incomplete
            </p>
            <p className="text-lg font-bold text-amber-600">{incompleteCount}</p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" /> Complete
            </p>
            <p className="text-lg font-bold text-green-600">{completeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unsaved Changes</p>
            <p className="text-lg font-bold text-gold">{dirtyCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-blush/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Button
            variant={filterStatus === 'incomplete' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('incomplete')}
            className={filterStatus === 'incomplete' ? 'bg-amber-500 text-white' : ''}
          >
            Incomplete ({incompleteCount})
          </Button>
          <Button
            variant={filterStatus === 'complete' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('complete')}
            className={filterStatus === 'complete' ? 'bg-green-500 text-white' : ''}
          >
            Complete ({completeCount})
          </Button>
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'bg-gold text-white' : ''}
          >
            All
          </Button>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-blush/30 bg-white"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.slug}</option>
          ))}
        </select>
      </div>

      {/* Product Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="border-blush/30 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blush/10 border-b border-blush/30">
                  <tr className="text-left">
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Product</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Category</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Price</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Free Ship</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Weight (oz)</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">L (in)</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">W (in)</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">H (in)</th>
                    <th className="px-2 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const complete = isComplete(p)
                    const savingThis = savingIds.has(p.id)
                    const hasVariants = p.variants.length > 0
                    const incompleteVariants = p.variants.filter(v => !isVariantComplete(v))
                    return (
                      <>
                      <tr key={p.id} className={`border-b border-blush/20 ${p.dirty ? 'bg-gold/5' : ''} ${hasVariants ? 'cursor-pointer' : ''}`} onClick={hasVariants ? () => toggleExpand(p.id) : undefined}>
                        <td className="px-3 py-2 font-medium max-w-[200px]">
                          <div className="flex items-center gap-1">
                            {hasVariants && (
                              <span className="text-muted-foreground">
                                {p.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </span>
                            )}
                            <span className="line-clamp-2">{p.name}</span>
                          </div>
                          {hasVariants && (
                            <span className="text-[10px] text-muted-foreground ml-5">{p.variants.length} variant(s){incompleteVariants.length > 0 ? ` · ${incompleteVariants.length} incomplete` : ''}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          <code className="bg-blush/20 px-1.5 py-0.5 rounded text-[10px]">{p.categorySlug}</code>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">${p.price.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <Switch
                            checked={p.editFreeShipping}
                            onCheckedChange={(v) => handleChange(p.id, 'editFreeShipping', v)}
                            disabled={savingThis}
                            className="data-[state=checked]:bg-gold scale-75"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number" step="0.1" min="0"
                            value={p.editWeight}
                            onChange={(e) => handleChange(p.id, 'editWeight', e.target.value)}
                            disabled={savingThis || p.editFreeShipping}
                            placeholder="—"
                            className={`w-16 h-8 text-xs ${!p.editWeight && !p.editFreeShipping ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" step="0.1" min="0"
                            value={p.editLength}
                            onChange={(e) => handleChange(p.id, 'editLength', e.target.value)}
                            disabled={savingThis || p.editFreeShipping}
                            placeholder="—"
                            className={`w-14 h-8 text-xs ${!p.editLength && !p.editFreeShipping ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" step="0.1" min="0"
                            value={p.editWidth}
                            onChange={(e) => handleChange(p.id, 'editWidth', e.target.value)}
                            disabled={savingThis || p.editFreeShipping}
                            placeholder="—"
                            className={`w-14 h-8 text-xs ${!p.editWidth && !p.editFreeShipping ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input type="number" step="0.1" min="0"
                            value={p.editHeight}
                            onChange={(e) => handleChange(p.id, 'editHeight', e.target.value)}
                            disabled={savingThis || p.editFreeShipping}
                            placeholder="—"
                            className={`w-14 h-8 text-xs ${!p.editHeight && !p.editFreeShipping ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          {p.editFreeShipping ? (
                            <Badge className="bg-gold/10 text-gold border-gold/20 text-[10px]">Free Ship</Badge>
                          ) : complete && incompleteVariants.length === 0 ? (
                            <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px]">✓ Ready</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">⚠ Incomplete</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {p.dirty && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-gold/30 text-gold hover:bg-gold hover:text-white"
                              onClick={(e) => { e.stopPropagation(); saveProduct(p) }}
                              disabled={savingThis}>
                              {savingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                              Save
                            </Button>
                          )}
                        </td>
                      </tr>
                      {/* ── Variant rows (shown when expanded) ── */}
                      {p.expanded && p.variants.map((v) => {
                        const vComplete = isVariantComplete(v)
                        const vSaving = savingIds.has(v.id)
                        return (
                          <tr key={v.id} className="bg-blush/5 border-b border-blush/10">
                            <td className="px-3 py-2 pl-10 text-sm text-muted-foreground">
                              ↳ {v.name} <span className="text-[10px] text-muted-foreground/70">(${v.price})</span>
                            </td>
                            <td colSpan={2} className="px-2 py-2 text-[10px] text-muted-foreground/70">Variant shipping:</td>
                            <td className="px-2 py-2"><span className="text-[10px] text-muted-foreground/70">—</span></td>
                            <td className="px-1 py-1">
                              <Input type="number" step="0.1" min="0"
                                value={v.editWeightOz}
                                onChange={(e) => handleVariantChange(p.id, v.id, 'editWeightOz', e.target.value)}
                                disabled={vSaving}
                                placeholder="—"
                                className={`w-16 h-8 text-xs ${!v.editWeightOz ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input type="number" step="0.1" min="0"
                                value={v.editLengthIn}
                                onChange={(e) => handleVariantChange(p.id, v.id, 'editLengthIn', e.target.value)}
                                disabled={vSaving}
                                placeholder="—"
                                className={`w-14 h-8 text-xs ${!v.editLengthIn ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input type="number" step="0.1" min="0"
                                value={v.editWidthIn}
                                onChange={(e) => handleVariantChange(p.id, v.id, 'editWidthIn', e.target.value)}
                                disabled={vSaving}
                                placeholder="—"
                                className={`w-14 h-8 text-xs ${!v.editWidthIn ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input type="number" step="0.1" min="0"
                                value={v.editHeightIn}
                                onChange={(e) => handleVariantChange(p.id, v.id, 'editHeightIn', e.target.value)}
                                disabled={vSaving}
                                placeholder="—"
                                className={`w-14 h-8 text-xs ${!v.editHeightIn ? 'border-amber-300 bg-amber-50' : 'border-blush/30'}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              {vComplete ? (
                                <Badge className="bg-green-500/10 text-green-700 border-green-500/20 text-[10px]">✓ Ready</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">⚠ Incomplete</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {v.dirty && (
                                <Button size="sm" variant="outline" className="h-7 text-xs border-gold/30 text-gold hover:bg-gold hover:text-white"
                                  onClick={() => saveVariant(p.id, v)}
                                  disabled={vSaving}>
                                  {vSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                  Save
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      </>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No products match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground">
        Products with incomplete shipping info will block checkout until weight and dimensions are entered.
        Toggle "Free Ship" for products that don't need carrier rate calculation.
        All measurements: weight in ounces (oz), dimensions in inches (in).
      </p>
    </div>
  )
}
