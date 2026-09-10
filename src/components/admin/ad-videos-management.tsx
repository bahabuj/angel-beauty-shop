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
  Video,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Play,
  ExternalLink,
  Film,
} from 'lucide-react'

interface AdVideo {
  id: string
  title: string
  description: string | null
  videoUrl: string
  posterImage: string | null
  productSlug: string | null
  duration: string
  active: boolean
  order: number
  createdAt: string
}

interface Product {
  id: string
  name: string
  slug: string
}

interface FormState {
  title: string
  description: string
  videoUrl: string
  posterImage: string
  productSlug: string
  duration: string
  active: boolean
  order: string
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  videoUrl: '',
  posterImage: '',
  productSlug: '',
  duration: '',
  active: true,
  order: '0',
}

export default function AdVideosManagement() {
  const [videos, setVideos] = useState<AdVideo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const [vidRes, prodRes] = await Promise.all([
        fetch('/api/ad-videos'),
        fetch('/api/products'),
      ])
      const [vidData, prodData] = await Promise.all([vidRes.json(), prodRes.json()])
      if (vidData.success) setVideos(vidData.videos)
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

  const openEdit = (v: AdVideo) => {
    setForm({
      title: v.title,
      description: v.description || '',
      videoUrl: v.videoUrl,
      posterImage: v.posterImage || '',
      productSlug: v.productSlug || '',
      duration: v.duration,
      active: v.active,
      order: String(v.order),
    })
    setEditingId(v.id)
    setDialogOpen(true)
  }

  // ─── Upload video file via /api/upload ──────────────────────────────────
  const handleVideoUpload = async (files: FileList) => {
    const allowedVideo = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']
    const file = Array.from(files).find((f) => allowedVideo.includes(f.type))
    if (!file) {
      toast.error('Please select a video file (MP4, WebM, MOV)')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video exceeds 100MB limit')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'ad-videos')
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setForm((prev) => ({ ...prev, videoUrl: data.url }))
        toast.success('Video uploaded')
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ─── Upload poster image ────────────────────────────────────────────────
  const handlePosterUpload = async (files: FileList) => {
    const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const file = Array.from(files).find((f) => allowedImage.includes(f.type))
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'ad-videos')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setForm((prev) => ({ ...prev, posterImage: data.url }))
        toast.success('Poster image uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.videoUrl.trim()) {
      toast.error('Video URL is required (upload a video or paste a URL)')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        videoUrl: form.videoUrl,
        posterImage: form.posterImage || null,
        productSlug: form.productSlug || null,
        duration: form.duration,
        active: form.active,
        order: parseInt(form.order) || 0,
      }
      const res = editingId
        ? await fetch(`/api/ad-videos/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/ad-videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (data.success) {
        toast.success(editingId ? 'Ad video updated' : 'Ad video created')
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
      const res = await fetch(`/api/ad-videos/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Ad video deleted')
        setDeleteId(null)
        await loadAll()
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (v: AdVideo) => {
    try {
      const res = await fetch(`/api/ad-videos/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !v.active }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${v.title} ${!v.active ? 'activated' : 'deactivated'}`)
        await loadAll()
      }
    } catch {
      toast.error('Failed to toggle')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Ad Videos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload product demo videos that play inline on the homepage.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-gold hover:bg-gold/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Video
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Videos</p>
            <p className="text-lg font-bold">{videos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-bold text-green-600">{videos.filter((v) => v.active).length}</p>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Linked to Products</p>
            <p className="text-lg font-bold">{videos.filter((v) => v.productSlug).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Video grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length === 0 ? (
        <Card className="border-blush/30">
          <CardContent className="py-12 text-center">
            <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-semibold mb-1">No ad videos yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first product demo video.
            </p>
            <Button onClick={openAdd} className="bg-gold hover:bg-gold/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <Card key={v.id} className="border-blush/30 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative aspect-video bg-black group">
                {v.posterImage ? (
                  <img
                    src={v.posterImage}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={v.videoUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge
                    className={v.active
                      ? 'bg-green-500/90 text-white'
                      : 'bg-gray-500/90 text-white'}
                  >
                    {v.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {v.duration && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className="bg-black/70 text-white text-[10px]">{v.duration}</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-1 line-clamp-1">{v.title}</h3>
                {v.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{v.description}</p>
                )}
                {v.productSlug && (
                  <Badge variant="outline" className="text-[10px] mb-2">
                    <ExternalLink className="w-2.5 h-2.5 mr-1" />
                    {products.find((p) => p.slug === v.productSlug)?.name || v.productSlug}
                  </Badge>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openEdit(v)}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Switch
                    checked={v.active}
                    onCheckedChange={() => handleToggleActive(v)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 ml-auto"
                    onClick={() => setDeleteId(v.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create/Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-gold" />
              {editingId ? 'Edit Ad Video' : 'Add Ad Video'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="vid-title">Title *</Label>
              <Input
                id="vid-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Vitamin C Serum Demo"
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="vid-desc">Description</Label>
              <Textarea
                id="vid-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short caption shown under the video"
                rows={2}
                disabled={saving}
              />
            </div>

            {/* Video upload + URL */}
            <div>
              <Label>Video File *</Label>
              {form.videoUrl ? (
                <div className="mt-1 space-y-2">
                  <video
                    src={form.videoUrl}
                    controls
                    className="w-full aspect-video bg-black rounded-md"
                    preload="metadata"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.videoUrl}
                      onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                      className="font-mono text-xs"
                      disabled={saving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setForm({ ...form, videoUrl: '' })}
                      disabled={saving}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="mt-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blush/50 rounded-lg cursor-pointer hover:bg-blush/10 transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleVideoUpload(e.target.files)}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gold mb-1" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload video (MP4, max 100MB)'}
                  </span>
                </label>
              )}
            </div>

            {/* Poster image */}
            <div>
              <Label>Poster Image (optional)</Label>
              {form.posterImage ? (
                <div className="mt-1 flex items-center gap-2">
                  <img
                    src={form.posterImage}
                    alt="poster"
                    className="w-20 h-12 object-cover rounded"
                  />
                  <Input
                    value={form.posterImage}
                    onChange={(e) => setForm({ ...form, posterImage: e.target.value })}
                    className="font-mono text-xs flex-1"
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, posterImage: '' })}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <label className="mt-1 flex items-center justify-center w-full h-16 border border-dashed border-blush/50 rounded-lg cursor-pointer hover:bg-blush/10">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handlePosterUpload(e.target.files)}
                    disabled={uploading}
                  />
                  <span className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload poster image (optional)'}
                  </span>
                </label>
              )}
            </div>

            {/* Linked product + duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Link to Product (optional)</Label>
                <Select
                  value={form.productSlug || 'none'}
                  onValueChange={(v) => setForm({ ...form, productSlug: v === 'none' ? '' : v })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh]">
                    <SelectItem value="none">None</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.slug}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vid-duration">Duration (display only)</Label>
                <Input
                  id="vid-duration"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="0:45"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Active + Order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border border-blush/30 p-3">
                <div>
                  <Label className="cursor-pointer">Active</Label>
                  <p className="text-xs text-muted-foreground">Show on homepage</p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="vid-order">Order</Label>
                <Input
                  id="vid-order"
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Ad Video?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the video from the homepage. The video file itself
            remains in Cloudinary/storage.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
