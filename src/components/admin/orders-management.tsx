'use client'

import { useState, useMemo } from 'react'
import {
  ShoppingBag,
  Eye,
  Filter,
  Search,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Package,
  ChevronDownIcon,
  FileText,
  Mail,
  Download,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { CashOnDeliveryIcon, VisaIcon, MastercardIcon, BankTransferIcon, PaystackIcon, CloverIcon, PayPalIcon, ApplePayIcon, KlarnaIcon, AffirmIcon, ZipIcon, SezzleIcon, ShopPayIcon } from '@/components/ui/payment-icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface OrderItem {
  name?: string
  productName?: string
  quantity?: number
  qty?: number
  price?: number
  variantName?: string | null
  sku?: string | null
  variantId?: string | null
  [key: string]: unknown
}

interface OrdersManagementProps {
  orders: Array<{
    id: string
    customerName: string
    email: string
    phone: string | null
    total: number
    subtotal: number
    status: string
    items: string
    address: string
    city: string
    state: string | null
    zipCode: string | null
    country: string
    paymentMethod: string
    invoiceNumber: string | null
    invoiceSent: boolean
    createdAt: string
  }>
  onUpdateStatus: (id: string, status: string) => Promise<void>
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; bgClass: string; textClass: string }> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
  },
  shipped: {
    label: 'Shipped',
    icon: Truck,
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
  },
  delivered: {
    label: 'Delivered',
    icon: CheckCircle,
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
  },
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    pay_on_delivery: 'Pay on Delivery',
    card: 'Card Payment',
    bank_transfer: 'Bank Transfer',
    paystack: 'Paystack',
    clover: 'Clover',
    paypal: 'PayPal',
    apple_pay: 'Apple Pay',
    klarna: 'Klarna',
    affirm: 'Affirm',
    zip: 'Zip',
    sezzle: 'Sezzle',
    shop_pay: 'Shop Pay',
  }
  return map[method] || method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function PaymentMethodIcon({ method }: { method: string }) {
  const cls = 'h-5 w-auto'
  switch (method) {
    case 'pay_on_delivery':
      return <CashOnDeliveryIcon className={cls} />
    case 'card':
      return <VisaIcon className={cls} />
    case 'bank_transfer':
      return <BankTransferIcon className={cls} />
    case 'paystack':
      return <PaystackIcon className={cls} />
    case 'clover':
      return <CloverIcon className={cls} />
    case 'paypal':
      return <PayPalIcon className={cls} />
    case 'apple_pay':
      return <ApplePayIcon className={cls} />
    case 'klarna':
      return <KlarnaIcon className={cls} />
    case 'affirm':
      return <AffirmIcon className={cls} />
    case 'zip':
      return <ZipIcon className={cls} />
    case 'sezzle':
      return <SezzleIcon className={cls} />
    case 'shop_pay':
      return <ShopPayIcon className={cls} />
    default:
      return null
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

function shortenOrderId(id: string): string {
  if (id.length <= 8) return id
  return `#${id.slice(-8).toUpperCase()}`
}

function parseItems(itemsStr: string): OrderItem[] {
  try {
    const parsed = JSON.parse(itemsStr)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function OrdersManagement({ orders, onUpdateStatus }: OrdersManagementProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrdersManagementProps['orders'][0] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogStatus, setDialogStatus] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [isSendingInvoice, setIsSendingInvoice] = useState(false)

  const filteredOrders = useMemo(() => {
    let result = orders

    // Filter by status tab
    if (activeTab !== 'all') {
      result = result.filter((order) => order.status === activeTab)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (order) =>
          order.customerName.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query) ||
          order.email.toLowerCase().includes(query) ||
          (order.invoiceNumber && order.invoiceNumber.toLowerCase().includes(query))
      )
    }

    return result
  }, [orders, activeTab, searchQuery])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      pending: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
    orders.forEach((order) => {
      if (counts[order.status] !== undefined) {
        counts[order.status]++
      }
    })
    return counts
  }, [orders])

  const handleViewOrder = (order: OrdersManagementProps['orders'][0]) => {
    setSelectedOrder(order)
    setDialogStatus(order.status)
    setDialogOpen(true)
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      await onUpdateStatus(orderId, newStatus)
      toast.success(`Order status updated to ${statusConfig[newStatus]?.label || newStatus}`)
      if (selectedOrder && selectedOrder.id === orderId) {
        setDialogStatus(newStatus)
      }
    } catch {
      toast.error('Failed to update order status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGenerateInvoice = async (orderId: string, sendEmail: boolean = false) => {
    if (sendEmail) {
      setIsSendingInvoice(true)
    } else {
      setIsGeneratingInvoice(true)
    }
    try {
      const res = await fetch('/api/invoice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, sendEmail }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        // Update local state
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({
            ...selectedOrder,
            invoiceNumber: data.invoiceNumber,
            invoiceSent: sendEmail ? true : selectedOrder.invoiceSent,
          })
        }
      } else {
        toast.error(data.error || 'Failed to generate invoice')
      }
    } catch {
      toast.error('Failed to generate invoice. Please try again.')
    } finally {
      setIsGeneratingInvoice(false)
      setIsSendingInvoice(false)
    }
  }

  const handleSendInvoice = async (orderId: string, invoiceNumber: string, customerEmail: string, customerName: string) => {
    setIsSendingInvoice(true)
    try {
      const res = await fetch('/api/invoice/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, invoiceNumber, customerEmail, customerName }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, invoiceSent: true })
        }
      } else {
        toast.error(data.error || 'Failed to send invoice')
      }
    } catch {
      toast.error('Failed to send invoice. Please try again.')
    } finally {
      setIsSendingInvoice(false)
    }
  }

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      // Open PDF in new tab for download/viewing
      window.open(`/api/invoice/generate?orderId=${orderId}`, '_blank')
    } catch {
      toast.error('Failed to download invoice')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status]
    if (!config) {
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      )
    }
    const Icon = config.icon
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-0 gap-1 text-xs font-medium px-2.5 py-0.5',
          config.bgClass,
          config.textClass
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getInvoiceBadge = (order: OrdersManagementProps['orders'][0]) => {
    if (!order.invoiceNumber) {
      return (
        <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
          No Invoice
        </Badge>
      )
    }
    if (order.invoiceSent) {
      return (
        <Badge className="text-xs bg-green-100 text-green-800 border-0 gap-1">
          <Mail className="h-3 w-3" />
          Sent
        </Badge>
      )
    }
    return (
      <Badge className="text-xs bg-blue-100 text-blue-800 border-0 gap-1">
        <FileText className="h-3 w-3" />
        Generated
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
            <ShoppingBag className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Orders
              <Badge className="bg-gold text-white border-0 hover:bg-gold-light text-xs px-2">
                {orders.length}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">Manage and track customer orders</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/60">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              <Filter className="h-3.5 w-3.5" />
              All
              <span className="ml-1 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground shadow-sm">
                {statusCounts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5" />
              Pending
              {statusCounts.pending > 0 && (
                <span className="ml-1 rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-yellow-800 shadow-sm">
                  {statusCounts.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="shipped" className="gap-1.5 text-xs sm:text-sm">
              <Truck className="h-3.5 w-3.5" />
              Shipped
              {statusCounts.shipped > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-blue-800 shadow-sm">
                  {statusCounts.shipped}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="delivered" className="gap-1.5 text-xs sm:text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              Delivered
              {statusCounts.delivered > 0 && (
                <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-green-800 shadow-sm">
                  {statusCounts.delivered}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-1.5 text-xs sm:text-sm">
              <XCircle className="h-3.5 w-3.5" />
              Cancelled
              {statusCounts.cancelled > 0 && (
                <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-red-800 shadow-sm">
                  {statusCounts.cancelled}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, order ID or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Order ID
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Customer
              </TableHead>
              <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Total
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Invoice
              </TableHead>
              <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">No orders found</p>
                    <p className="text-xs text-muted-foreground/70">
                      {searchQuery ? 'Try adjusting your search or filter' : 'Orders will appear here when customers make purchases'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-blush/30"
                  onClick={() => handleViewOrder(order)}
                >
                  <TableCell className="font-mono text-xs font-semibold text-gold">
                    {shortenOrderId(order.id)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blush text-xs font-semibold text-gold">
                        {order.customerName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {order.customerName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {order.email}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-foreground">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{getInvoiceBadge(order)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-gold hover:text-gold hover:bg-gold/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewOrder(order)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Invoice Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            className="gap-2 text-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (order.invoiceNumber) {
                                handleDownloadInvoice(order.id)
                              } else {
                                handleGenerateInvoice(order.id)
                              }
                            }}
                          >
                            {order.invoiceNumber ? (
                              <>
                                <Download className="h-4 w-4" />
                                Download Invoice
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4" />
                                Generate Invoice
                              </>
                            )}
                          </DropdownMenuItem>
                          {order.invoiceNumber && !order.invoiceSent && (
                            <DropdownMenuItem
                              className="gap-2 text-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendInvoice(order.id, order.invoiceNumber!, order.email, order.customerName)
                              }}
                            >
                              <Mail className="h-4 w-4" />
                              Send to Customer
                            </DropdownMenuItem>
                          )}
                          {order.invoiceNumber && order.invoiceSent && (
                            <DropdownMenuItem
                              className="gap-2 text-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendInvoice(order.id, order.invoiceNumber!, order.email, order.customerName)
                              }}
                            >
                              <Mail className="h-4 w-4" />
                              Resend Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Update Status
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {Object.entries(statusConfig).map(([key, config]) => {
                            const Icon = config.icon
                            return (
                              <DropdownMenuItem
                                key={key}
                                className={cn(
                                  'gap-2 text-sm',
                                  order.status === key && 'font-semibold bg-muted/50'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusUpdate(order.id, key)
                                }}
                              >
                                <Icon className={cn('h-4 w-4', config.textClass)} />
                                {config.label}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing <span className="font-semibold text-foreground">{filteredOrders.length}</span> of{' '}
            <span className="font-semibold text-foreground">{orders.length}</span> orders
          </p>
          {(searchQuery || activeTab !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gold hover:text-gold hover:bg-gold/10"
              onClick={() => {
                setSearchQuery('')
                setActiveTab('all')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
              <DialogHeader className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-gold" />
                    Order {selectedOrder ? shortenOrderId(selectedOrder.id) : ''}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    {selectedOrder && getInvoiceBadge(selectedOrder)}
                    {selectedOrder && getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <DialogDescription className="text-sm text-muted-foreground">
                  Placed on {selectedOrder ? formatDate(selectedOrder.createdAt) : ''}
                </DialogDescription>
              </DialogHeader>

              {selectedOrder && (
                <div className="space-y-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                      Customer Information
                    </h4>
                    <div className="rounded-lg bg-blush/30 p-4 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Name</p>
                          <p className="text-sm font-medium text-foreground">{selectedOrder.customerName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email</p>
                          <p className="text-sm text-foreground">{selectedOrder.email}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Phone</p>
                          <p className="text-sm text-foreground">{selectedOrder.phone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Payment Method</p>
                          <div className="flex items-center gap-2">
                            <PaymentMethodIcon method={selectedOrder.paymentMethod} />
                            <p className="text-sm text-foreground">{formatPaymentMethod(selectedOrder.paymentMethod)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                      Shipping Address
                    </h4>
                    <div className="rounded-lg bg-blush/30 p-4">
                      <p className="text-sm text-foreground">{selectedOrder.address}</p>
                      <p className="text-sm text-foreground">
                        {selectedOrder.city}
                        {selectedOrder.state ? `, ${selectedOrder.state}` : ''}
                        {selectedOrder.zipCode ? ` ${selectedOrder.zipCode}` : ''}
                      </p>
                      <p className="text-sm text-foreground">{selectedOrder.country}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                      Order Items
                    </h4>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Product
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                              Qty
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                              Price
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parseItems(selectedOrder.items).map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-sm font-medium text-foreground align-top">
                                <div className="flex flex-col gap-1">
                                  <span>{item.name || item.productName || 'Unknown Product'}</span>
                                  {item.variantName && (
                                    <span className="inline-flex w-fit items-center rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                                      {item.variantName}
                                    </span>
                                  )}
                                  {item.sku && !item.variantName && (
                                    <span className="text-[10px] text-muted-foreground">SKU: {item.sku}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-center text-muted-foreground align-top">
                                {item.quantity || item.qty || 1}
                              </TableCell>
                              <TableCell className="text-sm text-right font-medium text-foreground align-top">
                                {item.price ? formatCurrency(Number(item.price)) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {parseItems(selectedOrder.items).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                                No item details available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                      Order Summary
                    </h4>
                    <div className="rounded-lg bg-blush/30 p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-lg font-bold text-gold">{formatCurrency(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                      Invoice
                    </h4>
                    <div className="rounded-lg bg-blush/30 p-4 space-y-3">
                      {selectedOrder.invoiceNumber ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Invoice Number</p>
                              <p className="text-sm font-semibold text-foreground">{selectedOrder.invoiceNumber}</p>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email Status</p>
                              <p className="text-sm font-medium text-foreground">
                                {selectedOrder.invoiceSent ? (
                                  <span className="text-green-600">Sent to customer</span>
                                ) : (
                                  <span className="text-amber-600">Not sent yet</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              className="bg-gold text-white hover:bg-gold-light gap-1.5"
                              onClick={() => handleDownloadInvoice(selectedOrder.id)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gold/30 text-gold hover:bg-gold hover:text-white gap-1.5"
                              onClick={() => handleSendInvoice(
                                selectedOrder.id,
                                selectedOrder.invoiceNumber!,
                                selectedOrder.email,
                                selectedOrder.customerName
                              )}
                              disabled={isSendingInvoice}
                            >
                              {isSendingInvoice ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                              {selectedOrder.invoiceSent ? 'Resend Email' : 'Send to Customer'}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">No invoice generated yet for this order.</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              className="bg-gold text-white hover:bg-gold-light gap-1.5"
                              onClick={() => handleGenerateInvoice(selectedOrder.id)}
                              disabled={isGeneratingInvoice}
                            >
                              {isGeneratingInvoice ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                              Generate Invoice
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gold/30 text-gold hover:bg-gold hover:text-white gap-1.5"
                              onClick={() => handleGenerateInvoice(selectedOrder.id, true)}
                              disabled={isSendingInvoice}
                            >
                              {isSendingInvoice ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                              Generate & Send Email
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Update Status */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gold" />
                      Update Order Status
                    </h4>
                    <div className="flex items-center gap-3">
                      <Select
                        value={dialogStatus}
                        onValueChange={(value) => setDialogStatus(value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, config]) => {
                            const Icon = config.icon
                            return (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <Icon className={cn('h-4 w-4', config.textClass)} />
                                  {config.label}
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        className="bg-gold text-white hover:bg-gold-light shadow-sm"
                        disabled={isUpdating || dialogStatus === selectedOrder.status}
                        onClick={() => handleStatusUpdate(selectedOrder.id, dialogStatus)}
                      >
                        {isUpdating ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="gap-2"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrdersManagement
