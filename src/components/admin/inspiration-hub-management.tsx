'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, Trash2, Edit, Upload, Eye, EyeOff, MoveUp, MoveDown,
  Sun, Sparkles, Droplets, Heart, Leaf, Check, ImageIcon, Lightbulb,
} from 'lucide-react'
import { toast } from 'sonner'

// Types
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

const ICON_OPTIONS = [
  { value: 'Sun', label: 'Sun', icon: Sun },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'Droplets', label: 'Droplets', icon: Droplets },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'Leaf', label: 'Leaf', icon: Leaf },
  { value: 'Check', label: 'Check', icon: Check },
]

const COLOR_OPTIONS = [
  { value: 'from-amber-500/80', label: 'Amber', swatch: 'bg-amber-500' },
  { value: 'from-gold/80', label: 'Gold', swatch: 'bg-yellow-500' },
  { value: 'from-rose-500/80', label: 'Rose', swatch: 'bg-rose-500' },
  { value: 'from-emerald-500/80', label: 'Emerald', swatch: 'bg-emerald-500' },
  { value: 'from-yellow-600/80', label: 'Yellow', swatch: 'bg-yellow-600' },
  { value: 'from-pink-500/80', label: 'Pink', swatch: 'bg-pink-500' },
  { value: 'from-orange-500/80', label: 'Orange', swatch: 'bg-orange-500' },
  { value: 'from-green-500/80', label: 'Green', swatch: 'bg-green-500' },
]

const defaultForm = (order = 0): InspirationForm => ({
  label: '',
  tip: '',
  image: '',
  icon: 'Sparkles',
  color: 'from-gold/80',
  active: true,
  order,
})

interface InspirationForm {
  label: string
  tip: string
  image: string
  icon: string
  color: string
  active: boolean
  order: number
}

// File upload helper
async function uploadFile(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Upload failed')
  return data.url
}

// Helper to get icon component by name
function getIconComponent(iconName: string) {
  const opt = ICON_OPTIONS.find(o => o.value === iconName)
  return opt?.icon ?? Sparkles
}

// Helper to get color swatch
function getColorSwatch(colorValue: string) {
  const opt = COLOR_OPTIONS.find(c => c.value === colorValue)
  return opt?.swatch ?? 'bg-gold'
}

