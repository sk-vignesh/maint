"use client"

import * as React from "react"
import {
  Search, RefreshCw, Download, Calendar, Clock,
  AlertCircle, ChevronRight, CheckCircle2, Loader2, X, Plus, Trash2, Wrench,
} from "lucide-react"
import {
  listVehicleUnavailability, createLeaveRequest, updateLeaveRequest, deleteLeaveRequest,
  type LeaveRequest,
} from "@/lib/leave-requests-api"
import { listVehicles, type Vehicle } from "@/lib/vehicles-api"
import { useLang } from "@/components/lang-context"
import { DatePicker } from "@/components/date-picker"

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

function vehicleLabel(v: Vehicle) {
  const parts = [v.plate_number, v.make, v.model, v.year].filter(Boolean)
  return parts.join(" · ")
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MaintenanceRow({
  r, locale, mt, onClick,
}: {
  r: LeaveRequest
  locale: string
  mt: typeof import("@/components/lang-context").translations["en"]["maintenance"]
  onClick: () => void
}) {
  const badge   = getStatusBadge(r, mt)
  const vehicle = r.vehicle_name ?? r.vehicle?.plate_number ?? "—"
  const make    = [r.vehicle?.make, r.vehicle?.model].filter(Boolean).join(" ")
  const days    = daysDiff(r.start_date, r.end_date)
  const reason  = r.reason || r.unavailability_type || "Maintenance"

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0 cursor-pointer"
    >
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

// ─── Drawer ───────────────────────────────────────────────────────────────────

function MaintenanceDrawer({
  open, record, vehicles, onClose, onSaved,
}: {
  open:     boolean
  record:   LeaveRequest | null
  vehicles: Vehicle[]
  onClose:  () => void
  onSaved:  () => void
}) {
  const isEdit = !!record

  const [vehicleUuid, setVehicleUuid] = React.useState("")
  const [startDate,   setStartDate]   = React.useState("")
  const [endDate,     setEndDate]     = React.useState("")
  const [reason,      setReason]      = React.useState("")
  const [saving,      setSaving]      = React.useState(false)
  const [deleting,    setDeleting]    = React.useState(false)
  const [error,       setError]       = React.useState<string | null>(null)

  React.useEffect(() => {
    if (record) {
      setVehicleUuid(record.vehicle_uuid ?? "")
      setStartDate(record.start_date?.slice(0, 10) ?? "")
      setEndDate(record.end_date?.slice(0, 10) ?? "")
      setReason(record.reason ?? "")
    } else {
      setVehicleUuid(""); setStartDate(""); setEndDate(""); setReason("")
    }
    setError(null)
  }, [record, open])

  const handleSave = async () => {
    if (!vehicleUuid && !isEdit) { setError("Please select a vehicle."); return }
    if (!startDate) { setError("Start date is required."); return }
    if (!endDate)   { setError("End date is required.");   return }
    setSaving(true); setError(null)
    try {
      if (isEdit && record) {
        await updateLeaveRequest(record.uuid, {
          user_uuid:  record.user_uuid ?? null,
          start_date: startDate,
          end_date:   endDate,
          reason:     reason || undefined,
        })
      } else {
        await createLeaveRequest({
          vehicle_uuid:        vehicleUuid,
          start_date:          startDate,
          end_date:            endDate,
          reason:              reason || undefined,
          unavailability_type: "vehicle",
        })
      }
      onSaved(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!record) return
    if (!confirm("Delete this maintenance record?")) return
    setDeleting(true); setError(null)
    try { await deleteLeaveRequest(record.uuid); onSaved(); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : "Delete failed") }
    finally   { setDeleting(false) }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">
              {isEdit ? "Edit Maintenance Period" : "New Maintenance Period"}
            </h2>
            {isEdit && record && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{record.public_id}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Vehicle */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</label>
            {isEdit ? (
              <p className="text-sm font-medium font-mono">
                {record?.vehicle_name ?? record?.vehicle?.plate_number ?? "—"}
                {(record?.vehicle?.make || record?.vehicle?.model) && (
                  <span className="ml-2 font-sans text-muted-foreground font-normal text-xs">
                    {[record?.vehicle?.make, record?.vehicle?.model].filter(Boolean).join(" ")}
                  </span>
                )}
              </p>
            ) : (
              <select value={vehicleUuid} onChange={e => setVehicleUuid(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select a vehicle…</option>
                {vehicles.map(v => (
                  <option key={v.uuid} value={v.uuid}>{vehicleLabel(v)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start Date *</label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">End Date *</label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" align="end" />
            </div>
          </div>

          {/* Duration hint */}
          {startDate && endDate && (
            <p className="text-xs text-muted-foreground">
              Duration: <span className="font-semibold text-foreground">{daysDiff(startDate, endDate)} day{daysDiff(startDate, endDate) !== 1 ? "s" : ""}</span>
            </p>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason / Notes</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="e.g. Annual service, tyre replacement, MOT…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3">
          {isEdit ? (
            <button onClick={handleDelete} disabled={deleting}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="h-8 rounded-lg border bg-background px-4 text-sm text-muted-foreground hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Record"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenanceTripsPage() {
  const { t, dateLocale } = useLang()
  const mt = t.maintenance

  const [tab,        setTab]        = React.useState<"upcoming" | "historical">("upcoming")
  const [records,    setRecords]    = React.useState<LeaveRequest[]>([])
  const [vehicles,   setVehicles]   = React.useState<Vehicle[]>([])
  const [loading,    setLoading]    = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error,      setError]      = React.useState<string | null>(null)
  const [search,     setSearch]     = React.useState("")
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editRecord, setEditRecord] = React.useState<LeaveRequest | null>(null)

  React.useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      listVehicleUnavailability({ per_page: 500, sort: "-start_date" }),
      listVehicles({ limit: 500, sort: "plate_number" }),
    ])
      .then(([leavesRes, vehiclesRes]) => {
        setRecords(leavesRes.data ?? [])
        setVehicles(vehiclesRes.vehicles ?? [])
      })
      .catch(err => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshKey(k => k + 1)
    setTimeout(() => setRefreshing(false), 800)
  }

  const openCreate = () => { setEditRecord(null); setDrawerOpen(true) }
  const openEdit   = (r: LeaveRequest) => { setEditRecord(r); setDrawerOpen(true) }

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

      {/* ── Toolbar ── */}
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
          {!loading && !error && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {search
                ? `${filtered.length} ${mt.ofRecords} ${pool.length} ${mt.records}`
                : `${pool.length} ${mt.records}`}
            </span>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{mt.refresh}</span>
          </button>

          <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs text-muted-foreground hover:bg-muted transition-colors">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{mt.export}</span>
          </button>

          <span className="h-6 w-px bg-border" />

          <button onClick={openCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 min-h-0 overflow-auto rounded-xl border bg-card shadow-sm">

        {/* Column header */}
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-muted/80 backdrop-blur-sm px-4 py-2.5">
          <div className="w-2.5 shrink-0" />
          <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colVehicle}</span>
          <span className="hidden sm:block w-56 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colDateRange}</span>
          <span className="hidden md:block w-14 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colDays}</span>
          <span className="w-20 text-right text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{mt.colWhen}</span>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{mt.loading}</p>
          </div>
        )}

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

        {!loading && !error && filtered.length === 0 && <EmptyState tab={tab} mt={mt} />}

        {!loading && !error && filtered.length > 0 && (
          <div>
            {filtered.map(r => (
              <MaintenanceRow
                key={r.uuid} r={r} locale={dateLocale} mt={mt}
                onClick={() => openEdit(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      <MaintenanceDrawer
        open={drawerOpen}
        record={editRecord}
        vehicles={vehicles}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleRefresh}
      />
    </div>
  )
}
