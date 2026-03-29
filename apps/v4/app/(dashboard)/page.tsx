"use client"
import * as React from "react"
import Link from "next/link"
import {
  Truck, Users, CalendarOff, TrendingUp,
  MapPin, ArrowRight, Clock, AlertTriangle,
  CheckCircle2, Calendar, ChevronRight, Wrench, Car,
} from "lucide-react"
import { listOrders,  type Order, type OrderStatus } from "@/lib/orders-api"
import { listDrivers, type Driver }                  from "@/lib/drivers-api"
import { listVehicles, type Vehicle }                from "@/lib/vehicles-api"
import { listDriverLeave, listVehicleUnavailability, type LeaveRequest } from "@/lib/leave-requests-api"
import { useLang, LOCALE_TAG } from "@/components/lang-context"

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toDateStr(d: Date) { return d.toISOString().slice(0, 10) }
function todayStr()         { return toDateStr(new Date()) }
function weekBounds() {
  const now = new Date()
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { mon: toDateStr(mon), sun: toDateStr(sun) }
}
function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}
function fmtTime(iso?: string | null) { return iso ? iso.slice(11, 16) : "—" }

// ─── Trip status config ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<OrderStatus, { label:string; cls:string; dot:string; border:string }> = {
  created:    { label:"Scheduled",  cls:"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40",      dot:"bg-blue-400",             border:"border-l-blue-400"             },
  dispatched: { label:"Dispatched", cls:"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40",  dot:"bg-amber-400",            border:"border-l-amber-400"            },
  started:    { label:"Started",    cls:"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",                   dot:"bg-emerald-500",          border:"border-l-emerald-500"          },
  completed:  { label:"Completed",  cls:"bg-muted text-muted-foreground border-border",                                                                    dot:"bg-muted-foreground/50",  border:"border-l-muted-foreground/30"  },
  canceled:   { label:"Cancelled",  cls:"bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40",              dot:"bg-red-400",              border:"border-l-red-400"              },
}



// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, gradient, glowColor, loading, href,
}: {
  icon: React.ElementType; label: string; value: string | number
  sub?: React.ReactNode; gradient: string; glowColor: string
  loading?: boolean; href?: string
}) {
  const inner = (
    <div className="relative flex flex-col gap-3 rounded-2xl border bg-card p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl group h-full">
      <div className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full ${glowColor} blur-2xl opacity-15 group-hover:opacity-25 transition-opacity`} />
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      {loading
        ? <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
        : <p className="text-4xl font-black tracking-tight leading-none">{value}</p>}
      {!loading && sub && <div className="text-[11px] text-muted-foreground mt-auto">{sub}</div>}
    </div>
  )
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner
}

// ─── Trip Row ─────────────────────────────────────────────────────────────────

function TripRow({ trip }: { trip: Order }) {
  const { t } = useLang()
  const c = t.common
  const statusLabels: Record<string,string> = { created:c.scheduled, dispatched:c.dispatched, started:c.started, completed:c.completed, canceled:c.cancelled }
  const s = STATUS_BADGE[trip.status] ?? STATUS_BADGE.created
  const noDriver = !trip.driver_assigned_uuid && trip.status !== "completed" && trip.status !== "canceled"
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-l-[3px] border-border bg-background/60 px-4 py-3 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 ${s.border}`}>
      <div className="flex w-11 shrink-0 flex-col items-center">
        <p className="text-[12px] font-bold tabular-nums">{fmtTime(trip.scheduled_at)}</p>
        <div className={`mt-1 h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 text-[11px]">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          <span className="font-semibold truncate">{trip.pickup_name ?? trip.payload?.pickup_name ?? "—"}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <span className="truncate text-muted-foreground/70">{trip.dropoff_name ?? trip.payload?.dropoff_name ?? "—"}</span>
        </div>
        {noDriver
          ? <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-2.5 w-2.5" /><span className="text-[10px] font-semibold">{c.noDriverAssigned}</span></div>
          : <p className="text-[10px] text-muted-foreground/60">{trip.driver_assigned?.name ?? trip.driver_name ?? c.driverAssigned}</p>
        }
      </div>
      <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide ${s.cls}`}>
        {statusLabels[trip.status] ?? s.label}
      </span>
    </div>
  )
}

// ─── Week sparkline bars ──────────────────────────────────────────────────────

function WeekBars({ trips }: { trips: Order[] }) {
  const { t } = useLang()
  const rt = t.rota
  const DAYS = [rt.mon, rt.tue, rt.wed, rt.thu, rt.fri, rt.sat, rt.sun]
  const { mon } = weekBounds()
  const today = todayStr()
  const bars = DAYS.map((lbl, i) => {
    const d = new Date(mon); d.setDate(d.getDate() + i)
    const ds = toDateStr(d)
    return { lbl, ds, count: trips.filter(t => t.scheduled_at?.slice(0,10) === ds).length, isToday: ds === today }
  })
  const max = Math.max(...bars.map(b => b.count), 1)
  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
      {bars.map(b => (
        <div key={b.lbl} className="flex flex-1 flex-col items-center gap-1">
          <div className="w-full flex items-end justify-center" style={{ height: 52 }}>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${b.isToday ? "bg-gradient-to-t from-[#496453] to-[#5d8068]" : "bg-gradient-to-t from-muted-foreground/25 to-muted-foreground/10"}`}
              style={{ height: `${Math.max((b.count / max) * 52, b.count > 0 ? 6 : 0)}px` }}
            />
          </div>
          <p className={`text-[9px] font-bold ${b.isToday ? "text-[#496453]" : "text-muted-foreground/50"}`}>{b.lbl}</p>
          {b.count > 0 && <p className={`text-[8px] ${b.isToday ? "text-[#496453]" : "text-muted-foreground/40"}`}>{b.count}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Driver grid ──────────────────────────────────────────────────────────────

function DriverGrid({ drivers, leavesToday }: { drivers: Driver[]; leavesToday: LeaveRequest[] }) {
  const leaveSet = new Set(leavesToday.map(l => l.user_uuid).filter(Boolean))
  const shown = drivers.slice(0, 24)
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map(d => {
        const onLeave = leaveSet.has(d.user_uuid ?? "")
        const leave = onLeave ? leavesToday.find(l => l.user_uuid === d.user_uuid) : null
        return (
          <div key={d.uuid} className="group relative flex flex-col items-center gap-1" title={d.name}>
            <div className={`relative flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black transition-transform group-hover:scale-110
              ${onLeave
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-400 dark:ring-amber-600"
                : "bg-gradient-to-br from-[#496453]/20 to-[#496453]/10 text-[#496453] ring-2 ring-[#496453]/30"}`}
            >
              {initials(d.name)}
              {onLeave && <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 ring-1 ring-background"><CalendarOff className="h-1.5 w-1.5 text-white" /></span>}
              {!onLeave && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />}
            </div>
            <p className="w-9 truncate text-center text-[8px] leading-none text-muted-foreground/50">{d.name.split(" ")[0]}</p>
            {onLeave && leave && (
              <div className="absolute -top-10 left-1/2 z-20 hidden -translate-x-1/2 group-hover:block whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-[10px] shadow-xl">
                <p className="font-semibold">{d.name}</p>
                <p className="text-muted-foreground">{leave.leave_type} · until {leave.end_date.slice(0,10)}</p>
              </div>
            )}
          </div>
        )
      })}
      {drivers.length > 24 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">+{drivers.length - 24}</div>
      )}
    </div>
  )
}

// ─── Vehicle maintenance list (real data from leave-requests API) ─────────────

function VehicleMaintenanceList({ events }: { events: LeaveRequest[] }) {
  const { dateLocale } = useLang()
  const today = todayStr()
  // Show upcoming + ongoing vehicle unavailability events, sorted soonest first
  const rows = events
    .filter(e => e.end_date.slice(0, 10) >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 6)

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Truck className="h-8 w-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground/60">No upcoming vehicle downtime</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(e => {
        const isOngoing = e.start_date.slice(0, 10) <= today
        const startFmt  = new Date(e.start_date).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })
        const endFmt    = new Date(e.end_date).toLocaleDateString(dateLocale,   { day: "numeric", month: "short" })
        return (
          <div key={e.uuid} className={`flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2.5 shadow-sm hover:shadow-md transition-all border-l-[3px] ${isOngoing ? "border-l-amber-400" : "border-l-slate-300 dark:border-l-slate-600"}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isOngoing ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"}`}>
              <Car className={`h-3.5 w-3.5 ${isOngoing ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold font-mono truncate">{e.vehicle_name ?? "Vehicle"}</p>
              <p className="text-[10px] text-muted-foreground">{e.leave_type}{e.reason ? ` · ${e.reason}` : ""}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold text-foreground">{startFmt} → {endFmt}</p>
              {isOngoing && <p className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Ongoing</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Upcoming leave list ──────────────────────────────────────────────────────

function LeaveList({ leaves }: { leaves: LeaveRequest[] }) {
  const today = todayStr()
  const in7   = new Date(); in7.setDate(in7.getDate() + 7)
  const in7s  = toDateStr(in7)
  const rows  = leaves
    .filter(l => l.status === "Approved" && l.end_date.slice(0,10) >= today && l.start_date.slice(0,10) <= in7s)
    .sort((a,b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 6)
  const { t: _t } = useLang()
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground/50">{_t.common.noUpcomingLeave}</p>
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(l => (
        <div key={l.uuid} className="flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-[9px] font-black text-amber-700 dark:text-amber-400">
            {initials(l.user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{l.user?.name ?? "Driver"}</p>
            <p className="text-[10px] text-muted-foreground">{l.leave_type} · {l.start_date.slice(5,10)} → {l.end_date.slice(5,10)}</p>
          </div>
          <span className="shrink-0 rounded-full border bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
            {l.total_days}d
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, href, linkLabel="View all", loading, icon: Icon, children }: {
  title:string; href?:string; linkLabel?:string; loading?:boolean; icon?:React.ElementType; children:React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" />}
          <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-0.5 text-[11px] font-semibold text-[#496453] hover:underline dark:text-emerald-400">
            {linkLabel} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {loading
        ? <div className="flex flex-col gap-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}</div>
        : children}
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t, dateLocale } = useLang()
  const today        = todayStr()
  const { mon, sun } = weekBounds()

  const [todayTrips,    setTodayTrips]    = React.useState<Order[]>([])
  const [weekTrips,     setWeekTrips]     = React.useState<Order[]>([])
  const [drivers,       setDrivers]       = React.useState<Driver[]>([])
  const [vehicles,      setVehicles]      = React.useState<Vehicle[]>([])
  const [leaves,        setLeaves]        = React.useState<LeaveRequest[]>([])
  const [maintEvents,   setMaintEvents]   = React.useState<LeaveRequest[]>([])
  const [loading,       setLoading]       = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      listOrders({ scheduled_at: today, per_page: 200 }).then(r =>
        setTodayTrips((r.orders ?? []).sort((a,b) => (a.scheduled_at??"").localeCompare(b.scheduled_at??"")))
      ),
      listOrders({ scheduled_at: mon, end_date: sun, per_page: 500 }).then(r => setWeekTrips(r.orders ?? [])),
      listDrivers().then(r => setDrivers((r.drivers ?? []).filter(d => (d.status as string) !== "pending"))),
      listVehicles().then(r => setVehicles(r.vehicles ?? [])),
      listDriverLeave({ per_page: 500 }).then(r => setLeaves(r.data ?? [])),
      listVehicleUnavailability({ per_page: 200 }).then(r => setMaintEvents(r.data ?? [])),
    ]).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, mon, sun])

  // Derived
  const leavesToday  = leaves.filter(l => l.start_date.slice(0,10) <= today && l.end_date.slice(0,10) >= today)
  const leaveSet     = new Set(leavesToday.map(l => l.user_uuid).filter(Boolean))
  const availDrivers = drivers.filter(d => !leaveSet.has(d.user_uuid ?? ""))
  const unassigned   = todayTrips.filter(t => !t.driver_assigned_uuid && !t.driver_assigned && t.status !== "canceled" && t.status !== "completed")
  const activeTrips  = todayTrips.filter(t => t.status === "started").length
  const doneTrips    = todayTrips.filter(t => t.status === "completed").length
  const ongoingMaint = maintEvents.filter(e => e.start_date.slice(0,10) <= today && e.end_date.slice(0,10) >= today).length

  const hr       = new Date().getHours()
  const c = t.common
  const greeting = hr < 12 ? c.goodMorning : hr < 17 ? c.goodAfternoon : c.goodEvening
  const dayLabel = new Date().toLocaleDateString(dateLocale, { weekday:"long", day:"numeric", month:"long", year:"numeric" })

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-5 overflow-auto">

      {/* ── Compact Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight">{greeting} 👋</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />{dayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/trips" className="flex items-center gap-2 rounded-xl bg-[#496453] px-3.5 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#3a5244] transition-all active:scale-95">
            <TrendingUp className="h-3.5 w-3.5" /> {t.nav.trips}
          </Link>
          <Link href="/rota" className="flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-sm font-semibold hover:bg-muted transition-all">
            <Calendar className="h-3.5 w-3.5" /> {t.nav.rota}
          </Link>
        </div>
      </div>

      {/* Unassigned alert — only shown when relevant */}
      {!loading && unassigned.length > 0 && (
        <Link href="/rota" className="flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50/80 dark:border-amber-700/40 dark:bg-amber-900/20 px-4 py-2.5 text-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 transition-colors">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>{c.needsDriver.replace("{n}", String(unassigned.length))}</span>
          <ChevronRight className="ml-auto h-4 w-4 text-amber-500" />
        </Link>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Clock} label={c.tripsToday} value={loading ? "—" : todayTrips.length}
          sub={<span className="flex flex-wrap gap-2">
            {activeTrips > 0 && <span className="font-semibold text-emerald-600 dark:text-emerald-400">● {activeTrips} {c.active2}</span>}
            {doneTrips > 0 && <span className="text-muted-foreground/70">{doneTrips} {c.done}</span>}
            {!activeTrips && !doneTrips && todayTrips.length > 0 && <span>{c.awaitingDispatch}</span>}
          </span>}
          gradient="from-[#496453] to-[#5d8068]" glowColor="bg-[#496453]" loading={loading} href="/trips"
        />
        <KpiCard
          icon={Users} label={c.driversAvailable} value={loading ? "—" : availDrivers.length}
          sub={leavesToday.length > 0
            ? <span className="font-semibold text-amber-600 dark:text-amber-400">{leavesToday.length} {c.onLeave}</span>
            : drivers.length > 0 ? <span>{c.ofTotal.replace("{n}", String(drivers.length))}</span> : undefined}
          gradient="from-blue-500 to-indigo-600" glowColor="bg-blue-500" loading={loading} href="/drivers"
        />
        <KpiCard
          icon={Truck} label={c.fleetSize} value={loading ? "—" : vehicles.length}
          sub={ongoingMaint > 0
            ? <span className="font-semibold text-amber-600 dark:text-amber-400">{c.vehiclesOff.replace("{n}", String(ongoingMaint))}</span>
            : <span>{c.vehiclesRegistered}</span>}
          gradient="from-violet-500 to-purple-600" glowColor="bg-violet-500" loading={loading} href="/vehicles"
        />
        <KpiCard
          icon={TrendingUp} label={c.thisWeek} value={loading ? "—" : weekTrips.length}
          sub={<span>{c.tripsMonSun}</span>}
          gradient="from-orange-500 to-amber-500" glowColor="bg-orange-500" loading={loading} href="/trips"
        />
      </div>

      {/* ── Operational Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Section title={c.todaysTrips} href="/trips" icon={Clock} loading={loading}>
            {todayTrips.length === 0
              ? <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><CheckCircle2 className="h-7 w-7 text-muted-foreground/30" /></div>
                  <div><p className="font-semibold text-muted-foreground">{c.noTripsToday}</p><p className="mt-0.5 text-sm text-muted-foreground/60">{c.nothingScheduled}</p></div>
                  <Link href="/trips" className="text-sm font-semibold text-[#496453] hover:underline dark:text-emerald-400">{c.createTrip}</Link>
                </div>
              : <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-0.5">{todayTrips.map(t => <TripRow key={t.uuid} trip={t} />)}</div>
            }
          </Section>
        </div>
        <div className="lg:col-span-2">
          <Section title={c.driverStatus} href="/drivers" linkLabel={c.allDrivers} icon={Users} loading={loading}>
            {drivers.length === 0
              ? <p className="py-6 text-center text-sm text-muted-foreground/60">{c.noData}</p>
              : <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-muted-foreground">{availDrivers.length} {c.available}</span></div>
                    {leavesToday.length > 0 && <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-muted-foreground">{leavesToday.length} {c.onLeave}</span></div>}
                    <p className="ml-auto text-[10px] text-muted-foreground/50 font-medium">{Math.round((availDrivers.length / Math.max(drivers.length, 1)) * 100)}% {c.available}</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#496453] to-emerald-400 transition-all duration-700" style={{ width: `${(availDrivers.length / Math.max(drivers.length, 1)) * 100}%` }} />
                  </div>
                  <DriverGrid drivers={drivers} leavesToday={leavesToday} />
                </div>
            }
          </Section>
        </div>
      </div>

      {/* ── Detail Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Section title={c.weekAtGlance} href="/trips" icon={TrendingUp}>
          {loading
            ? <div className="h-24 rounded-xl bg-muted animate-pulse" />
            : <><WeekBars trips={weekTrips} /><p className="text-center text-[10px] text-muted-foreground/50 mt-1">{weekTrips.length} {c.tripsMonSun}</p></>}
        </Section>

        <Section title={c.vehicleDowntime} href="/calendar" linkLabel={c.viewCalendar} icon={Wrench} loading={loading}>
          <VehicleMaintenanceList events={maintEvents} />
        </Section>

        <Section title={c.upcomingLeave} href="/holidays" linkLabel={c.manage} icon={CalendarOff}>
          {loading
            ? <div className="flex flex-col gap-2">{[1,2,3].map(i => <div key={i} className="h-11 rounded-xl bg-muted animate-pulse" />)}</div>
            : <LeaveList leaves={leaves} />}
        </Section>
      </div>

    </div>
  )
}
