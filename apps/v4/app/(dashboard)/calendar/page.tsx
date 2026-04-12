"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight,
  Clock, CalendarIcon, Users, IdCard, Car, MapPin,
  RefreshCw, X, Paperclip, FileText, FileSpreadsheet, FileCode, File,
} from "lucide-react"
import { listOrders, type Order, type OrderStatus } from "@/lib/orders-api"
import { listDriverLeave, listVehicleUnavailability, type LeaveRequest } from "@/lib/leave-requests-api"
import { getFileTypeIcon } from "@/app/(dashboard)/maintenance-trips/page"

// ─── Attachment file cache & hook (maintenance trips only) ───────────────────
// Cache stores full file list so the icon doubles as a download link.
interface CachedFile { uuid: string; original_filename: string; url: string }
const _fileCache = new Map<string, CachedFile[]>()

function useLeaveFiles(uuid: string, enabled: boolean) {
  const init = _fileCache.get(uuid)
  const [files, setFiles] = React.useState<CachedFile[]>(init ?? [])
  const [ready, setReady] = React.useState(init !== undefined)
  React.useEffect(() => {
    if (!enabled) return
    if (_fileCache.has(uuid)) { setFiles(_fileCache.get(uuid)!); setReady(true); return }
    let dead = false
    void (async () => {
      try {
        const { getToken } = await import("@/lib/ontrack-api")
        const res = await fetch(
          `https://ontrack-api.agilecyber.com/int/v1/files?subject_uuid=${uuid}&limit=10`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        )
        if (!res.ok || dead) return
        const d = await res.json()
        const list: CachedFile[] = d?.files ?? d?.data ?? []
        _fileCache.set(uuid, list)
        if (!dead) { setFiles(list); setReady(true) }
      } catch { _fileCache.set(uuid, []); if (!dead) setReady(true) }
    })()
    return () => { dead = true }
  }, [uuid, enabled])
  return { files, ready }
}

