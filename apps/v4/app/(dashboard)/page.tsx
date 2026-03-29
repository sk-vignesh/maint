"use client"
import * as React from "react"
import Link from "next/link"
import {
  Truck, Users, CalendarOff, ShieldCheck,
  MapPin, ArrowRight, Clock, AlertTriangle,
  CheckCircle2, Circle, TrendingUp, Calendar,
  ChevronRight, Loader2,
} from "lucide-react"
import { listOrders, type Order, type OrderStatus } from "@/lib/orders-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"
import { listVehicles, type Vehicle } from "@/lib/vehicles-api"
import { listDriverLeave, type LeaveRequest } from "@/lib/leave-requests-api"
import { listChecks, type ApiCheckSummary } from "@/lib/walkaround-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function todayStr() { return toDateStr(new Date()) }

function weekBounds() {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7)); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { mon: toDateStr(mon), sun: toDateStr(sun), monDate: mon }
}

function fmtTime(iso?: string | null) {
  if (!iso) return "—"
  return iso.slice(11, 16)
}

function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

const STATUS_META: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  created:   { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50",   dot: "bg-blue-500"  },
  dispatched:{ label: "Dispatched", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50", dot: "bg-amber-500" },
  started:   { label: "Started",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50", dot: "bg-emerald-500" },
  completed: { label: "Completed",  cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  canceled:  { label: "Cancelled",  cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",     dot: "bg-red-500"   },
}

const STATUS_BORDER: Record<OrderStatus, string> = {
  created:    "border-l-blue-400",
  dispatched: "border-l-amber-400",
  started:    "border-l-emerald-500",
  completed:  "border-l-muted-foreground/30",
  canceled:   "border-l-red-400",
}

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function SkeletonLine({ w = "full", h = 4 }: { w?: string; h?: number }) {
  return <div className={`w-${w} h-${h} rounded-md bg-muted animate-pulse`} />
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accentCls, loading, href,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: React.ReactNode
  accentCls: string; loading?: boolean; href?: string
}) {
  const inner = (
    <div className={`relative rounded-2xl border bg-card p-5 shadow-sm overflow-hidden transition-shadow hover:shadow-md h-full ${href ? "cursor-pointer" : ""}`}>
      {/* Left accent bar */}
      <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${accentCls}`} />
      <div className="pl-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentCls.replace("bg-", "bg-").toString()} bg-opacity-10`}>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {loading ? (
          <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
        ) : (
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        )}
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

// ─── Trip Row ─────────────────────────────────────────────────────────────────

function TripRow({ trip }: { trip: Order }) {
  const sm = STATUS_META[trip.status] ?? STATUS_META.created
  const borderCls = STATUS_BORDER[trip.status] ?? "border-l-border"
  const unassigned = !trip.driver_assigned_uuid && !trip.driver_assigned

  return (
    <div className={`flex items-center gap-3 rounded-xl border-l-[3px] border border-border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-all ${borderCls}`}>
      {/* Time */}
      <div className="w-12 shrink-0 text-center">
        <p className="text-[11px] font-bold text-foreground">{fmtTime(trip.scheduled_at)}</p>
        <div className={`mt-0.5 mx-auto h-1.5 w-1.5 rounded-full ${sm.dot}`} />
      </div>

      {/* Route */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium text-foreground">{trip.pickup_name ?? trip.payload?.pickup_name ?? "—"}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-muted-foreground">{trip.dropoff_name ?? trip.payload?.dropoff_name ?? "—"}</span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">{trip.public_id}</p>
      </div>

      {/* Driver */}
      <div className="shrink-0 min-w-0 max-w-[100px] text-right">
        {unassigned ? (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[10px] font-medium">Unassigned</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 justify-end">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#496453]/15 text-[8px] font-bold text-[#496453]">
              {initials(trip.driver_assigned?.name ?? trip.driver_name)}
            </span>
            <span className="text-[10px] font-medium truncate text-foreground">{trip.driver_assigned?.name ?? trip.driver_name ?? "—"}</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${sm.cls}`}>
          {sm.label}
        </span>
      </div>
    </div>
  )
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────

function WeekBars({ trips }: { trips: Order[] }) {
  const { mon: monStr } = weekBounds()
  const today = todayStr()

  const counts = DAYS.map((_, i) => {
    const d = new Date(monStr)
    d.setDate(d.getDate() + i)
    const ds = toDateStr(d)
    return {
      label: DAYS[i],
      date: ds,
      count: trips.filter(t => t.scheduled_at?.slice(0, 10) === ds).length,
      isToday: ds === today,
    }
  })
  const max = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="flex items-end justify-between gap-1 h-20">
      {counts.map(({ label, count, isToday }) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center" style={{ height: 56 }}>
            <div
              className={`w-full rounded-t-sm transition-all ${isToday ? "bg-[#496453]" : "bg-muted-foreground/20"}`}
              style={{ height: `${Math.max((count / max) * 56, count > 0 ? 4 : 0)}px` }}
            />
          </div>
          <div className={`text-[9px] font-bold ${isToday ? "text-[#496453]" : "text-muted-foreground/60"}`}>{label}</div>
          <div className={`text-[9px] font-medium ${isToday ? "text-[#496453]" : "text-muted-foreground/40"}`}>{count}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Driver avatar grid ───────────────────────────────────────────────────────

function DriverGrid({
  drivers, leavesToday,
}: { drivers: Driver[]; leavesToday: LeaveRequest[] }) {
  const leaveUserUuids = new Set(leavesToday.map(l => l.user_uuid).filter(Boolean))
  const MAX = 20
  const shown = drivers.slice(0, MAX)

  return (
    <div className="flex flex-wrap gap-2">
      {shown.map(d => {
        const onLeave = leaveUserUuids.has(d.user_uuid ?? "")
        const leave = onLeave ? leavesToday.find(l => l.user_uuid === d.user_uuid) : null
        return (
          <div key={d.uuid} className="group relative flex flex-col items-center gap-1" title={d.name}>
            <div className={`relative flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold transition-transform group-hover:scale-110
              ${onLeave
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-2 ring-amber-300 dark:ring-amber-700"
                : "bg-[#496453]/15 text-[#496453] ring-2 ring-[#496453]/30"}`}
            >
              {initials(d.name)}
              {onLeave && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-500 ring-1 ring-background">
                  <CalendarOff className="h-1.5 w-1.5 text-white" />
                </span>
              )}
            </div>
            <p className="text-[8px] text-muted-foreground/60 w-10 truncate text-center leading-none">{d.name.split(" ")[0]}</p>
            {/* Tooltip on hover */}
            {onLeave && leave && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block whitespace-nowrap rounded-lg border bg-popover px-2 py-1 text-[9px] shadow-lg">
                {leave.leave_type} until {leave.end_date.slice(0, 10)}
              </div>
            )}
          </div>
        )
      })}
      {drivers.length > MAX && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
          +{drivers.length - MAX}
        </div>
      )}
    </div>
  )
}

// ─── Leave list ───────────────────────────────────────────────────────────────

function LeaveList({ leaves }: { leaves: LeaveRequest[] }) {
  const today = todayStr()
  const in7 = new Date(); in7.setDate(in7.getDate() + 7)
  const in7str = toDateStr(in7)

  const upcoming = leaves
    .filter(l => l.status === "Approved" && l.end_date.slice(0, 10) >= today && l.start_date.slice(0, 10) <= in7str)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 6)

  if (!upcoming.length) return (
    <p className="text-sm text-muted-foreground/60 text-center py-4">No upcoming leave in the next 7 days</p>
  )

  return (
    <div className="flex flex-col gap-2">
      {upcoming.map(l => (
        <div key={l.uuid} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-[9px] font-bold text-amber-700 dark:text-amber-400">
            {initials(l.user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{l.user?.name ?? "Driver"}</p>
            <p className="text-[10px] text-muted-foreground">{l.leave_type} · {l.start_date.slice(5,10)} → {l.end_date.slice(5,10)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border
            ${l.total_days <= 1 ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300"}`}
          >
            {l.total_days}d
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, href, linkLabel = "View all", loading, children }: {
  title: string; href?: string; linkLabel?: string; loading?: boolean; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-0.5 text-[11px] font-medium text-[#496453] hover:underline dark:text-emerald-400">
            {linkLabel} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = todayStr()
  const { mon, sun } = weekBounds()

  // Data state
  const [todayTrips,  setTodayTrips]  = React.useState<Order[]>([])
  const [weekTrips,   setWeekTrips]   = React.useState<Order[]>([])
  const [drivers,     setDrivers]     = React.useState<Driver[]>([])
  const [vehicles,    setVehicles]    = React.useState<Vehicle[]>([])
  const [leaves,      setLeaves]      = React.useState<LeaveRequest[]>([])
  const [checkSummary, setCheckSummary] = React.useState<ApiCheckSummary | null>(null)
  const [loading,     setLoading]     = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      listOrders({ scheduled_at: today, per_page: 200 }).then(r => setTodayTrips(
        (r.orders ?? []).sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
      )),
      listOrders({ scheduled_at: mon, end_date: sun, per_page: 500 }).then(r => setWeekTrips(r.orders ?? [])),
      listDrivers().then(r => setDrivers((r.drivers ?? []).filter(d => (d.status as string) !== "pending"))),
      listVehicles().then(r => setVehicles(r.vehicles ?? [])),
      listDriverLeave({ per_page: 500 }).then(r => setLeaves(r.data ?? [])),
      listChecks({ limit: 1 }).then(r => setCheckSummary((r as { summary?: ApiCheckSummary }).summary ?? null)),
    ]).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, mon, sun])

  // Derived values
  const leavesToday = leaves.filter(l =>
    l.start_date.slice(0, 10) <= today && l.end_date.slice(0, 10) >= today
  )
  const leaveUserUuids = new Set(leavesToday.map(l => l.user_uuid).filter(Boolean))
  const availableDrivers = drivers.filter(d => !leaveUserUuids.has(d.user_uuid ?? ""))
  const unassignedToday  = todayTrips.filter(t => !t.driver_assigned_uuid && !t.driver_assigned && t.status !== "canceled" && t.status !== "completed")
  const activeTrips      = todayTrips.filter(t => t.status === "started").length
  const completedTrips   = todayTrips.filter(t => t.status === "completed").length

  const checksTotal   = checkSummary?.checks_completed_today ?? 0
  const checksPending = checkSummary?.vehicles_pending_today ?? 0
  const defects       = checkSummary?.defects_reported_today ?? 0

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const dayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 overflow-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{greeting} 👋</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Calendar className="h-3.5 w-3.5" /> {dayLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/trips" className="flex items-center gap-1.5 rounded-lg bg-[#496453] px-3 py-2 text-xs font-semibold text-white shadow hover:bg-[#3a5244] transition-colors">
            <TrendingUp className="h-3.5 w-3.5" /> Trips
          </Link>
          <Link href="/rota" className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">
            <Calendar className="h-3.5 w-3.5" /> Rota
          </Link>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Clock}
          label="Trips Today"
          value={loading ? "—" : todayTrips.length}
          sub={loading ? null : (
            <span className="flex flex-wrap gap-2">
              {activeTrips > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium">{activeTrips} active</span>}
              {unassignedToday.length > 0 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">{unassignedToday.length} unassigned</span>
              )}
              {completedTrips > 0 && <span className="text-muted-foreground/60">{completedTrips} done</span>}
            </span>
          )}
          accentCls="bg-[#496453]"
          loading={loading}
          href="/trips"
        />
        <KpiCard
          icon={Users}
          label="Drivers Available"
          value={loading ? "—" : availableDrivers.length}
          sub={loading ? null : leavesToday.length > 0
            ? <span className="text-amber-600 dark:text-amber-400">{leavesToday.length} on leave today</span>
            : <span>of {drivers.length} total active</span>
          }
          accentCls="bg-blue-500"
          loading={loading}
          href="/drivers"
        />
        <KpiCard
          icon={Truck}
          label="Fleet Size"
          value={loading ? "—" : vehicles.length}
          sub={<span>vehicles registered</span>}
          accentCls="bg-violet-500"
          loading={loading}
          href="/vehicles"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Walkarounds Today"
          value={loading ? "—" : checksTotal}
          sub={loading ? null : (
            <span className="flex gap-2 flex-wrap">
              {checksPending > 0 && <span className="text-amber-600 dark:text-amber-400">{checksPending} pending</span>}
              {defects > 0 && <span className="text-red-600 dark:text-red-400 font-medium">{defects} defect{defects > 1 ? "s" : ""}</span>}
              {checksPending === 0 && defects === 0 && checksTotal > 0 && <span className="text-emerald-600">All clear ✓</span>}
            </span>
          )}
          accentCls={defects > 0 ? "bg-red-500" : checksPending > 0 ? "bg-amber-500" : "bg-emerald-500"}
          loading={loading}
          href="/compliance"
        />
      </div>

      {/* ── Operational row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Today's trips — 3/5 */}
        <div className="lg:col-span-3">
          <Section title="Today's Trips" href="/trips" loading={loading}>
            {todayTrips.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No trips scheduled for today</p>
                <Link href="/trips" className="text-xs text-[#496453] hover:underline dark:text-emerald-400">Create a trip →</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-0.5">
                {todayTrips.map(t => <TripRow key={t.uuid} trip={t} />)}
              </div>
            )}
            {unassignedToday.length > 0 && (
              <Link href="/rota" className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {unassignedToday.length} trip{unassignedToday.length > 1 ? "s" : ""} need{unassignedToday.length === 1 ? "s" : ""} a driver — open Rota
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </Link>
            )}
          </Section>
        </div>

        {/* Driver availability — 2/5 */}
        <div className="lg:col-span-2">
          <Section title="Driver Status" href="/drivers" linkLabel="All drivers" loading={loading}>
            {drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 text-center py-4">No drivers found</p>
            ) : (
              <>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#496453]" />
                    <span className="text-muted-foreground">{availableDrivers.length} available</span>
                  </div>
                  {leavesToday.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground">{leavesToday.length} on leave</span>
                    </div>
                  )}
                </div>
                <DriverGrid drivers={drivers} leavesToday={leavesToday} />
              </>
            )}
          </Section>
        </div>
      </div>

      {/* ── Detail row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* Week at a glance */}
        <Section title="Week at a Glance" href="/trips" linkLabel="All trips">
          {loading ? (
            <div className="h-20 bg-muted rounded-lg animate-pulse" />
          ) : (
            <>
              <WeekBars trips={weekTrips} />
              <p className="text-[10px] text-muted-foreground/60 text-center">{weekTrips.length} trips this week</p>
            </>
          )}
        </Section>

        {/* Walkaround summary */}
        <Section title="Compliance Snapshot" href="/compliance" linkLabel="View checks">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
            </div>
          ) : checkSummary ? (
            <div className="flex flex-col gap-2">
              {[
                { label: "Checks completed", value: checksTotal, icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400" },
                { label: "Vehicles pending", value: checksPending, icon: Circle, cls: checksPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
                { label: "Defects reported", value: defects, icon: AlertTriangle, cls: defects > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
                { label: "Advisories", value: checkSummary.advisory_reported_today, icon: AlertTriangle, cls: checkSummary.advisory_reported_today > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
              ].map(({ label, value, icon: Icon, cls }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${cls}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className={`text-sm font-bold ${cls}`}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60 text-center py-4">No check data available</p>
          )}
        </Section>

        {/* Upcoming leave */}
        <Section title="Upcoming Leave" href="/holidays" linkLabel="Manage">
          {loading
            ? <div className="flex flex-col gap-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
            : <LeaveList leaves={leaves} />
          }
        </Section>

      </div>

    </div>
  )
}
