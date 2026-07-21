'use client'

import { motion, type Variants } from 'framer-motion'
import {
  Package,
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardOverviewProps {
  stats: {
    productCount: number
    orderCount: number
    subscriberCount: number
    promoCount: number
    totalRevenue: number
    recentOrders: Array<{
      id: string
      customerName: string
      total: number
      status: string
      createdAt: string
    }>
  }
  products: Array<{
    id: string
    name: string
    price: number
    categorySlug: string
    createdAt: string
  }>
}

// ---------------------------------------------------------------------------
// Mock revenue data for the chart (last 6 months)
// ---------------------------------------------------------------------------

const revenueData = [
  { month: 'Oct', revenue: 38000 },
  { month: 'Nov', revenue: 45000 },
  { month: 'Dec', revenue: 52000 },
  { month: 'Jan', revenue: 47000 },
  { month: 'Feb', revenue: 58000 },
  { month: 'Mar', revenue: 63000 },
]

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#C9A96E',
  },
}

// ---------------------------------------------------------------------------
// Stats card descriptors
// ---------------------------------------------------------------------------

interface StatCard {
  label: string
  value: string
  change: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  iconBg: string
  iconColor: string
}

function buildStatCards(props: DashboardOverviewProps): StatCard[] {
  const { stats } = props
  return [
    {
      label: 'Total Products',
      value: stats.productCount.toLocaleString(),
      change: '+8% from last month',
      icon: Package,
      gradientFrom: 'from-amber-50',
      gradientTo: 'to-yellow-50',
      iconBg: 'bg-gradient-to-br from-gold to-gold-light',
      iconColor: 'text-white',
    },
    {
      label: 'Total Orders',
      value: stats.orderCount.toLocaleString(),
      change: '+12% from last month',
      icon: ShoppingBag,
      gradientFrom: 'from-rose-50',
      gradientTo: 'to-pink-50',
      iconBg: 'bg-gradient-to-br from-rose to-rose-light',
      iconColor: 'text-white',
    },
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: '+18% from last month',
      icon: DollarSign,
      gradientFrom: 'from-emerald-50',
      gradientTo: 'to-green-50',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-400',
      iconColor: 'text-white',
    },
    {
      label: 'Subscribers',
      value: stats.subscriberCount.toLocaleString(),
      change: '+5% from last month',
      icon: Users,
      gradientFrom: 'from-purple-50',
      gradientTo: 'to-violet-50',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-400',
      iconColor: 'text-white',
    },
  ]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase().trim()
  switch (normalized) {
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
          Pending
        </Badge>
      )
    case 'shipped':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
          Shipped
        </Badge>
      )
    case 'delivered':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          Delivered
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Cancelled
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">{status}</Badge>
      )
  }
}

function getCategoryBadge(slug: string) {
  const formatted = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <Badge
      variant="secondary"
      className="bg-blush text-rose-dark border-blush-dark hover:bg-blush"
    >
      {formatted}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardOverview(props: DashboardOverviewProps) {
  const { stats, products } = props
  const statCards = buildStatCards(props)

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Stats Cards Row                                                    */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <motion.div key={card.label} variants={cardVariants}>
              <Card
                className={`premium-card relative overflow-hidden bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} border-none shadow-md`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg} shadow-lg`}>
                      <Icon className={`h-6 w-6 ${card.iconColor}`} />
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-emerald-100/80 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <ArrowUpRight className="h-3 w-3" />
                      {card.change.split('%')[0]}%
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-3xl font-bold tracking-tight text-foreground">
                      {card.value}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {card.label}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground/70">
                    <TrendingUp className="mr-1 inline h-3 w-3" />
                    {card.change}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Revenue Chart                                                      */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
      >
        <Card className="premium-card shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
              <BarChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DDD8" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                  className="text-muted-foreground"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-mono font-medium">
                          {formatCurrency(value as number)}
                        </span>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="revenue"
                  fill="#C9A96E"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/* Two-column section: Recent Orders + Recent Products                */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        className="grid grid-cols-1 gap-6 lg:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        {/* Recent Orders — wider column (3/5) */}
        <motion.div variants={sectionVariants} className="lg:col-span-3">
          <Card className="premium-card shadow-md border-none h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
              <CardDescription>Latest customer transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                  <p className="text-xs text-muted-foreground/60">
                    Orders will appear here once customers start purchasing
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.customerName}
                          </TableCell>
                          <TableCell>{formatCurrency(order.total)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Products — narrower column (2/5) */}
        <motion.div variants={sectionVariants} className="lg:col-span-2">
          <Card className="premium-card shadow-md border-none h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Products</CardTitle>
              <CardDescription>Recently added to the catalog</CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No data yet</p>
                  <p className="text-xs text-muted-foreground/60">
                    Products will appear here once you start adding them
                  </p>
                </div>
              ) : (
                <div className="max-h-96 space-y-4 overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group flex items-center justify-between rounded-xl border border-border/50 bg-gradient-to-r from-cream to-transparent p-4 transition-all hover:border-gold/30 hover:shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-gold transition-colors">
                          {product.name}
                        </p>
                        <div className="mt-1.5">
                          {getCategoryBadge(product.categorySlug)}
                        </div>
                      </div>
                      <div className="ml-4 text-right shrink-0">
                        <p className="text-sm font-semibold text-gold">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(product.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