export default function InspirationHubManagement() {
  const [items, setItems] = useState<InspirationItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InspirationItem | null>(null)
  const [form, setForm] = useState<InspirationForm>(defaultForm())
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load data
  const loadItems = () => {
    fetch('/api/inspiration-items?all=true')
      .then(r => r.json())
      .then(d => {
        if (d.success) setItems(d.items)
      })
      .catch(() => toast.error('Failed to load inspiration items'))
  }

  useEffect(() => { loadItems() }, [])

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const url = await uploadFile(file, 'inspiration')
      setForm(f => ({ ...f, image: url }))
      toast.success('Image uploaded!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  // Save (create or update)
  const saveItem = async () => {
    if (!form.label.trim()) { toast.error('Label is required'); return }
    if (!form.tip.trim()) { toast.error('Tip is required'); return }
    if (!form.image) { toast.error('Please upload an image'); return }

    try {
      if (editingItem) {
        await fetch(`/api/inspiration-items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Inspiration item updated!')
      } else {
        await fetch('/api/inspiration-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Inspiration item created!')
      }
      setDialogOpen(false)
      setEditingItem(null)
      setForm(defaultForm())
      loadItems()
    } catch {
      toast.error('Failed to save inspiration item')
    }
  }

  // Delete
  const deleteItem = async (id: string) => {
    if (!confirm('Delete this inspiration item?')) return
    try {
      await fetch(`/api/inspiration-items/${id}`, { method: 'DELETE' })
      toast.success('Inspiration item deleted')
      loadItems()
    } catch {
      toast.error('Failed to delete inspiration item')
    }
  }

  // Toggle active/inactive
  const toggleActive = async (item: InspirationItem) => {
    try {
      await fetch(`/api/inspiration-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      loadItems()
    } catch {
      toast.error('Failed to toggle item')
    }
  }

  // Reorder
  const reorderItem = async (item: InspirationItem, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === item.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === items.length - 1)) return
    const swapItem = items[direction === 'up' ? idx - 1 : idx + 1]
    try {
      await Promise.all([
        fetch(`/api/inspiration-items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: swapItem.order }),
        }),
        fetch(`/api/inspiration-items/${swapItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: item.order }),
        }),
      ])
      loadItems()
    } catch {
      toast.error('Failed to reorder items')
    }
  }

  // Open dialog for editing
  const openEdit = (item: InspirationItem) => {
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
  }

  // Open dialog for new item
  const openNew = () => {
    setEditingItem(null)
    setForm(defaultForm(items.length))
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Inspiration Hub
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage the beauty tips and inspiration cards shown on the homepage
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold-light text-white" onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> Add Inspiration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Inspiration Item' : 'Add Inspiration Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Image upload */}
              <div>
                <Label>Inspiration Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input type="file" ref={fileRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="border-gold/30 text-gold"
                  >
                    <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <span className="text-xs text-muted-foreground">or paste URL below</span>
                </div>
                <Input
                  value={form.image}
                  onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="Image URL"
                  className="mt-2 border-blush/30"
                />
              </div>

              {/* Image preview */}
              {form.image && (
                <div className="relative rounded-lg overflow-hidden h-40 bg-blush/20 border border-blush/30">
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Label */}
              <div>
                <Label>Label</Label>
                <Input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Morning Glow"
                  className="border-blush/30 mt-1"
                />
              </div>

              {/* Tip */}
              <div>
                <Label>Tip</Label>
                <Input
                  value={form.tip}
                  onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
                  placeholder="e.g. Start your day with a vitamin C serum for radiant skin"
                  className="border-blush/30 mt-1"
                />
              </div>

              {/* Icon and Color side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={v => setForm(f => ({ ...f, icon: v }))}>
                    <SelectTrigger className="border-blush/30 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="inline-flex items-center gap-2">
                            <opt.icon className="w-4 h-4" />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <Select value={form.color} onValueChange={v => setForm(f => ({ ...f, color: v }))}>
                    <SelectTrigger className="border-blush/30 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="inline-flex items-center gap-2">
                            <span className={`inline-block w-3 h-3 rounded-full ${opt.swatch}`} />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active and Order */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
                  <Label>Active</Label>
                </div>
                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    className="border-blush/30 mt-1 w-24"
                  />
                </div>
              </div>

              {/* Save button */}
              <Button onClick={saveItem} className="w-full bg-gold hover:bg-gold-light text-white">
                {editingItem ? 'Update Inspiration Item' : 'Add Inspiration Item'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <Card className="border-blush/20">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gold/30" />
            <p>No inspiration items yet. Add your first beauty tip!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const IconComp = getIconComponent(item.icon)
            const swatch = getColorSwatch(item.color)
            return (
              <Card
                key={item.id}
                className={`border-blush/20 overflow-hidden group transition-opacity ${!item.active ? 'opacity-50' : ''}`}
              >
                {/* Image section */}
                <div className="relative h-40 bg-blush/10">
                  {item.image ? (
                    <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-gold/20" />
                    </div>
                  )}
                  {/* Color gradient overlay at bottom */}
                  <div className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${item.color} to-transparent`} />
                  {/* Icon badge */}
                  <Badge className="absolute top-2 left-2 text-[10px] bg-black/50 text-white border-0 gap-1">
                    <IconComp className="w-3 h-3" />
                    {item.icon}
                  </Badge>
                  {/* Active badge */}
                  <Badge className={`absolute top-2 right-2 text-[10px] border-0 ${item.active ? 'bg-emerald-500/80 text-white' : 'bg-gray-500/80 text-white'}`}>
                    {item.active ? 'Active' : 'Inactive'}
                  </Badge>
                  {/* Order badge */}
                  <Badge variant="outline" className="absolute bottom-2 right-2 text-[10px] bg-black/40 text-white border-0">
                    #{item.order}
                  </Badge>
                </div>

                {/* Content section */}
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${swatch}`} />
                    <h4 className="font-semibold text-sm leading-tight">{item.label}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.tip}</p>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 pt-2 border-t border-blush/10">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-gold"
                      onClick={() => reorderItem(item, 'up')}
                      title="Move up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-gold"
                      onClick={() => reorderItem(item, 'down')}
                      title="Move down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => toggleActive(item)}
                      title={item.active ? 'Deactivate' : 'Activate'}
                    >
                      {item.active ? <Eye className="w-3.5 h-3.5 text-gold" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                      onClick={() => openEdit(item)}
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteItem(item.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview Section */}
      {items.filter(i => i.active).length > 0 && (
        <Card className="border-gold/20 bg-gradient-to-r from-cream via-white to-cream">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground mb-4 text-center uppercase tracking-widest">
              Preview — Inspiration Hub Cards
            </p>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {items.filter(i => i.active).map((item) => {
                const IconComp = getIconComponent(item.icon)
                return (
                  <div
                    key={item.id}
                    className="shrink-0 w-48 rounded-xl overflow-hidden border border-blush/20 bg-white shadow-sm"
                  >
                    <div className="relative h-24">
                      {item.image ? (
                        <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blush/10 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gold/20" />
                        </div>
                      )}
                      <div className={`absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t ${item.color} to-transparent`} />
                      <div className="absolute top-2 left-2">
                        <IconComp className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-xs mb-1">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{item.tip}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
