'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

export function HeaderAuth() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
  }

  if (!session?.user) {
    return (
      <Button variant="ghost" size="sm" asChild className="-my-3 text-primary">
        <Link href="/auth/signin">Sign in</Link>
      </Button>
    )
  }

  const user = session.user
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 -my-3 text-primary">
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold overflow-hidden">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ''}
                width={28}
                height={28}
                className="rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </span>
          <span className="hidden sm:inline max-w-[120px] truncate text-sm">
            {user.name ?? user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{user.name ?? 'User'}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/groups">My Groups</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onSelect={() => signOut({ callbackUrl: '/' })}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
