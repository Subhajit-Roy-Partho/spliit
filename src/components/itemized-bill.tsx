'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExpenseItem } from '@/lib/schemas'
import { Currency } from '@/lib/currency'
import { cn, formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useId, useState } from 'react'

const enforceCurrencyPattern = (value: string) =>
  value
    .replace(/^\s*-/, '')
    .replace(/[.,]/, '#')
    .replace(/[-.,]/g, '')
    .replace(/#/, '.')
    .replace(/[^.\d]/g, '')

interface Props {
  items: ExpenseItem[]
  participants: { id: string; name: string }[]
  currency: Currency
  onChange: (items: ExpenseItem[]) => void
}

export function computePaidForFromItems(
  items: ExpenseItem[],
  participants: { id: string; name: string }[],
  currency: Currency,
): Array<{ participant: string; shares: string }> {
  const totals: Record<string, number> = {}

  for (const item of items) {
    const included = participants.filter(
      (p) => !item.excludedParticipants.includes(p.id),
    )
    if (included.length === 0) continue
    const effectiveAmount = (item.sign ?? '+') === '-' ? -item.amount : item.amount
    const perPerson = effectiveAmount / included.length
    for (const p of included) {
      totals[p.id] = (totals[p.id] ?? 0) + perPerson
    }
  }

  return participants
    .filter((p) => (totals[p.id] ?? 0) > 0)
    .map((p) => ({
      participant: p.id,
      shares: (totals[p.id] ?? 0).toFixed(currency.decimal_digits),
    }))
}

export function ItemizedBill({ items, participants, currency, onChange }: Props) {
  const locale = useLocale()
  const baseId = useId()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const total = items.reduce(
    (sum, item) => sum + ((item.sign ?? '+') === '-' ? -item.amount : item.amount),
    0,
  )

  const addItem = () => {
    const id = `item-${Date.now()}`
    onChange([...items, { id, name: '', amount: 0, sign: '+', excludedParticipants: [] }])
    setExpanded((e) => ({ ...e, [id]: false }))
  }

  const updateItem = (id: string, patch: Partial<ExpenseItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const toggleSign = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    updateItem(id, { sign: (item.sign ?? '+') === '+' ? '-' : '+' })
  }

  const toggleExclude = (itemId: string, participantId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const excluded = item.excludedParticipants.includes(participantId)
      ? item.excludedParticipants.filter((id) => id !== participantId)
      : [...item.excludedParticipants, participantId]
    updateItem(itemId, { excludedParticipants: excluded })
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const includedCount =
          participants.length - item.excludedParticipants.length
        const isExpanded = expanded[item.id] ?? false
        const isDeduction = (item.sign ?? '+') === '-'

        return (
          <div
            key={item.id}
            className={cn(
              'border rounded-lg overflow-hidden',
              isDeduction && 'border-orange-300 dark:border-orange-700',
            )}
          >
            {/* Main row */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                {idx + 1}.
              </span>
              <Input
                className="flex-1 h-8 text-sm"
                placeholder="Item name"
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
              />
              {/* Sign toggle */}
              <button
                type="button"
                title={isDeduction ? 'Deduction (click to make addition)' : 'Addition (click to make deduction)'}
                onClick={() => toggleSign(item.id)}
                className={cn(
                  'h-8 w-8 shrink-0 flex items-center justify-center rounded border text-xs font-bold transition-colors',
                  isDeduction
                    ? 'border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-700'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary',
                )}
              >
                {isDeduction ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <span className={cn('text-sm', isDeduction && 'text-orange-500')}>
                  {currency.symbol}
                </span>
                <Input
                  className={cn(
                    'w-20 h-8 text-sm text-right',
                    isDeduction && 'text-orange-600 dark:text-orange-400',
                  )}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={item.amount === 0 ? '' : item.amount}
                  onChange={(e) => {
                    const v = enforceCurrencyPattern(e.target.value)
                    updateItem(item.id, { amount: v === '' ? 0 : Number(v) })
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                title="Exclude participants"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Participant exclusion panel */}
            {isExpanded && (
              <div className="border-t bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {isDeduction ? (
                    <>Deduction split among {includedCount} of {participants.length} participant{participants.length !== 1 ? 's' : ''}</>
                  ) : (
                    <>Split among {includedCount} of {participants.length} participant{participants.length !== 1 ? 's' : ''}</>
                  )}
                  {item.amount > 0 && includedCount > 0 && (
                    <span className="ml-1">
                      ({isDeduction ? '-' : ''}{formatCurrency(currency, Math.round(item.amount * 100 / includedCount), locale)} each)
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {participants.map((p) => {
                    const isExcluded = item.excludedParticipants.includes(p.id)
                    const checkId = `${baseId}-${item.id}-${p.id}`
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <Checkbox
                          id={checkId}
                          checked={!isExcluded}
                          onCheckedChange={() => toggleExclude(item.id, p.id)}
                        />
                        <Label htmlFor={checkId} className="text-sm font-normal cursor-pointer">
                          {p.name}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add item
        </Button>
        <div className="text-sm font-medium">
          Total:{' '}
          <span className="font-semibold">
            {formatCurrency(currency, Math.round(total * 100), locale)}
          </span>
        </div>
      </div>
    </div>
  )
}
