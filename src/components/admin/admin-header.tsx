'use client'

import { useState } from 'react'
import {
  Menu,
  Search,
  Bell,
  Settings,
  ArrowLeft,
  LogOut,
  ChevronDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AdminHeaderProps {
  title: string
  adminName: string
  adminEmail: string
  onMenuToggle: () => void
  onNavigate: (page: string) => void
  onLogout: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getFirstName(name: string): string {
  return name.split(' ')[0]
}

export function AdminHeader({
  title,
  adminName,
  adminEmail,
  onMenuToggle,
  onNavigate,
  onLogout,
}: AdminHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/10 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-blush/50"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
          </Button>

          {/* Page title */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {title}
            </h1>
            <Badge
              variant="secondary"
              className="hidden sm:inline-flex bg-blush/60 text-gold border-gold/20 text-[10px] px-1.5 py-0"
            >
              Admin
            </Badge>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search input */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-56 lg:w-72 rounded-full border-gold/15 bg-cream/40 pl-9 pr-4 text-sm placeholder:text-muted-foreground/70 focus-visible:border-gold/40 focus-visible:ring-gold/20"
            />
          </div>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground hover:bg-blush/50"
            aria-label="Search"
          >
            <Search className="size-5" />
          </Button>

          {/* Notification bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground hover:bg-blush/50"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {/* Red dot indicator */}
                <span className="absolute top-2 right-2 flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose/60 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-rose" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-semibold">Notifications</span>
                <Badge variant="secondary" className="bg-blush/60 text-gold border-gold/20 text-[10px]">
                  3 new
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                <span className="text-sm font-medium">New order received</span>
                <span className="text-xs text-muted-foreground">2 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                <span className="text-sm font-medium">Product review submitted</span>
                <span className="text-xs text-muted-foreground">15 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                <span className="text-sm font-medium">Low stock alert</span>
                <span className="text-xs text-muted-foreground">1 hour ago</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-center justify-center text-gold font-medium cursor-pointer"
                onClick={() => onNavigate('notifications')}
              >
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="hidden sm:block h-6 bg-gold/15" />

          {/* Admin profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-auto px-2 py-1.5 hover:bg-blush/50 rounded-full"
              >
                <Avatar className="size-8 ring-2 ring-gold/20">
                  <AvatarFallback className="bg-gradient-to-br from-gold to-gold-light text-white text-xs font-semibold">
                    {getInitials(adminName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium leading-tight text-foreground">
                    {getFirstName(adminName)}
                  </span>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    Administrator
                  </span>
                </div>
                <ChevronDown className="hidden sm:block size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* Profile section */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 ring-2 ring-gold/20">
                      <AvatarFallback className="bg-gradient-to-br from-gold to-gold-light text-white text-sm font-semibold">
                        {getInitials(adminName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-foreground">{adminName}</p>
                      <p className="text-xs text-muted-foreground">{adminEmail}</p>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Navigation options */}
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer py-2.5 focus:bg-blush/40"
                  onClick={() => onNavigate('settings')}
                >
                  <Settings className="size-4 text-muted-foreground" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer py-2.5 focus:bg-blush/40"
                  onClick={() => onNavigate('store')}
                >
                  <ArrowLeft className="size-4 text-muted-foreground" />
                  <span>Back to Store</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem
                className="cursor-pointer py-2.5 text-destructive focus:text-destructive focus:bg-red-50"
                onClick={onLogout}
              >
                <LogOut className="size-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
