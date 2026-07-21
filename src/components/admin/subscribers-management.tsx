'use client'

import { useState, useMemo, useCallback } from 'react'
import { Mail, Search, Download, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'

interface SubscribersManagementProps {
  subscribers: Array<{
    id: string
    email: string
    createdAt: string
  }>
  onDelete: (id: string) => Promise<void>
}

const ITEMS_PER_PAGE = 10

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

export function SubscribersManagement({ subscribers, onDelete }: SubscribersManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter subscribers by email search
  const filteredSubscribers = useMemo(() => {
    if (!searchQuery.trim()) return subscribers
    const query = searchQuery.toLowerCase().trim()
    return subscribers.filter((sub) =>
      sub.email.toLowerCase().includes(query)
    )
  }, [subscribers, searchQuery])

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedSubscribers = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return filteredSubscribers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSubscribers, safeCurrentPage])

  // Reset to page 1 when search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }, [])

  // Delete handler
  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id)
      try {
        await onDelete(id)
        toast.success('Subscriber removed successfully')
        // If we're on a page that no longer exists, go back
        const remainingOnPage = paginatedSubscribers.length - 1
        if (remainingOnPage === 0 && safeCurrentPage > 1) {
          setCurrentPage((prev) => prev - 1)
        }
      } catch {
        toast.error('Failed to remove subscriber. Please try again.')
      } finally {
        setDeletingId(null)
      }
    },
    [onDelete, paginatedSubscribers.length, safeCurrentPage]
  )

  // Generate page numbers to display
  const getPageNumbers = useCallback(() => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (safeCurrentPage > 3) pages.push('ellipsis')

      const start = Math.max(2, safeCurrentPage - 1)
      const end = Math.min(totalPages - 1, safeCurrentPage + 1)

      for (let i = start; i <= end; i++) pages.push(i)

      if (safeCurrentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }

    return pages
  }, [totalPages, safeCurrentPage])

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
            <Mail className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Newsletter Subscribers
              <Badge className="bg-gold text-white border-0 hover:bg-gold-light text-xs px-2">
                {subscribers.length}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your newsletter subscriber list
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9 bg-white"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-blush/30 hover:text-gold hover:border-gold/30 shrink-0"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-12 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                #
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </TableHead>
              <TableHead className="hidden sm:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Date Subscribed
              </TableHead>
              <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSubscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blush/40">
                      <Users className="h-8 w-8 text-gold/40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">No subscribers found</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {searchQuery
                          ? 'Try adjusting your search query'
                          : 'Subscribers will appear here when they sign up for your newsletter'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedSubscribers.map((subscriber, index) => {
                  const rowNumber = (safeCurrentPage - 1) * ITEMS_PER_PAGE + index + 1
                  const firstLetter = subscriber.email.charAt(0).toUpperCase()
                  const isDeleting = deletingId === subscriber.id

                  return (
                    <motion.tr
                      key={subscriber.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="border-b transition-colors hover:bg-blush/20"
                    >
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {rowNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-white shadow-sm">
                            {firstLetter}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate max-w-[280px]">
                            {subscriber.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatDate(subscriber.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isDeleting}
                              className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              {isDeleting ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </div>
                                Remove Subscriber
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                Are you sure you want to remove{' '}
                                <span className="font-semibold text-foreground">{subscriber.email}</span>{' '}
                                from your subscriber list? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white hover:bg-muted">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(subscriber.id)}
                                className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/20"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination & Results Count */}
      {filteredSubscribers.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-foreground">
              {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredSubscribers.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-foreground">{filteredSubscribers.length}</span>{' '}
            subscriber{filteredSubscribers.length !== 1 ? 's' : ''}
            {searchQuery && (
              <span>
                {' '}(filtered from {subscribers.length} total)
              </span>
            )}
          </p>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }}
                    className={safeCurrentPage <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-blush/30 hover:text-gold'}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, idx) =>
                  page === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === safeCurrentPage}
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage(page)
                        }}
                        className={
                          page === safeCurrentPage
                            ? 'bg-gold text-white border-gold hover:bg-gold-light hover:text-white'
                            : 'hover:bg-blush/30 hover:text-gold'
                        }
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }}
                    className={safeCurrentPage >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-blush/30 hover:text-gold'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  )
}

export default SubscribersManagement
