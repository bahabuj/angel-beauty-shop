'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Calendar,
  Tag,
  Percent,
  DollarSign,
  Truck,
} from 'lucide-react'

interface Promotion {
  id: string
  name: string
  description: string | null
  type: string
  discount: number
  couponCode: string
  minimumOrder: number
  eligibleProducts: string
  eligibleCategories: string
  freeShipping: boolean
  startDate: string | null
  endDate: string | null
  usageLimit: number
  usedCount: number
  status: string
  createdAt: string
}

interface Category {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  slug: string
}

interface FormState {
  name: string
  description: string
  type: string
  discount: string
  couponCode: string
  minimumOrder: string
  eligibleProducts: string[]
  eligibleCategories: string[]
  freeShipping: boolean
  startDate: string
  endDate: string
  usageLimit: string
  status: string
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  type: 'percentage',
  discount: '10',
  couponCode: '',
  minimumOrder: '0',
  eligibleProducts: [],
  eligibleCategories: [],
  freeShipping: false,
  startDate: '',
  endDate: '',
  usageLimit: '0',
  status: 'active',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-green-500/10 text-green-700 border-green-500/20',
    scheduled: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    expired: 'bg-gray-200 text-gray-600 border-gray-300',
    disabled: 'bg-red-500/10 text-red-700 border-red-500/20',
  }
  return styles[status] || styles.active
}

