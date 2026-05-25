'use client'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { trpc } from '@/trpc/client'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { useDebounce } from 'use-debounce'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ParticipantInput({ value, onChange, placeholder, className }: Props) {
  const { status } = useSession()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [debouncedQuery] = useDebounce(inputValue, 300)
  const didMount = useRef(false)

  const { data } = trpc.users.search.useQuery(
    { query: debouncedQuery },
    { enabled: status === 'authenticated' && debouncedQuery.length >= 1 },
  )

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    setInputValue(value)
  }, [value])

  const handleInputChange = (newVal: string) => {
    setInputValue(newVal)
    onChange(newVal)
    if (status === 'authenticated' && newVal.length >= 1) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  const handleSelect = (name: string) => {
    setInputValue(name)
    onChange(name)
    setOpen(false)
  }

  // For unauthenticated users, just render a plain input
  if (status !== 'authenticated') {
    return (
      <Input
        className={className ?? 'text-base'}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
      />
    )
  }

  return (
    <Popover open={open && (data?.users.length ?? 0) > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          className={className ?? 'text-base'}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => {
            if (inputValue.length >= 1 && (data?.users.length ?? 0) > 0) {
              setOpen(true)
            }
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No registered users found</CommandEmpty>
            <CommandGroup heading="Registered users">
              {data?.users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name ?? user.email}
                  onSelect={() => handleSelect(user.name ?? user.email)}
                >
                  <div className="flex flex-col">
                    <span>{user.name ?? user.email}</span>
                    {user.name && (
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
