"use client"

import * as React from "react"
import { PageHeader } from "@/components/page-header"
import {
  Search, RefreshCw, Download, Wrench, Calendar, Clock,
  AlertCircle, ChevronRight, CheckCircle2, Car, Loader2,
  SlidersHorizontal, X,
} from "lucide-react"
import {
  listVehicleUnavailability,
  type LeaveRequest,
} from "@/lib/leave-requests-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function daysDiff(start: string, end: string) {
  const s = new Date(start), e = new Date(end)
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000))
}

function isUpcoming(r: LeaveRequest) {
  return new Date(r.end_date) >= new Date()
}

function daysFromNow(iso: string) {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0)  return `${Math.abs(diff)}d ago`
  if (diff === 0) return "Today"
  return `In ${diff}d`
}

function statusBadge(r: LeaveRequest) {
  const now = new Date()
  const start = new Date(r.start_date)
  const end   = new Date(r.end_date)
  if (now >= start && now <= end) return { label: "Active",    bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-300/70", text: "text-amber-700 dark:text-amber-300",   dot: "bg-amber-500" }
  if (now < start)                return { label: "Upcoming",  bg: "bg-sky-50 dark:bg-sky-900/20",       border: "border-sky-300/70",    text: "text-sky-700 dark:text-sky-300",       dot: "bg-sky-500" }
  return                                 { label: "Completed", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-300/70", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" }
}

// ─── Row card ─────────────────────────────────────────────────────────────────

function MaintenanceRow({ r }: { r: LeaveRequest }) {
  const badge   = statusBadge(r)
  const vehicle = r.vehicle_name ?? r.vehicle?.plate_number ?? "Unknown vehicle"
  const make    = [r.vehicle?.make, r.vehicle?.model].filter(Boolean).join(" ")
  const days    = daysDiff(r.start_date, r.end_date)
  const reason  = r.reason || r.unavailability_type || "Maintenance"

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0">
      {/* Status dot */}
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${badge.dot}`} />

      {/* Vehicle info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold font-mono text-sm">{vehicle}</span>
          {make && <span className="text-xs text-muted-foreground">{make}</span>}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.border} ${badge.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{reason}</p>
      </div>

      {/* Date range */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Calendar className="h-3.5 w-3.5" />
        <span>{fmtDate(r.start_date)}</span>
        <ChevronRight className="h-3 w-3 opacity-40" />
        <span>{fmtDate(r.end_date)}</span>
      </div>

      {/* Duration */}
      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-16 justify-end">
        <Clock className="h-3 w-3" />
        <span>{days}d</span>
      </div>

      {/* Relative time */}
      <div className="text-right shrink-0">
        <p className={`text-xs font-semibold ${badge.text}`}>
          {isUpcoming(r) ? daysFromNow(r.start_date) : daysFromNow(r.end_date)}
        </p>
        <p className="text-[10px] text-muted-foreground">{r.public_id}</p>
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, colorClass }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; colorClass: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-4.5 w-4.5 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: "upcoming" | "historical" }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-400/60" />
      <p className="font-semibold text-foreground">
        {tab === "upcoming" ? "No upcoming maintenance" : "No historical records"}
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {tab === "upcoming"
          ? "All vehicles are currently available — no downtime scheduled."
          : "No past maintenance events found for the selected filters."}
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MaintenanceTripsPage() {
  const [tab, setTab]         = React.useState<"upcoming" | "historical">("upcoming")
  const [records, setRecords] = React.useState<LeaveRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError]     = React.useState<string | null>(null)
  const [search, setSearch]   = React.useState("")
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Fetch on mount and refresh
  React.useEffect(() => {
    setLoading(true)
    setError(null)
    listVehicleUnavailability({ per_page: 500, sort: "-start_date" })
      .then(res => setRecords(res.data ?? []))
      .catch(err => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [refreshKey])

  // Split into upcoming vs historical
  const now = new Date()
  const upcoming   = records.filter(r => new Date(r.end_date) >= now)
  const historical = records.filter(r => new Date(r.end_date) <  now)

  // Current tab data filtered by search
  const pool = tab === "upcoming" ? upcoming : historical
  const filtered = search.trim()
    ? pool.filter(r => {
        const q = search.toLowerCase()
        return (
          (r.vehicle_name ?? "").toLowerCase().includes(q) ||
          (r.vehicle?.plate_number ?? "").toLowerCase().includes(q) ||
          (r.vehicle?.make ?? "").toLowerCase().includes(q) ||
          (r.vehicle?.model ?? "").toLowerCase().includes(q) ||
          (r.reason ?? "").toLowerCase().includes(q) ||
          r.public_id.toLowerCase().includes(q)
        )
      })
    : pool

  // KPI stats
  const active   = records.filter(r => new Date(r.start_date) <= now && new Date(r.end_date) >= now)
  const next7d   = upcoming.filter(r => {
    const diff = (new Date(r.start_date).getTime() - now.getTime()) / 86400000
    return diff >= 0 && diff <= 7
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-500" />
            <h1 className="text-xl font-bold tracking-tight">Maintenance Trips</h1>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Vehicle downtime and off-road events from the calendar
          </p>
        </div>
        {active.length > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            {active.length} vehicle{active.length > 1 ? "s" : ""} currently off road
          </div>
        )}
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 shrink-0">
        <KPICard label="Currently Off Road"  value={active.length}    sub="active right now"        icon={Car}            colorClass="bg-amber-500" />
        <KPICard label="Next 7 Days"         value={next7d.length}    sub="scheduled downtime"      icon={Calendar}       colorClass="bg-sky-500" />
        <KPICard label="Total Upcoming"      value={upcoming.length}  sub="scheduled ahead"         icon={Wrench}         colorClass="bg-indigo-500" />
        <KPICard label="Historical"          value={historical.length} sub="completed events"       icon={CheckCircle2}   colorClass="bg-emerald-500" />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border bg-muted/30 p-1">
          {(["upcoming", "historical"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors
                ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "upcoming" ? <Calendar className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {t === "upcoming" ? "Upcoming" : "Historical"}
              <span className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums
                ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {t === "upcoming" ? upcoming.length : historical.length}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vehicle, reason…"
            className="h-8 w-full rounded-lg border bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export */}
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Result count ──────────────────────────────────────────────── */}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground shrink-0">
          {search ? `${filtered.length} of ${pool.length}` : pool.length} record{pool.length !== 1 ? "s" : ""}
          {search && <button onClick={() => setSearch("")} className="ml-1.5 text-primary hover:underline">clear</button>}
        </p>
      )}

      {/* ── List ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border bg-card shadow-sm">

        {/* List header */}
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-muted/80 backdrop-blur-sm px-4 py-2.5">
          <div className="w-2.5 shrink-0" />
          <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vehicle</span>
          <span className="hidden sm:block w-52 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Date Range</span>
          <span className="hidden md:block w-16 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Days</span>
          <span className="w-16 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">When</span>
        </div>

        {/* States */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Loading maintenance events…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-20">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <p className="text-sm font-medium text-rose-600">{error}</p>
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && <EmptyState tab={tab} />}

        {!loading && !error && filtered.length > 0 && (
          <div>
            {filtered.map(r => <MaintenanceRow key={r.uuid} r={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}
