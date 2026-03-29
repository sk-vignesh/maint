"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight, Check, X,
  Sun, Clock, Loader2,
} from "lucide-react"
import {
  type RotaStatus, type RotaEntry, type ShiftTemplate, type DriverPreference,
  getAllRota, saveRota, getWeekRota, upsertRota, deleteRota,
  getAllTemplates, getTemplate, saveTemplate,
  getAllPreferences, upsertPreference, getPreference,
  weekStart, weekDates, weekKey, fmtDate, fmtDay, getISOWeek,
} from "@/lib/rota-store"
import { listOrders, updateOrder, type Order } from "@/lib/orders-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"
import { listDriverLeave, type LeaveRequest } from "@/lib/leave-requests-api"
import { dedupBy } from "@/lib/utils"
import * as ReactDOM from "react-dom"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RotaStatus | "NOT_ON_ROTA", {
  label: string
  short: string
  bg: string
  text: string
  border: string
  dot: string
}> = {
  WD:          { label: "Working Day",     short: "WD",  bg: "bg-emerald-50 dark:bg-emerald-900/20",  text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-300/70 dark:border-emerald-600/40", dot: "bg-emerald-500" },
  RD:          { label: "Rest Day",        short: "RD",  bg: "bg-slate-50 dark:bg-slate-800/40",      text: "text-slate-700 dark:text-slate-300",      border: "border-slate-300/70 dark:border-slate-600/40",    dot: "bg-slate-400" },
  HOL_REQ:     { label: "Holiday",        short: "HOL", bg: "bg-rose-50 dark:bg-rose-900/20",        text: "text-rose-700 dark:text-rose-300",        border: "border-rose-300/70 dark:border-rose-600/40",      dot: "bg-rose-500" },
  UNAVAILABLE: { label: "Unavailable",    short: "N/A", bg: "bg-amber-50 dark:bg-amber-900/20",      text: "text-amber-700 dark:text-amber-300",      border: "border-amber-300/70 dark:border-amber-600/40",    dot: "bg-amber-500" },
  OFF:         { label: "Off",            short: "OFF", bg: "bg-gray-50 dark:bg-gray-800/40",        text: "text-gray-600 dark:text-gray-400",        border: "border-gray-300/70 dark:border-gray-600/40",      dot: "bg-gray-400" },
  NOT_ON_ROTA: { label: "Not on Rota",   short: "—",   bg: "bg-transparent",                        text: "text-muted-foreground/30",               border: "border-dashed border-muted/30",                   dot: "bg-muted" },
}

const STATUSES: RotaStatus[] = ["WD", "RD", "HOL_REQ", "UNAVAILABLE", "OFF"]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DEFAULT_SHIFTS: ShiftTemplate = {
  1: { start: "09:00", pushed_later: false },
  2: { start: "10:00", pushed_later: false },
  3: { start: "14:00", pushed_later: false },
  4: { start: "19:00", pushed_later: false },
  5: { start: "19:00", pushed_later: false },
  6: { start: "20:30", pushed_later: false },
  7: { start: "21:00", pushed_later: false },
  8: { start: "22:00", pushed_later: false },
  9: { start: "22:30", pushed_later: false },
  10: { start: "23:00", pushed_later: false },
}

/** Format "HH:MM" from a scheduled_at ISO string */
function tripTime(scheduledAt?: string | null): string {
  if (!scheduledAt) return "—"
  return scheduledAt.slice(11, 16)
}

/** Derive shift start from earliest selected trip — HH:00 or HH:30 */
function deriveShiftStart(orders: Order[]): string | undefined {
  if (orders.length === 0) return undefined
  const sorted = [...orders].sort((a, b) =>
    (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")
  )
  const t = sorted[0].scheduled_at
  if (!t) return undefined
  const [h, m] = t.slice(11, 16).split(":").map(Number)
  return `${String(h).padStart(2, "0")}:${m >= 30 ? "30" : "00"}`
}

function CellPopover({
  driver, date, entry,
  onSave, onClear, onClose,
}: {
  driver: Driver
  date: string
  entry?: RotaEntry
  onSave: (e: RotaEntry, selectedOrders: Order[]) => void
  onClear: () => void
  onClose: () => void
}) {
  const [status, setStatus] = React.useState<RotaStatus>(entry?.status ?? "WD")
  const [note, setNote] = React.useState(entry?.note ?? "")
  const [trips, setTrips] = React.useState<Order[]>([])
  const [loadingTrips, setLoadingTrips] = React.useState(false)
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(entry?.trip_uuids ?? [])
  )
  const [saving, setSaving] = React.useState(false)

  // Fetch trips for this date when status = WD
  React.useEffect(() => {
    if (status !== "WD") { setTrips([]); return }
    setLoadingTrips(true)
    // Filter by scheduled_at (start of day) + end_date (start of next day)
    // to get all trips on this specific date
    const nextDay = new Date(date + "T00:00:00")
    nextDay.setDate(nextDay.getDate() + 1)
    const y = nextDay.getFullYear()
    const mo = String(nextDay.getMonth() + 1).padStart(2, "0")
    const d = String(nextDay.getDate()).padStart(2, "0")
    const endDate = `${y}-${mo}-${d}`
    listOrders({ scheduled_at: date, end_date: endDate, per_page: 100 })
      .then((res) => {
        // Show unassigned trips and any already assigned to this driver
        const eligible = (res.orders ?? []).filter((o) => {
          const assignedUuid = o.driver_assigned_uuid || o.driver_assigned?.uuid
          return !assignedUuid || assignedUuid === driver.uuid
        })
        setTrips(eligible)
        // Pre-select trips already assigned to this driver
        const pre = new Set(
          eligible
            .filter((o) => (o.driver_assigned_uuid || o.driver_assigned?.uuid) === driver.uuid)
            .map((o) => o.uuid)
        )
        if (pre.size > 0) setSelected(pre)
      })
      .catch(() => setTrips([]))
      .finally(() => setLoadingTrips(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, date, driver.uuid])

  const toggleTrip = (uuid: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(uuid) ? n.delete(uuid) : n.add(uuid)
      return n
    })
  }

  const selectedOrders = trips.filter(t => selected.has(t.uuid))
  const derivedStart = deriveShiftStart(selectedOrders)

  const handleSave = async () => {
    setSaving(true)
    const rotaEntry: RotaEntry = {
      driver_uuid: driver.uuid,
      date,
      status,
      shift_start: status === "WD" ? derivedStart : undefined,
      trip_uuids: status === "WD" ? [...selected] : undefined,
      note: note || undefined,
    }
    onSave(rotaEntry, status === "WD" ? selectedOrders : [])
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-w-[280px]" onMouseDown={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{driver.name}</p>
          <p className="text-xs text-muted-foreground">{fmtDay(date)}, {fmtDate(date)}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Status selector */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Day status</p>
        <div className="grid grid-cols-3 gap-1.5">
          {STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                  status === s
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                    : "border-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                {status === s && <Check className="h-3 w-3 shrink-0" />}
                {cfg.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* Trip selector — WD only */}
      {status === "WD" && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Select trips
          </p>
          {loadingTrips ? (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading trips…
            </div>
          ) : trips.length === 0 ? (
            <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground">
              No unassigned trips on this date
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
              {trips.map((trip) => {
                const isSel = selected.has(trip.uuid)
                const time = tripTime(trip.scheduled_at)
                const route = [trip.pickup_name, trip.dropoff_name]
                  .filter(Boolean).join(" → ") || trip.public_id
                return (
                  <button
                    key={trip.uuid}
                    onClick={() => toggleTrip(trip.uuid)}
                    className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                      isSel ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                    }`}>
                      {isSel && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-xs font-medium">{route}</span>
                      <span className="block text-[10px] text-muted-foreground">{trip.public_id} · {time}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {derivedStart && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Shift starts at <span className="font-semibold text-foreground">{derivedStart}</span>
              {" "}({selected.size} trip{selected.size !== 1 ? "s" : ""})
            </p>
          )}
        </div>
      )}

      {/* Note */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Note (optional)</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note…"
          className="w-full resize-none rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : status === "WD" && selected.size > 0
            ? `Assign ${selected.size} trip${selected.size !== 1 ? "s" : ""}`
            : "Save"}
        </button>
        {entry && (
          <button
            onClick={onClear}
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}


// ─── Preference Editor ────────────────────────────────────────────────────────

function PreferenceCell({ driver, pref, onChange }: {
  driver: Driver
  pref?: DriverPreference
  onChange: (p: DriverPreference) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [start, setStart] = React.useState(pref?.preference_start ?? "")
  const [end, setEnd] = React.useState(pref?.preference_end ?? "")

  const label = pref?.preference_start && pref.preference_end
    ? `${pref.preference_start}–${pref.preference_end}`
    : "No pref"

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Click to edit preference window"
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Sun className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate max-w-[80px]">{label}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 text-[10px]">
      <div className="flex gap-1 items-center">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
          className="w-16 rounded border bg-background px-1 py-0.5 text-[10px]" />
        <span>–</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
          className="w-16 rounded border bg-background px-1 py-0.5 text-[10px]" />
      </div>
      <div className="flex gap-1">
        <button onClick={() => { onChange({ driver_uuid: driver.uuid, preference_start: start || undefined, preference_end: end || undefined }); setEditing(false) }}
          className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">Save</button>
        <button onClick={() => setEditing(false)}
          className="rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground">Cancel</button>
      </div>
    </div>
  )
}

// ─── Relay Shift Times Panel (right sidebar) ──────────────────────────────────

function ShiftTemplatePanel({ wk, template, onChange }: {
  wk: string
  template: ShiftTemplate
  onChange: (t: ShiftTemplate) => void
}) {
  const [local, setLocal] = React.useState<ShiftTemplate>(() =>
    Object.keys(DEFAULT_SHIFTS).reduce<ShiftTemplate>((acc, n) => {
      const num = Number(n)
      acc[num] = template[num] ?? DEFAULT_SHIFTS[num]
      return acc
    }, {})
  )
  const [dirty, setDirty] = React.useState(false)

  const update = (n: number, field: "start" | "pushed_later", val: string | boolean) => {
    setLocal(prev => ({ ...prev, [n]: { ...prev[n], [field]: val } }))
    setDirty(true)
  }

  return (
    <div className="rounded-xl border bg-card flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="border-b px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Relay Shift Times</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{wk} · red = pushed late</p>
      </div>

      {/* Shift rows */}
      <div className="flex-1 overflow-y-auto divide-y">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const row = local[n] ?? DEFAULT_SHIFTS[n]
          return (
            <div
              key={n}
              className={`flex items-center gap-2 px-3 py-1.5 ${row.pushed_later ? "bg-rose-50 dark:bg-rose-950/20" : ""}`}
            >
              {/* Shift label */}
              <span className={`w-5 shrink-0 text-center text-[10px] font-bold ${row.pushed_later ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                S{n}
              </span>
              {/* Time input */}
              <input
                type="time"
                value={row.start}
                onChange={(e) => update(n, "start", e.target.value)}
                className={`flex-1 min-w-0 rounded border bg-background px-1 py-0.5 text-center text-[10px] focus:outline-none focus:ring-1 focus:ring-ring ${row.pushed_later ? "border-rose-400" : ""}`}
              />
              {/* Late toggle */}
              <button
                onClick={() => update(n, "pushed_later", !row.pushed_later)}
                title={row.pushed_later ? "Pushed later — rest period risk" : "Mark as pushed later"}
                className={`shrink-0 text-[9px] font-bold transition-colors ${row.pushed_later ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
              >
                {row.pushed_later ? "⚠" : "·"}
              </button>
            </div>
          )
        })}
      </div>

      {/* Save footer */}
      <div className="border-t p-2">
        <button
          onClick={() => { onChange(local); setDirty(false) }}
          disabled={!dirty}
          className="w-full rounded-lg bg-primary px-2 py-1.5 text-[10px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          Save times
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RotaPage() {
  const [monday, setMonday] = React.useState<Date>(() => weekStart(new Date()))
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [rotas, setRotas] = React.useState<RotaEntry[]>([])
  const [preferences, setPreferences] = React.useState<DriverPreference[]>([])
  const [template, setTemplate] = React.useState<ShiftTemplate>({})
  const [loading, setLoading] = React.useState(true)
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([])

  // Popover state
  const [popover, setPopover] = React.useState<{
    driver: Driver; date: string; rect: DOMRect
  } | null>(null)

  const dates = React.useMemo(() => weekDates(monday), [monday])
  const wk = React.useMemo(() => weekKey(monday), [monday])
  const week = getISOWeek(monday)

  // Load drivers + rota + preferences on mount and week change
  React.useEffect(() => {
    setLoading(true)
    listDrivers()
      .then((r) => {
        const eligible = (r.drivers ?? []).filter((d) => (d.status as string) !== "pending")
        setDrivers(dedupBy(dedupBy(eligible, "uuid"), (d) => `${d.name}|${d.phone ?? ""}`))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    setRotas(getWeekRota(dates))
    setPreferences(getAllPreferences())
    const tpl = getTemplate(wk)
    setTemplate(Object.keys(tpl).length ? tpl : DEFAULT_SHIFTS)
    // Fetch driver leaves for a window around this week
    listDriverLeave({ per_page: 500, sort: "-start_date" })
      .then(res => setLeaves(res.data ?? []))
      .catch(() => {})
  }, [dates, wk])

  /**
   * Returns the leave record for a driver on a given YYYY-MM-DD date string.
   *
   * The leave API and drivers API use different UUID domains:
   *   – leave.driver_uuid ≠ driver.uuid (different tables, rarely matches)
   *   – leave.user_uuid === driver.user_uuid (both FK to users table — reliable)
   * We match by user_uuid first, then driver_uuid fallback, then name as last resort.
   */
  function leaveForDriverDate(driver: Driver, date: string): LeaveRequest | undefined {
    return leaves.find(l => {
      // Date range check first (cheap)
      if (date < l.start_date.slice(0, 10) || date > l.end_date.slice(0, 10)) return false
      // Primary: both have a user_uuid FK to the users table
      if (driver.user_uuid && l.user_uuid && l.user_uuid === driver.user_uuid) return true
      // Secondary: direct driver_uuid match (works for some records)
      if (l.driver_uuid && l.driver_uuid === driver.uuid) return true
      // Last resort: name match for legacy data
      if (l.user?.name && l.user.name === driver.name) return true
      return false
    })
  }

  const navWeek = (delta: number) => {
    setMonday(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta * 7)
      return d
    })
    setPopover(null)
  }

  const getEntry = (driverUuid: string, date: string): RotaEntry | undefined =>
    rotas.find((r) => r.driver_uuid === driverUuid && r.date === date)

  const handleSave = async (entry: RotaEntry, selectedOrders: Order[]) => {
    // If changing away from WD, un-assign the driver from their previous trips
    const prev = getEntry(entry.driver_uuid, entry.date)
    if (prev?.status === "WD" && prev.trip_uuids && entry.status !== "WD") {
      await Promise.all(
        prev.trip_uuids.map((uuid) =>
          updateOrder(uuid, { driver_assigned_uuid: null } as Parameters<typeof updateOrder>[1]).catch(() => {})
        )
      )
    }
    upsertRota(entry)
    // Assign the driver to each selected trip
    if (entry.status === "WD") {
      await Promise.all(
        selectedOrders.map((o) =>
          updateOrder(o.uuid, { driver_assigned_uuid: entry.driver_uuid }).catch(() => {})
        )
      )
    }
    setRotas(getWeekRota(dates))
    setPopover(null)
  }

  const handleClear = (driverUuid: string, date: string) => {
    deleteRota(driverUuid, date)
    setRotas(getWeekRota(dates))
    setPopover(null)
  }

  const handleCellClick = (e: React.MouseEvent, driver: Driver, date: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover(prev =>
      prev?.driver.uuid === driver.uuid && prev.date === date ? null : { driver, date, rect }
    )
  }

  const handlePreference = (pref: DriverPreference) => {
    upsertPreference(pref)
    setPreferences(getAllPreferences())
  }

  const handleTemplateSave = (tpl: ShiftTemplate) => {
    saveTemplate(wk, tpl)
    setTemplate(tpl)
  }

  // Popover position (flip up if near bottom)
  const popoverStyle = React.useMemo((): React.CSSProperties => {
    if (!popover) return {}
    const { rect } = popover
    const flipUp = window.innerHeight - rect.bottom < 280
    return {
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - 290),
      zIndex: 9999,
      ...(flipUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    }
  }, [popover])

  // Full-time / part-time split (using Fleetbase driver type if available, else show all together)
  const fullTime = drivers.filter((d) => (d as unknown as { type?: string }).type !== "part-time")
  const partTime = drivers.filter((d) => (d as unknown as { type?: string }).type === "part-time")
  const driverGroups: Array<{ label: string; items: Driver[] }> = [
    ...(fullTime.length ? [{ label: "Full-Time Drivers", items: fullTime }] : []),
    ...(partTime.length ? [{ label: "Part-Time Drivers", items: partTime }] : []),
    // If there's no type field, just show all
    ...(fullTime.length === 0 && partTime.length === 0 ? [{ label: "Drivers", items: drivers }] : []),
  ]
  const allDriverGroups = driverGroups.every(g => g.items.length === 0)
    ? [{ label: "Drivers", items: drivers }]
    : driverGroups

  return (
    <div className="flex h-full flex-col gap-3 p-4 md:p-5 overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap shrink-0">

        {/* Week nav — ‹ Week 13 · 24 Mar – 30 Mar › */}
        <div className="flex items-center gap-0 rounded-xl border bg-card px-1 py-1">
          <button
            onClick={() => navWeek(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setMonday(weekStart(new Date())); setPopover(null) }}
            className="flex items-center px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Jump to current week"
          >
            Week {week} &nbsp;·&nbsp; {fmtDate(dates[0])} – {fmtDate(dates[6])}
          </button>
          <button
            onClick={() => navWeek(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            title="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Status legend — pill style matching cells */}
        <div className="flex items-center gap-1.5">
          {(["WD", "RD", "HOL_REQ", "UNAVAILABLE"] as const).map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <span key={s} className={`inline-flex items-center gap-1 rounded-[100px] border pl-1.5 pr-2.5 text-[10px] font-medium leading-[1.8] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Main two-column area ──────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 min-h-0">

        {/* ── Left: driver grid ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-auto rounded-xl border bg-card">
          {loading ? (
            <div className="flex justify-center py-20 text-muted-foreground text-sm">Loading drivers…</div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="w-[160px] px-3 py-2 text-left text-[11px] font-bold text-muted-foreground">Driver</th>
                  <th className="w-[86px] px-2 py-2 text-left text-[11px] font-bold text-muted-foreground">Preference</th>
                  {dates.map((d, i) => (
                    <th key={d} className="px-1 py-2 text-center min-w-[84px]">
                      <div className="text-[11px] font-bold text-muted-foreground">{DAYS[i]}</div>
                      <div className="text-[10px] font-normal text-muted-foreground/60">{fmtDate(d)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allDriverGroups.map((group) => (
                  <React.Fragment key={group.label}>
                    <tr className="border-b bg-muted/20">
                      <td colSpan={2 + 7} className="px-3 py-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</span>
                      </td>
                    </tr>
                    {group.items.map((driver) => {
                      const pref = preferences.find(p => p.driver_uuid === driver.uuid)
                      return (
                        <tr key={driver.uuid} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                                {(driver.name ?? "?")[0].toUpperCase()}
                              </span>
                              <span className="text-xs font-medium truncate max-w-[100px]">{driver.name}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <PreferenceCell driver={driver} pref={pref} onChange={handlePreference} />
                          </td>
                          {dates.map((date) => {
                            const entry    = getEntry(driver.uuid, date)
                            const leave    = leaveForDriverDate(driver, date)
                            // Leave-derived status when no manual entry
                            const leaveStatus: "HOL_REQ" | "UNAVAILABLE" | undefined =
                              !entry && leave
                                ? (leave.leave_type === "Vacation" || leave.non_availability_type === "Holiday"
                                    ? "HOL_REQ" as const
                                    : "UNAVAILABLE" as const)
                                : undefined
                            const effectiveStatus = entry?.status ?? leaveStatus
                            const cfg    = STATUS_CONFIG[effectiveStatus ?? "NOT_ON_ROTA"]
                            const isActive = popover?.driver.uuid === driver.uuid && popover.date === date
                            const resolvedTime = entry?.status === "WD"
                              ? (entry.shift_start ?? (entry.shift_number ? template[entry.shift_number]?.start : undefined))
                              : undefined
                            const pushed = entry?.shift_number ? template[entry.shift_number]?.pushed_later : false
                            const tripCount = entry?.trip_uuids?.length

                            return (
                              <td key={date} className="px-1 py-1">
                                <button
                                  onClick={(e) => handleCellClick(e, driver, date)}
                                  className={`group relative w-full flex items-center justify-center rounded-lg border min-h-[32px] p-1 transition-all
                                    ${isActive
                                      ? "border-primary/50 bg-primary/5 ring-2 ring-primary ring-offset-1"
                                      : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                                    }`}
                                >
                                  {effectiveStatus ? (
                                    /* Pill — colour lives here, not in the cell */
                                    <span className={`inline-flex items-center gap-1 rounded-[100px] border pl-1 pr-2 text-[10px] font-medium capitalize leading-[1.8] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${pushed ? "bg-rose-500" : cfg.dot}`} />
                                      {entry?.status === "WD"
                                        ? (pushed ? `⚠ ${resolvedTime ?? "WD"}` : `${resolvedTime ?? "WD"}${tripCount ? ` · ${tripCount}t` : ""}`)
                                        : leave && !entry
                                          ? (leave.leave_type || leave.non_availability_type || cfg.label)
                                          : cfg.label}
                                    </span>
                                  ) : (
                                    /* Empty cell — show + to indicate it's clickable/allocatable */
                                    <span className="text-[14px] leading-none text-muted-foreground/30 group-hover:text-muted-foreground/60">+</span>
                                  )}
                                  {/* Conflict dot: leave exists but a manual entry overrides it */}
                                  {leave && entry && (
                                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-rose-400" title={`Leave: ${leave.leave_type}`} />
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Right: relay shift times ──────────────────────────────────── */}
        <div className="w-[200px] shrink-0 flex flex-col gap-2 overflow-y-auto">
          <ShiftTemplatePanel wk={wk} template={template} onChange={handleTemplateSave} />
        </div>
      </div>

      {/* Cell popover portal */}
      {popover && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setPopover(null)} />
          <div
            style={{ ...popoverStyle, width: 288 }}
            className="rounded-xl border bg-card shadow-xl"
          >
            <CellPopover
              driver={popover.driver}
              date={popover.date}
              entry={getEntry(popover.driver.uuid, popover.date)}
              onSave={handleSave}
              onClear={() => handleClear(popover.driver.uuid, popover.date)}
              onClose={() => setPopover(null)}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
