"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight, Check, X,
  Sun, Loader2, GripVertical, MapPin,
} from "lucide-react"
import {
  type RotaStatus, type RotaEntry, type DriverPreference,
  getWeekRota, upsertRota, deleteRota,
  getAllPreferences, upsertPreference,
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
  WD:          { label: "Working Day",   short: "WD",  bg: "bg-emerald-50 dark:bg-emerald-900/20",  text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-300/70 dark:border-emerald-600/40", dot: "bg-emerald-500" },
  RD:          { label: "Rest Day",      short: "RD",  bg: "bg-slate-50 dark:bg-slate-800/40",      text: "text-slate-700 dark:text-slate-300",      border: "border-slate-300/70 dark:border-slate-600/40",    dot: "bg-slate-400" },
  HOL_REQ:     { label: "Holiday",      short: "HOL", bg: "bg-rose-50 dark:bg-rose-900/20",        text: "text-rose-700 dark:text-rose-300",        border: "border-rose-300/70 dark:border-rose-600/40",      dot: "bg-rose-500" },
  UNAVAILABLE: { label: "Unavailable",  short: "N/A", bg: "bg-amber-50 dark:bg-amber-900/20",      text: "text-amber-700 dark:text-amber-300",      border: "border-amber-300/70 dark:border-amber-600/40",    dot: "bg-amber-500" },
  OFF:         { label: "Off",          short: "OFF", bg: "bg-gray-50 dark:bg-gray-800/40",        text: "text-gray-600 dark:text-gray-400",        border: "border-gray-300/70 dark:border-gray-600/40",      dot: "bg-gray-400" },
  NOT_ON_ROTA: { label: "Not on Rota", short: "—",   bg: "bg-transparent",                        text: "text-muted-foreground/30",               border: "border-dashed border-muted/30",                   dot: "bg-muted" },
}

const STATUSES: RotaStatus[] = ["WD", "RD", "HOL_REQ", "UNAVAILABLE", "OFF"]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Format "HH:MM" from a scheduled_at ISO string */
function tripTime(scheduledAt?: string | null): string {
  if (!scheduledAt) return "—"
  return scheduledAt.slice(11, 16)
}

// ─── Cell Popover ─────────────────────────────────────────────────────────────

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
    const nextDay = new Date(date + "T00:00:00")
    nextDay.setDate(nextDay.getDate() + 1)
    const y = nextDay.getFullYear()
    const mo = String(nextDay.getMonth() + 1).padStart(2, "0")
    const d = String(nextDay.getDate()).padStart(2, "0")
    const endDate = `${y}-${mo}-${d}`
    listOrders({ scheduled_at: date, end_date: endDate, per_page: 100 })
      .then((res) => {
        const eligible = (res.orders ?? []).filter((o) => {
          const assignedUuid = o.driver_assigned_uuid || o.driver_assigned?.uuid
          return !assignedUuid || assignedUuid === driver.uuid
        })
        setTrips(eligible)
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

  const handleSave = async () => {
    setSaving(true)
    const rotaEntry: RotaEntry = {
      driver_uuid: driver.uuid,
      date,
      status,
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
            Trips for this day
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
          {selected.size > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {selected.size} trip{selected.size !== 1 ? "s" : ""} selected
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

// ─── Trips Dock Panel (right sidebar) ─────────────────────────────────────────

function TripsDockPanel({
  dates,
  assignedUuids,
  onTripAssigned,
}: {
  dates: string[]
  assignedUuids: Set<string>
  onTripAssigned: (tripUuid: string) => void
}) {
  const [allTrips, setAllTrips] = React.useState<Order[]>([])
  const [loading, setLoading]   = React.useState(false)
  const [activeDay, setActiveDay] = React.useState<string | "all">("all")

  // Fetch all unassigned trips for this week
  React.useEffect(() => {
    if (dates.length === 0) return
    setLoading(true)
    const start = dates[0]
    // end = day after last date
    const last = new Date(dates[dates.length - 1] + "T00:00:00")
    last.setDate(last.getDate() + 1)
    const end = last.toISOString().slice(0, 10)
    listOrders({ scheduled_at: start, end_date: end, per_page: 200 })
      .then(res => {
        const unassigned = (res.orders ?? []).filter(o => {
          const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
          return !a
        })
        setAllTrips(unassigned)
      })
      .catch(() => setAllTrips([]))
      .finally(() => setLoading(false))
  }, [dates])

  // Filter by selected day tab
  const visible = allTrips.filter(o => {
    if (assignedUuids.has(o.uuid)) return false
    if (activeDay === "all") return true
    return o.scheduled_at?.slice(0, 10) === activeDay
  })

  // Day tabs — only show days that have trips
  const daysWithTrips = dates.filter(d =>
    allTrips.some(o => o.scheduled_at?.slice(0, 10) === d && !assignedUuids.has(o.uuid))
  )

  return (
    <div className="rounded-xl border bg-card flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="border-b px-3 py-2.5 shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Unassigned Trips</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {loading ? "Loading…" : `${visible.length} trip${visible.length !== 1 ? "s" : ""} · drag to assign`}
        </p>
      </div>

      {/* Day filter tabs */}
      {!loading && daysWithTrips.length > 0 && (
        <div className="flex gap-0.5 border-b px-2 py-1.5 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveDay("all")}
            className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              activeDay === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          {daysWithTrips.map(d => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeDay === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {DAYS[new Date(d + "T12:00:00").getDay()]}
            </button>
          ))}
        </div>
      )}

      {/* Trip list */}
      <div className="flex-1 overflow-y-auto divide-y">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5 opacity-30" />
            <p className="text-xs">No unassigned trips</p>
          </div>
        ) : (
          visible.map(trip => {
            const time = tripTime(trip.scheduled_at)
            const day  = trip.scheduled_at ? DAYS[new Date(trip.scheduled_at).getDay()] : ""
            const route = [trip.pickup_name, trip.dropoff_name].filter(Boolean).join(" → ") || trip.public_id
            return (
              <div
                key={trip.uuid}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData("trip_uuid", trip.uuid)
                  e.dataTransfer.effectAllowed = "move"
                }}
                className="flex items-start gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors select-none"
                title={`Drag to assign: ${route}`}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/40" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-primary">{time}</span>
                    {day && <span className="text-[10px] text-muted-foreground">{day}</span>}
                  </div>
                  <p className="text-xs font-medium truncate leading-tight">{route}</p>
                  <p className="text-[10px] text-muted-foreground">{trip.public_id}</p>
                </div>
              </div>
            )
          })
        )}
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
  const [loading, setLoading] = React.useState(true)
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([])
  // Track which trip UUIDs are already assigned (to hide from dock)
  const [assignedTripUuids, setAssignedTripUuids] = React.useState<Set<string>>(new Set())
  // Drop-target highlight
  const [dropTarget, setDropTarget] = React.useState<{ driverUuid: string; date: string } | null>(null)

  // Popover state
  const [popover, setPopover] = React.useState<{
    driver: Driver; date: string; rect: DOMRect
  } | null>(null)

  const dates = React.useMemo(() => weekDates(monday), [monday])
  const wk = React.useMemo(() => weekKey(monday), [monday])
  const week = getISOWeek(monday)

  // Load drivers on mount
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

  // Load rota + leaves on week change
  React.useEffect(() => {
    const weekRotas = getWeekRota(dates)
    setRotas(weekRotas)
    setPreferences(getAllPreferences())
    // Build set of already-assigned trip UUIDs
    const uuids = new Set(weekRotas.flatMap(r => r.trip_uuids ?? []))
    setAssignedTripUuids(uuids)

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
   */
  function leaveForDriverDate(driver: Driver, date: string): LeaveRequest | undefined {
    return leaves.find(l => {
      if (date < l.start_date.slice(0, 10) || date > l.end_date.slice(0, 10)) return false
      if (driver.user_uuid && l.user_uuid && l.user_uuid === driver.user_uuid) return true
      if (l.driver_uuid && l.driver_uuid === driver.uuid) return true
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
    // If changing away from WD, un-assign driver from previous trips
    const prev = getEntry(entry.driver_uuid, entry.date)
    if (prev?.status === "WD" && prev.trip_uuids && entry.status !== "WD") {
      await Promise.all(
        prev.trip_uuids.map((uuid) =>
          updateOrder(uuid, { driver_assigned_uuid: null } as Parameters<typeof updateOrder>[1]).catch(() => {})
        )
      )
    }
    upsertRota(entry)
    if (entry.status === "WD") {
      await Promise.all(
        selectedOrders.map((o) =>
          updateOrder(o.uuid, { driver_assigned_uuid: entry.driver_uuid }).catch(() => {})
        )
      )
    }
    const updated = getWeekRota(dates)
    setRotas(updated)
    setAssignedTripUuids(new Set(updated.flatMap(r => r.trip_uuids ?? [])))
    setPopover(null)
  }

  const handleClear = (driverUuid: string, date: string) => {
    deleteRota(driverUuid, date)
    const updated = getWeekRota(dates)
    setRotas(updated)
    setAssignedTripUuids(new Set(updated.flatMap(r => r.trip_uuids ?? [])))
    setPopover(null)
  }

  const handleCellClick = (e: React.MouseEvent, driver: Driver, date: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover(prev =>
      prev?.driver.uuid === driver.uuid && prev.date === date ? null : { driver, date, rect }
    )
  }

  // ── Drag-and-drop onto a cell ──────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent, driverUuid: string, date: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTarget({ driverUuid, date })
  }

  const handleDragLeave = () => setDropTarget(null)

  const handleDrop = async (e: React.DragEvent, driver: Driver, date: string) => {
    e.preventDefault()
    setDropTarget(null)
    const tripUuid = e.dataTransfer.getData("trip_uuid")
    if (!tripUuid) return

    // Get or create a WD entry for this cell
    const existing = getEntry(driver.uuid, date)
    const currentTrips = existing?.trip_uuids ?? []
    // Add trip if not already there
    if (currentTrips.includes(tripUuid)) return

    const newEntry: RotaEntry = {
      driver_uuid: driver.uuid,
      date,
      status: "WD",
      trip_uuids: [...currentTrips, tripUuid],
      note: existing?.note,
    }
    upsertRota(newEntry)

    // Assign the driver to the trip via API
    await updateOrder(tripUuid, { driver_assigned_uuid: driver.uuid }).catch(() => {})

    const updated = getWeekRota(dates)
    setRotas(updated)
    setAssignedTripUuids(new Set(updated.flatMap(r => r.trip_uuids ?? [])))
  }

  const handlePreference = (pref: DriverPreference) => {
    upsertPreference(pref)
    setPreferences(getAllPreferences())
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

  // Driver grouping
  const fullTime = drivers.filter((d) => (d as unknown as { type?: string }).type !== "part-time")
  const partTime = drivers.filter((d) => (d as unknown as { type?: string }).type === "part-time")
  const driverGroups: Array<{ label: string; items: Driver[] }> = [
    ...(fullTime.length ? [{ label: "Full-Time Drivers", items: fullTime }] : []),
    ...(partTime.length ? [{ label: "Part-Time Drivers", items: partTime }] : []),
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
                            const entry         = getEntry(driver.uuid, date)
                            const leave         = leaveForDriverDate(driver, date)
                            const leaveStatus: "HOL_REQ" | "UNAVAILABLE" | undefined =
                              !entry && leave
                                ? (leave.leave_type === "Vacation" || leave.non_availability_type === "Holiday"
                                    ? "HOL_REQ" as const
                                    : "UNAVAILABLE" as const)
                                : undefined
                            const effectiveStatus = entry?.status ?? leaveStatus
                            const cfg       = STATUS_CONFIG[effectiveStatus ?? "NOT_ON_ROTA"]
                            const isActive  = popover?.driver.uuid === driver.uuid && popover.date === date
                            const tripCount = entry?.trip_uuids?.length
                            const isDrop    = dropTarget?.driverUuid === driver.uuid && dropTarget?.date === date

                            return (
                              <td key={date} className="px-1 py-1">
                                <button
                                  onClick={(e) => handleCellClick(e, driver, date)}
                                  onDragOver={(e) => handleDragOver(e, driver.uuid, date)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, driver, date)}
                                  className={`group relative w-full flex items-center justify-center rounded-lg min-h-[32px] p-1 transition-all
                                    ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}
                                    ${isDrop ? "ring-2 ring-primary/60 ring-offset-1 bg-primary/5" : ""}
                                    ${effectiveStatus ? "border-0" : "border border-dashed border-border hover:border-muted-foreground/40 hover:bg-muted/20"}
                                  `}
                                >
                                  {effectiveStatus ? (
                                    <span className={`inline-flex w-full items-center justify-start gap-1.5 rounded-[100px] border pl-2 pr-3 text-[11px] font-medium capitalize leading-[2] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                                      {entry?.status === "WD"
                                        ? `Working Day${tripCount ? ` · ${tripCount}t` : ""}`
                                        : leave && !entry
                                          ? (leave.leave_type || leave.non_availability_type || cfg.label)
                                          : cfg.label}
                                    </span>
                                  ) : (
                                    <span className="text-[14px] leading-none text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors">+</span>
                                  )}
                                  {/* Conflict dot */}
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

        {/* ── Right: unassigned trips dock ──────────────────────────────── */}
        <div className="w-[210px] shrink-0 flex flex-col gap-2 overflow-y-auto">
          <TripsDockPanel
            dates={dates}
            assignedUuids={assignedTripUuids}
            onTripAssigned={(uuid) => {
              setAssignedTripUuids(prev => new Set([...prev, uuid]))
            }}
          />
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
