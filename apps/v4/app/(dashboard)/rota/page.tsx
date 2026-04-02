"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight, Check, X,
  Sun, Loader2, MapPin, AlertTriangle, ShieldCheck, ShieldAlert, XCircle, BookOpen,
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
import { useLang } from "@/components/lang-context"
import {
  runComplianceCheck,
  prospectiveComplianceCheck,
  COMPLIANCE_RULES,
  type RotaComplianceReport,
  type ComplianceViolation,
} from "@/lib/compliance-engine"
import * as ReactDOM from "react-dom"

// ─── Constants ────────────────────────────────────────────────────────────────

type StatusConfigEntry = { label: string; short: string; bg: string; text: string; border: string; dot: string }
type StatusConfig = Record<RotaStatus | "NOT_ON_ROTA", StatusConfigEntry>

function buildStatusConfig(rt: ReturnType<typeof useLang>["t"]["rota"]): StatusConfig {
  return {
    WD:          { label: rt.workingDay,   short: "WD",  bg: "bg-emerald-50 dark:bg-emerald-900/20",  text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-300/70 dark:border-emerald-600/40", dot: "bg-emerald-500" },
    RD:          { label: rt.restDay,      short: "RD",  bg: "bg-slate-50 dark:bg-slate-800/40",      text: "text-slate-700 dark:text-slate-300",      border: "border-slate-300/70 dark:border-slate-600/40",    dot: "bg-slate-400" },
    HOL_REQ:     { label: rt.holiday,      short: "HOL", bg: "bg-rose-50 dark:bg-rose-900/20",        text: "text-rose-700 dark:text-rose-300",        border: "border-rose-300/70 dark:border-rose-600/40",      dot: "bg-rose-500" },
    UNAVAILABLE: { label: rt.unavailable,  short: "N/A", bg: "bg-amber-50 dark:bg-amber-900/20",      text: "text-amber-700 dark:text-amber-300",      border: "border-amber-300/70 dark:border-amber-600/40",    dot: "bg-amber-500" },
    OFF:         { label: rt.off,          short: "OFF", bg: "bg-gray-50 dark:bg-gray-800/40",        text: "text-gray-600 dark:text-gray-400",        border: "border-gray-300/70 dark:border-gray-600/40",      dot: "bg-gray-400" },
    NOT_ON_ROTA: { label: rt.notOnRota,    short: "—",   bg: "bg-transparent",                        text: "text-muted-foreground/30",               border: "border-dashed border-muted/30",                   dot: "bg-muted" },
  }
}

function buildLoadSteps(rt: ReturnType<typeof useLang>["t"]["rota"]) {
  return [
    { label: rt.step1Label, emoji: "👤", detail: rt.step1Detail },
    { label: rt.step2Label, emoji: "🏖️", detail: rt.step2Detail },
    { label: rt.step3Label, emoji: "🗺️", detail: rt.step3Detail },
    { label: rt.step4Label, emoji: "📋", detail: rt.step4Detail },
  ]
}

function buildDays(rt: ReturnType<typeof useLang>["t"]["rota"]) {
  return [rt.sun, rt.mon, rt.tue, rt.wed, rt.thu, rt.fri, rt.sat]
}

const STATUSES: RotaStatus[] = ["WD", "RD", "HOL_REQ", "UNAVAILABLE", "OFF"]

/** Format "HH:MM" from a scheduled_at ISO string — local clock, not UTC */
function tripTime(scheduledAt?: string | null): string {
  if (!scheduledAt) return "—"
  const d = new Date(scheduledAt)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/** Convert API ISO timestamp → local date "YYYY-MM-DD" */
function isoLocalDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Convert API ISO timestamp → local time "HH:MM" */
function isoLocalTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
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
  const { t } = useLang()
  const STATUS_CONFIG = buildStatusConfig(t.rota)
  const [status, setStatus] = React.useState<RotaStatus>(entry?.status ?? "WD")
  const [note, setNote] = React.useState(entry?.note ?? "")
  const [trips, setTrips] = React.useState<Order[]>([])
  const [loadingTrips, setLoadingTrips] = React.useState(false)
  // Start empty — always overwritten by the API fetch below (single source of truth)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [saving, setSaving] = React.useState(false)

  // Fetch trips for this date when status = WD
  React.useEffect(() => {
    if (status !== "WD") { setTrips([]); return }
    setLoadingTrips(true)
    // end_date is inclusive on this API — use the same date to scope to one day only
    listOrders({ scheduled_at: date, end_date: date, limit: 100 })
      .then((res) => {
        const eligible = (res.data ?? []).filter((o) => {
          const assignedUuid = o.driver_assigned_uuid || o.driver_assigned?.uuid
          return !assignedUuid || assignedUuid === driver.uuid
        })
        setTrips(eligible)
        // Always sync selection from API — removes stale pre-selections if trips were
        // unassigned externally (e.g. via the Trips module). No guard: empty = no selection.
        const pre = new Set(
          eligible
            .filter((o) => (o.driver_assigned_uuid || o.driver_assigned?.uuid) === driver.uuid)
            .map((o) => o.uuid)
        )
        setSelected(pre)
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
                const route = [trip.payload?.pickup?.name ?? trip.pickup_name, trip.payload?.dropoff?.name ?? trip.dropoff_name]
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
  const { t } = useLang()
  const DAYS = buildDays(t.rota)
  const [allTrips, setAllTrips] = React.useState<Order[]>([])
  const [loading, setLoading]   = React.useState(false)
  const [activeDay, setActiveDay] = React.useState<string | "all">("all")

  // Fetch trips for this week. refreshKey forces a re-fetch after reassignments.
  React.useEffect(() => {
    if (dates.length === 0) return
    setLoading(true)
    setActiveDay("all")  // reset day tab when week changes
    const datesSet = new Set(dates)

    // Use the week's exact Monday–Sunday date strings (already YYYY-MM-DD local dates).
    // Do NOT use toISOString() here — that converts to UTC and shifts the date in BST/other
    // positive-offset timezones (e.g. Sun 00:00 local → Sat 23:00 UTC → wrong date).
    const start = dates[0]
    const end   = dates[dates.length - 1]

    // Extend fetch window 1 day before Sunday (back to Saturday) and 1 day after Saturday (to next Sunday).
    // This ensures trips that START on the Sunday before or sunday after are
    // included in tripIndex so the compliance engine can detect rest-gap
    // violations between adjacent-week trips (e.g. a Sunday overnight trip
    // followed by a sunday morning trip has an insufficient rest gap).
    const fetchStart = (() => {
      const d = new Date(start + "T12:00:00")
      d.setDate(d.getDate() - 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    })()
    const fetchEnd = (() => {
      const d = new Date(end + "T12:00:00")
      d.setDate(d.getDate() + 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    })()

    listOrders({ scheduled_at: fetchStart, end_date: fetchEnd, limit: 250 })
      .then(res => {
        const unassigned = (res.data ?? []).filter(o => {
          const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
          if (a) return false
          // Dock only shows unassigned trips within the actual visible week
          const d = o.scheduled_at ? isoLocalDate(o.scheduled_at) : undefined
          return d ? datesSet.has(d) : false
        })
        setAllTrips(unassigned)
        // Bubble ALL fetched orders (including adjacent days) up to parent.
        // The compliance engine uses these to detect cross-week rest gaps.
        onTripsLoaded?.(res.data ?? [])
      })
      .catch(() => setAllTrips([]))
      .finally(() => setLoading(false))
  }, [dates, refreshKey])


  // Filter by selected day tab
  const visible = allTrips.filter(o => {
    if (assignedUuids.has(o.uuid)) return false
    if (activeDay === "all") return true
    return o.scheduled_at ? isoLocalDate(o.scheduled_at) === activeDay : false
  })

  // Day tabs — only show days that have unassigned trips
  const daysWithTrips = dates.filter(d =>
    allTrips.some(o => o.scheduled_at && isoLocalDate(o.scheduled_at) === d && !assignedUuids.has(o.uuid))
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
              const localDate = trip.scheduled_at ? isoLocalDate(trip.scheduled_at) : ""
              const day   = localDate ? DAYS[new Date(localDate + "T12:00:00").getDay()] : ""
              const pick  = trip.payload?.pickup?.name  ?? trip.pickup_name  ?? ""
              const drop  = trip.payload?.dropoff?.name ?? trip.dropoff_name ?? ""
              return (
                <div
                  key={trip.uuid}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData("trip_uuid", trip.uuid)
                    e.dataTransfer.setData("trip_date", localDate)
                    e.dataTransfer.effectAllowed = "move"
                    onDragStart(trip)
                  }}
                  onDragEnd={onDragEnd}
                  title={`${pick} → ${drop}\n${trip.public_id} · ${time} ${day}`}
                  className="flex flex-col gap-0.5 rounded-lg border bg-background p-1.5 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-primary/5 transition-colors select-none"
                >
                  {/* Date + time header */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold text-primary leading-none">{day} {fmtDate(localDate)}</span>
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

// ─── Rota Loader ─────────────────────────────────────────────────────────────
// Slow animated steps, holds at last step until API is ready, then sprints.

const STEP_CEILINGS = [22, 48, 70, 88]

function RotaLoader({ apiReady, onFinished }: { apiReady: boolean; onFinished: () => void }) {
  const { t } = useLang()
  const LOAD_STEPS = buildLoadSteps(t.rota)
  const [step, setStep]         = React.useState(0)
  const [pct,  setPct]          = React.useState(0)
  const apiReadyRef             = React.useRef(apiReady)
  const finishedRef             = React.useRef(false)

  // Keep ref in sync so the rAF tick always sees the latest value
  React.useEffect(() => { apiReadyRef.current = apiReady }, [apiReady])

  // ─ Slow step timers (users can read each one) ─
  React.useEffect(() => {
    const durations = [1800, 2400, 2000]  // only steps 0→1, 1→2, 2→3
    let accumulated = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    durations.forEach((dur, i) => {
      accumulated += dur
      timers.push(setTimeout(() => setStep(i + 1), accumulated))
    })

    return () => timers.forEach(clearTimeout)
  }, [])

  // ─ rAF progress ticker ─
  // Fills toward the ceiling for each step; at step 3 breathes between 70-88.
  // When apiReady flips true, rushes to 100 then calls onFinished.
  React.useEffect(() => {
    let raf: number
    const start = Date.now()
    const phaseMs = [1800, 2400, 2000] // parallel with timers above
    const totalPhaseMs = phaseMs.reduce((a, b) => a + b, 0) // 6200ms

    const tick = () => {
      const elapsed = Date.now() - start

      if (apiReadyRef.current && !finishedRef.current) {
        // API is done — sprint to 100 and signal parent
        setPct(prev => {
          const next = prev + (100 - prev) * 0.18  // exponential approach
          if (next >= 99.2) {
            finishedRef.current = true
            setTimeout(onFinished, 260)  // brief hold at 100 before unmounting
            return 100
          }
          return Math.round(next * 10) / 10
        })
        raf = requestAnimationFrame(tick)
        return
      }

      if (finishedRef.current) return  // finished, stop ticking

      // Normal fill — approach the current step's ceiling
      const currentStep = Math.min(
        phaseMs.reduce((acc, dur, i) => acc + (elapsed > phaseMs.slice(0, i + 1).reduce((a, b) => a + b, 0) ? 1 : 0), 0),
        STEP_CEILINGS.length - 1
      )
      const ceiling = STEP_CEILINGS[currentStep]

      if (currentStep >= 3) {
        // Step 4: breathe between 70–85, waiting
        const breathe = 77 + Math.sin(elapsed / 800) * 8
        setPct(Math.round(breathe))
      } else {
        // Fill smoothly toward ceiling
        const phaseStart = phaseMs.slice(0, currentStep).reduce((a, b) => a + b, 0)
        const phaseDur   = phaseMs[currentStep]
        const phaseElapsed = Math.min(elapsed - phaseStart, phaseDur)
        const prevCeiling  = currentStep > 0 ? STEP_CEILINGS[currentStep - 1] : 0
        const fill = prevCeiling + ((ceiling - prevCeiling) * (phaseElapsed / phaseDur)) * 0.9
        setPct(prev => Math.max(prev, Math.round(fill)))
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinished])

  // ─ When api becomes ready while step < 3, fast-forward remaining steps ─
  React.useEffect(() => {
    if (!apiReady) return
    let t = 0
    for (let i = step; i < LOAD_STEPS.length; i++) {
      const captured = i
      const timer = setTimeout(() => setStep(captured + 1), t)
      t += 80
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady])

  const displayStep  = Math.min(step, LOAD_STEPS.length - 1)
  const currentData  = LOAD_STEPS[displayStep]
  const isWaiting    = step >= LOAD_STEPS.length && !apiReady

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20 px-8 select-none">

      {/* Animated icon cluster */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        <div className="absolute inset-0 rounded-full border-[6px] border-[#496453]/12" />
        <div
          className="absolute inset-0 rounded-full border-[6px] border-transparent border-t-[#496453] animate-spin"
          style={{ animationDuration: isWaiting ? "2s" : "1.2s" }}
        />
        <span
          style={{ fontSize: "7rem", lineHeight: 1, animation: "rotaPulse 1.6s ease-in-out infinite" }}
          key={displayStep}
        >
          {currentData.emoji}
        </span>
        <style>{`
          @keyframes rotaPulse {
            0%   { transform: scale(0.85); opacity: 0.55; }
            50%  { transform: scale(1.12); opacity: 1;   }
            100% { transform: scale(0.85); opacity: 0.55; }
          }
          @keyframes rotaFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* Step label + detail */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p
          className="text-base font-bold text-foreground"
          style={{ animation: "rotaFadeIn 0.35s ease" }}
          key={`label-${displayStep}`}
        >
          {currentData.label}
        </p>
        <p
          className="text-sm text-muted-foreground/70 max-w-xs leading-relaxed"
          key={`detail-${displayStep}`}
          style={{ animation: "rotaFadeIn 0.45s ease" }}
        >
          {currentData.detail}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm flex flex-col gap-2.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#496453] via-emerald-500 to-[#5d8068]"
            style={{
              width: `${pct}%`,
              transition: apiReady ? "width 0.08s linear" : "width 0.6s ease-out",
            }}
          />
        </div>

        {/* Step milestone dots */}
        <div className="flex items-center justify-between px-0.5">
          {LOAD_STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={[
                "h-2 w-2 rounded-full transition-all duration-500",
                i < step  ? "bg-[#496453] scale-110 shadow-sm"  :
                i === step ? "bg-[#496453]/50 animate-pulse scale-125" :
                             "bg-muted-foreground/20",
              ].join(" ")} />
              <p className={[
                "text-[10px] font-medium transition-colors duration-500",
                i <= step ? "text-[#496453]" : "text-muted-foreground/35",
              ].join(" ")}>{s.emoji}</p>
            </div>
          ))}
        </div>

        {/* % label */}
        <p className="text-center text-[11px] tabular-nums text-muted-foreground/50">
          {Math.round(pct)}%
        </p>
      </div>

      {/* Skeleton grid preview */}
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border/40 opacity-25">
        <div className="flex border-b bg-muted/20 px-3 py-2 gap-2">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          {[1,2,3,4,5,6,7].map(i => <div key={i} className="flex-1 h-3 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />)}
        </div>
        {[1,2,3,4,5].map(row => (
          <div key={row} className="flex border-b last:border-0 px-3 py-2 gap-2 items-center">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" style={{ animationDelay: `${row * 100}ms` }} />
            {[1,2,3,4,5,6,7].map(col => (
              <div key={col} className="flex-1 h-6 rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${(row * 7 + col) * 45}ms` }} />
            ))}
          </div>
        ))}
      </div>

    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RotaPage() {
  const { t } = useLang()
  const STATUS_CONFIG = buildStatusConfig(t.rota)
  const DAYS = buildDays(t.rota)
  const [sunday, setSunday] = React.useState<Date>(() => weekStart(new Date()))
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [rotas, setRotas] = React.useState<RotaEntry[]>([])
  const [preferences, setPreferences] = React.useState<DriverPreference[]>([])
  const [loading, setLoading]     = React.useState(true)
  const [loaderDone, setLoaderDone] = React.useState(false)
  const handleLoaderFinished = React.useCallback(() => setLoaderDone(true), [])
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

  // ── Single source of truth: derive assignedTripUuids from the live API (tripIndex) ──
  // This means external unassignments (via the Trips module) are always reflected here.
  React.useEffect(() => {
    const uuids = new Set<string>()
    tripIndex.forEach((o) => {
      if (o.driver_assigned_uuid || o.driver_assigned?.uuid) uuids.add(o.uuid)
    })
    setAssignedTripUuids(uuids)
  }, [tripIndex])

  // ── Cleanup stale WD rota entries once tripIndex is populated ──────────────
  // An entry is stale ONLY if its listed trips are confirmed in the API as
  // assigned to a DIFFERENT driver (externally reassigned or unassigned via
  // the Trips module). We do NOT purge entries whose trips haven't been
  // reflected in tripIndex yet (post-drop async window) to avoid a race
  // condition where a freshly-assigned cell disappears during dock re-fetch.
  React.useEffect(() => {
    if (tripIndex.size === 0) return  // tripIndex not yet loaded — don't prune
    setRotas(prev => {
      const stale = prev.filter(r => {
        if (r.status !== "WD") return false

        if (!r.trip_uuids || r.trip_uuids.length === 0) {
          // No trip_uuids recorded: stale if no API trip is assigned to this
          // driver on this date at all (original behaviour for legacy entries).
          return ![...tripIndex.values()].some(o => {
            const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
            return a === r.driver_uuid && o.scheduled_at && isoLocalDate(o.scheduled_at) === r.date
          })
        }

        // Has trip_uuids: stale ONLY if every listed trip is in tripIndex
        // AND is explicitly assigned to a DIFFERENT (non-null) driver.
        // If the trip is unassigned (null) or not yet in tripIndex, we keep
        // the entry — it may be pending an async API sync.
        return r.trip_uuids.length > 0 && r.trip_uuids.every(uuid => {
          const o = tripIndex.get(uuid)
          if (!o) return false  // not in tripIndex — can't confirm, keep entry
          const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
          return a != null && a !== r.driver_uuid  // confirmed reassigned away
        })
      })
      if (stale.length === 0) return prev
      stale.forEach(r => deleteRota(r.driver_uuid, r.date))
      return prev.filter(
        r => !stale.some(s => s.driver_uuid === r.driver_uuid && s.date === r.date)
      )
    })
  }, [tripIndex])
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

  // ── Compliance Engine State ──────────────────────────────────────────────
  /** Per-driver compliance reports: driverUuid → RotaComplianceReport */
  const [complianceReports, setComplianceReports] = React.useState<Map<string, RotaComplianceReport>>(new Map())
  /** Whether a compliance check is currently running */
  const [complianceLoading, setComplianceLoading] = React.useState(false)
  /** Rejection dialog when a hard violation blocks an allocation */
  const [complianceReject, setComplianceReject] = React.useState<{
    driver: Driver
    date: string
    violations: ComplianceViolation[]
  } | null>(null)
  /** Whether the compliance panel drawer is open */
  const [compliancePanelOpen, setCompliancePanelOpen] = React.useState(false)
  /** Active tab in compliance panel: 'issues' or 'rules' */
  const [compliancePanelTab, setCompliancePanelTab] = React.useState<"issues" | "rules">("issues")

  // Popover state
  const [popover, setPopover] = React.useState<{
    driver: Driver; date: string; rect: DOMRect
  } | null>(null)

  const dates = React.useMemo(() => weekDates(sunday), [sunday])
  const wk = React.useMemo(() => weekKey(sunday), [sunday])
  const week = getISOWeek(sunday)

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
    // Note: assignedTripUuids is now derived from the live tripIndex (below),
    // NOT from localStorage, so external API unassignments are always reflected.

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

  // ── Compliance Engine — Run checks using tripIndex (no extra API calls) ─────
  const runComplianceChecks = React.useCallback(() => {
    if (drivers.length === 0 || tripIndex.size === 0) return
    const results = new Map<string, RotaComplianceReport>()
    for (const driver of drivers) {
      results.set(driver.uuid, runComplianceCheck(driver.uuid, tripIndex))
    }
    setComplianceReports(results)
  }, [drivers, tripIndex])


  // Re-run compliance whenever tripIndex changes (new assignments reflected immediately)
  React.useEffect(() => {
    if (!loaderDone || drivers.length === 0) return
    runComplianceChecks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaderDone, drivers.length, wk, tripIndex])

  /**
   * Get all violations/warnings for a specific driver + date cell.
   * Returns { violations: [...], warnings: [...] }
   */
  function getCellCompliance(driverUuid: string, date: string): {
    violations: ComplianceViolation[]
    warnings: ComplianceViolation[]
  } {
    const report = complianceReports.get(driverUuid)
    if (!report) return { violations: [], warnings: [] }
    return {
      violations: report.violations.filter(v => v.date === date),
      warnings:   report.warnings.filter(w => w.date === date),
    }
  }

  /**
   * Get the overall compliance status for a driver across the visible week.
   * Returns 'compliant' | 'warning' | 'violation'
   */
  function getDriverComplianceStatus(driverUuid: string): "compliant" | "warning" | "violation" {
    const report = complianceReports.get(driverUuid)
    if (!report) return "compliant"
    // Filter to only include issues for the visible week dates
    const weekSet = new Set(dates)
    const weekViolations = report.violations.filter(v => weekSet.has(v.date))
    const weekWarnings   = report.warnings.filter(w => weekSet.has(w.date))
    if (weekViolations.length > 0) return "violation"
    if (weekWarnings.length > 0) return "warning"
    return "compliant"
  }

  /** Count total violations and warnings across all drivers for the visible week */
  const complianceSummary = React.useMemo(() => {
    const weekSet = new Set(dates)
    let totalViolations = 0
    let totalWarnings = 0
    let driversWithIssues = 0
    complianceReports.forEach((report) => {
      const v = report.violations.filter(v => weekSet.has(v.date)).length
      const w = report.warnings.filter(w => weekSet.has(w.date)).length
      totalViolations += v
      totalWarnings += w
      if (v > 0 || w > 0) driversWithIssues++
    })
    return { totalViolations, totalWarnings, driversWithIssues }
  }, [complianceReports, dates])

  const navWeek = (delta: number) => {
    setSunday(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta * 7)
      return d
    })
    setPopover(null)
  }

  const getEntry = (driverUuid: string, date: string): RotaEntry | undefined =>
    rotas.find((r) => r.driver_uuid === driverUuid && r.date === date)

  const handleSave = async (entry: RotaEntry, selectedOrders: Order[]) => {
    // ── Compliance pre-check for newly assigned trips ────────────────────────
    // Run the same prospective check as drag-and-drop for every new order being
    // assigned via the popover. Skip orders already assigned to this driver
    // (re-checking them is harmless but produces no new violations).
    if (entry.status === "WD" && selectedOrders.length > 0) {
      const driver = drivers.find(d => d.uuid === entry.driver_uuid)
      const alreadyHere = getEntry(entry.driver_uuid, entry.date)?.trip_uuids ?? []
      const newOrders = selectedOrders.filter(o => !alreadyHere.includes(o.uuid))
      for (const order of newOrders) {
        const prospective = prospectiveComplianceCheck(
          entry.driver_uuid, entry.date, order, tripIndex,
        )
        if (prospective.violations.length > 0) {
          if (driver) setComplianceReject({ driver, date: entry.date, violations: prospective.violations })
          setPopover(null)
          return
        }
      }
    }

    // If changing away from WD, un-assign driver from any API-assigned trips (live source of truth)
    const prev = getEntry(entry.driver_uuid, entry.date)
    if (prev?.status === "WD" && entry.status !== "WD") {
      const prevApiTrips = [...tripIndex.values()].filter(o => {
        const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
        return a === entry.driver_uuid && o.scheduled_at && isoLocalDate(o.scheduled_at) === entry.date
      })
      await Promise.all(
        prevApiTrips.map((o) =>
          updateOrder(o.uuid, { driver_assigned_uuid: null } as Parameters<typeof updateOrder>[1]).catch(() => {})
        )
      )
    }
    // Enrich the rota entry with embedded trip timing data so the compliance
    // check can resolve trips without depending on the async tripIndex state.
    if (entry.status === "WD" && selectedOrders.length > 0) {
      entry = {
        ...entry,
        trip_data: selectedOrders.map(o => ({
          uuid: o.uuid,
          scheduled_at: o.scheduled_at ?? undefined,
          estimated_end_date: o.estimated_end_date ?? undefined,
          time: o.time ?? undefined,
        })),
      }
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
    // Bump dock refresh — re-fetch from API updates tripIndex → assignedTripUuids (single source of truth)
    setDockRefreshKey(k => k + 1)
    setPopover(null)
  }

  const handleClear = async (driverUuid: string, date: string) => {
    // Un-assign the driver from any API-assigned trips (live source of truth, not stale localStorage)
    const assignedTrips = [...tripIndex.values()].filter(o => {
      const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
      return a === driverUuid && o.scheduled_at && isoLocalDate(o.scheduled_at) === date
    })
    if (assignedTrips.length > 0) {
      await Promise.all(
        assignedTrips.map((o) =>
          updateOrder(o.uuid, { driver_assigned_uuid: null } as Parameters<typeof updateOrder>[1]).catch(() => {})
        )
      )
    }
    deleteRota(driverUuid, date)
    const updated = getWeekRota(dates)
    setRotas(updated)
    setPopover(null)
    // Bump dock so un-assigned trips reappear; tripIndex update will rebuild assignedTripUuids
    setDockRefreshKey(k => k + 1)
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
    const wrongDate = trip?.scheduled_at ? isoLocalDate(trip.scheduled_at) !== date : false
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

    // ── Compliance Pre-Check — Run PROSPECTIVE check before allocation ──
    // This checks the proposed trip against the driver's existing schedule,
    // including adjacent days, to catch rest period violations.
    const tripOrder = tripIndex.get(tripUuid) ?? draggingTripRef.current
    if (tripOrder) {
      const prospective = prospectiveComplianceCheck(
        driver.uuid,
        date,
        tripOrder,
        tripIndex,
      )
      if (prospective.violations.length > 0) {
        setComplianceReject({ driver, date, violations: prospective.violations })
        return
      }
    }

    // --- No existing trips: proceed directly ---
    const newEntry: RotaEntry = {
      driver_uuid: driver.uuid,
      date,
      status: "WD",
      trip_uuids: [tripUuid],
      note: existing?.note,
      // Embed timing data so compliance check doesn't depend on async tripIndex
      trip_data: tripOrder ? [{
        uuid: tripUuid,
        scheduled_at: tripOrder.scheduled_at ?? undefined,
        estimated_end_date: tripOrder.estimated_end_date ?? undefined,
        time: tripOrder.time ?? undefined,
      }] : undefined,
    }
    upsertRota(newEntry)

    const cellKey = `${driver.uuid}|${date}`
    setSavingCells(prev => new Set(prev).add(cellKey))
    await updateOrder(tripUuid, { driver_assigned_uuid: driver.uuid }).catch(() => {})
    const updated = getWeekRota(dates)
    setRotas(updated)
    setSavingCells(prev => { const s = new Set(prev); s.delete(cellKey); return s })
    // Bump dock refresh — re-fetch from API updates tripIndex → assignedTripUuids
    setDockRefreshKey(k => k + 1)
  }

  /** Called when user confirms the reassignment dialog */
  const confirmReassign = async () => {
    if (!reassignDialog) return
    const { driver, date, existingUuids, newTripUuid, newTripOrder } = reassignDialog
    setReassignDialog(null)

    // ── Prospective compliance check before reassignment ──
    const tripOrder = newTripOrder ?? tripIndex.get(newTripUuid)
    if (tripOrder) {
      const prospective = prospectiveComplianceCheck(
        driver.uuid, date, tripOrder, tripIndex,
      )
      if (prospective.violations.length > 0) {
        setComplianceReject({ driver, date, violations: prospective.violations })
        return
      }
    }

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
      // Embed timing data so prospective check doesn't depend on async tripIndex
      trip_data: tripOrder ? [{
        uuid: newTripUuid,
        scheduled_at: tripOrder.scheduled_at ?? undefined,
        estimated_end_date: tripOrder.estimated_end_date ?? undefined,
        time: tripOrder.time ?? undefined,
      }] : undefined,
    })

    // Assign new trip
    await updateOrder(newTripUuid, { driver_assigned_uuid: driver.uuid }).catch(() => {})

    const updated = getWeekRota(dates)
    setRotas(updated)
    setSavingCells(prev => { const s = new Set(prev); s.delete(cellKey); return s })
    // Bump dock so old trips reappear; tripIndex update will rebuild assignedTripUuids
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

  // Which date is the in-flight trip scheduled for? (local clock, not UTC)
  const draggingDate = draggingTrip?.scheduled_at ? isoLocalDate(draggingTrip.scheduled_at) : undefined

  // Column expand/collapse during drag — based on draggingDate (set once, stable)
  // so the layout doesn't reflow on every dragOver and break DnD hit-testing.
  // Non-target columns collapse to 0; target takes all remaining width.
  const COL_TRANSITION = "width 0.25s ease, min-width 0.25s ease, max-width 0.25s ease, opacity 0.15s ease"
  function colW(d: string) {
    if (!draggingDate) return 52
    return d === draggingDate ? 9999 : 0
  }

  // Preference match: compute once per render so all rows can reference it
  const draggingTime = draggingTrip?.scheduled_at ? isoLocalTime(draggingTrip.scheduled_at) : null
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
            onClick={() => { setSunday(weekStart(new Date())); setPopover(null) }}
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

        {/* Compliance indicator — right-aligned */}
        <div className="ml-auto flex items-center gap-2">
          {complianceLoading ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking compliance…
            </span>
          ) : complianceSummary.totalViolations > 0 ? (
            <button
              onClick={() => setCompliancePanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-300/60 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {complianceSummary.totalViolations} violation{complianceSummary.totalViolations !== 1 ? "s" : ""}
              {complianceSummary.totalWarnings > 0 && (
                <span className="text-amber-600 dark:text-amber-400"> · {complianceSummary.totalWarnings} warning{complianceSummary.totalWarnings !== 1 ? "s" : ""}</span>
              )}
            </button>
          ) : complianceSummary.totalWarnings > 0 ? (
            <button
              onClick={() => setCompliancePanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {complianceSummary.totalWarnings} warning{complianceSummary.totalWarnings !== 1 ? "s" : ""}
            </button>
          ) : complianceReports.size > 0 ? (
            <button
              onClick={() => setCompliancePanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              All compliant
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Main two-column area ──────────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 min-h-0">

        {/* ── Left: driver grid ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-auto rounded-xl border bg-card">
          {(loading || !loaderDone) ? (
            <RotaLoader apiReady={!loading} onFinished={handleLoaderFinished} />
          ) : (
            <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                <tr className="border-b">
                  <th
                    className="py-2 text-left text-[11px] font-bold text-muted-foreground px-2 overflow-hidden"
                    style={{ width: 120, minWidth: 120, maxWidth: 120 }}
                  >Driver</th>
                  {dates.map((d, i) => (
                    <th
                      key={d}
                      className="py-1 text-center overflow-hidden"
                      style={{ width: colW(d), minWidth: colW(d), maxWidth: colW(d), transition: COL_TRANSITION }}
                    >
                      <div className={`text-[11px] font-bold text-muted-foreground transition-opacity duration-150 ${draggingDate && d !== draggingDate ? "opacity-0" : ""}`}>{DAYS[new Date(d + "T12:00:00").getDay()]}</div>
                      <div className={`text-[10px] font-normal text-muted-foreground/60 transition-opacity duration-150 ${draggingDate && d !== draggingDate ? "opacity-0" : ""}`}>{fmtDate(d)}</div>
                    </th>
                  ))}
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
                              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                                {(driver.name ?? "?")[0].toUpperCase()}
                                {/* Compliance dot on avatar */}
                                {(() => {
                                  const dcs = getDriverComplianceStatus(driver.uuid)
                                  if (dcs === "violation") return (
                                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-card" title="Compliance violation" />
                                  )
                                  if (dcs === "warning") return (
                                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-card" title="Compliance warning" />
                                  )
                                  return null
                                })()}
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
                            // After the cleanup effect runs, stale WD entries are removed from
                            // rotas state, so entry will be undefined. This guard handles the
                            // brief window before tripIndex is populated (avoids flicker).
                            const leave         = leaveForDriverDate(driver, date)
                            const leaveStatus: "HOL_REQ" | "UNAVAILABLE" | undefined =
                              !entry && leave
                                ? (leave.leave_type === "Vacation" || leave.non_availability_type === "Holiday"
                                    ? "HOL_REQ" as const
                                    : "UNAVAILABLE" as const)
                                : undefined
                            const effectiveStatus: typeof leaveStatus | "WD" | "RD" | "OFF" | "HOL_REQ" | "UNAVAILABLE" | undefined = (() => {
                              if (entry?.status) return entry.status
                              // Trips assigned from the Trips module update only the API — no localStorage
                              // rota entry is written. Detect those here and promote the cell to "WD".
                              // Date-range check: multi-day trips cover multiple cells.
                              const hasApiTrip = [...tripIndex.values()].some(o => {
                                const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
                                if (a !== driver.uuid || !o.scheduled_at) return false
                                const startD = isoLocalDate(o.scheduled_at)
                                const endD = (o.estimated_end_date && !isNaN(new Date(o.estimated_end_date).getTime()))
                                  ? isoLocalDate(o.estimated_end_date)
                                  : startD
                                return date >= startD && date <= endD
                              })
                              if (hasApiTrip) return "WD" as const
                              return leaveStatus
                            })()
                            const cfg       = STATUS_CONFIG[effectiveStatus ?? "NOT_ON_ROTA"]
                            const isActive  = popover?.driver.uuid === driver.uuid && popover.date === date
                            const isDrop    = dropTarget?.driverUuid === driver.uuid && dropTarget?.date === date
                            const isBlocked = effectiveStatus === "HOL_REQ" || effectiveStatus === "UNAVAILABLE"
                            const isValidDrop = draggingDate === date && !isBlocked
                            const isSaving = savingCells.has(`${driver.uuid}|${date}`)

                            // ── Compliance status for this cell ──
                            const cellComp = getCellCompliance(driver.uuid, date)
                            const hasViolation = cellComp.violations.length > 0
                            const hasWarning = cellComp.warnings.length > 0
                            const compTooltip = [...cellComp.violations, ...cellComp.warnings]
                              .map(v => `${v.severity === "violation" ? "🚫" : "⚠️"} ${v.message}`)
                              .join("\n")

                            return (
                              <td
                                key={date}
                                className="relative overflow-hidden px-0.5 py-0.5"
                                style={{ width: colW(date), minWidth: colW(date), maxWidth: colW(date), transition: COL_TRANSITION }}
                              >
                                <button
                                  onClick={(e) => handleCellClick(e, driver, date)}
                                  onDragOver={(e) => handleDragOver(e, driver.uuid, date, effectiveStatus)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, driver, date)}
                                  title={compTooltip || undefined}
                                  className={`group relative w-full flex flex-col items-center justify-center gap-0.5 rounded-md min-h-[32px] p-1 transition-all
                                    ${isActive ? "ring-2 ring-primary" : ""}
                                    ${isDrop && isValidDrop ? "ring-2 ring-primary bg-primary/10" : ""}
                                    ${hasViolation ? "ring-1 ring-red-400/60 bg-red-50/40 dark:bg-red-900/10" : ""}
                                    ${!hasViolation && hasWarning ? "ring-1 ring-amber-400/50 bg-amber-50/30 dark:bg-amber-900/10" : ""}
                                    ${!effectiveStatus && !isSaving && !hasViolation && !hasWarning ? "border border-dashed border-border hover:border-muted-foreground/40 hover:bg-muted/20" : ""}
                                  `}
                                >
                                  {isSaving ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-[100px] border border-emerald-300/40 bg-emerald-50/60 dark:bg-emerald-900/20 px-2 text-[10px] font-semibold leading-[1.9] animate-pulse">
                                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                                      <span className="w-10 h-2 rounded bg-emerald-200/80 dark:bg-emerald-700/50" />
                                    </span>
                                  ) : effectiveStatus ? (
                                    effectiveStatus === "WD" ? (() => {
                                      // Derive assigned trips from the live API (tripIndex) — single source of truth.
                                      // Date-range match: covers same-day, overnight, and multi-day trips.
                                      const cellTrips = [...tripIndex.values()]
                                        .filter(o => {
                                          const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
                                          if (a !== driver.uuid || !o.scheduled_at) return false
                                          const startD = isoLocalDate(o.scheduled_at)
                                          const endD = (o.estimated_end_date && !isNaN(new Date(o.estimated_end_date).getTime()))
                                            ? isoLocalDate(o.estimated_end_date)
                                            : startD
                                          return date >= startD && date <= endD
                                        })
                                        .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))

                                      if (cellTrips.length > 0) {
                                        return cellTrips.map((t) => {
                                          const time = t.scheduled_at ? isoLocalTime(t.scheduled_at) : ""
                                          const pid  = t.public_id ?? t.uuid.slice(0, 6)
                                          return (
                                            <span
                                              key={t.uuid}
                                              className={`group/pill relative inline-flex w-full items-center gap-1 rounded-[100px] border px-1.5 text-[9px] font-semibold leading-[1.9] ${cfg.bg} ${cfg.border} ${cfg.text}`}
                                            >
                                              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                                              <span className="truncate flex-1">{time || pid}</span>
                                              {/* Quick-unassign button — visible on hover only */}
                                              <button
                                                type="button"
                                                title="Unassign trip"
                                                onClick={async (e) => {
                                                  e.stopPropagation()
                                                  const cellKey = `${driver.uuid}|${date}`
                                                  setSavingCells(prev => new Set(prev).add(cellKey))
                                                  await updateOrder(t.uuid, { driver_assigned_uuid: null }).catch(() => {})
                                                  // Remove this uuid from the rota entry; if empty, delete entry
                                                  setRotas(prev => {
                                                    const idx = prev.findIndex(r => r.driver_uuid === driver.uuid && r.date === date)
                                                    if (idx === -1) return prev
                                                    const entry = prev[idx]
                                                    const remaining = (entry.trip_uuids ?? []).filter(u => u !== t.uuid)
                                                    if (remaining.length === 0) {
                                                      deleteRota(driver.uuid, date)
                                                      return prev.filter((_, i) => i !== idx)
                                                    }
                                                    const updated = { ...entry, trip_uuids: remaining }
                                                    upsertRota(updated)
                                                    return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)]
                                                  })
                                                  setSavingCells(prev => { const s = new Set(prev); s.delete(cellKey); return s })
                                                  setDockRefreshKey(k => k + 1)
                                                  runComplianceChecks()
                                                }}
                                                className="ml-auto opacity-0 group-hover/pill:opacity-100 transition-opacity rounded-full hover:bg-black/10 p-px -mr-0.5 flex-shrink-0"
                                              >
                                                <X className="h-2 w-2" />
                                              </button>
                                            </span>
                                          )
                                        })
                                      }
                                      // WD status but no API-assigned trips — show WD pill
                                      return (
                                        <span className={`inline-flex items-center gap-1 rounded-[100px] border px-2 text-[10px] font-semibold leading-[1.9] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                          <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                                          {cfg.short}
                                        </span>
                                      )
                                    })() : (
                                      // Leave / RD / OFF / UNAVAILABLE — single status pill
                                      <span className={`inline-flex items-center gap-1 rounded-[100px] border px-2 text-[10px] font-semibold leading-[1.9] ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                                        {leave && !entry
                                          ? (leave.leave_type || leave.non_availability_type || cfg.short)
                                          : cfg.short}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[14px] leading-none text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors">+</span>
                                  )}
                                  {/* Compliance violation/warning badge */}
                                  {hasViolation && (
                                    <span className="absolute bottom-0 left-0.5 flex items-center gap-0.5 rounded-t bg-red-500 px-1 py-px">
                                      <ShieldAlert className="h-2 w-2 text-white" />
                                      <span className="text-[7px] font-bold text-white leading-none">{cellComp.violations.length}</span>
                                    </span>
                                  )}
                                  {!hasViolation && hasWarning && (
                                    <span className="absolute bottom-0 left-0.5 flex items-center gap-0.5 rounded-t bg-amber-500 px-1 py-px">
                                      <AlertTriangle className="h-2 w-2 text-white" />
                                      <span className="text-[7px] font-bold text-white leading-none">{cellComp.warnings.length}</span>
                                    </span>
                                  )}
                                  {/* Conflict dot */}
                                  {leave && entry && (
                                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-rose-400" title={`Leave: ${leave.leave_type}`} />
                                  )}
                                  {/* Dark overlay on invalid drop targets */}
                                  {draggingTrip && !isValidDrop && (
                                    <span className="absolute inset-0 rounded-lg bg-background/60 pointer-events-none" />
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

      {/* Compliance rejection dialog — shown when a hard violation blocks allocation */}
      {complianceReject && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            style={{ zIndex: 10002 }}
            onClick={() => setComplianceReject(null)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] rounded-2xl border border-red-300/40 bg-card shadow-2xl"
            style={{ zIndex: 10003 }}
          >
            <div className="p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </span>
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">Allocation Blocked</p>
                  <p className="text-[11px] text-muted-foreground">Compliance violation prevents this assignment</p>
                </div>
              </div>
              {/* Driver + date */}
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs font-semibold">{complianceReject.driver.name}</p>
                <p className="text-[11px] text-muted-foreground">{complianceReject.date}</p>
              </div>
              {/* Violations list */}
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {complianceReject.violations.map((v, i) => (
                  <div key={i} className="rounded-lg border border-red-200/60 bg-red-50/50 dark:bg-red-900/10 p-2.5">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">{v.message}</p>
                        <p className="text-[10px] text-red-600/70 dark:text-red-400/60 mt-0.5">{v.calculation}</p>
                        <p className="text-[9px] text-muted-foreground mt-1 font-mono">{v.ruleId}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Action */}
              <button
                onClick={() => setComplianceReject(null)}
                className="w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >Understood</button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Compliance panel drawer — slide-over from right */}
      {compliancePanelOpen && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 bg-background/40 backdrop-blur-[2px]"
            style={{ zIndex: 10004 }}
            onClick={() => setCompliancePanelOpen(false)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 w-[420px] max-w-[90vw] border-l bg-card shadow-2xl flex flex-col"
            style={{ zIndex: 10005, animation: "slideInRight 0.25s ease" }}
          >
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-5 py-4 shrink-0">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                complianceSummary.totalViolations > 0
                  ? "bg-red-100 dark:bg-red-900/30"
                  : complianceSummary.totalWarnings > 0
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              }`}>
                {complianceSummary.totalViolations > 0
                  ? <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                  : complianceSummary.totalWarnings > 0
                  ? <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  : <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">Compliance Report</p>
                <p className="text-[11px] text-muted-foreground">
                  Week {week} · {complianceSummary.driversWithIssues} driver{complianceSummary.driversWithIssues !== 1 ? "s" : ""} with issues
                </p>
              </div>
              <button
                onClick={() => setCompliancePanelOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Summary stats */}
            <div className="flex gap-3 px-5 py-3 border-b bg-muted/20 shrink-0">
              <div className="flex-1 rounded-xl border bg-card p-3 text-center">
                <p className="text-lg font-bold text-red-600">{complianceSummary.totalViolations}</p>
                <p className="text-[10px] font-medium text-muted-foreground">Violations</p>
              </div>
              <div className="flex-1 rounded-xl border bg-card p-3 text-center">
                <p className="text-lg font-bold text-amber-600">{complianceSummary.totalWarnings}</p>
                <p className="text-[10px] font-medium text-muted-foreground">Warnings</p>
              </div>
              <div className="flex-1 rounded-xl border bg-card p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">
                  {drivers.length - complianceSummary.driversWithIssues}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground">Compliant</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b shrink-0">
              <button
                onClick={() => setCompliancePanelTab("issues")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  compliancePanelTab === "issues"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Issues
                {(complianceSummary.totalViolations + complianceSummary.totalWarnings) > 0 && (
                  <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">
                    {complianceSummary.totalViolations + complianceSummary.totalWarnings}
                  </span>
                )}
              </button>
              <button
                onClick={() => setCompliancePanelTab("rules")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  compliancePanelTab === "rules"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Rules Reference
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {compliancePanelTab === "issues" ? (
                <>
                  {drivers
                    .filter(d => {
                      const report = complianceReports.get(d.uuid)
                      if (!report) return false
                      const weekSet = new Set(dates)
                      return report.violations.some(v => weekSet.has(v.date)) ||
                             report.warnings.some(w => weekSet.has(w.date))
                    })
                    .map(driver => {
                      const report = complianceReports.get(driver.uuid)!
                      const weekSet = new Set(dates)
                      const driverViolations = report.violations.filter(v => weekSet.has(v.date))
                      const driverWarnings = report.warnings.filter(w => weekSet.has(w.date))

                      return (
                        <div key={driver.uuid} className="mb-4">
                          {/* Driver header */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold">
                              {(driver.name ?? "?")[0].toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold">{driver.name}</span>
                            <span className="ml-auto flex items-center gap-1.5">
                              {driverViolations.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">
                                  {driverViolations.length} violation{driverViolations.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {driverWarnings.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                  {driverWarnings.length} warning{driverWarnings.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </span>
                          </div>
                          {/* Issues */}
                          <div className="flex flex-col gap-1.5 pl-7">
                            {driverViolations.map((v, i) => (
                              <div key={`v-${i}`} className="rounded-lg border border-red-200/60 bg-red-50/40 dark:bg-red-900/10 p-2">
                                <div className="flex items-start gap-1.5">
                                  <ShieldAlert className="h-3 w-3 shrink-0 text-red-500 mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-red-700 dark:text-red-300">{v.message}</p>
                                    <p className="text-[9px] text-red-600/60 mt-0.5">{v.calculation}</p>
                                    {v.tripStartTime && v.tripEndTime && (
                                      <p className="text-[9px] text-red-500/50 mt-0.5">
                                        Trip &middot; {new Date(v.tripStartTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                                        {" → "}
                                        {new Date(v.tripEndTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[8px] font-mono text-muted-foreground/60">{v.ruleId}</span>
                                      <span className="text-[8px] text-muted-foreground/60">·</span>
                                      <span className="text-[8px] text-muted-foreground/60">{v.date}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {driverWarnings.map((w, i) => (
                              <div key={`w-${i}`} className="rounded-lg border border-amber-200/60 bg-amber-50/30 dark:bg-amber-900/10 p-2">
                                <div className="flex items-start gap-1.5">
                                  <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500 mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">{w.message}</p>
                                    <p className="text-[9px] text-amber-600/60 mt-0.5">{w.calculation}</p>
                                    {w.tripStartTime && w.tripEndTime && (
                                      <p className="text-[9px] text-amber-500/50 mt-0.5">
                                        Trip &middot; {new Date(w.tripStartTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                                        {" → "}
                                        {new Date(w.tripEndTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[8px] font-mono text-muted-foreground/60">{w.ruleId}</span>
                                      <span className="text-[8px] text-muted-foreground/60">·</span>
                                      <span className="text-[8px] text-muted-foreground/60">{w.date}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                  {/* Empty state */}
                  {complianceSummary.totalViolations === 0 && complianceSummary.totalWarnings === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-semibold">All Clear</p>
                      <p className="text-xs text-center max-w-[240px]">
                        No compliance violations or warnings detected for this week. All drivers are within their permitted hours.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* ── Rules Reference Tab ───────────────────────────────── */
                <div className="flex flex-col gap-4">
                  <p className="text-[11px] text-muted-foreground">
                    UK HGV Driver&apos;s Hours rules based on Assimilated (ex-EU) regulations.
                    Applies to goods vehicles over 3.5 tonnes.
                  </p>
                  {/* Group rules by category */}
                  {["Daily Limits", "Rest Periods", "Weekly Limits", "Record Keeping"].map(category => {
                    const categoryRules = COMPLIANCE_RULES.filter(r => r.category === category)
                    return (
                      <div key={category}>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{category}</h4>
                        <div className="flex flex-col gap-2">
                          {categoryRules.map(rule => (
                            <div key={rule.id} className="rounded-xl border bg-muted/20 p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                                  rule.severity === "hard"
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                }`}>
                                  {rule.severity === "hard" ? "HARD" : "SOFT"}
                                </span>
                                <span className="text-xs font-semibold flex-1">{rule.title}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{rule.description}</p>
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
                                <span className="text-[9px] font-mono text-muted-foreground/60">{rule.id}</span>
                                <span className="ml-auto text-[10px] font-bold text-foreground/80">{rule.limit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <p className="text-[9px] text-muted-foreground/60 mt-2">
                    Source: UK DVSA — Drivers&apos; hours rules for goods vehicles (retained EU regulation 561/2006)
                  </p>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}


