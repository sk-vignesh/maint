"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight, Check, X,
  Sun, Loader2, MapPin,
} from "lucide-react"
import {
  type RotaStatus, type RotaEntry, type DriverPreference,
  getWeekRota, upsertRota, deleteRota,
  getAllPreferences, upsertPreference,
  weekStart, weekDates, weekKey, fmtDate, fmtDay, getISOWeek,
} from "@/lib/rota-store"
import { listOrders, updateOrder, type Order } from "@/lib/orders-api"
import { listDrivers, getDriverDetail, type Driver } from "@/lib/drivers-api"
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
    // end_date is inclusive on this API — use the same date to scope to one day only
    listOrders({ scheduled_at: date, end_date: date, per_page: 100 })
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
  onDragStart,
  onDragEnd,
  onTripsLoaded,
  refreshKey,
}: {
  dates: string[]
  assignedUuids: Set<string>
  onDragStart: (trip: Order) => void
  onDragEnd: () => void
  onTripsLoaded?: (orders: Order[]) => void
  refreshKey?: number
}) {
  const [allTrips, setAllTrips] = React.useState<Order[]>([])
  const [loading, setLoading]   = React.useState(false)
  const [activeDay, setActiveDay] = React.useState<string | "all">("all")

  // Fetch trips for this week. refreshKey forces a re-fetch after reassignments.
  React.useEffect(() => {
    if (dates.length === 0) return
    setLoading(true)
    setActiveDay("all")  // reset day tab when week changes
    const datesSet = new Set(dates)
    const start = dates[0]
    const last = new Date(dates[dates.length - 1] + "T00:00:00")
    last.setDate(last.getDate() + 2)  // +2 to avoid any off-by-one with API
    const end = last.toISOString().slice(0, 10)
    listOrders({ scheduled_at: start, end_date: end, per_page: 200 })
      .then(res => {
        const unassigned = (res.orders ?? []).filter(o => {
          const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
          if (a) return false
          // Keep only trips that actually fall in this week
          const d = o.scheduled_at?.slice(0, 10)
          return d ? datesSet.has(d) : false
        })
        setAllTrips(unassigned)
        // Bubble all fetched orders (not just unassigned) up to parent for cell labels
        onTripsLoaded?.(res.orders ?? [])
      })
      .catch(() => setAllTrips([]))
      .finally(() => setLoading(false))
  }, [dates, refreshKey])

  // Filter by selected day tab
  const visible = allTrips.filter(o => {
    if (assignedUuids.has(o.uuid)) return false
    if (activeDay === "all") return true
    return o.scheduled_at?.slice(0, 10) === activeDay
  })

  // Day tabs — only show days that have unassigned trips
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

      {/* 3-column card grid */}
      <div className="flex-1 overflow-y-auto p-2">
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
          <div className="grid grid-cols-3 gap-1.5">
            {visible.map(trip => {
              const time  = tripTime(trip.scheduled_at)
              const day   = trip.scheduled_at ? DAYS[new Date(trip.scheduled_at + (trip.scheduled_at.length === 10 ? "T12:00:00" : "")).getDay()] : ""
              const pick  = trip.pickup_name  ?? ""
              const drop  = trip.dropoff_name ?? ""
              return (
                <div
                  key={trip.uuid}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData("trip_uuid", trip.uuid)
                    e.dataTransfer.setData("trip_date", trip.scheduled_at?.slice(0, 10) ?? "")
                    e.dataTransfer.effectAllowed = "move"
                    onDragStart(trip)
                  }}
                  onDragEnd={onDragEnd}
                  title={`${pick} → ${drop}\n${trip.public_id} · ${time} ${day}`}
                  className="flex flex-col gap-0.5 rounded-lg border bg-background p-1.5 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-primary/5 transition-colors select-none"
                >
                  {/* Date + time header */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold text-primary leading-none">{day} {fmtDate(trip.scheduled_at?.slice(0, 10) ?? "")}</span>
                    <span className="text-[9px] font-semibold text-muted-foreground leading-none">{time}</span>
                  </div>
                  {pick && <p className="text-[9px] font-medium text-foreground truncate leading-tight mt-0.5">{pick}</p>}
                  {drop && <p className="text-[9px] text-muted-foreground truncate leading-tight">{drop}</p>}
                  <p className="text-[9px] text-muted-foreground/60 leading-none mt-0.5">{trip.public_id}</p>
                </div>
              )
            })}
          </div>
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
  // draggingTripRef: synchronous ref so onDragOver always sees the current value
  // (React state updates are async — by the time the first dragover fires, state may not have updated)
  const draggingTripRef = React.useRef<Order | null>(null)
  // draggingTrip state: for re-renders (overlay display)
  const [draggingTrip, setDraggingTrip] = React.useState<Order | null>(null)
  // Drop-target highlight
  const [dropTarget, setDropTarget] = React.useState<{ driverUuid: string; date: string } | null>(null)
  // Index of all orders fetched for the current week (uuid → Order) for cell labels
  const [tripIndex, setTripIndex] = React.useState<Map<string, Order>>(new Map())
  // Cells that are mid-save (driverUuid|date key)
  const [savingCells, setSavingCells] = React.useState<Set<string>>(new Set())
  // Counter bumped after reassignment to force dock refetch
  const [dockRefreshKey, setDockRefreshKey] = React.useState(0)
  // Pending reassignment — populated when drop target already has trips
  const [reassignDialog, setReassignDialog] = React.useState<{
    driver: Driver
    date: string
    existingUuids: string[]
    newTripUuid: string
    newTripOrder: Order | null
  } | null>(null)
  // Driver shift preference map: uuid → { start: "HH:MM", end: "HH:MM" }
  const [prefMap, setPrefMap] = React.useState<Map<string, { start: string; end: string }>>(new Map())

  // Popover state
  const [popover, setPopover] = React.useState<{
    driver: Driver; date: string; rect: DOMRect
  } | null>(null)

  const dates = React.useMemo(() => weekDates(monday), [monday])
  const wk = React.useMemo(() => weekKey(monday), [monday])
  const week = getISOWeek(monday)

  // Load drivers on mount; then batch-fetch shift preferences in parallel (non-blocking)
  React.useEffect(() => {
    setLoading(true)
    listDrivers()
      .then(async (r) => {
        const eligible = (r.drivers ?? []).filter((d) => (d.status as string) !== "pending")
        const deduped  = dedupBy(dedupBy(eligible, "uuid"), (d) => `${d.name}|${d.phone ?? ""}`)
        setDrivers(deduped)
        // Fire all detail requests in parallel — drivers = 30 max, allSettled won't throw
        const results = await Promise.allSettled(deduped.map(d => getDriverDetail(d.uuid)))
        const map = new Map<string, { start: string; end: string }>()
        results.forEach((res, i) => {
          if (res.status !== "fulfilled") return
          const sp = res.value.shift_preferences?.all_days
          if (!sp?.start || !sp?.end) return
          map.set(deduped[i].uuid, { start: sp.start.slice(0, 5), end: sp.end.slice(0, 5) })
        })
        setPrefMap(map)
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

  const handleDragOver = (
    e: React.DragEvent,
    driverUuid: string,
    date: string,
    effectiveStatus: RotaStatus | undefined
  ) => {
    // Always prevent default so the browser allows a drop (required for onDrop to fire).
    // We validate and silently reject in onDrop if the cell is invalid.
    e.preventDefault()
    const trip = draggingTripRef.current
    const blocked = effectiveStatus === "HOL_REQ" || effectiveStatus === "UNAVAILABLE"
    const wrongDate = trip ? trip.scheduled_at?.slice(0, 10) !== date : false
    if (blocked || wrongDate) {
      e.dataTransfer.dropEffect = "none"
      setDropTarget(null)
      return
    }
    e.dataTransfer.dropEffect = "move"
    setDropTarget({ driverUuid, date })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're truly leaving the cell (not entering a child element)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropTarget(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, driver: Driver, date: string) => {
    e.preventDefault()
    setDropTarget(null)
    const tripUuid = e.dataTransfer.getData("trip_uuid")
    const tripDate = e.dataTransfer.getData("trip_date")
    if (!tripUuid) return
    // Re-validate: reject if date doesn't match or cell is blocked
    if (tripDate && tripDate !== date) return

    // Get or create a WD entry for this cell
    const existing = getEntry(driver.uuid, date)
    const currentTrips = existing?.trip_uuids ?? []
    if (currentTrips.includes(tripUuid)) return

    // If the cell already has trips assigned, ask for confirmation before replacing
    if (currentTrips.length > 0) {
      setReassignDialog({
        driver,
        date,
        existingUuids: currentTrips,
        newTripUuid: tripUuid,
        newTripOrder: draggingTripRef.current,
      })
      return
    }

    // --- No existing trips: proceed directly ---
    const newEntry: RotaEntry = {
      driver_uuid: driver.uuid,
      date,
      status: "WD",
      trip_uuids: [tripUuid],
      note: existing?.note,
    }
    upsertRota(newEntry)

    const cellKey = `${driver.uuid}|${date}`
    setSavingCells(prev => new Set(prev).add(cellKey))
    await updateOrder(tripUuid, { driver_assigned_uuid: driver.uuid }).catch(() => {})
    const updated = getWeekRota(dates)
    setRotas(updated)
    setAssignedTripUuids(new Set(updated.flatMap(r => r.trip_uuids ?? [])))
    setSavingCells(prev => { const s = new Set(prev); s.delete(cellKey); return s })
  }

  /** Called when user confirms the reassignment dialog */
  const confirmReassign = async () => {
    if (!reassignDialog) return
    const { driver, date, existingUuids, newTripUuid } = reassignDialog
    setReassignDialog(null)

    const cellKey = `${driver.uuid}|${date}`
    setSavingCells(prev => new Set(prev).add(cellKey))

    // Unassign all existing trips from this driver
    await Promise.all(
      existingUuids.map(uuid =>
        updateOrder(uuid, { driver_assigned_uuid: null }).catch(() => {})
      )
    )

    // Replace rota entry with only the new trip
    const existing = getEntry(driver.uuid, date)
    upsertRota({
      driver_uuid: driver.uuid,
      date,
      status: "WD",
      trip_uuids: [newTripUuid],
      note: existing?.note,
    })

    // Assign new trip
    await updateOrder(newTripUuid, { driver_assigned_uuid: driver.uuid }).catch(() => {})

    const updated = getWeekRota(dates)
    setRotas(updated)
    setAssignedTripUuids(new Set(updated.flatMap(r => r.trip_uuids ?? [])))
    setSavingCells(prev => { const s = new Set(prev); s.delete(cellKey); return s })
    // Bump key so dock refetches — old trips reappear as unassigned
    setDockRefreshKey(k => k + 1)
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

  // Which date is the in-flight trip scheduled for?
  const draggingDate = draggingTrip?.scheduled_at?.slice(0, 10)

  // Preference match: compute once per render so all rows can reference it
  const draggingTime = draggingTrip?.scheduled_at?.slice(11, 16) ?? null
  const matchingDrivers = React.useMemo<Set<string>>(() => {
    if (!draggingTime) return new Set<string>()
    const s = new Set<string>()
    prefMap.forEach(({ start, end }, uuid) => {
      if (draggingTime >= start && draggingTime <= end) s.add(uuid)
    })
    return s
  }, [draggingTime, prefMap])

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
                  <th
                    className="py-2 text-left text-[11px] font-bold text-muted-foreground px-2 overflow-hidden"
                    style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                  >Driver</th>
                  {dates.map((d, i) => {
                    const isTarget = draggingDate === d
                    const isOther  = !!draggingDate && !isTarget
                    return (
                      <th
                        key={d}
                        className="py-1 text-center overflow-hidden"
                        style={{
                          // Expand slowly on drag-start, snap back instantly on release
                          transition: draggingDate
                            ? 'width 0.18s ease-out, min-width 0.18s ease-out'
                            : 'width 0.06s ease-in, min-width 0.06s ease-in',
                          // Use large px values (not %) so driver column's min-width holds
                          ...(draggingDate
                            ? isTarget
                              ? { width: 9999, minWidth: 160 } // expands greedily
                              : { width: 16, minWidth: 0, maxWidth: 16 }  // collapses to thin strip
                            : { width: 52, minWidth: 52, maxWidth: 52 }),
                        }}
                      >
                        {isOther ? null : (
                          <>
                            <div className={`text-[11px] font-bold ${isTarget ? 'text-primary' : 'text-muted-foreground'}`}>{DAYS[i]}</div>
                            <div className={`text-[10px] font-normal ${isTarget ? 'text-primary/70' : 'text-muted-foreground/60'}`}>{fmtDate(d)}</div>
                            {isTarget && (
                              <div className="text-[9px] text-primary/60 mt-0.5 font-medium">drop here ↓</div>
                            )}
                          </>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {allDriverGroups.map((group) => (
                  <React.Fragment key={group.label}>
                    {group.items.map((driver) => {
                      return (
                        <tr
                          key={driver.uuid}
                          className={`border-b last:border-0 transition-colors
                            ${draggingTrip
                              ? matchingDrivers.has(driver.uuid)
                                ? "bg-emerald-50/60 dark:bg-emerald-900/10"
                                : prefMap.has(driver.uuid) ? "opacity-60" : ""
                              : "hover:bg-muted/10"}
                          `}
                        >
                          {/* Avatar + name, fixed 120px */}
                          <td className="px-2 py-1 w-[120px] min-w-[120px] max-w-[120px] overflow-hidden">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                                {(driver.name ?? "?")[0].toUpperCase()}
                              </span>
                              <span className="text-[11px] font-medium truncate" title={driver.name}>{driver.name}</span>
                              {draggingTrip && matchingDrivers.has(driver.uuid) && (
                                <span
                                  className="ml-auto shrink-0 text-[12px] leading-none animate-bounce"
                                  title={`Prefers ${prefMap.get(driver.uuid)!.start}–${prefMap.get(driver.uuid)!.end}`}
                                >&#x1F64B;</span>
                              )}
                            </div>
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
                            const isBlocked = effectiveStatus === "HOL_REQ" || effectiveStatus === "UNAVAILABLE"
                            const isValidDrop = draggingDate === date && !isBlocked
                            // Collapsed = dragging but not the target column
                            const isCollapsed = !!draggingDate && date !== draggingDate
                            const isSaving = savingCells.has(`${driver.uuid}|${date}`)

                            return (
                              <td
                                key={date}
                                // Apply collapsed colour DIRECTLY on td — visible at any pixel width
                                className={`relative overflow-hidden
                                  ${isCollapsed
                                    ? effectiveStatus
                                      ? cfg.dot + ' opacity-35 p-0'
                                      : 'bg-border/50 p-0'
                                    : 'px-0.5 py-0.5'}  // small pad so button ring never clips
                                `}
                                // Attach DnD to td when collapsed (no child button in that state)
                                onDragOver={isCollapsed ? (e) => handleDragOver(e, driver.uuid, date, effectiveStatus) : undefined}
                                onDragLeave={isCollapsed ? handleDragLeave : undefined}
                                onDrop={isCollapsed ? (e) => handleDrop(e, driver, date) : undefined}
                              >
                                {!isCollapsed && (
                                  <button
                                    onClick={(e) => handleCellClick(e, driver, date)}
                                    onDragOver={(e) => handleDragOver(e, driver.uuid, date, effectiveStatus)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, driver, date)}
                                    className={`group relative w-full flex items-center justify-center rounded-md min-h-[32px] p-1 transition-all
                                      ${isActive ? "ring-2 ring-primary" : ""}
                                      ${isDrop && isValidDrop ? "ring-2 ring-primary bg-primary/10" : ""}
                                      ${!effectiveStatus && !isSaving ? "border border-dashed border-border hover:border-muted-foreground/40 hover:bg-muted/20" : ""}
                                    `}
                                  >
                                    {isSaving ? (
                                      // Saving skeleton — pulsing pill
                                      <span className="inline-flex items-center gap-1.5 rounded-[100px] border border-emerald-300/40 bg-emerald-50/60 dark:bg-emerald-900/20 px-2 text-[10px] font-semibold leading-[1.9] animate-pulse">
                                        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                                        <span className="w-10 h-2 rounded bg-emerald-200/80 dark:bg-emerald-700/50" />
                                      </span>
                                    ) : effectiveStatus ? (
                                      // WD: show first trip's time + public_id; fall back to short label
                                      <span className={`inline-flex items-center gap-1 rounded-[100px] border px-2 text-[10px] font-semibold leading-[1.9] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                                        {entry?.status === "WD" && entry.trip_uuids?.length
                                          ? (() => {
                                              const t = tripIndex.get(entry.trip_uuids[0])
                                              const time = t?.scheduled_at?.slice(11, 16) ?? ""
                                              const id   = t?.public_id ?? ""
                                              const extra = entry.trip_uuids.length > 1 ? ` +${entry.trip_uuids.length - 1}` : ""
                                              return time ? `${time}${id ? ` · ${id}` : ""}${extra}` : `${entry.trip_uuids.length}t`
                                            })()
                                          : leave && !entry
                                            ? (leave.leave_type || leave.non_availability_type || cfg.short)
                                            : cfg.short}
                                      </span>
                                    ) : (
                                      <span className="text-[14px] leading-none text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors">+</span>
                                    )}
                                    {/* Conflict dot */}
                                    {leave && entry && (
                                      <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-rose-400" title={`Leave: ${leave.leave_type}`} />
                                    )}
                                    {/* Dark overlay on invalid/blocked drop targets */}
                                    {draggingTrip && !isValidDrop && (
                                      <span className="absolute inset-0 rounded-lg bg-background/60 pointer-events-none" />
                                    )}
                                  </button>
                                )}
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
        <div className="w-[360px] shrink-0 flex flex-col min-h-0 overflow-hidden">
          <TripsDockPanel
            dates={dates}
            assignedUuids={assignedTripUuids}
            refreshKey={dockRefreshKey}
            onTripsLoaded={(orders) => {
              const m = new Map<string, Order>()
              orders.forEach(o => m.set(o.uuid, o))
              setTripIndex(m)
            }}
            onDragStart={(trip) => {
              draggingTripRef.current = trip
              setDraggingTrip(trip)
            }}
            onDragEnd={() => {
              draggingTripRef.current = null
              setDraggingTrip(null)
            }}
          />
        </div>
      </div>

      {/* Reassignment confirmation dialog */}
      {reassignDialog && ReactDOM.createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            style={{ zIndex: 10000 }}
            onClick={() => setReassignDialog(null)}
          />
          {/* Dialog */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-2xl border bg-card shadow-2xl"
            style={{ zIndex: 10001 }}
          >
            <div className="p-5 flex flex-col gap-4">
              {/* Header */}
              <div>
                <p className="text-sm font-bold">Reassign {reassignDialog.driver.name}?</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDay(reassignDialog.date)}, {fmtDate(reassignDialog.date)}</p>
              </div>
              {/* Current vs new */}
              <div className="rounded-xl border bg-muted/30 p-3 flex flex-col gap-2 text-xs">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Currently assigned</p>
                  {reassignDialog.existingUuids.map(uid => {
                    const t = tripIndex.get(uid)
                    return (
                      <span key={uid} className="inline-flex items-center gap-1 rounded-[100px] border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 mr-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {t ? `${t.scheduled_at?.slice(11,16)} · ${t.public_id}` : uid.slice(0,8)}
                      </span>
                    )
                  })}
                </div>
                <div className="border-t pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Will be replaced with</p>
                  {(() => {
                    const t = reassignDialog.newTripOrder
                    return (
                      <span className="inline-flex items-center gap-1 rounded-[100px] border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary mr-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {t ? `${t.scheduled_at?.slice(11,16)} · ${t.public_id}` : reassignDialog.newTripUuid.slice(0,8)}
                      </span>
                    )
                  })()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">The existing trip{reassignDialog.existingUuids.length !== 1 ? 's' : ''} will be unassigned and returned to the unassigned pool.</p>
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setReassignDialog(null)}
                  className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >Cancel</button>
                <button
                  onClick={confirmReassign}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >Reassign</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

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
