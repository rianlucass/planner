"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import { updateTaskDate } from "@/app/boards/[id]/task-actions"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatDateOnly, localCalendarDate, parseDateOnly, toDateOnly, todayDateOnly, type DateOnlyParts } from "@/lib/task-date"

const weekDays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

function initialMonth(value: string | null): DateOnlyParts {
  const selected = value ? parseDateOnly(value) : null
  const today = parseDateOnly(todayDateOnly()) as DateOnlyParts
  return { year: selected?.year ?? today.year, month: selected?.month ?? today.month, day: 1 }
}

function moveMonth(parts: DateOnlyParts, amount: number): DateOnlyParts {
  const date = localCalendarDate({ ...parts, day: 1 })
  date.setMonth(date.getMonth() + amount)
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: 1 }
}

function monthDays(parts: DateOnlyParts) {
  const firstDay = localCalendarDate({ ...parts, day: 1 })
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstDay)
    date.setDate(1 - firstDay.getDay() + index)
    const dayParts = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
    return { value: toDateOnly(dayParts), parts: dayParts, currentMonth: dayParts.month === parts.month }
  })
}

function monthTitle(parts: DateOnlyParts) {
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(localCalendarDate(parts))
  return title.charAt(0).toUpperCase() + title.slice(1)
}

export function TaskDatePicker({ boardId, taskId, value, onChange, variant = "cell" }: { boardId: string; taskId: string; value: string | null; onChange: (value: string | null) => void; variant?: "cell" | "property" }) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => initialMonth(value))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = todayDateOnly()
  const selectedParts = value ? parseDateOnly(value) : null
  const todayParts = parseDateOnly(today)
  const includeYear = variant === "property" || Boolean(selectedParts && todayParts && selectedParts.year !== todayParts.year)
  const days = monthDays(viewMonth)

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setViewMonth(initialMonth(value))
    setOpen(nextOpen)
  }

  async function persistDate(nextValue: string | null) {
    if (saving) return
    if (nextValue === value) {
      setOpen(false)
      return
    }

    const previousValue = value
    setError(null)
    onChange(nextValue)
    setOpen(false)
    setSaving(true)
    const result = await updateTaskDate({ boardId, taskId, date: nextValue })
    setSaving(false)
    if (!result.success) {
      onChange(previousValue)
      setError(result.error ?? "Não foi possível salvar a data.")
    }
  }

  return (
    <div className={cn("min-w-0 max-w-full", variant === "property" && "flex flex-wrap items-center gap-2")} onPointerDown={(event) => event.stopPropagation()}>
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              className={cn(
                "min-w-0 font-normal",
                variant === "cell" && "h-9 w-full justify-start rounded-none px-3 text-[11px] hover:bg-muted/30",
                variant === "property" && "h-8 max-w-full justify-start border bg-muted/20 px-2.5 text-xs hover:bg-muted/40"
              )}
              aria-label={value ? `Alterar data ${formatDateOnly(value, true)}` : "Definir data da tarefa"}
              title={value ? formatDateOnly(value, true) : undefined}
            />
          }
        >
          {saving ? <Loader2 className="animate-spin" /> : variant === "property" ? <CalendarDays /> : null}
          {variant === "property" && <span className="font-medium text-muted-foreground">Data:</span>}
          <span className={cn("truncate", !value && "text-muted-foreground")}>{formatDateOnly(value, includeYear)}</span>
        </PopoverTrigger>

        <PopoverContent align="center" className="w-[calc(100vw-1.5rem)] max-w-80 gap-3 p-3" onPointerDown={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewMonth((current) => moveMonth(current, -1))} aria-label="Mês anterior"><ChevronLeft /></Button>
            <p className="min-w-0 flex-1 text-center text-sm font-semibold">{monthTitle(viewMonth)}</p>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setViewMonth((current) => moveMonth(current, 1))} aria-label="Próximo mês"><ChevronRight /></Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => <span key={day} className="py-1 text-[10px] font-semibold uppercase text-muted-foreground">{day}</span>)}
            {days.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => void persistDate(day.value)}
                className={cn(
                  "grid aspect-square min-w-0 place-items-center rounded-md text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !day.currentMonth && "text-muted-foreground/45",
                  day.value === today && day.value !== value && "ring-1 ring-primary/50",
                  day.value === value && "bg-primary font-semibold text-primary-foreground hover:bg-primary/80"
                )}
                aria-label={formatDateOnly(day.value, true)}
                aria-pressed={day.value === value}
              >
                {day.parts.day}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => void persistDate(today)}>Hoje</Button>
            <Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => void persistDate(null)}>Limpar data</Button>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p role="alert" className={cn("max-w-full break-words text-[10px] leading-4 text-destructive", variant === "cell" && "px-2 pb-1")}>{error}</p>}
    </div>
  )
}
