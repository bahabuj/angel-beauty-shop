'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Download,
  Package,
  Database,
  FileCode2,
  ShieldAlert,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface DownloadOption {
  id: string
  label: string
  description: string
  size: string
  icon: React.ReactNode
  href: string
  filename: string
  warning?: string
  variant: 'default' | 'outline'
}

const DOWNLOAD_OPTIONS: DownloadOption[] = [
  {
    id: 'project',
    label: 'Project Export',
    description: 'Complete source code, public assets, Prisma schema, configs',
    size: '~55 MB',
    icon: <Package className="size-4" />,
    href: '/downloads/angelsbeauty-trae-export.zip',
    filename: 'angelsbeauty-trae-export.zip',
    variant: 'default',
  },
  {
    id: 'db-binary',
    label: 'Database Backup (Binary)',
    description: 'SQLite .db file — fastest to restore',
    size: '~152 KB',
    icon: <Database className="size-4" />,
    href: '/downloads/angelsbeauty-production-backup.db',
    filename: 'angelsbeauty-production-backup.db',
    warning: 'Contains real production credentials',
    variant: 'outline',
  },
  {
    id: 'db-sql',
    label: 'Database Backup (SQL)',
    description: 'SQL dump — portable, human-readable',
    size: '~30 KB',
    icon: <FileCode2 className="size-4" />,
    href: '/downloads/angelsbeauty-production-backup.sql',
    filename: 'angelsbeauty-production-backup.sql',
    warning: 'Contains real production credentials',
    variant: 'outline',
  },
]

export default function DownloadCenter() {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [completed, setCompleted] = useState<string | null>(null)

  const handleDownload = (option: DownloadOption) => {
    setDownloading(option.id)
    setCompleted(null)

    // Show feedback. The actual download is handled natively by the
    // <a href download> element — the browser navigates to the URL, sees
    // Content-Disposition: attachment, and downloads instead of navigating.
    toast.success('Download started', {
      description: `${option.label} (${option.size})`,
    })

    // Mark as completed after a short delay (the browser handles the actual
    // download progress in its own UI — we just show that it was initiated)
    setTimeout(() => {
      setDownloading(null)
      setCompleted(option.id)
      // Clear the completed checkmark after 3 seconds
      setTimeout(() => setCompleted(null), 3000)
    }, 1500)

    // Delay closing the popover so the browser has time to start the
    // download navigation. If we close immediately, Radix unmounts the
    // anchor element before the browser processes the click → no download.
    setTimeout(() => setOpen(false), 200)
  }

  return (
    <div className="fixed bottom-6 left-4 z-50 print:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Open download center"
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 px-4 py-3 text-white shadow-lg ring-1 ring-black/5 transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            <Download className="size-5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
            <span className="hidden text-sm font-semibold sm:inline">
              Download
            </span>
            <span className="sr-only">Open download center</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-80 p-0"
        >
          <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-amber-50 to-rose-50 px-4 py-3 dark:from-amber-950/30 dark:to-rose-950/30">
            <Download className="size-4 text-amber-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">
              Download Center
            </h3>
          </div>

          <div className="space-y-2 p-3">
            {DOWNLOAD_OPTIONS.map((option) => {
              const isDownloading = downloading === option.id
              const isCompleted = completed === option.id
              return (
                <a
                  key={option.id}
                  href={option.href}
                  download={option.filename}
                  onClick={() => handleDownload(option)}
                  aria-label={`Download ${option.label}`}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition-all hover:border-amber-300 hover:bg-amber-50/50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:border-amber-700 dark:hover:bg-amber-950/20"
                >
                  <div
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${
                      option.variant === 'default'
                        ? 'bg-gradient-to-br from-amber-500 to-rose-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDownloading ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="size-4 text-green-600" aria-hidden="true" />
                    ) : (
                      option.icon
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {option.size}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                    {option.warning && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                        <ShieldAlert className="size-3 shrink-0" aria-hidden="true" />
                        <span>{option.warning}</span>
                      </p>
                    )}
                  </div>
                </a>
              )
            })}
          </div>

          <div className="border-t border-border bg-muted/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Tip:</span> Project ZIP is ready for
              Trae migration. Database backups contain live secrets — store
              securely. If a download doesn&apos;t start, right-click an item
              and choose <span className="font-medium">Save link as…</span>.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
