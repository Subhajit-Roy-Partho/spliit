'use client'

import { Input } from '@/components/ui/input'
import { trpc } from '@/trpc/client'
import { useSession } from 'next-auth/react'
import { useRef, useState } from 'react'
import { useDebounce } from 'use-debounce'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ParticipantInput({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const { status } = useSession()
  const [focused, setFocused] = useState(false)
  const [debouncedQuery] = useDebounce(value, 300)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data } = trpc.users.search.useQuery(
    { query: debouncedQuery },
    {
      enabled:
        status === 'authenticated' && focused && debouncedQuery.length >= 1,
    },
  )

  const suggestions = data?.users ?? []
  const showDropdown = focused && suggestions.length > 0

  return (
    <div ref={containerRef} className="relative">
      <Input
        className={className ?? 'text-base'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border bg-popover shadow-md text-sm overflow-hidden">
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted flex flex-col"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(user.name ?? user.email)
                setFocused(false)
              }}
            >
              <span>{user.name ?? user.email}</span>
              {user.name && (
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
