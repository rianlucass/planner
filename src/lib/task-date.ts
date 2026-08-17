export type DateOnlyParts = { year: number; month: number; day: number }

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function parseDateOnly(value: string): DateOnlyParts | null {
  const match = dateOnlyPattern.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

export function isValidDateOnly(value: string) {
  return parseDateOnly(value) !== null
}

export function toDateOnly(parts: DateOnlyParts) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

export function todayDateOnly() {
  const today = new Date()
  return toDateOnly({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() })
}

function toLocalCalendarDate(parts: DateOnlyParts) {
  const date = new Date(0)
  date.setHours(12, 0, 0, 0)
  date.setFullYear(parts.year, parts.month - 1, parts.day)
  return date
}

export function formatDateOnly(value: string | null, includeYear = false) {
  if (!value) return "—"
  const parts = parseDateOnly(value)
  if (!parts) return "—"

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  })
  const formattedParts = formatter.formatToParts(toLocalCalendarDate(parts))
  const day = formattedParts.find((part) => part.type === "day")?.value ?? String(parts.day)
  const month = (formattedParts.find((part) => part.type === "month")?.value ?? String(parts.month)).replace(/\.$/, "")
  return includeYear ? `${day} ${month} ${parts.year}` : `${day} ${month}`
}

export function localCalendarDate(parts: DateOnlyParts) {
  return toLocalCalendarDate(parts)
}
