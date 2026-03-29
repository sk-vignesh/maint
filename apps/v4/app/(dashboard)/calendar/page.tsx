"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight,
  Clock, CalendarIcon, Users, IdCard, Car, MapPin,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react"
import { listOrders, type Order, type OrderStatus } from "@/lib/orders-api"
import { listDriverLeave, listVehicleUnavailability, type LeaveRequest } from "@/lib/leave-requests-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

function fmtDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function fmtTime(iso?: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

/** Returns true if `date` falls on or between start and end (inclusive, date-only comparison) */
function isInRange(date: Date, start: string, end: string) {
  const d  = date.getTime()
  const s  = new Date(start.slice(0, 10)).getTime()
  const e  = new Date(end.slice(0, 10)).getTime()
  return d >= s && d <= e
}

const LEAVE_STYLE: Record<string, { chip: string; label: string }> = {
  "Off-shift": { chip: "border-l-2 border-slate-400 bg-slate-200/60 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300", label: "Off-shift" },
  "Holiday":   { chip: "border-l-2 border-blue-400 bg-blue-100/70 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",   label: "Leave" },
  "vehicle":   { chip: "border-l-2 border-amber-500 bg-amber-100/70 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", label: "Vehicle off" },
  "default":   { chip: "border-l-2 border-blue-400 bg-blue-100/70 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",   label: "Leave" },
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

// ─── Status colour map — API statuses ─────────────────────────────────────────

const STATUS_COLORS: Record<OrderStatus, { badge: string; dot: string; event: string; label: string }> = {
  created:    { badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",   dot: "bg-yellow-500",  event: "bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-400",   label: "Created" },
  dispatched: { badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",   dot: "bg-purple-500",  event: "bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-400",   label: "Dispatched" },
  started:    { badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",           dot: "bg-blue-500",    event: "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-400",           label: "In Progress" },
  completed:  { badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",       dot: "bg-green-500",   event: "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400",       label: "Completed" },
  canceled:   { badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",              dot: "bg-zinc-400",    event: "bg-zinc-200/60 border-zinc-400 text-zinc-600 dark:text-zinc-400",           label: "Cancelled" },
}

function statusStyle(s?: string) {
  return STATUS_COLORS[(s as OrderStatus) ?? "created"] ?? STATUS_COLORS.created
}

// ─── Order card (shown in detail panel and sidebar) ──────────────────────────

function OrderCard({ order }: { order: Order }) {
  const s    = statusStyle(order.status)
  const dest = order.dropoff_name ?? order.payload?.dropoff?.name ?? "—"
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-semibold tracking-tight font-mono">
          {order.internal_id ?? order.public_id}
        </span>
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
        <Row icon={<IdCard  className="h-3 w-3" />} label="Driver"      value={order.driver_name ?? "No Driver"} muted={!order.driver_name} />
        <Row icon={<Car     className="h-3 w-3" />} label="Vehicle"     value={order.vehicle_assigned?.plate_number ?? "No Vehicle"} muted={!order.vehicle_assigned?.plate_number} />
        <Row icon={<MapPin  className="h-3 w-3" />} label="Destination" value={dest} />
      </div>
    </div>
  )
}

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

// ─── Collapsible panel ────────────────────────────────────────────────────────

function Panel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true)
  return (
    <div className="flex flex-col min-h-0 overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors shrink-0"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">{title}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
        </div>
      </button>
      {open && (
        <div className="border-t p-3 space-y-3 overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date()
  const [year,     setYear]     = React.useState(today.getFullYear())
  const [month,    setMonth]    = React.useState(today.getMonth())
  const [selected, setSelected] = React.useState<Date | null>(null)
  const [orders,       setOrders]       = React.useState<Order[]>([])
  const [leaveEvents,  setLeaveEvents]  = React.useState<LeaveRequest[]>([])
  const [loading,      setLoading]      = React.useState(true)
  const [error,        setError]        = React.useState<string | null>(null)

  // Fetch orders for the visible month window (include prev/next month overflow)
  const load = React.useCallback(async (y: number, m: number) => {
    setLoading(true); setError(null)
    try {
      const from = new Date(y, m - 1, 1).toISOString().slice(0, 10)
      const to   = new Date(y, m + 2, 0).toISOString().slice(0, 10)
      const [ordersRes, driverRes, vehicleRes] = await Promise.allSettled([
        listOrders({ scheduled_at: from, end_date: to, per_page: 500 }),
        listDriverLeave({ per_page: 200 }),
        listVehicleUnavailability({ per_page: 200 }),
      ])
      setOrders(ordersRes.status === "fulfilled" ? (ordersRes.value.orders ?? []) : [])
      const driverLeave  = driverRes.status  === "fulfilled" ? (driverRes.value.data  ?? []) : []
      const vehicleLeave = vehicleRes.status === "fulfilled" ? (vehicleRes.value.data ?? []) : []
      setLeaveEvents([...driverLeave, ...vehicleLeave])
      if (ordersRes.status === "rejected") setError("Orders: " + (ordersRes.reason as Error).message)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load(year, month) }, [load, year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const cells = getCalendarDays(year, month)

  const ordersForDay = (date: Date) =>
    orders.filter(o => o.scheduled_at && isSameDay(new Date(o.scheduled_at), date))

  const leaveForDay = (date: Date) =>
    leaveEvents.filter(l => isInRange(date, l.start_date, l.end_date))

  const selectedDayOrders = selected ? ordersForDay(selected) : []
  const selectedDayLeave  = selected ? leaveForDay(selected)  : []

  // An order is assigned if ANY of the three driver signals is present
  const hasDriver  = (o: Order) => !!(o.driver_name || o.driver_assigned_uuid || o.driver_assigned)
  const unassigned = orders.filter(o => !hasDriver(o))
  const assigned   = orders.filter(o =>  hasDriver(o))

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1" />
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
        <button
          onClick={() => load(year, month)}
          disabled={loading}
          title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Body: sidebar + calendar ── */}
      <div className="flex flex-1 gap-4 min-h-0 flex-col lg:flex-row overflow-hidden">

        {/* ── Left Sidebar ── */}
        <div className="flex flex-col gap-3 lg:w-80 xl:w-96 shrink-0 min-h-0 overflow-hidden">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse h-20 rounded-xl border bg-card" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 flex flex-col">
                <Panel title="Unassigned" count={unassigned.length}>
                  {unassigned.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-2">No unassigned orders</p>
                    : unassigned.map(o => <OrderCard key={o.uuid} order={o} />)
                  }
                </Panel>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <Panel title="Assigned" count={assigned.length}>
                  {assigned.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-2">No assigned orders</p>
                    : assigned.map(o => <OrderCard key={o.uuid} order={o} />)
                  }
                </Panel>
              </div>
            </>
          )}
        </div>

        {/* ── Calendar + detail ── */}
        <div className="flex flex-1 flex-col gap-3 min-w-0 overflow-hidden">

          {/* Calendar card */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm flex flex-col flex-1 min-h-0">

            {/* Month nav */}
            <div className="flex items-center justify-between border-b px-5 py-3 shrink-0">
              <button onClick={prevMonth} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b bg-muted/30 shrink-0">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
              {cells.map((cell, i) => {
                const dayOrders = ordersForDay(cell.date)
                const isToday   = isSameDay(cell.date, today)
                const isSel     = !!selected && isSameDay(cell.date, selected)
                return (
                  <div
                    key={i}
                    onClick={() => setSelected(isSel ? null : cell.date)}
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
                      {loading ? null : dayOrders.slice(0, 2).map(o => {
                        const s = statusStyle(o.status)
                        return (
                          <div
                            key={o.uuid}
                            className={`truncate rounded border-l-2 px-1.5 py-0.5 text-[10px] font-medium leading-tight ${s.event}`}
                          >
                            {fmtTime(o.scheduled_at)} {o.internal_id ?? o.public_id}
                          </div>
                        )
                      })}
                      {!loading && leaveForDay(cell.date).slice(0, 2).map(l => {
                        const key = l.non_availability_type ?? l.unavailability_type ?? "default"
                        const ls  = LEAVE_STYLE[key] ?? LEAVE_STYLE["default"]
                        const name = l.vehicle_name ?? l.user?.name ?? "Unknown"
                        return (
                          <div key={l.uuid} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${ls.chip}`}>
                            {ls.label}: {name}
                          </div>
                        )
                      })}
                      {(dayOrders.length + leaveForDay(cell.date).length) > 4 && (
                        <div className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{dayOrders.length + leaveForDay(cell.date).length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selected && (
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
                  <div key={o.uuid} className="min-w-[220px] flex-1">
                    <OrderCard order={o} />
                  </div>
                ))}
                {selectedDayLeave.map(l => {
                  const key = l.non_availability_type ?? l.unavailability_type ?? "default"
                  const ls  = LEAVE_STYLE[key] ?? LEAVE_STYLE["default"]
                  const who = l.vehicle_name ?? l.user?.name ?? "Unknown"
                  return (
                    <div key={l.uuid} className="min-w-[200px] flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
                      <div className={`flex items-center justify-between border-b px-3 py-2 ${ls.chip}`}>
                        <span className="text-[11px] font-semibold">{ls.label}: {who}</span>
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
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
