'use client'

import { useState, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { User, Store, Bell, Shield, AlertTriangle, Save, CreditCard, ExternalLink, RefreshCw, CheckCircle2, XCircle, FileWarning, KeyRound, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

interface SettingsPageProps {
  adminName: string
  adminEmail: string
  adminPhone: string | null
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function SettingsSection({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.div variants={sectionVariants}>
      <Card className="premium-card border-blush/30 shadow-md overflow-hidden">
        <CardHeader className="border-b border-blush/20 bg-gradient-to-r from-cream to-transparent">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
            >
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsPage({ adminName, adminEmail, adminPhone }: SettingsPageProps) {
  // ── Profile state ──
  const [profileName, setProfileName] = useState(adminName)
  const [profilePhone, setProfilePhone] = useState(adminPhone ?? '')

  // ── Store state ──
  const [storeName, setStoreName] = useState('Angel Beauty')
  const [storeDescription, setStoreDescription] = useState(
    'Premium beauty products for the modern woman. Discover our curated collection of skincare, makeup, and wellness essentials.'
  )
  const [currency, setCurrency] = useState('USD')
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('100')

  // ── Notification state ──
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [orderNotifications, setOrderNotifications] = useState(true)
  const [newsletterUpdates, setNewsletterUpdates] = useState(false)

  // ── Security state ──
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ── Clover state ──
  const [cloverStatus, setCloverStatus] = useState<any>(null)
  const [cloverLoading, setCloverLoading] = useState(true)
  const [cloverToken, setCloverToken] = useState('')
  const [cloverEcomMerchantId, setCloverEcomMerchantId] = useState('')
  const [savingToken, setSavingToken] = useState(false)
  const [saveResult, setSaveResult] = useState<any>(null)

  // ── Env health state ──
  const [envHealth, setEnvHealth] = useState<any>(null)
  const [envHealthLoading, setEnvHealthLoading] = useState(true)

  // ── Loading states ──
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingStore, setSavingStore] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // ── Clover handlers ──
  const fetchCloverStatus = async () => {
    setCloverLoading(true)
    try {
      const res = await fetch('/api/clover/setup')
      const data = await res.json()
      setCloverStatus(data)
    } catch {
      toast.error('Failed to check Clover status')
    } finally {
      setCloverLoading(false)
    }
  }

  // ── Env health handler ──
  const fetchEnvHealth = async () => {
    setEnvHealthLoading(true)
    try {
      const res = await fetch('/api/env-health')
      const data = await res.json()
      setEnvHealth(data)
    } catch {
      // silent fail — health is informational
    } finally {
      setEnvHealthLoading(false)
    }
  }

  const handleSaveCloverToken = async () => {
    if (!cloverToken.trim()) {
      toast.error('Please enter a token')
      return
    }
    if (!cloverEcomMerchantId.trim()) {
      toast.error('Please enter your Ecommerce Merchant ID')
      return
    }
    setSavingToken(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/clover/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenType: 'ecom',
          token: cloverToken.trim(),
          ecomMerchantId: cloverEcomMerchantId.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Clover credentials validated and saved successfully!')
        setSaveResult(data)
        setCloverToken('')
        setCloverEcomMerchantId('')
        fetchCloverStatus()
        fetchEnvHealth()
      } else {
        // Surface the specific failure step
        const stepLabel =
          data.step === 'credential_validation' ? 'Credential validation failed' :
          data.step === 'persist' ? 'Failed to save to .env.local' :
          data.step === 'input_validation' ? 'Invalid input' :
          'Token setup failed'
        toast.error(`${stepLabel}: ${data.error || 'Unknown error'}`)
        setSaveResult(data)
      }
    } catch {
      toast.error('Failed to set token — network error')
    } finally {
      setSavingToken(false)
    }
  }

  // Fetch Clover status + env health on mount
  useEffect(() => {
    fetchCloverStatus()
    fetchEnvHealth()
  }, [])

  // ── Handlers ──

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('Name is required')
      return
    }
    setSavingProfile(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveStore = async () => {
    if (!storeName.trim()) {
      toast.error('Store name is required')
      return
    }
    setSavingStore(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success('Store settings saved successfully')
    } catch {
      toast.error('Failed to save store settings. Please try again.')
    } finally {
      setSavingStore(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success('Notification preferences saved successfully')
    } catch {
      toast.error('Failed to save preferences. Please try again.')
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error('Current password is required')
      return
    }
    if (!newPassword) {
      toast.error('New password is required')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setUpdatingPassword(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to update password. Please try again.')
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ── */}
      <motion.div variants={sectionVariants} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
          <User className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your account and store preferences
          </p>
        </div>
      </motion.div>

      {/* ================================================================= */}
      {/* Environment Health Warning Banner (shows if critical vars missing) */}
      {/* ================================================================= */}
      {envHealth && !envHealthLoading && (envHealth.critical || envHealth.paymentsDisabled) && (
        <motion.div
          variants={sectionVariants}
          className={`rounded-xl border p-4 ${
            envHealth.critical
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {envHealth.critical ? (
              <FileWarning className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${envHealth.critical ? 'text-red-900' : 'text-amber-900'}`}>
                {envHealth.critical
                  ? 'Critical Environment Variables Missing'
                  : 'Payment System Not Configured'}
              </p>
              <p className={`text-xs mt-1 ${envHealth.critical ? 'text-red-700' : 'text-amber-700'}`}>
                {envHealth.payments?.message}
                {!envHealth.envLocal?.exists && (
                  <>
                    {' '}
                    <strong>.env.local does not exist</strong> — copy <code className="px-1 py-0.5 rounded bg-white/60 font-mono text-[11px]">.env.example</code> to <code className="px-1 py-0.5 rounded bg-white/60 font-mono text-[11px]">.env.local</code> and fill in values, or use the Clover form below.
                  </>
                )}
              </p>

              {/* Missing vars list */}
              {envHealth.payments?.missingKeys?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {envHealth.payments.missingKeys.map((k: string) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/70 border border-amber-300 text-[11px] font-mono text-amber-800"
                    >
                      <XCircle className="h-3 w-3" />
                      {k}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>
                  <strong>{envHealth.present}</strong>/{envHealth.total} vars present
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchEnvHealth}
                  disabled={envHealthLoading}
                  className="h-7 text-[11px] border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${envHealthLoading ? 'animate-spin' : ''}`} />
                  Recheck
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================================================================= */}
      {/* Profile Settings                                                   */}
      {/* ================================================================= */}
      <SettingsSection
        icon={User}
        iconBg="bg-gradient-to-br from-gold to-gold-light"
        iconColor="text-white"
        title="Profile Settings"
        description="Update your personal information"
      >
        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light shadow-lg">
              <span className="text-2xl font-bold text-white">
                {getInitials(profileName || 'A')}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md border border-blush/30">
                <User className="h-3 w-3 text-gold" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">{profileName || 'Admin'}</p>
              <p className="text-sm text-muted-foreground">{adminEmail}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Click the avatar to change your profile picture
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your name"
                className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">
                Email{' '}
                <span className="text-xs font-normal text-muted-foreground">(read-only)</span>
              </Label>
              <Input
                id="profile-email"
                value={adminEmail}
                disabled
                className="border-blush/30 bg-muted/50 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <Label htmlFor="profile-phone">
              Phone Number{' '}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="profile-phone"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="bg-gold hover:bg-gold-light text-white shadow-md min-w-[140px]"
            >
              {savingProfile ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================= */}
      {/* Store Settings                                                     */}
      {/* ================================================================= */}
      <SettingsSection
        icon={Store}
        iconBg="bg-gradient-to-br from-rose to-rose-light"
        iconColor="text-white"
        title="Store Settings"
        description="Configure your store details and preferences"
      >
        <div className="space-y-5">
          <div className="space-y-2 max-w-lg">
            <Label htmlFor="store-name">Store Name</Label>
            <Input
              id="store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Your store name"
              className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
            />
          </div>

          <div className="space-y-2 max-w-lg">
            <Label htmlFor="store-description">Store Description</Label>
            <Textarea
              id="store-description"
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Describe your store..."
              className="min-h-[100px] border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="store-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full border-blush/30 focus:ring-gold/20">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="NGN">NGN - Nigerian Naira (₦)</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-shipping">
                Free Shipping Threshold{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({currency === 'USD' ? '$' : currency === 'NGN' ? '₦' : '£'})
                </span>
              </Label>
              <Input
                id="free-shipping"
                type="number"
                min="0"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                placeholder="0"
                className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveStore}
              disabled={savingStore}
              className="bg-gold hover:bg-gold-light text-white shadow-md min-w-[140px]"
            >
              {savingStore ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================= */}
      {/* Notification Preferences                                           */}
      {/* ================================================================= */}
      <SettingsSection
        icon={Bell}
        iconBg="bg-gradient-to-br from-amber-500 to-amber-400"
        iconColor="text-white"
        title="Notification Preferences"
        description="Choose how you want to be notified"
      >
        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-blush/20 bg-cream/50 p-4 transition-colors hover:border-blush/40">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive important updates and alerts via email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
              className="data-[state=checked]:bg-gold"
            />
          </div>

          {/* Order Notifications */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-blush/20 bg-cream/50 p-4 transition-colors hover:border-blush/40">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Order Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get notified when a new order is placed
              </p>
            </div>
            <Switch
              checked={orderNotifications}
              onCheckedChange={setOrderNotifications}
              className="data-[state=checked]:bg-gold"
            />
          </div>

          {/* Newsletter Updates */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-blush/20 bg-cream/50 p-4 transition-colors hover:border-blush/40">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Newsletter Updates</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive product updates and promotional content
              </p>
            </div>
            <Switch
              checked={newsletterUpdates}
              onCheckedChange={setNewsletterUpdates}
              className="data-[state=checked]:bg-gold"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveNotifications}
              disabled={savingNotifications}
              className="bg-gold hover:bg-gold-light text-white shadow-md min-w-[160px]"
            >
              {savingNotifications ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================= */}
      {/* Security Section                                                   */}
      {/* ================================================================= */}
      <SettingsSection
        icon={Shield}
        iconBg="bg-gradient-to-br from-emerald-600 to-emerald-500"
        iconColor="text-white"
        title="Security"
        description="Update your password and secure your account"
      >
        <div className="space-y-5">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="border-blush/30 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              />
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Passwords do not match
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUpdatePassword}
              disabled={updatingPassword}
              className="bg-gold hover:bg-gold-light text-white shadow-md min-w-[160px]"
            >
              {updatingPassword ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating...
                </span>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================= */}
      {/* Clover Payment Integration                                         */}
      {/* ================================================================= */}
      <SettingsSection
        icon={CreditCard}
        iconBg="bg-gradient-to-br from-green-600 to-green-500"
        iconColor="text-white"
        title="Clover Payment Integration"
        description="Configure your Clover payment gateway for accepting online payments"
      >
        <div className="space-y-5">
          {/* Status Overview */}
          {cloverLoading ? (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-blush/20 bg-cream/50">
              <RefreshCw className="h-4 w-4 animate-spin text-gold" />
              <span className="text-sm text-muted-foreground">Checking Clover status...</span>
            </div>
          ) : cloverStatus ? (
            <div className="space-y-3">
              {/* Connection Status Badge */}
              <div className={`flex items-center gap-2 p-3 rounded-xl border ${
                cloverStatus.config?.isConfigured
                  ? 'border-green-200 bg-green-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                {cloverStatus.config?.isConfigured ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        {cloverStatus.connectionTest?.success
                          ? 'Connected to Clover — Hosted Checkout Active'
                          : 'Configured (connection test pending)'}
                      </p>
                      <p className="text-xs text-green-600">
                        {cloverStatus.connectionTest?.success && cloverStatus.connectionTest?.note
                          ? cloverStatus.connectionTest.note
                          : cloverStatus.connectionTest?.merchantName
                          ? `Merchant: ${cloverStatus.connectionTest.merchantName}`
                          : `Merchant: ${cloverStatus.config?.checkoutMerchantId}`}
                      </p>
                      {cloverStatus.connectionTest?.success === false && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠ Connection test failed: {cloverStatus.connectionTest.error || 'Unknown error'}
                          {cloverStatus.connectionTest.hint && (
                            <span className="block mt-0.5">{cloverStatus.connectionTest.hint}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Not Connected</p>
                      <p className="text-xs text-amber-600">Ecommerce API token is required to accept payments</p>
                    </div>
                  </>
                )}
              </div>

              {/* Config Details */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-3 rounded-lg border border-blush/20 bg-white">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Environment</p>
                  <p className="text-sm font-semibold mt-1">{cloverStatus.config?.environment || 'sandbox'}</p>
                </div>
                <div className="p-3 rounded-lg border border-blush/20 bg-white">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auth Method</p>
                  <p className="text-sm font-semibold mt-1">
                    {cloverStatus.config?.isUsingEcomApi ? (
                      <span className="text-green-700">🔑 Ecommerce API Private Token</span>
                    ) : cloverStatus.config?.accessTokenSet ? (
                      <span className="text-blue-700">🔐 OAuth Access Token</span>
                    ) : (
                      <span className="text-amber-700">⚠ Not configured</span>
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-blush/20 bg-white">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ecommerce Merchant ID</p>
                  <p className="text-sm font-mono mt-1">{cloverStatus.config?.ecomMerchantId || '(not set)'}</p>
                </div>
                <div className="p-3 rounded-lg border border-blush/20 bg-white">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">POS Merchant ID</p>
                  <p className="text-sm font-mono mt-1">{cloverStatus.config?.merchantId || '(not set)'}</p>
                </div>
                <div className="p-3 rounded-lg border border-blush/20 bg-white">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">API Base URL</p>
                  <p className="text-sm font-mono mt-1 text-xs break-all">{cloverStatus.config?.merchantBaseUrl || '(not set)'}</p>
                </div>
                <div className="p-3 rounded-lg border border-blush/20 bg-white">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Client ID</p>
                  <p className="text-sm font-mono mt-1">{cloverStatus.config?.clientId || '(not set)'}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Save Result (validation + persistence verification) ── */}
          {saveResult && (
            <div className={`p-4 rounded-xl border ${saveResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-2">
                {saveResult.success ? (
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-xs space-y-2">
                  <p className={`font-semibold ${saveResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {saveResult.success ? 'Credentials validated & saved' : `Failed at step: ${saveResult.step}`}
                  </p>

                  {saveResult.validation && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Step 1 — Clover validation</p>
                      <p className={saveResult.validation.ok ? 'text-green-700' : 'text-red-700'}>
                        {saveResult.validation.ok ? '✓ ' : '✗ '}
                        {saveResult.validation.detail?.substring(0, 300)}
                      </p>
                    </div>
                  )}

                  {saveResult.write && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Step 2 — .env.local persistence</p>
                      <p className={saveResult.write.ok ? 'text-green-700' : 'text-red-700'}>
                        {saveResult.write.ok
                          ? `✓ Written atomically (created: ${saveResult.write.created ? 'yes' : 'no'}, updated: ${saveResult.write.updatedKeys?.length || 0}, added: ${saveResult.write.addedKeys?.length || 0})`
                          : `✗ ${saveResult.write.error}`}
                      </p>
                    </div>
                  )}

                  {saveResult.verification && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Step 3 — Post-write verification</p>
                      <p className={saveResult.verification.isConfiguredAfterWrite ? 'text-green-700' : 'text-red-700'}>
                        {saveResult.verification.isConfiguredAfterWrite
                          ? '✓ isConfigured() = true — payments are now live'
                          : '✗ isConfigured() still false — check logs'}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Keys persisted to .env.local: {Object.entries(saveResult.verification.persistedKeys || {}).map(([k, v]) => `${k}=${v ? '✓' : '✗'}`).join(', ')}
                      </p>
                    </div>
                  )}

                  {saveResult.error && (
                    <p className="text-red-700 mt-2">{saveResult.error.substring(0, 400)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Environment Variables Health Table ── */}
          {envHealth && !envHealthLoading && (
            <div className="rounded-xl border border-blush/20 bg-cream/30 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-blush/10 bg-white/50">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-gold" />
                  <p className="text-sm font-semibold">Environment Variables</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                  envHealth.missing === 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {envHealth.present}/{envHealth.total} present
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white/80 backdrop-blur">
                    <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Variable</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envHealth.statuses?.map((s: any) => (
                      <tr
                        key={s.key}
                        className={`border-t border-blush/5 ${!s.present && s.category !== 'optional' && s.category !== 'public' ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="px-3 py-2 font-mono text-[11px] align-top">
                          {s.key}
                          <span className="block text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">{s.category}</span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {s.present ? (
                            <span className="inline-flex items-center gap-1 text-green-700">
                              <CheckCircle2 className="h-3 w-3" /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="h-3 w-3" /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground align-top">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-2 border-t border-blush/10 bg-white/50 text-[10px] text-muted-foreground">
                .env.local {envHealth.envLocal?.exists ? 'exists ✓' : 'does NOT exist ✗'} — values are never displayed, only presence is checked.
              </div>
            </div>
          )}

          {/* Token Setup */}
          {!cloverStatus?.config?.isConfigured && (
            <div className="space-y-4">
              {/* Option 1: Ecommerce API Private Token (RECOMMENDED) */}
              <div className="p-4 rounded-xl border border-green-200 bg-green-50/50">
                <p className="text-sm font-medium text-green-900 mb-1">Option 1: Ecommerce API Private Token (Recommended)</p>
                <p className="text-xs text-green-700 mb-3">
                  Found in your Clover Merchant Dashboard under <strong>Ecommerce → Ecommerce API Tokens</strong>.
                  Look for the <strong>Private Token</strong> with <strong>HOSTED_CHECKOUT</strong> integration type.
                  This works directly — no OAuth flow needed!
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-green-800 mb-1 block">Ecommerce Merchant ID</label>
                    <Input
                      value={cloverEcomMerchantId}
                      onChange={(e) => setCloverEcomMerchantId(e.target.value)}
                      placeholder="Paste your Ecommerce Merchant ID here (shown on the Ecommerce API Tokens page)..."
                      className="border-green-200 focus-visible:border-green-400 focus-visible:ring-green-200 font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-green-800 mb-1 block">Ecommerce API Private Token</label>
                    <Input
                      value={cloverToken}
                      onChange={(e) => setCloverToken(e.target.value)}
                      placeholder="Paste your Ecommerce API Private Token here..."
                      className="border-green-200 focus-visible:border-green-400 focus-visible:ring-green-200 font-mono text-xs bg-white"
                    />
                  </div>
                  <Button
                    onClick={handleSaveCloverToken}
                    disabled={savingToken || !cloverToken.trim() || !cloverEcomMerchantId.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-md w-full sm:w-auto"
                  >
                    {savingToken ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving...
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Save Ecommerce Token
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Option 2: OAuth Flow */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <p className="text-sm font-medium text-blue-900 mb-1">Option 2: OAuth Authorization (Alternative)</p>
                <p className="text-xs text-blue-700 mb-3">
                  If you have the Clover Developer App configured, authorize via OAuth.
                  This requires a browser login to your Clover merchant account.
                </p>
                <a
                  href={`${cloverStatus?.config?.environment === 'production' ? 'https://www.clover.com' : 'https://sandbox.dev.clover.com'}/oauth/authorize?client_id=${cloverStatus?.config?.clientId || 'AR06K5Q8YW5K0'}&response_type=code&redirect_uri=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-md no-underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Authorize via OAuth
                </a>
              </div>
            </div>
          )}

          {/* Refresh Status */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={fetchCloverStatus}
              disabled={cloverLoading}
              className="border-blush/30 text-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${cloverLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================= */}
      {/* Danger Zone                                                        */}
      {/* ================================================================= */}
      <motion.div variants={sectionVariants}>
        <Card className="border-2 border-destructive/30 shadow-md overflow-hidden">
          <CardHeader className="border-b border-destructive/10 bg-gradient-to-r from-red-50 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-destructive to-red-500">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-destructive">
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions — proceed with caution
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="rounded-xl border border-destructive/20 bg-red-50/50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Clear All Data
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This will permanently delete all products, orders, and customer data from your
                      store. This action cannot be undone. Make sure you have a backup before
                      proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="destructive"
                  disabled
                  className="min-w-[160px] opacity-70 cursor-not-allowed"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
