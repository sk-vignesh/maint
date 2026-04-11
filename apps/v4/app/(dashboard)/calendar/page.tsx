"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight,
  Clock, CalendarIcon, Users, IdCard, Car, MapPin,
  RefreshCw,
} from "lucide-react"
import { listOrders, type Order, type OrderStatus } from "@/lib/orders-api"
import { listDriverLeave, listVehicleUnavailability, type LeaveRequest } from "@/lib/leave-requests-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
const HOURS  = Array.from({ length: 24 }, (_, i) => i) // 00:00–23:00

function fmtDate(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  const base = d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  if (iso.length <= 10) return base
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return `${base}, ${time}`
}

function fmtTime(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function fmtHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function isInRange(date: Date, start: string, end: string) {
  // Compare date-only strings to avoid UTC/local timezone shift issues
  const d = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`
  const s = start.slice(0, 10)
  const e = end.slice(0, 10)
  return d >= s && d <= e
}

function getWeekDays(anchor: Date): Date[] {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  const d = anchor.getDate() - anchor.getDay() // back to Sunday
  return Array.from({ length: 7 }, (_, i) => new Date(y, m, d + i))
}

function getCalendarDays(year: number, month: number) {
  const firstDay      = new Date(year, month, 1).getDay()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const cells: { date: Date; current: boolean }[] = []

  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), current: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), current: true })
  let trailing = 1
  while (cells.length < 42)
    cells.push({ date: new Date(year, month + 1, trailing++), current: false })

  return cells
}

// ─── Time-grid positioning helpers ───────────────────────────────────────────

/** Extract local hours+minutes from ISO string as fractional hours */
function isoHours(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

/** Convert ISO timestamp to local YYYY-MM-DD string */
function isoLocalDateStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Returns { top, height } in pixels given an hour grid starting at HOURS[0] */
function eventSlot(startIso: string, endIso: string | null | undefined, pxPerHour: number, firstHour: number) {
  const sH  = isoHours(startIso)
  const top = (sH - firstHour) * pxPerHour
  let height = pxPerHour  // default 1 hour
  if (endIso) {
    const eH  = isoHours(endIso)
    // If end is on a different local day, fill to end of first day
    if (isoLocalDateStr(startIso) === isoLocalDateStr(endIso)) {
      height = Math.max(24, (eH - sH) * pxPerHour)
    } else {
      height = Math.max(24, (24 - sH) * pxPerHour)
    }
  }
  return { top: Math.max(0, top), height }
}

/**
 * Returns true if an order spans the given calendar day.
 * Uses local-clock dates so UTC midnight-crossings map to the correct day.
 */
function orderSpansDay(o: Order, day: Date): boolean {
  if (!o.scheduled_at) return false
  const start    = new Date(o.scheduled_at)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const target   = new Date(day.getFullYear(),   day.getMonth(),   day.getDate())
  if (!o.estimated_end_date) return startDay.getTime() === target.getTime()
  const end    = new Date(o.estimated_end_date)
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return target >= startDay && target <= endDay
}

/**
 * Like eventSlot() but handles the case where the order began on a previous
 * day (top=0) or extends beyond this day (height fills to grid bottom).
 * Uses local-clock dates and times.
 */
function effectiveSlot(
  o: Order, forDay: Date, pxPerHour: number, firstHour: number, gridH: number
): { top: number; height: number; isStart: boolean; isEnd: boolean } {
  const start    = new Date(o.scheduled_at!)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const target   = new Date(forDay.getFullYear(), forDay.getMonth(), forDay.getDate())
  const isStart  = startDay.getTime() === target.getTime()

  let top = isStart
    ? ((start.getHours() - firstHour) + start.getMinutes() / 60) * pxPerHour
    : 0
  top = Math.max(0, top)

  let height: number
  let isEnd = true
  if (!o.estimated_end_date) {
    height = pxPerHour  // 1 hour default
  } else {
    const end    = new Date(o.estimated_end_date)
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    isEnd = endDay.getTime() === target.getTime()
    if (isEnd) {
      const endTop = ((end.getHours() - firstHour) + end.getMinutes() / 60) * pxPerHour
      height = Math.max(24, endTop - top)
    } else {
      height = gridH - top
    }
  }
  return { top, height: Math.max(24, height), isStart, isEnd }
}

/**
 * Assigns a column index to each event so overlapping events sit side-by-side.
 * Returns items in same order as input with { col, totalCols } added.
 */
function columnizeEvents<T>(events: T[], getStart: (e: T) => number, getEnd: (e: T) => number) {
  const sorted  = [...events].sort((a, b) => getStart(a) - getStart(b))
  const cols    = new Array<number>(sorted.length).fill(0)
  const colEnds: number[] = []

  for (let i = 0; i < sorted.length; i++) {
    const start = getStart(sorted[i])
    let placed  = false
    for (let c = 0; c < colEnds.length; c++) {
      if (colEnds[c] <= start) {
        cols[i] = c
        colEnds[c] = getEnd(sorted[i])
        placed = true
        break
      }
    }
    if (!placed) { cols[i] = colEnds.length; colEnds.push(getEnd(sorted[i])) }
  }

  return sorted.map((item, i) => {
    // Find max col in all events that overlap with this one
    const s = getStart(item), e = getEnd(item)
    const maxCol = sorted.reduce((m, other, j) =>
      getStart(other) < e && getEnd(other) > s ? Math.max(m, cols[j]) : m, 0)
    return { item, col: cols[i], totalCols: maxCol + 1 }
  })
}

// ─── 6-category colour system ──────────────────────────────────────────────────

const CHIP = {
  driverLeave:  "border-l-2 border-red-500    bg-red-100/80   text-red-800   dark:bg-red-900/40   dark:text-red-300",
  vehicleLeave: "border-l-2 border-neutral-700 bg-neutral-800  text-white     dark:bg-neutral-900 dark:text-neutral-100",
  assigned:     "border-l-2 border-green-500  bg-green-100/70 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  unassigned:   "border-l-2 border-blue-500   bg-blue-100/70  text-blue-800  dark:bg-blue-900/30  dark:text-blue-300",
  noVehicle:    "border-l-2 border-yellow-500 bg-yellow-100/70 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  noDriver:     "border-l-2 border-amber-500  bg-amber-100/70 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
} as const

const LEGEND = [
  { chip: CHIP.driverLeave,  label: "Driver unavailable" },
  { chip: CHIP.vehicleLeave, label: "Veh. off" },
  { chip: CHIP.assigned,     label: "Fully assigned" },
  { chip: CHIP.unassigned,   label: "Unassigned" },
  { chip: CHIP.noVehicle,    label: "No vehicle" },
  { chip: CHIP.noDriver,     label: "No driver" },
] as const

function leaveChip(l: LeaveRequest): string {
  return l.unavailability_type === "vehicle" ? CHIP.vehicleLeave : CHIP.driverLeave
}

function leaveLabel(l: LeaveRequest): string {
  return l.unavailability_type === "vehicle" ? "Vehicle off" : (l.non_availability_type ?? "Leave")
}

/** Resolves the best available driver name from an order. */
function driverName(o: Order): string | null {
  return o.driver_assigned?.name ?? o.driver_name ?? null
}

/** Resolves the best available vehicle plate from an order. */
function vehiclePlate(o: Order): string | null {
  return o.vehicle_assigned?.plate_number ?? null
}

function orderChip(o: Order, hd: (o: Order) => boolean, hv: (o: Order) => boolean): string {
  const d = hd(o), v = hv(o)
  if (d && v)   return CHIP.assigned
  if (!d && !v) return CHIP.unassigned
  if (d && !v)  return CHIP.noVehicle
  return CHIP.noDriver
}

/** Solid bg color class for the duration tail line, matching the chip accent */
function orderAccentBg(o: Order, hd: (o: Order) => boolean, hv: (o: Order) => boolean): string {
  const d = hd(o), v = hv(o)
  if (d && v)   return "bg-green-500"
  if (!d && !v) return "bg-blue-500"
  if (d && !v)  return "bg-yellow-500"
  return "bg-amber-500"
}

// ─── Status colour map ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<OrderStatus, { badge: string; dot: string; label: string }> = {
  created:    { badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-500", label: "Created" },
  dispatched: { badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", dot: "bg-purple-500", label: "Dispatched" },
  started:    { badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",         dot: "bg-blue-500",  label: "In Progress" },
  completed:  { badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",     dot: "bg-green-500", label: "Completed" },
  canceled:   { badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",            dot: "bg-zinc-400",  label: "Cancelled" },
}

function statusStyle(s?: string) {
  return STATUS_COLORS[(s as OrderStatus) ?? "created"] ?? STATUS_COLORS.created
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Row({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        {icon}
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <span className={`text-right truncate max-w-[140px] ${muted ? "text-muted-foreground" : ""}`}>{value}</span>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const s    = statusStyle(order.status)
  const dest = order.dropoff_name ?? order.payload?.dropoff?.name ?? "—"
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-semibold tracking-tight font-mono">{order.internal_id ?? order.public_id}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>
      <div className="space-y-1.5 p-3 text-xs">
        <Row icon={<Clock   className="h-3 w-3" />} label="Scheduled"   value={fmtDate(order.scheduled_at)} />
        <Row icon={<Clock   className="h-3 w-3" />} label="Est. End"    value={fmtDate(order.estimated_end_date)} />
        <Row icon={<CalendarIcon className="h-3 w-3" />} label="Created" value={fmtDate(order.created_at)} />
        <Row icon={<Users   className="h-3 w-3" />} label="Fleet"       value={order.fleet_name ?? "—"} />
        <Row icon={<IdCard  className="h-3 w-3" />} label="Driver"      value={driverName(order) ?? "No Driver"} muted={!driverName(order)} />
        <Row icon={<Car     className="h-3 w-3" />} label="Vehicle"     value={vehiclePlate(order) ?? "No Vehicle"} muted={!vehiclePlate(order)} />
        <Row icon={<MapPin  className="h-3 w-3" />} label="Destination" value={dest} />
      </div>
    </div>
  )
}

function LeaveCard({ leave: l }: { leave: LeaveRequest }) {
  const who = l.vehicle_name ?? l.user?.name ?? "Unknown"
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className={`flex items-center justify-between border-b px-3 py-2 ${leaveChip(l)}`}>
        <span className="text-[11px] font-semibold">{leaveLabel(l)}: {who}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">{l.status}</span>
      </div>
      <div className="space-y-1 p-3 text-xs">
        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Type</span><span>{l.leave_type}</span></div>
        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Period</span><span>{l.start_date.slice(0,10)} → {l.end_date.slice(0,10)}</span></div>
        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Days</span><span>{l.total_days}</span></div>
        {l.reason && <div className="pt-1 text-muted-foreground border-t">{l.reason}</div>}
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function LegendBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {LEGEND.map(({ chip, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm ${chip.replace(/text-\S+/g, "").replace(/border-l-2\s/g, "").trim()}`} />
          <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  anchor, today, orders, leaveEvents, selected, setSelected,
  hd, hv, showOrders, showDriverLeave, showVehicleLeave,
}: {
  anchor: Date; today: Date
  orders: Order[]; leaveEvents: LeaveRequest[]
  selected: Date | null; setSelected: (d: Date | null) => void
  hd: (o: Order) => boolean; hv: (o: Order) => boolean
  showOrders: boolean; showDriverLeave: boolean; showVehicleLeave: boolean
}) {
  const week        = getWeekDays(anchor)
  const PX_PER_HOUR = 64   // 64px/hr × 24h = 1536px — proper density, scrollable
  const FIRST_HOUR  = HOURS[0]
  const GRID_H      = HOURS.length * PX_PER_HOUR

  // Scroll to the earliest trip in this week (or 07:00 if none) — before paint
  const scrollRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!scrollRef.current) return
    const weekStrs = week.map(d =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    )
    const earliest = orders
      .filter(o => o.scheduled_at && weekStrs.includes(isoLocalDateStr(o.scheduled_at)))
      .map(o => isoHours(o.scheduled_at!))
      .sort((a, b) => a - b)[0]
    const targetHour = earliest !== undefined ? Math.max(0, earliest - 0.5) : 7
    scrollRef.current.scrollTop = targetHour * PX_PER_HOUR
  }, [anchor, orders])

  function ordersForDay(d: Date) {
    if (!showOrders) return []
    return orders.filter(o => orderSpansDay(o, d))
  }
  function leaveForDay(d: Date) {
    return leaveEvents.filter(l => {
      if (l.unavailability_type === "vehicle" && !showVehicleLeave) return false
      if (l.unavailability_type !== "vehicle" && !showDriverLeave) return false
      return isInRange(d, l.start_date, l.end_date)
    })
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* ── Day header row ─────────────────────────────────────────────── */}
      <div className="flex border-b shrink-0">
        <div className="w-14 shrink-0 border-r" />
        {week.map((d, i) => {
          const isTod = isSameDay(d, today)
          const isSel = !!selected && isSameDay(d, selected)
          return (
            <button
              key={i}
              onClick={() => setSelected(isSel ? null : d)}
              className={[
                "flex-1 flex flex-col items-center py-2 text-center text-xs font-medium transition-colors hover:bg-muted/30",
                isSel ? "bg-primary/10" : "",
              ].join(" ")}
            >
              <span className="text-muted-foreground uppercase tracking-wide text-[10px]">{DAYS[d.getDay()]}</span>
              <span className={[
                "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full font-semibold text-xs",
                isTod ? "bg-primary text-primary-foreground" : "text-foreground",
              ].join(" ")}>{d.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* ── All-day row (leaves + maintenance) ────────────────────────── */}
      <div className="flex border-b shrink-0 bg-muted/15">
        <div className="w-14 shrink-0 border-r flex items-start justify-end pr-1 pt-1">
          <span className="text-[8px] text-muted-foreground leading-none">all day</span>
        </div>
        {week.map((d, i) => {
          const leaves = leaveForDay(d)
          return (
            <div key={i} className="flex-1 border-r p-0.5 flex flex-col gap-0.5 min-h-[28px]">
              {leaves.map(l => {
                const isVehicle = l.unavailability_type === "vehicle"
                const name      = l.vehicle_name ?? l.user?.name ?? "—"
                const colorCls  = isVehicle
                  ? "border-l-2 border-neutral-500 bg-neutral-100/80 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                  : "border-l-2 border-red-400   bg-red-50/80    text-red-800   dark:bg-red-900/30  dark:text-red-300"
                return (
                  <div
                    key={l.uuid}
                    title={`${leaveLabel(l)}: ${name}\n${l.start_date.slice(0,10)} → ${l.end_date.slice(0,10)}`}
                    className={`overflow-hidden rounded px-1.5 py-1 text-[9px] font-medium cursor-default ${colorCls}`}
                  >
                    <div className="font-semibold truncate leading-tight">{leaveLabel(l)}: {name}</div>
                    <div className="opacity-70 text-[8px] truncate leading-tight mt-0.5">
                      {l.start_date.slice(0,10)} → {l.end_date.slice(0,10)}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Scrollable time grid (trips only) ──────────────────────────── */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto min-h-0">

        {/* Time gutter */}
        <div className="w-14 shrink-0 border-r relative" style={{ height: GRID_H }}>
          {HOURS.map(h => (
            <div key={h} className="absolute w-full border-t" style={{ top: (h - FIRST_HOUR) * PX_PER_HOUR }}>
              <span className="text-[9px] text-muted-foreground px-1">{fmtHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {week.map((d, ci) => {
          const dayOrds = ordersForDay(d)
          const isSel   = !!selected && isSameDay(d, selected)

          return (
            <div
              key={ci}
              className={`flex-1 border-r relative ${isSel ? "bg-primary/5" : ""}`}
              style={{ height: GRID_H }}
            >
              {/* Hour grid lines */}
              {HOURS.map(h => (
                <div key={h} className="absolute w-full border-t border-muted/30" style={{ top: (h - FIRST_HOUR) * PX_PER_HOUR }} />
              ))}

              {/* Trip cards at scheduled time */}
              {(() => {
                const dayTrips = dayOrds.filter(o =>
                  !!o.scheduled_at && isSameDay(new Date(o.scheduled_at), d)
                )
                if (dayTrips.length === 0) return null
                const withSlots = dayTrips.map(o => ({
                  ...o,
                  _start: new Date(o.scheduled_at!).getTime(),
                  _end: o.estimated_end_date
                    ? new Date(o.estimated_end_date).getTime()
                    : new Date(o.scheduled_at!).getTime() + 3_600_000,
                }))
                const layout = columnizeEvents(withSlots, e => e._start, e => e._end)

                return layout.map(({ item: o, col, totalCols }) => {
                  const start    = new Date(o.scheduled_at!)
                  const top      = ((start.getHours() - FIRST_HOUR) + start.getMinutes() / 60) * PX_PER_HOUR
                  const chip     = orderChip(o, hd, hv)
                  const slotFrac = 1 / totalCols
                  const leftFrac = col * slotFrac
                  return (
                    <div
                      key={o.uuid}
                      title={`${o.internal_id ?? o.public_id} — ${fmtTime(o.scheduled_at)}${o.estimated_end_date ? ` → ${fmtTime(o.estimated_end_date)}` : ""}`}
                      className={`absolute overflow-hidden rounded px-1.5 py-1 text-[9px] font-medium cursor-default ${chip}`}
                      style={{
                        top,
                        height: 44,
                        left:   `${(leftFrac  * 100).toFixed(1)}%`,
                        width:  `${(slotFrac  * 100).toFixed(1)}%`,
                        zIndex: col + 1,
                      }}
                    >
                      <div className="font-semibold truncate leading-tight">
                        {fmtTime(o.scheduled_at!)} {o.internal_id ?? o.public_id}
                      </div>
                      <div className="opacity-70 text-[8px] truncate leading-tight mt-0.5">
                        {driverName(o) ?? "No driver"} · {vehiclePlate(o) ?? "No vehicle"}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day view ────────────────────────────────────────────────────────────────

function DayView({
  anchor, today, orders, leaveEvents,
  hd, hv, showOrders, showDriverLeave, showVehicleLeave,
}: {
  anchor: Date; today: Date
  orders: Order[]; leaveEvents: LeaveRequest[]
  hd: (o: Order) => boolean; hv: (o: Order) => boolean
  showOrders: boolean; showDriverLeave: boolean; showVehicleLeave: boolean
}) {
  const PX_PER_HOUR = 64   // 64px/hr × 24h = 1536px — proper density, scrollable
  const FIRST_HOUR  = HOURS[0]
  const GRID_H      = HOURS.length * PX_PER_HOUR

  // Scroll to earliest trip or 07:00 — before paint
  const scrollRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!scrollRef.current) return
    const anchorStr = `${anchor.getFullYear()}-${String(anchor.getMonth()+1).padStart(2,"0")}-${String(anchor.getDate()).padStart(2,"0")}`
    const earliest = orders
      .filter(o => o.scheduled_at && isoLocalDateStr(o.scheduled_at) === anchorStr)
      .map(o => isoHours(o.scheduled_at!))
      .sort((a, b) => a - b)[0]
    const targetHour = earliest !== undefined ? Math.max(0, earliest - 0.5) : 7
    scrollRef.current.scrollTop = targetHour * PX_PER_HOUR
  }, [anchor, orders])

  const dayOrders = !showOrders ? [] : orders.filter(o => orderSpansDay(o, anchor))
  const dayLeave  = leaveEvents.filter(l => {
    if (l.unavailability_type === "vehicle" && !showVehicleLeave) return false
    if (l.unavailability_type !== "vehicle" && !showDriverLeave) return false
    return isInRange(anchor, l.start_date, l.end_date)
  })

  // Leave events get left strips; the rest of the width is for orders
  const leaveW = dayLeave.length > 0 ? Math.min(dayLeave.length * 72, 216) : 0

  // Columnize overlapping orders so they sit side-by-side
  const ordersWithSlot = dayOrders
    .filter(o => !!o.scheduled_at)
    .map(o => ({
      ...o,
      // For non-start days, treat as starting at midnight for column-conflict purposes
      _start: orderSpansDay(o, anchor) && !isSameDay(new Date(o.scheduled_at!), anchor)
        ? anchor.setHours(0, 0, 0, 0)
        : new Date(o.scheduled_at!).getTime(),
      _end: o.estimated_end_date
        ? new Date(o.estimated_end_date).getTime()
        : new Date(o.scheduled_at!).getTime() + 3_600_000,
    }))
  const layout = columnizeEvents(ordersWithSlot, e => e._start, e => e._end)

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto min-h-0">

        {/* Time gutter */}
        <div className="w-14 shrink-0 border-r relative" style={{ height: GRID_H }}>
          {HOURS.map(h => (
            <div key={h} className="absolute w-full border-t" style={{ top: (h - FIRST_HOUR) * PX_PER_HOUR }}>
              <span className="text-[9px] text-muted-foreground px-2">{fmtHour(h)}</span>
            </div>
          ))}
        </div>

        {/* Events area */}
        <div className="flex-1 relative" style={{ height: GRID_H }}>
          {/* Hour grid lines */}
          {HOURS.map(h => (
            <div key={h} className="absolute w-full border-t border-muted/30" style={{ top: (h - FIRST_HOUR) * PX_PER_HOUR }} />
          ))}

          {/* Full-day leave strips — left portion */}
          {dayLeave.map((l, li) => {
            const isVehicle = l.unavailability_type === "vehicle"
            const stripPx   = leaveW / dayLeave.length
            const name      = l.vehicle_name ?? l.user?.name ?? leaveLabel(l)
            return (
              <div
                key={l.uuid}
                className={`absolute top-0 overflow-hidden rounded-sm ${
                  isVehicle
                    ? "bg-neutral-700/15 border-l-2 border-neutral-700"
                    : "bg-red-500/15 border-l-2 border-red-500"
                }`}
                style={{ left: li * stripPx, width: stripPx - 2, height: GRID_H }}
              >
                <div className={`sticky top-1 mx-0.5 rounded px-1.5 py-1 text-[9px] font-semibold leading-tight truncate ${
                  isVehicle ? "bg-neutral-800 text-white" : "bg-red-500/80 text-white"
                }`}>
                  {leaveLabel(l)}: {name}
                  <div className="text-[8px] font-normal opacity-80 mt-0.5">{l.start_date.slice(0,10)} → {l.end_date.slice(0,10)}</div>
                </div>
              </div>
            )
          })}

          {/* Orders — columnized, multi-day aware */}
          {layout.map(({ item: o, col, totalCols }) => {
            const { top, height, isStart, isEnd } = effectiveSlot(o, anchor, PX_PER_HOUR, FIRST_HOUR, GRID_H)
            const left  = `calc(${leaveW + 4}px + ${col} * (100% - ${leaveW + 8}px) / ${totalCols})`
            const right = `calc((${totalCols - col - 1}) * (100% - ${leaveW + 8}px) / ${totalCols} + 2px)`
            return (
              <div
                key={o.uuid}
                className={`absolute rounded-lg px-2 py-1 text-xs font-medium shadow-sm overflow-hidden ${orderChip(o, hd, hv)}`}
                style={{ top, height, left, right, zIndex: col + 1 }}
              >
                <div className="font-semibold truncate text-[10px]">
                  {isStart ? fmtTime(o.scheduled_at) : "00:00"}
                  {isStart && o.estimated_end_date && isEnd ? ` – ${fmtTime(o.estimated_end_date)}` : ""}
                  {!isStart && <span className="opacity-50 ml-0.5">(cont.)</span>}
                  {" · "}{o.internal_id ?? o.public_id}
                </div>
                {height > 28 && (
                  <div className="opacity-70 text-[9px] truncate">
                    {driverName(o) ?? "No driver"} · {vehiclePlate(o) ?? "No vehicle"}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type CalView = "month" | "week" | "day"

export default function CalendarPage() {
  const today = new Date()

  // Navigation
  const [year,     setYear]     = React.useState(today.getFullYear())
  const [month,    setMonth]    = React.useState(today.getMonth())
  const [anchor,   setAnchor]   = React.useState<Date>(today)   // week/day anchor
  const [selected, setSelected] = React.useState<Date | null>(null)
  const [calView,  setCalView]  = React.useState<CalView>("week")

  // Data
  const [orders,      setOrders]      = React.useState<Order[]>([])
  const [leaveEvents, setLeaveEvents] = React.useState<LeaveRequest[]>([])
  const [loading,     setLoading]     = React.useState(true)
  const [error,       setError]       = React.useState<string | null>(null)

  // Sidebar removed — assignment filter replaces it
  const [assignmentFilter, setAssignmentFilter] = React.useState<"all" | "assigned" | "unassigned">("all")

  // Category visibility filters
  const [showOrders,       setShowOrders]       = React.useState(true)
  const [showDriverLeave,  setShowDriverLeave]  = React.useState(true)
  const [showVehicleLeave, setShowVehicleLeave] = React.useState(true)

  // Entity filters
  const [filterDriver,  setFilterDriver]  = React.useState("")
  const [filterVehicle, setFilterVehicle] = React.useState("")

  // ─── Data fetch ─────────────────────────────────────────────────────────────

  const load = React.useCallback(async (y: number, m: number) => {
    setLoading(true); setError(null)
    try {
      // m is 0-indexed (JS month). Build a window: prev month → next month
      // to capture multi-day trips/leaves that start before or end after the current month
      const from = new Date(y, m - 1, 1).toISOString().slice(0, 10)   // 1st of prev month
      const to   = new Date(y, m + 2, 1).toISOString().slice(0, 10)   // 1st of month+2 (exclusive)
      const [ordersRes, driverRes, vehicleRes] = await Promise.allSettled([
        listOrders({ scheduled_at: from, end_date: to, limit: 500 }),
        listDriverLeave({ per_page: 500, sort: "-start_date" }),
        listVehicleUnavailability({ per_page: 500, sort: "-start_date" }),
      ])
      setOrders(ordersRes.status === "fulfilled" ? (ordersRes.value.data ?? []) : [])
      const dl = driverRes.status  === "fulfilled" ? (driverRes.value.data  ?? []) : []
      const vl = vehicleRes.status === "fulfilled" ? (vehicleRes.value.data ?? []) : []
      setLeaveEvents([...dl, ...vl])
      if (ordersRes.status === "rejected") setError("Orders: " + (ordersRes.reason as Error).message)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load(year, month) }, [load, year, month])

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function prevPeriod() {
    if (calView === "month") {
      if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    } else if (calView === "week") {
      const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d)
    } else {
      const d = new Date(anchor); d.setDate(d.getDate() - 1); setAnchor(d)
    }
  }

  function nextPeriod() {
    if (calView === "month") {
      if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    } else if (calView === "week") {
      const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d)
    } else {
      const d = new Date(anchor); d.setDate(d.getDate() + 1); setAnchor(d)
    }
  }

  // When clicking a day in month view → switch to day view on that date
  function handleDayClick(date: Date) {
    const isSel = !!selected && isSameDay(date, selected)
    setSelected(isSel ? null : date)
  }

  // Title text for the calendar header
  function periodTitle() {
    if (calView === "month") return `${MONTHS[month]} ${year}`
    if (calView === "week") {
      const week = getWeekDays(anchor)
      const s = week[0], e = week[6]
      if (s.getMonth() === e.getMonth()) return `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`
      return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
    }
    return anchor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }

  // ─── Assignment helpers ──────────────────────────────────────────────────────

  const hasDriver  = (o: Order) => !!(o.driver_name || o.driver_assigned_uuid || o.driver_assigned)
  const hasVehicle = (o: Order) => !!(o.vehicle_assigned?.plate_number || o.vehicle_assigned_uuid)

  // ─── Entity filter options ────────────────────────────────────────────────────

  const driverOptions = React.useMemo(() => {
    const fromOrders = orders.map(driverName).filter(Boolean) as string[]
    const fromLeave  = leaveEvents
      .filter(l => l.unavailability_type !== "vehicle")
      .map(l => l.user?.name)
      .filter(Boolean) as string[]
    return [...new Set([...fromOrders, ...fromLeave])].sort()
  }, [orders, leaveEvents])

  const vehicleOptions = React.useMemo(() => {
    const fromOrders = orders.map(vehiclePlate).filter(Boolean) as string[]
    const fromLeave  = leaveEvents
      .filter(l => l.unavailability_type === "vehicle")
      .map(l => l.vehicle_name)
      .filter(Boolean) as string[]
    return [...new Set([...fromOrders, ...fromLeave])].sort()
  }, [orders, leaveEvents])

  // ─── Filtered data ────────────────────────────────────────────────────────────

  // Orders filtered by entity selects + assignment filter
  const filteredOrders = React.useMemo(() => orders.filter(o => {
    if (filterDriver  && driverName(o)   !== filterDriver)  return false
    if (filterVehicle && vehiclePlate(o) !== filterVehicle) return false
    if (assignmentFilter === "assigned"   && !(hasDriver(o) && hasVehicle(o))) return false
    if (assignmentFilter === "unassigned" && (hasDriver(o)  || hasVehicle(o))) return false
    return true
  }), [orders, filterDriver, filterVehicle, assignmentFilter])

  // Leave events filtered by entity selects (driver filter applies to driver leaves)
  const filteredLeave = React.useMemo(() => leaveEvents.filter(l => {
    if (filterDriver && l.unavailability_type !== "vehicle" && l.user?.name !== filterDriver) return false
    if (filterVehicle && l.unavailability_type === "vehicle" && l.vehicle_name !== filterVehicle) return false
    return true
  }), [leaveEvents, filterDriver, filterVehicle])

  const cells = getCalendarDays(year, month)

  function ordersForDay(date: Date) {
    if (!showOrders) return []
    return filteredOrders.filter(o => orderSpansDay(o, date))
  }

  function leaveForDay(date: Date) {
    return filteredLeave.filter(l => {
      if (l.unavailability_type === "vehicle" && !showVehicleLeave) return false
      if (l.unavailability_type !== "vehicle" && !showDriverLeave) return false
      return isInRange(date, l.start_date, l.end_date)
    })
  }

  const selectedDayOrders = selected ? ordersForDay(selected) : []
  const selectedDayLeave  = selected ? leaveForDay(selected)  : []



  // ─── Filter pill helper ──────────────────────────────────────────────────────
  function FilterPill({ label, active, dot, onClick }: { label: string; active: boolean; dot: string; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
          active
            ? "border-foreground/30 bg-foreground/10 text-foreground"
            : "border-border bg-background text-muted-foreground line-through opacity-60",
        ].join(" ")}
      >
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </button>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Calendar area (full width — sidebar removed) ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Calendar ── */}
        <div className="flex flex-1 flex-col gap-3 min-w-0 overflow-hidden">

          {/* Calendar card */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm flex flex-col flex-1 min-h-0">

            {/* Calendar header */}
            <div className="flex flex-col gap-1.5 border-b px-4 py-2.5 shrink-0">

              {/* Row 1: nav + period title + view switcher + refresh */}
              <div className="flex items-center gap-2">
                <button onClick={prevPeriod} className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="flex-1 text-center text-sm font-semibold">{periodTitle()}</span>
                <button onClick={nextPeriod} className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <div className="w-px h-5 bg-border mx-0.5" />

                {/* View switcher */}
                <div className="flex rounded-md border overflow-hidden text-xs font-medium">
                  {(["month","week","day"] as CalView[]).map(v => (
                    <button key={v} onClick={() => setCalView(v)}
                      className={["px-2.5 py-1 transition-colors capitalize",
                        calView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                      ].join(" ")}>
                      {v}
                    </button>
                  ))}
                </div>

                <div className="w-px h-5 bg-border mx-0.5" />

                {/* Refresh */}
                <button onClick={() => load(year, month)} disabled={loading} title="Refresh"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
                  <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Row 2: Legend (wraps) + entity selects + type pills */}
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">

                {/* Compact legend — wraps to 2 lines naturally */}
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 items-center max-w-xs shrink-0">
                  {LEGEND.map(({ chip, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${chip.replace(/text-\S+/g,"").replace(/border-l-2\s/g,"").trim()}`} />
                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1" />

                {/* Entity selects */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={filterDriver}
                    onChange={e => setFilterDriver(e.target.value)}
                    className="h-7 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All drivers</option>
                    {driverOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={filterVehicle}
                    onChange={e => setFilterVehicle(e.target.value)}
                    className="h-7 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All vehicles</option>
                    {vehicleOptions.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                <div className="w-px h-5 bg-border self-center" />

                {/* Assignment filter */}
                <div className="flex items-center gap-0.5 rounded-full border bg-muted/30 p-0.5 shrink-0">
                  {(["all", "assigned", "unassigned"] as const).map(v => (
                    <button key={v} onClick={() => setAssignmentFilter(v)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-all ${
                        assignmentFilter === v
                          ? v === "assigned"   ? "bg-green-500 text-white shadow-sm"
                          : v === "unassigned" ? "bg-blue-500 text-white shadow-sm"
                          : "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}>
                      {v}
                    </button>
                  ))}
                </div>

                <div className="w-px h-5 bg-border self-center" />

                {/* Type visibility pills */}
                <div className="flex items-center gap-1 shrink-0">
                  <FilterPill label="Trips"       active={showOrders}       dot="bg-foreground"  onClick={() => setShowOrders(v => !v)} />
                  <FilterPill label="Driver off"  active={showDriverLeave}  dot="bg-red-500"     onClick={() => setShowDriverLeave(v => !v)} />
                  <FilterPill label="Veh. off"    active={showVehicleLeave} dot="bg-neutral-700" onClick={() => setShowVehicleLeave(v => !v)} />
                </div>

                {error && <span className="text-[10px] text-red-500 self-center">{error}</span>}
              </div>
            </div>

            {/* ── Month view ── */}
            {calView === "month" && (
              <>
                <div className="grid grid-cols-7 border-b bg-muted/30 shrink-0">
                  {DAYS.map(d => (
                    <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
                  {cells.map((cell, i) => {
                    const dayOrders = ordersForDay(cell.date)
                    const dayLeave  = leaveForDay(cell.date)
                    const isToday   = isSameDay(cell.date, today)
                    const isSel     = !!selected && isSameDay(cell.date, selected)
                    return (
                      <div
                        key={i}
                        onClick={() => handleDayClick(cell.date)}
                        className={[
                          "relative flex flex-col gap-0.5 border-b border-r p-1.5 cursor-pointer transition-colors min-h-[70px] overflow-hidden",
                          !cell.current ? "bg-muted/20" : "hover:bg-muted/30",
                          isSel ? "ring-2 ring-inset ring-primary" : "",
                        ].join(" ")}
                      >
                        <span className={[
                          "flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-medium shrink-0",
                          isToday ? "bg-primary text-primary-foreground" : !cell.current ? "text-muted-foreground" : "text-foreground",
                        ].join(" ")}>
                          {cell.date.getDate()}
                        </span>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {loading ? null : dayOrders.slice(0, 2).map(o => (
                            <div key={o.uuid} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${orderChip(o, hasDriver, hasVehicle)}`}>
                              {fmtTime(o.scheduled_at)} {o.internal_id ?? o.public_id}
                            </div>
                          ))}
                          {!loading && dayLeave.slice(0, 2).map(l => (
                            <div key={l.uuid} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${leaveChip(l)}`}>
                              {leaveLabel(l)}: {l.vehicle_name ?? l.user?.name ?? "—"}
                            </div>
                          ))}
                          {(dayOrders.length + dayLeave.length) > 4 && (
                            <div className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              +{dayOrders.length + dayLeave.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── Week view ── */}
            {calView === "week" && (
              <WeekView
                anchor={anchor} today={today}
                orders={filteredOrders} leaveEvents={filteredLeave}
                selected={selected} setSelected={setSelected}
                hd={hasDriver} hv={hasVehicle}
                showOrders={showOrders} showDriverLeave={showDriverLeave} showVehicleLeave={showVehicleLeave}
              />
            )}

            {/* ── Day view ── */}
            {calView === "day" && (
              <DayView
                anchor={anchor} today={today}
                orders={filteredOrders} leaveEvents={filteredLeave}
                hd={hasDriver} hv={hasVehicle}
                showOrders={showOrders} showDriverLeave={showDriverLeave} showVehicleLeave={showVehicleLeave}
              />
            )}

          </div>

          {/* Selected day detail (month view only) */}
          {calView === "month" && selected && (
            <div className="shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b px-5 py-3">
                <h3 className="text-sm font-semibold">
                  {selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDayOrders.length === 0 && selectedDayLeave.length === 0
                    ? "No events"
                    : [
                        selectedDayOrders.length > 0 ? `${selectedDayOrders.length} order${selectedDayOrders.length > 1 ? "s" : ""}` : "",
                        selectedDayLeave.length  > 0 ? `${selectedDayLeave.length} availability event${selectedDayLeave.length > 1 ? "s" : ""}` : "",
                      ].filter(Boolean).join(" · ")
                  }
                </p>
              </div>
              <div className="flex flex-wrap gap-3 p-4 max-h-72 overflow-y-auto">
                {selectedDayOrders.map(o => (
                  <div key={o.uuid} className="min-w-[220px] flex-1"><OrderCard order={o} /></div>
                ))}
                {selectedDayLeave.map(l => (
                  <div key={l.uuid} className="min-w-[200px] flex-1"><LeaveCard leave={l} /></div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
