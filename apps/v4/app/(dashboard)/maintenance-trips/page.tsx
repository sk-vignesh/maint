"use client"

import * as React from "react"
import {
  Search, RefreshCw, Download, Calendar, Clock,
  AlertCircle, ChevronRight, CheckCircle2, Loader2, X,
  Wrench,
} from "lucide-react"
import {
  listVehicleUnavailability,
  type LeaveRequest,
} from "@/lib/leave-requests-api"
import { useLang, LOCALE_TAG } from "@/components/lang-context"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function daysDiff(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
}

function isUpcoming(r: LeaveRequest) {
  return new Date(r.end_date) >= new Date()
}

function daysFromNowStr(iso: string, mt: typeof import("@/components/lang-context").translations["en"]["maintenance"]) {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0)   return mt.daysAgo.replace("{n}", String(Math.abs(diff)))
  if (diff === 0) return mt.today
  return mt.inDays.replace("{n}", String(diff))
}

function getStatusBadge(r: LeaveRequest, mt: typeof import("@/components/lang-context").translations["en"]["maintenance"]) {
  const now   = new Date()
  const start = new Date(r.start_date)
  const end   = new Date(r.end_date)
  if (now >= start && now <= end)
    return { label: mt.statusActive,    bg: "bg-amber-50 dark:bg-amber-900/20",     border: "border-amber-300/70 dark:border-amber-700/40",     text: "text-amber-700 dark:text-amber-300",     dot: "bg-amber-500" }
  if (now < start)
    return { label: mt.statusUpcoming,  bg: "bg-sky-50 dark:bg-sky-900/20",         border: "border-sky-300/70 dark:border-sky-700/40",         text: "text-sky-700 dark:text-sky-300",         dot: "bg-sky-500" }
  return       { label: mt.statusCompleted, bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-300/70 dark:border-emerald-700/40", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" }
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MaintenanceRow({ r, locale, mt }: {
  r: LeaveRequest
  locale: string
  mt: typeof import("@/components/lang-context").translations["en"]["maintenance"]
}) {
  const badge   = getStatusBadge(r, mt)
  const vehicle = r.vehicle_name ?? r.vehicle?.plate_number ?? "—"
  const make    = [r.vehicle?.make, r.vehicle?.model].filter(Boolean).join(" ")
  const days    = daysDiff(r.start_date, r.end_date)
  const reason  = r.reason || r.unavailability_type || "Maintenance"

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0">
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${badge.dot}`} />

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

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Calendar className="h-3.5 w-3.5" />
        <span>{fmtDate(r.start_date, locale)}</span>
        <ChevronRight className="h-3 w-3 opacity-40" />
        <span>{fmtDate(r.end_date, locale)}</span>
      </div>

      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-14 justify-end">
        <Clock className="h-3 w-3" />
        <span>{mt.durationDays.replace("{n}", String(days))}</span>
      </div>

      <div className="text-right shrink-0 w-20">
        <p className={`text-xs font-semibold ${badge.text}`}>
          {isUpcoming(r) ? daysFromNowStr(r.start_date, mt) : daysFromNowStr(r.end_date, mt)}
        </p>
        <p className="text-[10px] text-muted-foreground">{r.public_id}</p>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab, mt }: {
  tab: "upcoming" | "historical"
  mt: typeof import("@/components/lang-context").translations["en"]["maintenance"]
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <CheckCircle2 className="h-10 w-10 text-emerald-400/50" />
      <p className="font-semibold">
        {tab === "upcoming" ? mt.noUpcoming : mt.noHistorical}
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {tab === "upcoming" ? mt.noUpcomingDesc : mt.noHistoricalDesc}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenanceTripsPage() {
  const { t, dateLocale } = useLang()
  const mt = t.maintenance

  const [tab, setTab]         = React.useState<"upcoming" | "historical">("upcoming")
  const [records, setRecords] = React.useState<LeaveRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError]     = React.useState<string | null>(null)
  const [search, setSearch]   = React.useState("")
  const [refreshKey, setRefreshKey] = React.useState(0)

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    listVehicleUnavailability({ per_page: 500, sort: "-start_date" })
      .then(res => setRecords(res.data ?? []))
      .catch(err => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshKey(k => k + 1)
    setTimeout(() => setRefreshing(false), 800)
  }

  const now        = new Date()
  const upcoming   = records.filter(r => new Date(r.end_date) >= now)
  const historical = records.filter(r => new Date(r.end_date) < now)
  const pool       = tab === "upcoming" ? upcoming : historical

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

  return (
    <div className="flex h-full flex-col gap-3 p-4 md:p-5 overflow-hidden">

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border bg-muted/30 p-1">
          {(["upcoming", "historical"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                ${tab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "upcoming"
                ? <Wrench className="h-3.5 w-3.5" />
                : <Clock className="h-3.5 w-3.5" />}
              {t === "upcoming" ? mt.upcoming : mt.historical}
              <span className={`rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums
                ${tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"}`}>
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
            placeholder={mt.searchPlaceholder}
            className="h-8 w-full rounded-lg border bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Record count */}
          {!loading && !error && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {search
                ? `${filtered.length} ${mt.ofRecords} ${pool.length} ${mt.records}`
                : `${pool.length} ${mt.records}`}
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{mt.refresh}</span>
          </button>

          {/* Export */}
          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{mt.export}</span>
          </button>
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border bg-card shadow-sm">

        {/* Column header */}
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-muted/80 backdrop-blur-sm px-4 py-2.5">
          <div className="w-2.5 shrink-0" />
          <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colVehicle}</span>
          <span className="hidden sm:block w-56 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colDateRange}</span>
          <span className="hidden md:block w-14 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colDays}</span>
          <span className="w-20 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colWhen}</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{mt.loading}</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-20">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <p className="text-sm font-medium text-rose-600">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {mt.tryAgain}
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && <EmptyState tab={tab} mt={mt} />}

        {/* Rows */}
        {!loading && !error && filtered.length > 0 && (
          <div>
            {filtered.map(r => (
              <MaintenanceRow key={r.uuid} r={r} locale={dateLocale} mt={mt} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
