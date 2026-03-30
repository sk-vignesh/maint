/**
 * Rota Store — localStorage-backed rota data layer.
 * Swappable to Supabase: replace the read/write functions below
 * while keeping the same exported API surface.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type RotaStatus = "WD" | "RD" | "HOL_REQ" | "UNAVAILABLE" | "OFF"

export interface RotaEntry {
  driver_uuid: string
  date: string         // "YYYY-MM-DD"
  status: RotaStatus
  shift_number?: number // 1–10 (legacy relay concept)
  shift_start?: string  // "HH:MM" — auto-derived from earliest trip
  trip_uuids?: string[] // trips assigned on this day via rota
  note?: string
}

export interface ShiftTime {
  start: string        // "HH:MM"
  pushed_later: boolean
}

// shift_number (1–10) → ShiftTime
export type ShiftTemplate = Record<number, ShiftTime>

// keyed by "YYYY-Www" e.g. "2025-W25"
export type ShiftTemplates = Record<string, ShiftTemplate>

export interface DriverPreference {
  driver_uuid: string
  preference_start?: string  // "HH:MM" — undefined = "No preference"
  preference_end?: string    // "HH:MM"
}

// ─── Storage Keys ───────────────────────────────────────────────────────────

const ROTA_KEY        = "rota_entries"
const TEMPLATES_KEY   = "shift_templates"
const PREFERENCES_KEY = "driver_preferences"

// ─── Rota Entries ───────────────────────────────────────────────────────────

export function getAllRota(): RotaEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(ROTA_KEY) ?? "[]") as RotaEntry[]
  } catch {
    return []
  }
}

export function saveRota(entries: RotaEntry[]): void {
  localStorage.setItem(ROTA_KEY, JSON.stringify(entries))
}

export function getRotaEntry(driverUuid: string, date: string): RotaEntry | undefined {
  return getAllRota().find((e) => e.driver_uuid === driverUuid && e.date === date)
}

/** Upsert a single rota entry */
export function upsertRota(entry: RotaEntry): void {
  const all = getAllRota()
  const idx = all.findIndex((e) => e.driver_uuid === entry.driver_uuid && e.date === entry.date)
  if (idx >= 0) {
    all[idx] = entry
  } else {
    all.push(entry)
  }
  saveRota(all)
}

/** Delete a single rota entry (resets cell to no state) */
export function deleteRota(driverUuid: string, date: string): void {
  saveRota(getAllRota().filter((e) => !(e.driver_uuid === driverUuid && e.date === date)))
}

/** Get all entries for a given ISO week (Mon–Sun) */
export function getWeekRota(weekDates: string[]): RotaEntry[] {
  const all = getAllRota()
  const set = new Set(weekDates)
  return all.filter((e) => set.has(e.date))
}

// ─── Shift Templates ────────────────────────────────────────────────────────

export function getAllTemplates(): ShiftTemplates {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? "{}") as ShiftTemplates
  } catch {
    return {}
  }
}

export function getTemplate(weekKey: string): ShiftTemplate {
  return getAllTemplates()[weekKey] ?? {}
}

export function saveTemplate(weekKey: string, template: ShiftTemplate): void {
  const all = getAllTemplates()
  all[weekKey] = template
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all))
}

/** Get the resolved start time for a shift entry (uses template if no override) */
export function resolveShiftStart(entry: RotaEntry, weekKey: string): string | undefined {
  if (entry.shift_start) return entry.shift_start
  if (entry.shift_number !== undefined) {
    const template = getTemplate(weekKey)
    return template[entry.shift_number]?.start
  }
  return undefined
}

// ─── Driver Preferences ─────────────────────────────────────────────────────

export function getAllPreferences(): DriverPreference[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "[]") as DriverPreference[]
  } catch {
    return []
  }
}

export function getPreference(driverUuid: string): DriverPreference | undefined {
  return getAllPreferences().find((p) => p.driver_uuid === driverUuid)
}

export function upsertPreference(pref: DriverPreference): void {
  const all = getAllPreferences()
  const idx = all.findIndex((p) => p.driver_uuid === pref.driver_uuid)
  if (idx >= 0) {
    all[idx] = pref
  } else {
    all.push(pref)
  }
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(all))
}

// ─── Date Utilities ─────────────────────────────────────────────────────────

/** Get ISO week number for a date */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** "YYYY-Www" key for a date */
export function weekKey(date: Date): string {
  return `${date.getFullYear()}-W${String(getISOWeek(date)).padStart(2, "0")}`
}

/** Sunday of the week containing `date` (weeks run Sun–Sat).
 *  Uses pure local-integer arithmetic to avoid DST drift (e.g. UK spring-forward). */
export function weekStart(date: Date): Date {
  const day = date.getDay()           // 0=Sun … 6=Sat
  // Build a DST-safe midnight by working in local year/month/date integers
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day)
  return d
}

/** Format a Date as "YYYY-MM-DD" in local time (not UTC) */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Array of 7 "YYYY-MM-DD" strings for Sun–Sat of the given week.
 *  Built from integer offsets so no DST transition can shift a day. */
export function weekDates(sunday: Date): string[] {
  const y = sunday.getFullYear()
  const mo = sunday.getMonth()
  const startDay = sunday.getDate()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(y, mo, startDay + i)
    return toLocalDateStr(d)
  })
}

/** Pretty label "15 Jun" — uses noon to avoid DST midnight drift */
export function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

/** Day abbrev "Mon" — uses noon to avoid DST midnight drift */
export function fmtDay(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" })
}

// ─── Availability helpers ────────────────────────────────────────────────────

export interface DriverAvailability {
  status: RotaStatus | "NOT_ON_ROTA"
  shiftStart?: string
  shiftNumber?: number
  preferenceStart?: string
  preferenceEnd?: string
  /** true if trip time falls outside preference window */
  preferenceConflict?: boolean
}

/**
 * Check a driver's availability for a specific trip date + time.
 * tripTime: "HH:MM" — optional, used for preference conflict check.
 */
export function getDriverAvailability(
  driverUuid: string,
  date: string,
  tripTime?: string,
): DriverAvailability {
  const entry = getRotaEntry(driverUuid, date)
  const pref  = getPreference(driverUuid)
  const wk    = weekKey(new Date(date + "T00:00:00"))

  const prefStart = pref?.preference_start
  const prefEnd   = pref?.preference_end

  let preferenceConflict = false
  if (tripTime && prefStart && prefEnd) {
    const [th, tm] = tripTime.split(":").map(Number)
    const [sh, sm] = prefStart.split(":").map(Number)
    const [eh, em] = prefEnd.split(":").map(Number)
    const tripMins  = th * 60 + tm
    const startMins = sh * 60 + sm
    const endMins   = eh * 60 + em
    preferenceConflict = tripMins < startMins || tripMins > endMins
  }

  if (!entry) {
    return {
      status: "NOT_ON_ROTA",
      preferenceStart: prefStart,
      preferenceEnd: prefEnd,
      preferenceConflict,
    }
  }

  const shiftStart = resolveShiftStart(entry, wk)

  return {
    status: entry.status,
    shiftStart,
    shiftNumber: entry.shift_number,
    preferenceStart: prefStart,
    preferenceEnd: prefEnd,
    preferenceConflict,
  }
}
