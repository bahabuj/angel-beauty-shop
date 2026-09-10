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
  Plus,
  Save,
  X,
  Pencil,
  Trash2,
  Globe,
  Loader2,
} from 'lucide-react'

interface ShippingZone {
  id: string
  name: string
  code: string
  flag: string
  rate: number
  estimatedDays: string
  active: boolean
  order: number
  createdAt: string
  updatedAt: string
}

interface EditingRow {
  id: string | null
  name: string
  code: string
  flag: string
  rate: string
  estimatedDays: string
  active: boolean
  order: string
}

const EMPTY_ROW: EditingRow = {
  id: null,
  name: '',
  code: '',
  flag: '',
  rate: '0',
  estimatedDays: '',
  active: true,
  order: '0',
}

export default function ShippingManagement() {
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<EditingRow | null>(null)
  const [showAddRow, setShowAddRow] = useState(false)

  const loadZones = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/shipping-zones')
      const data = await res.json()
      if (data.success) {
        setZones(data.zones)
      } else {
        toast.error('Failed to load shipping zones')
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load shipping zones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  const handleSave = async (row: EditingRow) => {
    if (!row.name.trim()) {
      toast.error('Name is required')
      return
    }
    const rate = parseFloat(row.rate)
    if (isNaN(rate) || rate < 0) {
      toast.error('Rate must be a non-negative number')
      return
    }
    setSaving(row.id || 'new')
    try {
      const payload = {
        name: row.name,
        code: row.code,
        flag: row.flag,
        rate,
        estimatedDays: row.estimatedDays,
        active: row.active,
        order: parseInt(row.order) || 0,
      }
      const res = row.id
        ? await fetch(`/api/shipping-zones/${row.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/shipping-zones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (data.success) {
        toast.success(row.id ? 'Shipping zone updated' : 'Shipping zone created')
        setEditingRow(null)
        setShowAddRow(false)
        await loadZones()
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const handleToggleActive = async (zone: ShippingZone) => {
    try {
      const res = await fetch(`/api/shipping-zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !zone.active }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${zone.name} ${!zone.active ? 'activated' : 'deactivated'}`)
        await loadZones()
      } else {
        toast.error('Failed to toggle')
      }
    } catch (e) {
      toast.error('Failed to toggle')
    }
  }

  const handleDelete = async (zone: ShippingZone) => {
    if (!confirm(`Delete "${zone.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/shipping-zones/${zone.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Shipping zone deleted')
        await loadZones()
      } else {
        toast.error('Failed to delete')
      }
    } catch (e) {
      toast.error('Failed to delete')
    }
  }

  const startEdit = (zone: ShippingZone) => {
    setEditingRow({
      id: zone.id,
      name: zone.name,
      code: zone.code,
      flag: zone.flag,
      rate: String(zone.rate),
      estimatedDays: zone.estimatedDays,
      active: zone.active,
      order: String(zone.order),
    })
    setShowAddRow(false)
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setShowAddRow(false)
  }

  const startAdd = () => {
    setEditingRow({ ...EMPTY_ROW })
    setShowAddRow(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
            Shipping Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set shipping rates per region. Customers see these rates at checkout based on their country.
          </p>
        </div>
        <Button onClick={startAdd} className="bg-gold hover:bg-gold/90" disabled={showAddRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Zone
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-blush/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gold/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Zones</p>
              <p className="text-lg font-bold">{zones.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-bold">{zones.filter(z => z.active).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blush/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blush/30 flex items-center justify-center">
              <span className="text-base">💰</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Rate</p>
              <p className="text-lg font-bold">
                ${zones.length ? (zones.reduce((s, z) => s + z.rate, 0) / zones.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones table */}
      <Card className="border-blush/30">
        <CardHeader>
          <CardTitle className="text-base">Shipping Zones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blush/10 border-b border-blush/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold">Region</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Rate (USD)</th>
                    <th className="px-4 py-3 font-semibold">Est. Delivery</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => (
                    <tr key={zone.id} className="border-b border-blush/20 hover:bg-blush/5">
                      {editingRow?.id === zone.id ? (
                        <EditRowCells
                          row={editingRow}
                          setRow={setEditingRow}
                          saving={saving === zone.id}
                          onSave={() => handleSave(editingRow)}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium">
                            <span className="mr-2">{zone.flag}</span>
                            {zone.name}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-blush/20 px-2 py-0.5 rounded">{zone.code}</code>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gold">
                            ${zone.rate.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {zone.estimatedDays || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={zone.active
                                ? 'bg-green-500/10 text-green-700 border-green-500/20'
                                : 'bg-gray-200 text-gray-600 border-gray-300'}
                            >
                              {zone.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => startEdit(zone)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Switch
                                checked={zone.active}
                                onCheckedChange={() => handleToggleActive(zone)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(zone)}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {showAddRow && editingRow && (
                    <tr className="border-b border-blush/20 bg-gold/5">
                      <EditRowCells
                        row={editingRow}
                        setRow={setEditingRow}
                        saving={saving === 'new'}
                        onSave={() => handleSave(editingRow)}
                        onCancel={cancelEdit}
                      />
                    </tr>
                  )}
                  {zones.length === 0 && !showAddRow && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No shipping zones yet. Click <strong>Add Zone</strong> to create your first one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Inline editable row (used for both edit and add) ───────────────────────
function EditRowCells({
  row,
  setRow,
  saving,
  onSave,
  onCancel,
}: {
  row: EditingRow
  setRow: (r: EditingRow) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <>
      <td className="px-2 py-2">
        <div className="flex items-center gap-2">
          <Input
            className="w-16 text-center"
            placeholder="🇺🇸"
            value={row.flag}
            onChange={(e) => setRow({ ...row, flag: e.target.value })}
            disabled={saving}
          />
          <Input
            className="flex-1"
            placeholder="Region name"
            value={row.name}
            onChange={(e) => setRow({ ...row, name: e.target.value })}
            disabled={saving}
            autoFocus
          />
        </div>
      </td>
      <td className="px-2 py-2">
        <Input
          className="w-28"
          placeholder="auto"
          value={row.code}
          onChange={(e) => setRow({ ...row, code: e.target.value })}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            className="w-24 pl-5"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={row.rate}
            onChange={(e) => setRow({ ...row, rate: e.target.value })}
            disabled={saving}
          />
        </div>
      </td>
      <td className="px-2 py-2">
        <Input
          className="w-40"
          placeholder="3-5 business days"
          value={row.estimatedDays}
          onChange={(e) => setRow({ ...row, estimatedDays: e.target.value })}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <Switch
          checked={row.active}
          onCheckedChange={(v) => setRow({ ...row, active: v })}
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            className="h-8 bg-gold hover:bg-gold/90"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1">Save</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </>
  )
}