// Calendar-chip icon: typed icon link → first file; badge if multiple.
// Clicks are stopPropagation so the chip's own onClick (open sidebar) still fires.
function LeaveAttachmentIcon({ uuid }: { uuid: string }) {
  const { files } = useLeaveFiles(uuid, true)
  if (!files.length) return null
  const { Icon, cls } = getFileTypeIcon(files[0].original_filename, (files[0] as { content_type?: string }).content_type)
  return (
    <a
      href={files[0].url}
      target="_blank"
      rel="noopener noreferrer"
      title={files.length === 1 ? files[0].original_filename : `${files.length} attachments`}
      onClick={e => e.stopPropagation()}
      className={`inline-flex items-center gap-0.5 shrink-0 hover:opacity-100 opacity-80 ${cls}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {files.length > 1 && <span className="text-[8px] leading-none font-bold">{files.length}</span>}
    </a>
  )
}


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
  { chip: CHIP.driverLeave,  label: "Driver" },
  { chip: CHIP.vehicleLeave, label: "Vehicle" },
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
        <Row icon={<Users   className="h-3 w-3" />} label="Fleet"       value={order.fleet?.name ?? order.fleet_name ?? "—"} />
        <Row icon={<IdCard  className="h-3 w-3" />} label="Driver"      value={driverName(order) ?? "No Driver"} muted={!driverName(order)} />
        <Row icon={<Car     className="h-3 w-3" />} label="Vehicle"     value={vehiclePlate(order) ?? "No Vehicle"} muted={!vehiclePlate(order)} />
        <Row icon={<MapPin  className="h-3 w-3" />} label="Destination" value={dest} />
      </div>
    </div>
  )
}

function LeaveCard({ leave: l }: { leave: LeaveRequest }) {
  const who       = l.vehicle_name ?? l.user?.name ?? "Unknown"
  const isVehicle = l.unavailability_type === "vehicle"
  const { files } = useLeaveFiles(l.uuid, isVehicle)
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
        {isVehicle && files.length > 0 && (
          <div className="pt-2 mt-1 border-t space-y-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Attachments</div>
            {files.map(f => {
              const { Icon, cls } = getFileTypeIcon(f.original_filename, (f as { content_type?: string }).content_type)
              return (
                <a
                  key={f.uuid}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 hover:underline truncate ${cls}`}
                  title={f.original_filename}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate text-foreground hover:text-primary">{f.original_filename}</span>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Trip sidebar ─────────────────────────────────────────────────────────────

interface SidebarData {
  title:       string
  trips:       Order[]
  leaves:      LeaveRequest[]
  continuing?: Order[]     // week-scoped continuing trips (started before this week)
  initialTab?: 'all' | 'trips' | 'vehicle' | 'drivers' | 'continuing'
}

function TripSidebar({ data, onClose }: { data: SidebarData; onClose: () => void }) {
  const [tab, setTab] = React.useState<'all' | 'trips' | 'vehicle' | 'drivers' | 'continuing'>('all')

  // Reset to requested initial tab whenever content changes (new day clicked)
  React.useEffect(() => { setTab(data.initialTab ?? 'all') }, [data])

  // Close on Escape key
  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const vehicleLeaves    = data.leaves.filter(l => l.unavailability_type === 'vehicle')
  const driverLeaves     = data.leaves.filter(l => l.unavailability_type !== 'vehicle')
  const contOrders       = data.continuing ?? []

  const visibleTrips  = tab === 'all' || tab === 'trips'      ? data.trips     : []
  const visibleLeaves = tab === 'all'                          ? data.leaves
                      : tab === 'vehicle'                      ? vehicleLeaves
                      : tab === 'drivers'                      ? driverLeaves
                      : []
  const visibleCont   = tab === 'all' || tab === 'continuing'  ? contOrders     : []

  const visibleCount = visibleTrips.length + visibleLeaves.length + visibleCont.length
  const total        = data.trips.length + data.leaves.length + contOrders.length

  // Sidebar width locked to TOTAL on open; grid cols adapt per tab
  const CARD_W    = 300
  const GAP       = 12
  const PAD       = 24
  const panelCols = Math.min(Math.max(total, 1), 4)
  const gridCols  = Math.min(Math.max(visibleCount, 1), 4)
  const panelW    = `min(${panelCols * CARD_W + (panelCols - 1) * GAP + PAD}px, 90vw)`

  const TABS = [
    { id: 'all'        as const, label: 'All',        count: total                },
    { id: 'trips'      as const, label: 'Trips',      count: data.trips.length    },
    { id: 'vehicle'    as const, label: 'Vehicle',    count: vehicleLeaves.length },
    { id: 'drivers'    as const, label: 'Drivers',    count: driverLeaves.length  },
    { id: 'continuing' as const, label: 'Continuing', count: contOrders.length   },
  ].filter(t => t.id === 'all' || t.count > 0)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-card border-l shadow-2xl overflow-hidden transition-[width] duration-200"
        style={{ width: panelW }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{data.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {total} event{total !== 1 ? 's' : ''}
              {data.trips.length    > 0 && ` · ${data.trips.length} trip${data.trips.length > 1 ? 's' : ''}`}
              {vehicleLeaves.length > 0 && ` · ${vehicleLeaves.length} vehicle`}
              {driverLeaves.length  > 0 && ` · ${driverLeaves.length} driver`}
              {contOrders.length    > 0 && ` · ${contOrders.length} continuing`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 border-b bg-muted/30 px-3 pt-2 pb-0 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors
                ${tab === t.id
                  ? 'bg-card text-foreground shadow-sm border border-b-card border-border -mb-px'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none
                ${tab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {visibleCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground gap-2">
              <span className="text-2xl">—</span>
              No {tab === 'trips' ? 'trips' : tab === 'vehicle' ? 'vehicle events' : tab === 'drivers' ? 'driver events' : tab === 'continuing' ? 'continuing trips' : 'events'} for this period
            </div>
          ) : (
            <div
              className="grid content-start"
              style={{ gridTemplateColumns: `repeat(${gridCols}, ${CARD_W}px)`, gap: GAP }}
            >
              {/* Continuing first, then leaves, then trips */}
              {visibleCont.map(o   => <OrderCard key={o.uuid} order={o}  />)}
              {visibleLeaves.map(l => <LeaveCard  key={l.uuid} leave={l}  />)}
              {visibleTrips.map(o  => <OrderCard key={o.uuid} order={o}  />)}
            </div>
          )}
        </div>
      </div>
    </>
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
  hd, hv, showOrders, showDriverLeave, showVehicleLeave, onSidebar,
}: {
  anchor: Date; today: Date
  orders: Order[]; leaveEvents: LeaveRequest[]
  selected: Date | null; setSelected: (d: Date | null) => void
  hd: (o: Order) => boolean; hv: (o: Order) => boolean
  showOrders: boolean; showDriverLeave: boolean; showVehicleLeave: boolean
  onSidebar: (d: SidebarData) => void
}) {
  const week        = getWeekDays(anchor)

  // Multi-day trips (scheduled_at and estimated_end_date on different calendar days)
  // that appear anywhere in this week — numbered 1..N sorted by start time.
  const allContinuing = React.useMemo(() => {
    if (!showOrders) return [] as { order: Order; num: number }[]
    return orders
      .filter(o => {
        if (!o.scheduled_at || !o.estimated_end_date) return false
        // Must span MULTIPLE calendar days (start ≠ end day)
        if (isSameDay(new Date(o.scheduled_at), new Date(o.estimated_end_date))) return false
        // Must appear in this week
        return week.some(d => orderSpansDay(o, d))
      })
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
      .map((o, i) => ({ order: o, num: i + 1 }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, anchor, showOrders])
  /** UUID → sequential number for end-marker circles */
  const contNumMap = new Map(allContinuing.map(({ order: o, num }) => [o.uuid, num]))
  const PX_PER_HOUR = 32   // 32px/hr × 24h = 1536px — proper density, scrollable
  const FIRST_HOUR  = HOURS[0]

  // ── Layout constants (defined early so hourH can use them) ───────────────
  const CARD_H   = PX_PER_HOUR - 2   // 30px — height of one stacked card
  const MAX_SHOW = 3                  // max cards shown before +X badge

  // Variable-height rows based on trip density per hour across the whole week.
  // 0 trips → HALF_PH (compressed).  1 trip → PX_PER_HOUR.  n trips (≤ MAX_SHOW) → n*CARD_H.
  // Hour height is the same across ALL day columns (shared time gutter).
  const HALF_PH = PX_PER_HOUR / 2
  const tripsPerHour = React.useMemo(() => {
    const counts = new Map<number, number>(HOURS.map(h => [h, 0]))
    if (!showOrders) return counts
    HOURS.forEach(h => {
      const max = Math.max(0, ...week.map(d =>
        orders.filter(o =>
          o.scheduled_at &&
          isSameDay(new Date(o.scheduled_at!), d) &&
          new Date(o.scheduled_at!).getHours() === h
        ).length
      ))
      counts.set(h, max)
    })
    return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, anchor, showOrders])
  const CIRCLE_SIZE = 18             // px — end-marker dot (larger to fit number)
  const CIRCLE_GAP  = 2              // px — gap between stacked dots

  // endsPerHour: max continuation trips ENDING in each hour across all days.
  // Used to expand hour height and reserve space in the right rail.
  const endsPerHour = React.useMemo(() => {
    const counts = new Map<number, number>(HOURS.map(h => [h, 0]))
    week.forEach(d => {
      HOURS.forEach(h => {
        const n = orders.filter(o =>
          o.scheduled_at &&
          o.estimated_end_date &&
          !isSameDay(new Date(o.scheduled_at!), d) &&
          isSameDay(new Date(o.estimated_end_date!), d) &&
          new Date(o.estimated_end_date!).getHours() === h
        ).length
        if (n > counts.get(h)!) counts.set(h, n)
      })
    })
    return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, anchor])
  const hourH   = HOURS.map(h => {
    const starts = tripsPerHour.get(h) ?? 0
    const ends   = endsPerHour.get(h) ?? 0
    const fromStarts = starts === 0 ? 0 : Math.max(PX_PER_HOUR, Math.min(starts, MAX_SHOW) * CARD_H)
    const fromEnds   = ends   === 0 ? 0 : ends * (CIRCLE_SIZE + CIRCLE_GAP)
    const combined   = Math.max(fromStarts, fromEnds)
    return combined === 0 ? HALF_PH : combined
  })
  const hourOff = HOURS.map((_, i) => hourH.slice(0, i).reduce((s, v) => s + v, 0))
  const GRID_H  = hourH.reduce((s, v) => s + v, 0)
  /** Pixel top for the START of hour h */
  const hTop = (h: number) => { const i = h - FIRST_HOUR; return i >= 0 ? (hourOff[i] ?? 0) : 0 }
  /** Pixel position for a timestamp within this grid (used for solo events) */
  const msToPx = (ms: number) => {
    const dt = new Date(ms); const h = dt.getHours(); const i = h - FIRST_HOUR
    if (i < 0 || i >= HOURS.length) return 0
    return hourOff[i] + (dt.getMinutes() / 60) * hourH[i]
  }

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
    const targetHour = earliest !== undefined ? Math.max(FIRST_HOUR, earliest - 0.5) : 7
    scrollRef.current.scrollTop = hTop(Math.floor(targetHour))
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

      {/* Single scroll container — headers sticky inside, time grid scrolls */}
      <div ref={scrollRef} className="flex-1 overflow-y-scroll overflow-x-hidden min-h-0">

        {/* ── Sticky header block (day labels + all-day row) ──────────── */}
        <div className="sticky top-0 z-20 flex flex-col border-b bg-card shadow-sm">

          {/* Day header row */}
          <div className="flex border-b">
            <div className="w-14 shrink-0 border-r" />
            {week.map((d, i) => {
              const isTod = isSameDay(d, today)
              const isSel = !!selected && isSameDay(d, selected)
              return (
                <button
                  key={i}
                  onClick={() => setSelected(isSel ? null : d)}
                  className={[
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-center text-xs font-medium transition-colors hover:bg-muted/30",
                    isSel ? "bg-primary/10" : "",
                  ].join(" ")}
                >
                  <span className="text-muted-foreground uppercase tracking-wide text-[10px]">{DAYS[d.getDay()]}</span>
                  <span className={[
                    "flex h-5 w-5 items-center justify-center rounded-full font-semibold text-[11px]",
                    isTod ? "bg-primary text-primary-foreground" : "text-foreground",
                  ].join(" ")}>{d.getDate()}</span>
                </button>
              )
            })}
          </div>

          {/* All-day row (leaves + maintenance) */}
          <div className="flex bg-muted/15">
            <div className="w-14 shrink-0 border-r flex items-start justify-end pr-1 pt-1">
              <span className="text-[8px] text-muted-foreground leading-none">all day</span>
            </div>
            {week.map((d, i) => {
              const leaves    = leaveForDay(d)
              const dayLabel  = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })
              return (
                <div key={i} className="flex-1 border-r p-0.5 flex flex-col gap-0.5 min-h-[28px]">
                  {leaves.map(l => {
                    const isVehicle = l.unavailability_type === "vehicle"
                    const name      = l.vehicle_name ?? l.user?.name ?? "—"
                    const colorCls  = isVehicle
                      ? "border-l-2 border-neutral-500 bg-neutral-100/80 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                      : "border-l-2 border-red-400   bg-red-50/80    text-red-800   dark:bg-red-900/30  dark:text-red-300"
                    return (
                      <button
                        key={l.uuid}
                        type="button"
                        title={`${leaveLabel(l)}: ${name} — click to open`}
                        onClick={() => onSidebar({
                          title:      dayLabel,
                          trips:      ordersForDay(d),
                          leaves:     leaveForDay(d),
                          continuing: allContinuing.map(c => c.order),
                        })}
                        className={`overflow-hidden rounded px-1.5 py-1 text-[9px] font-medium cursor-pointer text-left w-full ${colorCls}`}
                      >
                        <div className="flex items-center gap-1 font-semibold truncate leading-tight">
                          {isVehicle && <LeaveAttachmentIcon uuid={l.uuid} />}
                          {leaveLabel(l)}: {name}
                        </div>
                        <div className="opacity-70 text-[8px] truncate leading-tight mt-0.5">
                          {l.start_date.slice(0,10)} → {l.end_date.slice(0,10)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* ── Continuing trips strip (between all-day and time grid) ───────── */}
          {allContinuing.length > 0 && (
            <div className="flex border-b bg-indigo-50/30 dark:bg-indigo-950/20">
              <div className="w-14 shrink-0 border-r flex items-center justify-end pr-1">
                <span className="text-[7px] text-muted-foreground leading-tight text-right">cont.</span>
              </div>
              {week.map((d, i) => {
                const dayConts = allContinuing.filter(({ order: o }) => {
                  // Normalise to local midnight timestamps for robust day comparison.
                  // This explicitly includes the trip's start day (sd <= td <= ed).
                  const s  = new Date(o.scheduled_at!)
                  const e  = new Date(o.estimated_end_date!)
                  const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()
                  const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime()
                  const td = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
                  return td >= sd && td <= ed
                })
                const shown    = dayConts.slice(0, 4)
                const extra    = dayConts.length - shown.length
                const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
                return (
                  <div key={i} className="flex-1 border-r p-0.5 flex flex-wrap gap-0.5 min-h-[14px]">
                    {shown.map(({ order: o, num }) => {
                      const chip = orderChip(o, hd, hv)
                      return (
                        <div
                          key={o.uuid}
                          title={`#${num} ${o.internal_id ?? o.public_id}\nStarted: ${fmtTime(o.scheduled_at!)}\nDriver: ${driverName(o) ?? 'No driver'}\nVehicle: ${vehiclePlate(o) ?? 'No vehicle'}`}
                          className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-medium overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${chip}`}
                          style={{ width: 'calc(50% - 1px)' }}
                          onClick={() => onSidebar({
                            title:      dayLabel,
                            trips:      ordersForDay(d),
                            leaves:     leaveForDay(d),
                            continuing: allContinuing.map(c => c.order),
                            initialTab: 'continuing',
                          })}
                        >
                          <span className="shrink-0 rounded-full h-3.5 w-3.5 flex items-center justify-center bg-white/40 dark:bg-black/30 font-bold text-[7px] leading-none border border-current/20">
                            {num}
                          </span>
                          <span className="truncate leading-none">{fmtTime(o.scheduled_at!)} {o.internal_id ?? o.public_id}</span>
                        </div>
                      )
                    })}
                    {extra > 0 && (
                      <button
                        type="button"
                        className="flex items-center justify-center rounded px-1 py-0.5 text-[8px] font-bold bg-muted/80 hover:bg-primary hover:text-primary-foreground transition-colors leading-none"
                        style={{ width: 'calc(50% - 1px)' }}
                        onClick={() => onSidebar({
                          title:      dayLabel,
                          trips:      ordersForDay(d),
                          leaves:     leaveForDay(d),
                          continuing: allContinuing.map(c => c.order),
                          initialTab: 'continuing',
                        })}
                      >
                        +{extra}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Time grid ───────────────────────────────────────────────── */}
        <div className="flex">

          {/* Time gutter */}
          <div className="w-14 shrink-0 border-r relative" style={{ height: GRID_H }}>
            {HOURS.map((h, i) => (
              <div key={h} className="absolute w-full border-t" style={{ top: hourOff[i] }}>
                <span className={`text-[9px] px-1 leading-none block ${
                  (tripsPerHour.get(h) ?? 0) + (endsPerHour.get(h) ?? 0) > 0
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/40'
                }`}>
                  {fmtHour(h)}
                </span>
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
                {/* Hour grid lines — dimmer for empty rows */}
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className={`absolute w-full border-t ${
                      (tripsPerHour.get(h) ?? 0) + (endsPerHour.get(h) ?? 0) > 0
                        ? 'border-muted/30'
                        : 'border-muted/15'
                    }`}
                    style={{ top: hourOff[i] }}
                  />
                ))}

                {/* Trip cards — hour-bucketed vertical stacking */}
                {(() => {
                  const allTrips = dayOrds.filter(o => !!o.scheduled_at)
                  if (allTrips.length === 0) return null

                  const nodes: React.ReactNode[] = []

                  // Group continuation endings by end-hour and render as
                  // stacked circles in the right rail, centred vertically.
                  const endsByHour = new Map<number, typeof allTrips>()
                  allTrips
                    .filter(o => !isSameDay(new Date(o.scheduled_at!), d) && !!o.estimated_end_date)
                    .forEach(o => {
                      const endDate = new Date(o.estimated_end_date!)
                      if (!isSameDay(endDate, d)) return
                      const h = endDate.getHours()
                      if (!endsByHour.has(h)) endsByHour.set(h, [])
                      endsByHour.get(h)!.push(o)
                    })

                  endsByHour.forEach((endings, h) => {
                    const slotTop  = hTop(h)
                    const slotH    = hourH[h - FIRST_HOUR] ?? PX_PER_HOUR
                    const totalH   = endings.length * CIRCLE_SIZE + (endings.length - 1) * CIRCLE_GAP
                    // Centre the stack vertically within the slot
                    const startY   = slotTop + Math.max(0, Math.round((slotH - totalH) / 2))
                    endings.forEach((o, i) => {
                      const chip = orderChip(o, hd, hv)
                      nodes.push(
                        <div
                          key={`end-${o.uuid}`}
                          title={`#${contNumMap.get(o.uuid)} ${o.internal_id ?? o.public_id} ends ${fmtTime(o.estimated_end_date!)}`}
                          className={`absolute rounded-full border-2 ${chip} flex items-center justify-center text-[7px] font-bold opacity-90`}
                          style={{
                            top:    startY + i * (CIRCLE_SIZE + CIRCLE_GAP),
                            right:  1,
                            width:  CIRCLE_SIZE,
                            height: CIRCLE_SIZE,
                            zIndex: 10,
                          }}
                        >
                          {contNumMap.get(o.uuid)}
                        </div>
                      )
                    })
                  })


                  // Group trips that START on this day by their start hour
                  const byHour = new Map<number, typeof allTrips>()
                  allTrips
                    .filter(o => isSameDay(new Date(o.scheduled_at!), d))
                    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
                    .forEach(o => {
                      const h = new Date(o.scheduled_at!).getHours()
                      if (!byHour.has(h)) byHour.set(h, [])
                      byHour.get(h)!.push(o)
                    })

                  byHour.forEach((group, h) => {
                    const slotTop = hTop(h)
                    const slotHt  = hourH[h - FIRST_HOUR] ?? PX_PER_HOUR
                    const shown   = group.slice(0, MAX_SHOW)
                    const extra   = group.length - shown.length
                    // Divide the slot evenly between the shown cards
                    const cardHt  = Math.floor(slotHt / shown.length)

                    shown.forEach((o, i) => {
                      const chip     = orderChip(o, hd, hv)
                      const isLast   = i === shown.length - 1
                      const showBadge = isLast && extra > 0
                      nodes.push(
                        <div
                          key={o.uuid}
                          title={`${o.internal_id ?? o.public_id} — ${fmtTime(o.scheduled_at)}${o.estimated_end_date ? ` → ${fmtTime(o.estimated_end_date)}` : ""}`}
                          className={`absolute rounded px-1.5 py-1 text-[9px] font-medium cursor-default overflow-hidden ${chip}`}
                          style={{ top: slotTop + i * cardHt, height: cardHt - 1, left: "1%", right: "15px", zIndex: i + 1 }}
                        >
                          <div className="flex items-start justify-between gap-0.5 h-full">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate leading-tight">
                                {fmtTime(o.scheduled_at!)} {o.internal_id ?? o.public_id}
                              </div>
                              <div className="opacity-70 text-[8px] truncate leading-tight mt-0.5">
                                {driverName(o) ?? "No driver"} · {vehiclePlate(o) ?? "No vehicle"}
                              </div>
                            </div>
                            {showBadge && (
                              <button
                                type="button"
                                title={`+${extra} more trips at this hour — click to view all`}
                                onClick={e => {
                                  e.stopPropagation()
                                  onSidebar({
                                    title: `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ${fmtHour(h)} — ${group.length} trips`,
                                    trips: group,
                                    leaves: [],
                                  })
                                }}
                                className="shrink-0 self-start rounded px-1 py-0.5 bg-black/25 dark:bg-white/25 text-[8px] font-bold leading-none hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                +{extra}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })

                  return nodes
                })()}

              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

// ─── Day view ────────────────────────────────────────────────────────────────

function DayView({
  anchor, today, orders, leaveEvents,
  hd, hv, showOrders, showDriverLeave, showVehicleLeave, onSidebar,
}: {
  anchor: Date; today: Date
  orders: Order[]; leaveEvents: LeaveRequest[]
  hd: (o: Order) => boolean; hv: (o: Order) => boolean
  showOrders: boolean; showDriverLeave: boolean; showVehicleLeave: boolean
  onSidebar: (d: SidebarData) => void
}) {
  const PX_PER_HOUR = 32   // 32px/hr × 24h = 1536px — proper density, scrollable
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

  const allDayLeave = dayLeave  // leaves shown in all-day row

  // Separate: trips starting on this day vs continuations from previous days
  const startingTrips = dayOrders
    .filter(o => !!o.scheduled_at && isSameDay(new Date(o.scheduled_at!), anchor))
    .map(o => ({
      ...o,
      _start: new Date(o.scheduled_at!).getTime(),
      _end: o.estimated_end_date
        ? new Date(o.estimated_end_date).getTime()
        : new Date(o.scheduled_at!).getTime() + 3_600_000,
    }))

  const continuationTrips = dayOrders
    .filter(o => !!o.scheduled_at && !isSameDay(new Date(o.scheduled_at!), anchor))

  // Only columnize the trips that actually start today — continuations never compete
  const layout = columnizeEvents(startingTrips, e => e._start, e => e._end)

  const anchorLabel = anchor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Single scroll container — sticky header inside, same pattern as WeekView */}
      <div ref={scrollRef} className="flex-1 overflow-y-scroll overflow-x-hidden min-h-0">

        {/* ── Sticky header block ─────────────────────────────────────── */}
        <div className="sticky top-0 z-20 flex flex-col border-b bg-card shadow-sm">

          {/* Day title */}
          <div className="flex border-b px-4 py-2 items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{anchorLabel}</span>
            {isSameDay(anchor, today) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">Today</span>
            )}
          </div>

          {/* All-day row — leaves + continuations */}
          {(allDayLeave.length > 0 || continuationTrips.length > 0) && (
            <div className="flex bg-muted/15">
              <div className="w-14 shrink-0 border-r flex items-start justify-end pr-1 pt-1">
                <span className="text-[8px] text-muted-foreground leading-none">all day</span>
              </div>
              <div className="flex-1 p-0.5 flex flex-wrap gap-0.5">
                {/* Leave cards */}
                {allDayLeave.map(l => {
                  const isVehicle = l.unavailability_type === "vehicle"
                  const name      = l.vehicle_name ?? l.user?.name ?? "—"
                  const colorCls  = isVehicle
                    ? "border-l-2 border-neutral-500 bg-neutral-100/80 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                    : "border-l-2 border-red-400   bg-red-50/80 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  return (
                    <div
                      key={l.uuid}
                      title={`${leaveLabel(l)}: ${name}\n${l.start_date.slice(0,10)} → ${l.end_date.slice(0,10)}`}
                      className={`overflow-hidden rounded px-1.5 py-1 text-[9px] font-medium cursor-default min-w-[120px] ${colorCls}`}
                    >
                      <div className="flex items-center gap-1 font-semibold truncate leading-tight">
                        {isVehicle && <LeaveAttachmentIcon uuid={l.uuid} />}
                        {leaveLabel(l)}: {name}
                      </div>
                      <div className="opacity-70 text-[8px] truncate leading-tight mt-0.5">
                        {l.start_date.slice(0,10)} → {l.end_date.slice(0,10)}
                      </div>
                    </div>
                  )
                })}
                {/* Continuation trip cards */}
                {continuationTrips.map(o => {
                  const chip = orderChip(o, hd, hv)
                  return (
                    <div
                      key={o.uuid}
                      title={`${o.internal_id ?? o.public_id} (started ${fmtTime(o.scheduled_at)}${o.estimated_end_date ? ` → ${fmtTime(o.estimated_end_date)}` : ""})`}
                      className={`overflow-hidden rounded px-1.5 py-1 text-[9px] font-medium cursor-default min-w-[120px] ${chip}`}
                    >
                      <div className="font-semibold truncate leading-tight">→ cont. {o.internal_id ?? o.public_id}</div>
                      <div className="opacity-70 text-[8px] truncate leading-tight mt-0.5">
                        {driverName(o) ?? "No driver"} · {vehiclePlate(o) ?? "No vehicle"}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Time grid ───────────────────────────────────────────────── */}
        <div className="flex">

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

            {/* Trip cards — overflow-aware */}
            {(() => {
              if (layout.length === 0) return null
              const MAX_SHOW = 3
              const SLOT_N   = MAX_SHOW + 1
              const shown    = layout.filter(x => x.col < MAX_SHOW)
              const overflow = layout.filter(x => x.col >= MAX_SHOW)

              const assigned = new Set<string>()
              const ofClusters: { topPx: number; count: number; allTrips: Order[] }[] = []
              overflow.forEach(({ item }) => {
                if (assigned.has(item.uuid)) return
                const cluster = layout.filter(x =>
                  x.item._start < item._end && x.item._end > item._start
                )
                cluster.filter(x => x.col >= MAX_SHOW).forEach(x => assigned.add(x.item.uuid))
                const clusterTopPx = Math.min(...cluster.map(x => {
                  const s = new Date(x.item.scheduled_at!)
                  return ((s.getHours() - FIRST_HOUR) + s.getMinutes() / 60) * PX_PER_HOUR
                }))
                ofClusters.push({
                  topPx:    clusterTopPx,
                  count:    cluster.filter(x => x.col >= MAX_SHOW).length,
                  allTrips: cluster.map(x => x.item),
                })
              })

              return [
                ...shown.map(({ item: o, col, totalCols }) => {
                  const hasOf    = totalCols > MAX_SHOW
                  const effCols  = hasOf ? SLOT_N : totalCols
                  const slotFrac = 1 / effCols
                  const leftFrac = col / effCols
                  const chip     = orderChip(o, hd, hv)
                  const start    = new Date(o.scheduled_at!)
                  const top      = ((start.getHours() - FIRST_HOUR) + start.getMinutes() / 60) * PX_PER_HOUR
                  return (
                    <div
                      key={o.uuid}
                      title={`${o.internal_id ?? o.public_id} — ${fmtTime(o.scheduled_at)}${o.estimated_end_date ? ` → ${fmtTime(o.estimated_end_date)}` : ""}`}
                      className={`absolute overflow-hidden rounded px-1.5 py-1 text-[9px] font-medium cursor-default ${chip}`}
                      style={{ top, height: 32, left: `${(leftFrac*100).toFixed(1)}%`, width: `${(slotFrac*100).toFixed(1)}%`, zIndex: col+1 }}
                    >
                      <div className="font-semibold truncate leading-tight">
                        {fmtTime(o.scheduled_at!)} {o.internal_id ?? o.public_id}
                      </div>
                      <div className="opacity-70 text-[8px] truncate leading-tight mt-0.5">
                        {driverName(o) ?? "No driver"} · {vehiclePlate(o) ?? "No vehicle"}
                      </div>
                    </div>
                  )
                }),
                ...ofClusters.map(cluster => (
                  <button
                    key={`of-${cluster.topPx}`}
                    title={`+${cluster.count} more — click to expand`}
                    onClick={() => onSidebar({
                      title: `${anchor.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} — ${cluster.count + MAX_SHOW} overlapping trips`,
                      trips: cluster.allTrips,
                      leaves: [],
                    })}
                    className="absolute flex items-center justify-center rounded border border-border bg-muted/70 text-[9px] font-semibold text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                    style={{ top: cluster.topPx, height: 32, left: `${(MAX_SHOW/SLOT_N*100).toFixed(1)}%`, width: `${(1/SLOT_N*100).toFixed(1)}%`, zIndex: MAX_SHOW+1 }}
                  >
                    +{cluster.count}
                  </button>
                )),
              ]
            })()}
          </div>
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
  const [filterFleet,   setFilterFleet]   = React.useState("")

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

  // Sidebar state — opened by "+N more" in week/day views or day-cell click in month view
  const [sidebarData, setSidebarData] = React.useState<SidebarData | null>(null)
  function openSidebar(d: SidebarData) { setSidebarData(d) }

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

  // fleet name: new API nests it in o.fleet.name; legacy API uses flat o.fleet_name
  const fleetName = React.useCallback(
    (o: Order) => o.fleet?.name ?? o.fleet_name ?? null,
    []
  )

  const fleetOptions = React.useMemo(() =>
    [...new Set(orders.map(o => fleetName(o)).filter(Boolean) as string[])].sort()
  , [orders, fleetName])

  // ─── Filtered data ────────────────────────────────────────────────────────────

  // Orders filtered by entity selects + assignment filter
  const filteredOrders = React.useMemo(() => orders.filter(o => {
    if (filterDriver  && driverName(o)   !== filterDriver)  return false
    if (filterVehicle && vehiclePlate(o) !== filterVehicle) return false
    if (filterFleet   && fleetName(o)    !== filterFleet)   return false
    if (assignmentFilter === "assigned"   && !(hasDriver(o) && hasVehicle(o))) return false
    if (assignmentFilter === "unassigned" && (hasDriver(o)  || hasVehicle(o))) return false
    return true
  }), [orders, filterDriver, filterVehicle, filterFleet, assignmentFilter, fleetName])

  // Leave events filtered by entity selects:
  //  • Driver filter only  → hide all vehicle/maintenance leaves (irrelevant to the driver)
  //  • Vehicle filter only → hide all driver leaves (irrelevant to the vehicle)
  //  • Both / neither      → apply each independently as before
  const filteredLeave = React.useMemo(() => leaveEvents.filter(l => {
    const isVehicle = l.unavailability_type === "vehicle"

    if (filterDriver && !filterVehicle) {
      // Driver-centric view — suppress all vehicle/maintenance entries
      if (isVehicle) return false
      return l.user?.name === filterDriver
    }

    if (filterVehicle && !filterDriver) {
      // Vehicle-centric view — suppress all driver leave entries
      if (!isVehicle) return false
      return l.vehicle_name === filterVehicle
    }

    // Both or neither — original independent matching
    if (filterDriver  && !isVehicle && l.user?.name    !== filterDriver)  return false
    if (filterVehicle &&  isVehicle && l.vehicle_name  !== filterVehicle) return false
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
                  <select
                    value={filterFleet}
                    onChange={e => setFilterFleet(e.target.value)}
                    className="h-7 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All fleets</option>
                    {fleetOptions.map(f => <option key={f} value={f}>{f}</option>)}
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
                  <FilterPill label="Trips"    active={showOrders}       dot="bg-foreground"  onClick={() => setShowOrders(v => !v)} />
                  <FilterPill label="Driver"   active={showDriverLeave}  dot="bg-red-500"     onClick={() => setShowDriverLeave(v => !v)} />
                  <FilterPill label="Vehicle"  active={showVehicleLeave} dot="bg-neutral-700" onClick={() => setShowVehicleLeave(v => !v)} />
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
                    const dayOrds2  = ordersForDay(cell.date)
                    const dayLeave2 = leaveForDay(cell.date)
                    const isToday   = isSameDay(cell.date, today)
                    const total     = dayOrds2.length + dayLeave2.length
                    return (
                      <div
                        key={i}
                        onClick={() => openSidebar({
                          title: cell.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
                          trips:  dayOrds2,
                          leaves: dayLeave2,
                        })}
                        className={[
                          "relative flex flex-col gap-0.5 border-b border-r p-1.5 cursor-pointer transition-colors min-h-[70px] overflow-hidden",
                          !cell.current ? "bg-muted/20" : "hover:bg-muted/30",
                        ].join(" ")}
                      >
                        <span className={[
                          "flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-medium shrink-0",
                          isToday ? "bg-primary text-primary-foreground" : !cell.current ? "text-muted-foreground" : "text-foreground",
                        ].join(" ")}>
                          {cell.date.getDate()}
                        </span>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {loading ? null : dayOrds2.slice(0, 2).map(o => (
                            <div key={o.uuid} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${orderChip(o, hasDriver, hasVehicle)}`}>
                              {fmtTime(o.scheduled_at)} {o.internal_id ?? o.public_id}
                            </div>
                          ))}
                          {!loading && dayLeave2.slice(0, 1).map(l => (
                            <div key={l.uuid} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${leaveChip(l)}`}>
                              {leaveLabel(l)}: {l.vehicle_name ?? l.user?.name ?? "—"}
                            </div>
                          ))}
                          {!loading && total > 3 && (
                            <div className="rounded px-1.5 py-0.5 text-[10px] text-primary font-medium">
                              +{total - 3} more
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
                onSidebar={openSidebar}
              />
            )}

            {/* ── Day view ── */}
            {calView === "day" && (
              <DayView
                anchor={anchor} today={today}
                orders={filteredOrders} leaveEvents={filteredLeave}
                hd={hasDriver} hv={hasVehicle}
                showOrders={showOrders} showDriverLeave={showDriverLeave} showVehicleLeave={showVehicleLeave}
                onSidebar={openSidebar}
              />
            )}

          </div>



        </div>
      </div>

      {/* ── Trip sidebar overlay ── */}
      {sidebarData && (
        <TripSidebar data={sidebarData} onClose={() => setSidebarData(null)} />
      )}
    </div>
  )
}
