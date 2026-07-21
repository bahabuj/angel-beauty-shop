'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  ImagePlus, Trash2, Edit, Plus, Upload, Eye, EyeOff,
  MoveUp, MoveDown, ArrowRightLeft, Clock, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

// Types
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

const emptyForm = {
  name: '',
  duration: '',
  result: '',
  beforeImg: '',
  afterImg: '',
  active: true,
  order: 0,
}

export default function BeforeAfterManagement() {
  const [transformations, setTransformations] = useState<Transformation[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Transformation | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const beforeFileRef = useRef<HTMLInputElement>(null)
  const afterFileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingField, setUploadingField] = useState<'before' | 'after' | null>(null)

  // Fetch data
  const loadTransformations = () => {
    fetch('/api/transformations?all=true')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTransformations(d.transformations)
        }
      })
  }

  useEffect(() => {
    loadTransformations()
  }, [])

  // File upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'before' | 'after') => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      setUploadingField(field)
      const url = await uploadFile(file, 'transformations')
      setForm(f => ({ ...f, [field === 'before' ? 'beforeImg' : 'afterImg']: url }))
      toast.success(`${field === 'before' ? 'Before' : 'After'} image uploaded!`)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadingField(null)
    }
  }

  // Save (create or update)
  const saveTransformation = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    if (!form.beforeImg) { toast.error('Before image is required'); return }
    if (!form.afterImg) { toast.error('After image is required'); return }

    try {
      if (editingItem) {
        await fetch(`/api/transformations/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Transformation updated!')
      } else {
        await fetch('/api/transformations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast.success('Transformation created!')
      }
      setDialogOpen(false)
      setEditingItem(null)
      setForm({ ...emptyForm })
      loadTransformations()
    } catch {
      toast.error('Failed to save transformation')
    }
  }

  // Delete
  const deleteTransformation = async (id: string) => {
    if (!confirm('Delete this transformation?')) return
    await fetch(`/api/transformations/${id}`, { method: 'DELETE' })
    toast.success('Transformation deleted')
    loadTransformations()
  }

  // Toggle active
  const toggleActive = async (item: Transformation) => {
    await fetch(`/api/transformations/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    loadTransformations()
  }

  // Reorder
  const reorderItem = async (item: Transformation, direction: 'up' | 'down') => {
    const idx = transformations.findIndex(t => t.id === item.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === transformations.length - 1)) return
    const swapItem = transformations[direction === 'up' ? idx - 1 : idx + 1]
    await Promise.all([
      fetch(`/api/transformations/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: swapItem.order }),
      }),
      fetch(`/api/transformations/${swapItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: item.order }),
      }),
    ])
    loadTransformations()
  }

  // Open edit dialog
  const openEditDialog = (item: Transformation) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      duration: item.duration,
      result: item.result,
      beforeImg: item.beforeImg,
      afterImg: item.afterImg,
      active: item.active,
      order: item.order,
    })
    setDialogOpen(true)
  }

  // Open add dialog
  const openAddDialog = () => {
    setEditingItem(null)
    setForm({ ...emptyForm, order: transformations.length })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Before & After Images
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage transformation showcase images — upload before & after photos with treatment details
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold-light text-white" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" /> Add Transformation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Transformation' : 'Add Transformation'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Before Image Upload */}
              <div>
                <Label>Before Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    ref={beforeFileRef}
                    accept="image/*"
                    onChange={e => handleFileUpload(e, 'before')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => beforeFileRef.current?.click()}
                    disabled={uploading && uploadingField === 'before'}
                    className="border-gold/30 text-gold"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading && uploadingField === 'before' ? 'Uploading...' : 'Upload Before'}
                  </Button>
                  <span className="text-xs text-muted-foreground">or paste URL below</span>
                </div>
                <Input
                  value={form.beforeImg}
                  onChange={e => setForm(f => ({ ...f, beforeImg: e.target.value }))}
                  placeholder="Before image URL"
                  className="mt-2 border-blush/30"
                />
              </div>

              {/* Before Image Preview */}
              {form.beforeImg && (
                <div className="relative rounded-lg overflow-hidden h-40 bg-blush/20 border border-blush/30">
                  <img src={form.beforeImg} alt="Before preview" className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 left-2 text-[10px] bg-black/60 text-white border-0">BEFORE</Badge>
                </div>
              )}

              {/* After Image Upload */}
              <div>
                <Label>After Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    ref={afterFileRef}
                    accept="image/*"
                    onChange={e => handleFileUpload(e, 'after')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => afterFileRef.current?.click()}
                    disabled={uploading && uploadingField === 'after'}
                    className="border-gold/30 text-gold"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading && uploadingField === 'after' ? 'Uploading...' : 'Upload After'}
                  </Button>
                  <span className="text-xs text-muted-foreground">or paste URL below</span>
                </div>
                <Input
                  value={form.afterImg}
                  onChange={e => setForm(f => ({ ...f, afterImg: e.target.value }))}
                  placeholder="After image URL"
                  className="mt-2 border-blush/30"
                />
              </div>

              {/* After Image Preview */}
              {form.afterImg && (
                <div className="relative rounded-lg overflow-hidden h-40 bg-blush/20 border border-blush/30">
                  <img src={form.afterImg} alt="After preview" className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 left-2 text-[10px] bg-gold/80 text-white border-0">AFTER</Badge>
                </div>
              )}

              {/* Side by side preview */}
              {form.beforeImg && form.afterImg && (
                <div className="rounded-lg overflow-hidden border border-blush/30">
                  <p className="text-xs text-muted-foreground p-2 text-center uppercase tracking-widest">Preview</p>
                  <div className="flex">
                    <div className="flex-1 relative h-32">
                      <img src={form.beforeImg} alt="Before" className="w-full h-full object-cover" />
                      <Badge className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white border-0">Before</Badge>
                    </div>
                    <div className="w-px bg-white/30" />
                    <div className="flex-1 relative h-32">
                      <img src={form.afterImg} alt="After" className="w-full h-full object-cover" />
                      <Badge className="absolute bottom-2 left-2 text-[10px] bg-gold/80 text-white border-0">After</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <Label>Treatment Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Turmeric Glow Facial"
                  className="border-blush/30 mt-1"
                />
              </div>

              {/* Duration & Result */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 4 Weeks"
                    className="border-blush/30 mt-1"
                  />
                </div>
                <div>
                  <Label>Result</Label>
                  <Input
                    value={form.result}
                    onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                    placeholder="e.g. Radiant Glow"
                    className="border-blush/30 mt-1"
                  />
                </div>
              </div>

              {/* Active toggle & Order */}
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
              <Button onClick={saveTransformation} className="w-full bg-gold hover:bg-gold-light text-white">
                {editingItem ? 'Update Transformation' : 'Add Transformation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transformation Cards Grid */}
      <div className="grid gap-4">
        {transformations.length === 0 ? (
          <Card className="border-blush/20">
            <CardContent className="p-8 text-center text-muted-foreground">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 text-gold/30" />
              <p>No transformations yet. Add your first before & after showcase!</p>
            </CardContent>
          </Card>
        ) : (
          transformations.map((item) => (
            <Card key={item.id} className={`border-blush/20 overflow-hidden ${!item.active ? 'opacity-50' : ''}`}>
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Before/After Images Side by Side */}
                  <div className="flex shrink-0">
                    <div className="w-40 h-28 sm:w-36 sm:h-28 relative bg-blush/10">
                      <img src={item.beforeImg} alt={`Before - ${item.name}`} className="w-full h-full object-cover" />
                      <Badge className="absolute top-2 left-2 text-[10px] bg-black/60 text-white border-0">BEFORE</Badge>
                    </div>
                    <div className="w-px bg-blush/30" />
                    <div className="w-40 h-28 sm:w-36 sm:h-28 relative bg-blush/10">
                      <img src={item.afterImg} alt={`After - ${item.name}`} className="w-full h-full object-cover" />
                      <Badge className="absolute top-2 left-2 text-[10px] bg-gold/80 text-white border-0">AFTER</Badge>
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.name || 'Untitled Transformation'}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {item.duration && (
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.duration}
                          </Badge>
                        )}
                        {item.result && (
                          <Badge variant="outline" className="text-[10px]">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {item.result}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">Order: {item.order}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-gold"
                        onClick={() => reorderItem(item, 'up')}
                      >
                        <MoveUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-gold"
                        onClick={() => reorderItem(item, 'down')}
                      >
                        <MoveDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => toggleActive(item)}
                      >
                        {item.active
                          ? <Eye className="w-4 h-4 text-gold" />
                          : <EyeOff className="w-4 h-4 text-muted-foreground" />
                        }
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTransformation(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview section */}
      {transformations.length > 0 && (
        <Card className="border-gold/20 bg-gradient-to-r from-cream via-white to-cream">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground mb-4 text-center uppercase tracking-widest">
              Preview — Before & After Showcase
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {transformations.filter(t => t.active).map(item => (
                <div key={item.id} className="rounded-xl overflow-hidden border border-blush/20 shadow-sm">
                  <div className="flex">
                    <div className="flex-1 relative h-32">
                      <img src={item.beforeImg} alt={`Before - ${item.name}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">Before</span>
                    </div>
                    <div className="flex-1 relative h-32">
                      <img src={item.afterImg} alt={`After - ${item.name}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[9px] bg-gold/80 text-white px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">After</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white">
                    <p className="font-semibold text-xs">{item.name}</p>
                    <div className="flex gap-2 mt-1">
                      {item.duration && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {item.duration}
                        </span>
                      )}
                      {item.result && (
                        <span className="text-[10px] text-gold flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" /> {item.result}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