export default function PromotionsManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [promoRes, catRes, prodRes] = await Promise.all([
        fetch('/api/promotions'),
        fetch('/api/categories'),
        fetch('/api/products'),
      ])
      const [promoData, catData, prodData] = await Promise.all([
        promoRes.json(),
        catRes.json(),
        prodRes.json(),
      ])
      if (promoData.success) setPromotions(promoData.promotions)
      if (catData.success) setCategories(catData.categories || [])
      if (prodData.success) setProducts(prodData.products || [])
    } catch (e) {
      console.error(e)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const openAdd = () => {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (promo: Promotion) => {
    setForm({
      name: promo.name,
      description: promo.description || '',
      type: promo.type,
      discount: String(promo.discount),
      couponCode: promo.couponCode,
      minimumOrder: String(promo.minimumOrder),
      eligibleProducts: (() => { try { return JSON.parse(promo.eligibleProducts || '[]') } catch { return [] } })(),
      eligibleCategories: (() => { try { return JSON.parse(promo.eligibleCategories || '[]') } catch { return [] } })(),
      freeShipping: promo.freeShipping,
      startDate: promo.startDate ? promo.startDate.split('T')[0] : '',
      endDate: promo.endDate ? promo.endDate.split('T')[0] : '',
      usageLimit: String(promo.usageLimit),
      status: promo.status,
    })
    setEditingId(promo.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Promotion name is required')
      return
    }
    if (!form.couponCode.trim()) {
      toast.error('Coupon code is required')
      return
    }
    const discount = parseFloat(form.discount)
    if (isNaN(discount) || discount < 0) {
      toast.error('Discount must be a non-negative number')
      return
    }
    if (form.type === 'percentage' && discount > 100) {
      toast.error('Percentage discount cannot exceed 100')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        discount,
        couponCode: form.couponCode,
        minimumOrder: parseFloat(form.minimumOrder) || 0,
        eligibleProducts: form.eligibleProducts,
        eligibleCategories: form.eligibleCategories,
        freeShipping: form.freeShipping || form.type === 'shipping',
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        usageLimit: parseInt(form.usageLimit) || 0,
        status: form.status,
      }
      const res = editingId
        ? await fetch(`/api/promotions/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (data.success) {
        toast.success(editingId ? 'Promotion updated' : 'Promotion created')
        setDialogOpen(false)
        await loadAll()
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/promotions/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Promotion deleted')
        setDeleteId(null)
        await loadAll()
      } else {
        toast.error('Failed to delete')
      }
    } catch (e) {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Copied "${code}" to clipboard`)
  }

  const toggleArrayItem = (arr: string[], item: string): string[] => {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Promotions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create discount codes, percentage-off sales, and free-shipping coupons.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-gold hover:bg-gold/90">
          <Plus className="h-4 w-4 mr-2" />
          Create Promotion
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{promotions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-bold text-green-600">
              {promotions.filter((p) => p.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="text-lg font-bold text-blue-600">
              {promotions.filter((p) => p.status === 'scheduled').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Used</p>
            <p className="text-lg font-bold">
              {promotions.reduce((s, p) => s + p.usedCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Promotions grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : promotions.length === 0 ? (
        <Card className="border-blush/30">
          <CardContent className="py-12 text-center">
            <Ticket className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-semibold mb-1">No promotions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first discount code or free-shipping coupon.
            </p>
            <Button onClick={openAdd} className="bg-gold hover:bg-gold/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map((promo) => (
            <Card key={promo.id} className="border-blush/30 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base">{promo.name}</h3>
                      <Badge className={statusBadge(promo.status)}>
                        {promo.status}
                      </Badge>
                    </div>
                    {promo.description && (
                      <p className="text-xs text-muted-foreground">{promo.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(promo)}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(promo.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Discount + Coupon */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-lg bg-blush/10 p-3">
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      {promo.type === 'percentage' && <Percent className="h-3 w-3" />}
                      {promo.type === 'fixed' && <DollarSign className="h-3 w-3" />}
                      {promo.type === 'shipping' && <Truck className="h-3 w-3" />}
                      Discount
                    </p>
                    <p className="font-bold text-gold">
                      {promo.type === 'percentage' && `${promo.discount}%`}
                      {promo.type === 'fixed' && `$${promo.discount.toFixed(2)}`}
                      {promo.type === 'shipping' && 'Free Shipping'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blush/10 p-3">
                    <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Coupon Code
                    </p>
                    <button
                      onClick={() => copyCode(promo.couponCode)}
                      className="font-mono font-bold text-foreground hover:text-gold flex items-center gap-1"
                      title="Click to copy"
                    >
                      {promo.couponCode}
                      <Copy className="h-3 w-3 opacity-50" />
                    </button>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Order:</span>
                    <span className="font-medium">${promo.minimumOrder.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Free Ship:</span>
                    <span className="font-medium">{promo.freeShipping ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <span className="font-medium">{formatDate(promo.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End:</span>
                    <span className="font-medium">{formatDate(promo.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used:</span>
                    <span className="font-medium">
                      {promo.usedCount}{promo.usageLimit > 0 ? ` / ${promo.usageLimit}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{promo.type}</span>
                  </div>
                </div>

                {/* Eligibility badges */}
                {(() => {
                  const cats = (() => { try { return JSON.parse(promo.eligibleCategories || '[]') } catch { return [] } })()
                  const prods = (() => { try { return JSON.parse(promo.eligibleProducts || '[]') } catch { return [] } })()
                  if (cats.length === 0 && prods.length === 0) return null
                  return (
                    <div className="mt-3 pt-3 border-t border-blush/20 flex flex-wrap gap-1">
                      {cats.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {cats.length} categor{cats.length === 1 ? 'y' : 'ies'}
                        </Badge>
                      )}
                      {prods.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {prods.length} product{prods.length === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create/Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Promotion' : 'Create Promotion'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name + Coupon Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promo-name">Promotion Name *</Label>
                <Input
                  id="promo-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Black Friday 2026"
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="promo-code">Coupon Code *</Label>
                <Input
                  id="promo-code"
                  value={form.couponCode}
                  onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                  placeholder="BLACKFRI40"
                  className="font-mono"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="promo-desc">Description</Label>
              <Textarea
                id="promo-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional notes about this promotion"
                rows={2}
                disabled={saving}
              />
            </div>

            {/* Type + Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Promotion Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount Off ($)</SelectItem>
                    <SelectItem value="shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="promo-discount">
                  Discount {form.type === 'percentage' ? '(%)' : '($ USD)'}
                </Label>
                <Input
                  id="promo-discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={form.type === 'percentage' ? '100' : undefined}
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  disabled={saving || form.type === 'shipping'}
                />
              </div>
            </div>

            {/* Minimum Order + Usage Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promo-min">Minimum Order ($)</Label>
                <Input
                  id="promo-min"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minimumOrder}
                  onChange={(e) => setForm({ ...form, minimumOrder: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="promo-limit">Usage Limit (0 = unlimited)</Label>
                <Input
                  id="promo-limit"
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promo-start">Start Date</Label>
                <Input
                  id="promo-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="promo-end">End Date</Label>
                <Input
                  id="promo-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Eligible Categories */}
            <div>
              <Label>Eligible Categories (empty = all)</Label>
              <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-blush/30 p-2 space-y-1
                              [&::-webkit-scrollbar]:w-1.5
                              [&::-webkit-scrollbar-thumb]:rounded-full
                              [&::-webkit-scrollbar-thumb]:bg-blush/40
                              [&::-webkit-scrollbar-track]:bg-transparent">
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No categories yet.</p>
                ) : (
                  categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-blush/10 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={form.eligibleCategories.includes(cat.slug)}
                        onChange={() => setForm({
                          ...form,
                          eligibleCategories: toggleArrayItem(form.eligibleCategories, cat.slug),
                        })}
                        disabled={saving}
                        className="rounded"
                      />
                      <span>{cat.name}</span>
                      <code className="text-[10px] text-muted-foreground ml-auto">{cat.slug}</code>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Eligible Products */}
            <div>
              <Label>Eligible Products (empty = all)</Label>
              <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-blush/30 p-2 space-y-1
                              [&::-webkit-scrollbar]:w-1.5
                              [&::-webkit-scrollbar-thumb]:rounded-full
                              [&::-webkit-scrollbar-thumb]:bg-blush/40
                              [&::-webkit-scrollbar-track]:bg-transparent">
                {products.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No products yet.</p>
                ) : (
                  products.map((prod) => (
                    <label
                      key={prod.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-blush/10 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={form.eligibleProducts.includes(prod.id)}
                        onChange={() => setForm({
                          ...form,
                          eligibleProducts: toggleArrayItem(form.eligibleProducts, prod.id),
                        })}
                        disabled={saving}
                        className="rounded"
                      />
                      <span className="truncate">{prod.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Free Shipping + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border border-blush/30 p-3">
                <div>
                  <Label htmlFor="promo-free-ship" className="cursor-pointer">Free Shipping</Label>
                  <p className="text-xs text-muted-foreground">Waive shipping cost</p>
                </div>
                <Switch
                  id="promo-free-ship"
                  checked={form.freeShipping || form.type === 'shipping'}
                  onCheckedChange={(v) => setForm({ ...form, freeShipping: v })}
                  disabled={saving || form.type === 'shipping'}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold hover:bg-gold/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Promotion?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the promotion and its coupon code. Customers will no longer be able to redeem it.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
