'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ImagePlus, Trash2, Edit, Plus, GripVertical, Play, Truck, Sparkles, Gift, Star, Heart,
  Upload, Eye, EyeOff, Link as LinkIcon, Video, ImageIcon, MoveUp, MoveDown, Ban
} from 'lucide-react'
import { toast } from 'sonner'

// Types
interface HeroSlide {
  id: string; title: string; subtitle: string | null; mediaUrl: string; mediaType: string;
  active: boolean; order: number; overlayDark: number; kenBurns: boolean;
}

interface Partner {
  id: string; name: string; logo: string; url: string | null; active: boolean; order: number;
}

interface AnnouncementItem {
  id: string; text: string; icon: string; separator: string; active: boolean; order: number;
}

const ICON_OPTIONS = [
  { value: 'none', label: 'No Icon', icon: null },
  { value: 'truck', label: 'Truck', icon: Truck },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'gift', label: 'Gift', icon: Gift },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'heart', label: 'Heart', icon: Heart },
]

const SEPARATOR_OPTIONS = ['✦', '✨', '●', '◆', '|', '·']

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

export default function VisualContentManagement() {
  const [activeTab, setActiveTab] = useState('hero')
  
  // Hero slides state
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [heroDialogOpen, setHeroDialogOpen] = useState(false)
  const [editingHeroSlide, setEditingHeroSlide] = useState<HeroSlide | null>(null)
  const [heroForm, setHeroForm] = useState({ title: '', subtitle: '', mediaUrl: '', mediaType: 'image', active: true, order: 0, overlayDark: 0.5, kenBurns: true })
  const heroFileRef = useRef<HTMLInputElement>(null)

  // Partners state
  const [partners, setPartners] = useState<Partner[]>([])
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [partnerForm, setPartnerForm] = useState({ name: '', logo: '', url: '', active: true, order: 0 })
  const partnerFileRef = useRef<HTMLInputElement>(null)

  // Announcement items state
  const [announcementItems, setAnnouncementItems] = useState<AnnouncementItem[]>([])
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null)
  const [announcementForm, setAnnouncementForm] = useState({ text: '', icon: 'none', separator: '✦', active: true, order: 0 })

  // Loading states
  const [uploading, setUploading] = useState(false)

  // Fetch data
  const loadHeroSlides = () => fetch('/api/hero-slides?all=true').then(r => r.json()).then(d => d.success && setHeroSlides(d.slides))
  const loadPartners = () => fetch('/api/partners?all=true').then(r => r.json()).then(d => d.success && setPartners(d.partners))
  const loadAnnouncementItems = () => fetch('/api/announcement-items?all=true').then(r => r.json()).then(d => d.success && setAnnouncementItems(d.items))

  useEffect(() => { loadHeroSlides(); loadPartners(); loadAnnouncementItems() }, [])

  // Hero slide handlers
  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const url = await uploadFile(file, 'hero')
      setHeroForm(f => ({ ...f, mediaUrl: url, mediaType: file.type.startsWith('video/') ? 'video' : 'image' }))
      toast.success('File uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const saveHeroSlide = async () => {
    if (!heroForm.mediaUrl) { toast.error('Please upload an image or video'); return }
    try {
      if (editingHeroSlide) {
        await fetch(`/api/hero-slides/${editingHeroSlide.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(heroForm) })
        toast.success('Hero slide updated!')
      } else {
        await fetch('/api/hero-slides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(heroForm) })
        toast.success('Hero slide created!')
      }
      setHeroDialogOpen(false)
      setEditingHeroSlide(null)
      setHeroForm({ title: '', subtitle: '', mediaUrl: '', mediaType: 'image', active: true, order: 0, overlayDark: 0.5, kenBurns: true })
      loadHeroSlides()
    } catch { toast.error('Failed to save hero slide') }
  }

  const deleteHeroSlide = async (id: string) => {
    if (!confirm('Delete this hero slide?')) return
    await fetch(`/api/hero-slides/${id}`, { method: 'DELETE' })
    toast.success('Hero slide deleted')
    loadHeroSlides()
  }

  const toggleHeroSlide = async (slide: HeroSlide) => {
    await fetch(`/api/hero-slides/${slide.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !slide.active }) })
    loadHeroSlides()
  }

  const reorderHeroSlide = async (slide: HeroSlide, direction: 'up' | 'down') => {
    const idx = heroSlides.findIndex(s => s.id === slide.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === heroSlides.length - 1)) return
    const swapSlide = heroSlides[direction === 'up' ? idx - 1 : idx + 1]
    await Promise.all([
      fetch(`/api/hero-slides/${slide.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: swapSlide.order }) }),
      fetch(`/api/hero-slides/${swapSlide.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: slide.order }) }),
    ])
    loadHeroSlides()
  }

  // Partner handlers
  const handlePartnerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const url = await uploadFile(file, 'partners')
      setPartnerForm(f => ({ ...f, logo: url }))
      toast.success('Logo uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const savePartner = async () => {
    if (!partnerForm.name || !partnerForm.logo) { toast.error('Name and logo are required'); return }
    try {
      if (editingPartner) {
        await fetch(`/api/partners/${editingPartner.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(partnerForm) })
        toast.success('Partner updated!')
      } else {
        await fetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(partnerForm) })
        toast.success('Partner created!')
      }
      setPartnerDialogOpen(false)
      setEditingPartner(null)
      setPartnerForm({ name: '', logo: '', url: '', active: true, order: 0 })
      loadPartners()
    } catch { toast.error('Failed to save partner') }
  }

  const deletePartner = async (id: string) => {
    if (!confirm('Delete this partner?')) return
    await fetch(`/api/partners/${id}`, { method: 'DELETE' })
    toast.success('Partner deleted')
    loadPartners()
  }

  const togglePartner = async (partner: Partner) => {
    await fetch(`/api/partners/${partner.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !partner.active }) })
    loadPartners()
  }

  const reorderPartner = async (partner: Partner, direction: 'up' | 'down') => {
    const idx = partners.findIndex(p => p.id === partner.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === partners.length - 1)) return
    const swapPartner = partners[direction === 'up' ? idx - 1 : idx + 1]
    await Promise.all([
      fetch(`/api/partners/${partner.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: swapPartner.order }) }),
      fetch(`/api/partners/${swapPartner.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: partner.order }) }),
    ])
    loadPartners()
  }

  // Announcement item handlers
  const saveAnnouncementItem = async () => {
    if (!announcementForm.text) { toast.error('Text is required'); return }
    try {
      if (editingAnnouncement) {
        await fetch(`/api/announcement-items/${editingAnnouncement.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(announcementForm) })
        toast.success('Announcement item updated!')
      } else {
        await fetch('/api/announcement-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(announcementForm) })
        toast.success('Announcement item created!')
      }
      setAnnouncementDialogOpen(false)
      setEditingAnnouncement(null)
      setAnnouncementForm({ text: '', icon: 'none', separator: '✦', active: true, order: 0 })
      loadAnnouncementItems()
    } catch { toast.error('Failed to save announcement item') }
  }

  const deleteAnnouncementItem = async (id: string) => {
    if (!confirm('Delete this announcement item?')) return
    await fetch(`/api/announcement-items/${id}`, { method: 'DELETE' })
    toast.success('Announcement item deleted')
    loadAnnouncementItems()
  }

  const toggleAnnouncementItem = async (item: AnnouncementItem) => {
    await fetch(`/api/announcement-items/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !item.active }) })
    loadAnnouncementItems()
  }

  const reorderAnnouncementItem = async (item: AnnouncementItem, direction: 'up' | 'down') => {
    const idx = announcementItems.findIndex(a => a.id === item.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === announcementItems.length - 1)) return
    const swapItem = announcementItems[direction === 'up' ? idx - 1 : idx + 1]
    await Promise.all([
      fetch(`/api/announcement-items/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: swapItem.order }) }),
      fetch(`/api/announcement-items/${swapItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: item.order }) }),
    ])
    loadAnnouncementItems()
  }

  // Preview text for announcement bar
  const announcementPreview = announcementItems.filter(i => i.active).map(i => {
    const iconOpt = ICON_OPTIONS.find(o => o.value === i.icon)
    const iconStr = iconOpt?.icon ? `[${iconOpt.label}]` : ''
    return `${iconStr} ${i.text} ${i.separator}`
  }).join(' ')

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-blush/20 border border-blush/30">
          <TabsTrigger value="hero" className="data-[state=active]:bg-gold data-[state=active]:text-white">
            <ImageIcon className="w-4 h-4 mr-2" /> Hero Slides
          </TabsTrigger>
          <TabsTrigger value="partners" className="data-[state=active]:bg-gold data-[state=active]:text-white">
            <Star className="w-4 h-4 mr-2" /> Partners
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-gold data-[state=active]:text-white">
            <Sparkles className="w-4 h-4 mr-2" /> Announcement Bar
          </TabsTrigger>
        </TabsList>

        {/* ===== HERO SLIDES TAB ===== */}
        <TabsContent value="hero" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Hero Background Slides</h3>
              <p className="text-sm text-muted-foreground">Manage the cinematic background images/videos in the hero section</p>
            </div>
            <Dialog open={heroDialogOpen} onOpenChange={setHeroDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gold hover:bg-gold-light text-white" onClick={() => { setEditingHeroSlide(null); setHeroForm({ title: '', subtitle: '', mediaUrl: '', mediaType: 'image', active: true, order: heroSlides.length, overlayDark: 0.5, kenBurns: true }) }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Slide
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingHeroSlide ? 'Edit Hero Slide' : 'Add Hero Slide'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Background Image / Video</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <input type="file" ref={heroFileRef} accept="image/*,video/*" onChange={handleHeroFileUpload} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => heroFileRef.current?.click()} disabled={uploading} className="border-gold/30 text-gold">
                        <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload File'}
                      </Button>
                      <span className="text-xs text-muted-foreground">or paste URL below</span>
                    </div>
                    <Input value={heroForm.mediaUrl} onChange={e => setHeroForm(f => ({ ...f, mediaUrl: e.target.value, mediaType: e.target.value.match(/\.(mp4|webm)$/i) ? 'video' : 'image' }))} placeholder="Image/Video URL" className="mt-2 border-blush/30" />
                  </div>
                  {heroForm.mediaUrl && (
                    <div className="relative rounded-lg overflow-hidden h-40 bg-blush/20 border border-blush/30">
                      {heroForm.mediaType === 'video' ? (
                        <video src={heroForm.mediaUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={heroForm.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Title</Label><Input value={heroForm.title} onChange={e => setHeroForm(f => ({ ...f, title: e.target.value }))} placeholder="Slide title" className="border-blush/30 mt-1" /></div>
                    <div><Label>Subtitle</Label><Input value={heroForm.subtitle} onChange={e => setHeroForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Slide subtitle" className="border-blush/30 mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Media Type</Label>
                      <Select value={heroForm.mediaType} onValueChange={v => setHeroForm(f => ({ ...f, mediaType: v }))}>
                        <SelectTrigger className="border-blush/30 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image"><ImageIcon className="w-4 h-4 mr-2 inline" /> Image</SelectItem>
                          <SelectItem value="video"><Video className="w-4 h-4 mr-2 inline" /> Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Overlay Darkness: {heroForm.overlayDark}</Label>
                      <input type="range" min="0" max="1" step="0.1" value={heroForm.overlayDark} onChange={e => setHeroForm(f => ({ ...f, overlayDark: parseFloat(e.target.value) }))} className="w-full mt-3 accent-gold" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><Switch checked={heroForm.active} onCheckedChange={v => setHeroForm(f => ({ ...f, active: v }))} /><Label>Active</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={heroForm.kenBurns} onCheckedChange={v => setHeroForm(f => ({ ...f, kenBurns: v }))} /><Label>Ken Burns Effect</Label></div>
                  </div>
                  <div><Label>Order</Label><Input type="number" value={heroForm.order} onChange={e => setHeroForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="border-blush/30 mt-1 w-24" /></div>
                  <Button onClick={saveHeroSlide} className="w-full bg-gold hover:bg-gold-light text-white">{editingHeroSlide ? 'Update Slide' : 'Add Slide'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {heroSlides.length === 0 ? (
              <Card className="border-blush/20"><CardContent className="p-8 text-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gold/30" />
                <p>No hero slides yet. Add your first background image or video!</p>
              </CardContent></Card>
            ) : heroSlides.map((slide) => (
              <Card key={slide.id} className={`border-blush/20 overflow-hidden ${!slide.active ? 'opacity-50' : ''}`}>
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-40 h-28 shrink-0 bg-blush/10 relative">
                      {slide.mediaType === 'video' ? (
                        <video src={slide.mediaUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={slide.mediaUrl} alt={slide.title} className="w-full h-full object-cover" />
                      )}
                      <Badge className="absolute top-2 left-2 text-[10px] bg-black/50 text-white border-0">
                        {slide.mediaType === 'video' ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                        {slide.mediaType}
                      </Badge>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{slide.title || 'Untitled Slide'}</p>
                        <p className="text-xs text-muted-foreground">{slide.subtitle || 'No subtitle'}</p>
                        <div className="flex gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px]">Order: {slide.order}</Badge>
                          <Badge variant="outline" className="text-[10px]">Overlay: {slide.overlayDark}</Badge>
                          {slide.kenBurns && <Badge className="text-[10px] bg-gold/10 text-gold border-gold/20">Ken Burns</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => reorderHeroSlide(slide, 'up')}><MoveUp className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => reorderHeroSlide(slide, 'down')}><MoveDown className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleHeroSlide(slide)}>
                          {slide.active ? <Eye className="w-4 h-4 text-gold" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={() => { setEditingHeroSlide(slide); setHeroForm({ title: slide.title, subtitle: slide.subtitle || '', mediaUrl: slide.mediaUrl, mediaType: slide.mediaType, active: slide.active, order: slide.order, overlayDark: slide.overlayDark, kenBurns: slide.kenBurns }); setHeroDialogOpen(true) }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteHeroSlide(slide.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== PARTNERS TAB ===== */}
        <TabsContent value="partners" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Trusted Partners</h3>
              <p className="text-sm text-muted-foreground">Add brand partners that appear in the "Trusted By" section</p>
            </div>
            <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gold hover:bg-gold-light text-white" onClick={() => { setEditingPartner(null); setPartnerForm({ name: '', logo: '', url: '', active: true, order: partners.length }) }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Partner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add Partner'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Partner Logo</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <input type="file" ref={partnerFileRef} accept="image/*" onChange={handlePartnerFileUpload} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => partnerFileRef.current?.click()} disabled={uploading} className="border-gold/30 text-gold">
                        <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                    </div>
                    <Input value={partnerForm.logo} onChange={e => setPartnerForm(f => ({ ...f, logo: e.target.value }))} placeholder="Logo URL" className="mt-2 border-blush/30" />
                  </div>
                  {partnerForm.logo && (
                    <div className="flex justify-center p-4 bg-white rounded-lg border border-blush/30 h-24">
                      <img src={partnerForm.logo} alt="Logo preview" className="max-h-full max-w-full object-contain grayscale opacity-70" />
                    </div>
                  )}
                  <div><Label>Partner Name</Label><Input value={partnerForm.name} onChange={e => setPartnerForm(f => ({ ...f, name: e.target.value }))} placeholder="Brand name" className="border-blush/30 mt-1" /></div>
                  <div><Label>Website URL (optional)</Label><Input value={partnerForm.url} onChange={e => setPartnerForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="border-blush/30 mt-1" /></div>
                  <div className="flex items-center gap-2"><Switch checked={partnerForm.active} onCheckedChange={v => setPartnerForm(f => ({ ...f, active: v }))} /><Label>Active</Label></div>
                  <div><Label>Order</Label><Input type="number" value={partnerForm.order} onChange={e => setPartnerForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="border-blush/30 mt-1 w-24" /></div>
                  <Button onClick={savePartner} className="w-full bg-gold hover:bg-gold-light text-white">{editingPartner ? 'Update Partner' : 'Add Partner'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {partners.length === 0 ? (
              <Card className="border-blush/20"><CardContent className="p-8 text-center text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-3 text-gold/30" />
                <p>No partners yet. Add your first brand partner!</p>
              </CardContent></Card>
            ) : partners.map((partner) => (
              <Card key={partner.id} className={`border-blush/20 ${!partner.active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-20 h-14 shrink-0 bg-white rounded-lg border border-blush/20 flex items-center justify-center p-2">
                    <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain grayscale opacity-70" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{partner.name}</p>
                    {partner.url && <p className="text-xs text-muted-foreground truncate">{partner.url}</p>}
                    <Badge variant="outline" className="text-[10px] mt-1">Order: {partner.order}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => reorderPartner(partner, 'up')}><MoveUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => reorderPartner(partner, 'down')}><MoveDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePartner(partner)}>
                      {partner.active ? <Eye className="w-4 h-4 text-gold" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={() => { setEditingPartner(partner); setPartnerForm({ name: partner.name, logo: partner.logo, url: partner.url || '', active: partner.active, order: partner.order }); setPartnerDialogOpen(true) }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deletePartner(partner.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Partners preview */}
          {partners.length > 0 && (
            <Card className="border-gold/20 bg-gradient-to-r from-cream via-white to-cream">
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground mb-3 text-center uppercase tracking-widest">Preview — Trusted By Section</p>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  {partners.filter(p => p.active).map(p => (
                    <div key={p.id} className="w-24 h-12 flex items-center justify-center opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                      <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== ANNOUNCEMENT BAR TAB ===== */}
        <TabsContent value="announcements" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>Announcement Bar Items</h3>
              <p className="text-sm text-muted-foreground">Manage the scrolling text items in the top announcement marquee bar</p>
            </div>
            <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gold hover:bg-gold-light text-white" onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ text: '', icon: 'none', separator: '✦', active: true, order: announcementItems.length }) }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingAnnouncement ? 'Edit Announcement Item' : 'Add Announcement Item'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Text</Label><Input value={announcementForm.text} onChange={e => setAnnouncementForm(f => ({ ...f, text: e.target.value }))} placeholder="e.g. Free Delivery on Orders Over $100" className="border-blush/30 mt-1" /></div>
                  <div>
                    <Label>Icon</Label>
                    <Select value={announcementForm.icon} onValueChange={v => setAnnouncementForm(f => ({ ...f, icon: v }))}>
                      <SelectTrigger className="border-blush/30 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Separator Symbol</Label>
                    <div className="flex gap-2 mt-1">
                      {SEPARATOR_OPTIONS.map(sep => (
                        <button key={sep} type="button" onClick={() => setAnnouncementForm(f => ({ ...f, separator: sep }))}
                          className={`w-10 h-10 rounded-lg border text-lg flex items-center justify-center transition-colors ${announcementForm.separator === sep ? 'border-gold bg-gold/10 text-gold' : 'border-blush/30 hover:border-gold/50'}`}>
                          {sep}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={announcementForm.active} onCheckedChange={v => setAnnouncementForm(f => ({ ...f, active: v }))} /><Label>Active</Label></div>
                  <div><Label>Order</Label><Input type="number" value={announcementForm.order} onChange={e => setAnnouncementForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="border-blush/30 mt-1 w-24" /></div>
                  <Button onClick={saveAnnouncementItem} className="w-full bg-gold hover:bg-gold-light text-white">{editingAnnouncement ? 'Update Item' : 'Add Item'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3">
            {announcementItems.length === 0 ? (
              <Card className="border-blush/20"><CardContent className="p-8 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-gold/30" />
                <p>No announcement items yet. Add your first one!</p>
              </CardContent></Card>
            ) : announcementItems.map((item) => {
              const iconOpt = ICON_OPTIONS.find(o => o.value === item.icon)
              return (
                <Card key={item.id} className={`border-blush/20 ${!item.active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-lg text-gold/60">{item.separator}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {iconOpt?.icon && <iconOpt.icon className="w-4 h-4 text-gold" />}
                        <p className="font-medium text-sm">{item.text}</p>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">Icon: {iconOpt?.label || 'None'}</Badge>
                        <Badge variant="outline" className="text-[10px]">Separator: {item.separator}</Badge>
                        <Badge variant="outline" className="text-[10px]">Order: {item.order}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => reorderAnnouncementItem(item, 'up')}><MoveUp className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => reorderAnnouncementItem(item, 'down')}><MoveDown className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleAnnouncementItem(item)}>
                        {item.active ? <Eye className="w-4 h-4 text-gold" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-blue-500" onClick={() => { setEditingAnnouncement(item); setAnnouncementForm({ text: item.text, icon: item.icon, separator: item.separator, active: item.active, order: item.order }); setAnnouncementDialogOpen(true) }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteAnnouncementItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Announcement bar preview */}
          {announcementItems.length > 0 && (
            <Card className="border-gold/20 overflow-hidden">
              <CardContent className="p-0">
                <p className="text-xs text-muted-foreground p-3 text-center uppercase tracking-widest">Live Preview</p>
                <div className="bg-gradient-to-r from-gold via-gold-light to-gold text-white overflow-hidden">
                  <div className="flex items-center py-2 whitespace-nowrap gap-4 px-4">
                    {announcementItems.filter(i => i.active).map((item, idx) => {
                      const iconOpt = ICON_OPTIONS.find(o => o.value === item.icon)
                      return (
                        <span key={item.id} className="inline-flex items-center gap-2 shrink-0 text-xs tracking-[0.15em] font-semibold uppercase">
                          {iconOpt?.icon && <iconOpt.icon className="w-3.5 h-3.5" />}
                          <span>{item.text}</span>
                          {idx < announcementItems.filter(i => i.active).length - 1 && <span className="text-white/50">{item.separator}</span>}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
