'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string | null | undefined
  email?: string | null | undefined
  avatar?: string | null | undefined
  image?: string | null | undefined
  size?: number // px; default 32
  className?: string
  ring?: boolean // gold ring around the avatar
}

/**
 * Premium user avatar — shows the uploaded image if present, otherwise falls
 * back to the user's initial in a gold-gradient circle.
 *
 * Used in:
 *   - Navbar (customer + admin dropdown trigger)
 *   - Account page profile card
 *   - Admin header
 */
export default function UserAvatar({
  name,
  email,
  avatar,
  image,
  size = 32,
  className,
  ring = false,
}: UserAvatarProps) {
  const src = avatar || image
  const initial = (name?.trim()?.[0] || email?.trim()?.[0] || 'U').toUpperCase()

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-gold/25 to-rose/25 flex items-center justify-center',
        ring && 'ring-2 ring-gold/40 ring-offset-2 ring-offset-background',
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name || 'User avatar'}
          fill
          sizes={`${size}x${size}`}
          className="object-cover"
          unoptimized
        />
      ) : (
        <span
          className="font-bold text-gold"
          style={{ fontSize: Math.max(10, size * 0.4) }}
        >
          {initial}
        </span>
      )}
    </div>
  )
}
