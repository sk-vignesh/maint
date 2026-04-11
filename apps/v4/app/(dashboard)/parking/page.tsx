"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  Search, Download, Plus, RefreshCw, X, Loader2,
  AlertCircle, Trash2, Filter, ChevronLeft, ChevronRight, Pencil,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import {
  listParkingReports, createParkingReport, updateParkingReport,
  deleteParkingReport, bulkDeleteFuelReports, exportFuelReports,
  REPORT_STATUSES, PARKING_PAYMENT_METHODS,
  type ParkingReport, type CreateParkingPayload,
} from "@/lib/fuel-reports-api"
import { listVehicles, type Vehicle } from "@/lib/vehicles-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700",
  approved: "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
  rejected: "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-700",
}

const STATUS_DOT: Record<string, string> = {
  pending:  "bg-amber-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
}

// ─── Add/Edit Slide-Over ──────────────────────────────────────────────────────

const EMPTY_FORM: CreateParkingPayload = {
  report_type: "Parking",
  driver_uuid: "", vehicle_uuid: "", reported_by_uuid: "me",
  status: "pending", amount: 0, currency: "GBP", payment_method: "Card",
}

function ParkingSlideOver({ record, vehicles, drivers, onClose, onSaved }: {
  record: ParkingReport | null
  vehicles: Vehicle[]
  drivers: Driver[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLang()
  const c = t.common
  const isEdit = !!record
  const [form, setForm] = React.useState<CreateParkingPayload>(
    record
      ? {
          report_type: "Parking",
          driver_uuid: record.driver?.uuid ?? record.driver_uuid ?? "",
          vehicle_uuid: record.vehicle?.uuid ?? record.vehicle_uuid ?? "",
          reported_by_uuid: record.reported_by_uuid ?? "me",
          status: record.status,
          amount: record.amount,
          currency: record.currency,
          payment_method: (record.payment_method as "Card" | "Other") ?? "Card",
          card_type: record.card_type ?? "",
          odometer: record.odometer ?? "",
          report: record.report ?? "",
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  const set = <K extends keyof CreateParkingPayload>(k: K, v: CreateParkingPayload[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError("")
    setSaving(true)
    try {
      const payload = { ...form, amount: Number(form.amount) }
      if (isEdit && record) {
        await updateParkingReport(record.uuid, payload)
      } else {
        await createParkingReport(payload)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const input = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
  const sel = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-bold">{isEdit ? c.edit : c.addNew} Parking</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{isEdit ? `Editing ${record?.public_id}` : c.createRecord}</p>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${c.driver} *`}>
              <select value={form.driver_uuid} onChange={e => set("driver_uuid", e.target.value)} className={sel}>
                <option value="">Select driver…</option>
                {drivers.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
              </select>
            </Field>
            <Field label={`${c.vehicle} *`}>
              <select value={form.vehicle_uuid} onChange={e => set("vehicle_uuid", e.target.value)} className={sel}>
                <option value="">Select vehicle…</option>
                {vehicles.map(v => <option key={v.uuid} value={v.uuid}>{v.plate_number}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${c.amount} *`}><input type="number" step="0.01" min="0" value={form.amount} onChange={e => set("amount", Number(e.target.value))} className={input} /></Field>
            <Field label="Currency *"><input value={form.currency} onChange={e => set("currency", e.target.value)} className={input} placeholder="GBP" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${c.method} *`}>
              <select value={form.payment_method} onChange={e => set("payment_method", e.target.value as "Card" | "Other")} className={sel}>
                {PARKING_PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Card Type"><input value={form.card_type ?? ""} onChange={e => set("card_type", e.target.value)} className={input} placeholder="Visa, Mastercard…" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${c.status} *`}>
              <select value={form.status} onChange={e => set("status", e.target.value as "pending" | "approved" | "rejected")} className={sel}>
                {REPORT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label={c.odometer}><input value={form.odometer ?? ""} onChange={e => set("odometer", e.target.value)} className={input} placeholder="45200" /></Field>
          </div>
          <Field label={`${c.notes} / ${c.location}`}>
            <textarea value={form.report ?? ""} onChange={e => set("report", e.target.value)} className="h-16 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Parking at Manchester depot, Bay 12…" />
          </Field>
        </div>

        <div className="flex gap-2 border-t p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">{c.cancel}</button>
          <button onClick={handleSave} disabled={saving || !form.driver_uuid || !form.vehicle_uuid}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? c.saving : isEdit ? c.save : c.createRecord}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

type Filters = { vehicle: string; status: string; start_date: string; end_date: string }
const EMPTY_FILTERS: Filters = { vehicle: "", status: "", start_date: "", end_date: "" }

function FilterPanel({ open, onClose, filters, setFilters, vehicles }: {
  open: boolean; onClose: () => void
  filters: Filters; setFilters: (f: Filters) => void
  vehicles: Vehicle[]
}) {
  const [local, setLocal] = React.useState<Filters>(filters)
  const set = <K extends keyof Filters>(k: K, v: string) => setLocal(f => ({ ...f, [k]: v }))
  React.useEffect(() => { setLocal(filters) }, [filters])
  const active = Object.values(filters).filter(Boolean).length
  if (!open) return null
  const sel = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold">{c.filter} Parking</h2>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{c.vehicle}</label>
            <select value={local.vehicle} onChange={e => set("vehicle", e.target.value)} className={sel}>
              <option value="">Any vehicle</option>
              {vehicles.map(v => <option key={v.uuid} value={v.uuid}>{v.plate_number}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{c.status}</label>
            <select value={local.status} onChange={e => set("status", e.target.value)} className={sel}>
              <option value="">Any status</option>
              {REPORT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date from</label>
            <input type="date" value={local.start_date} onChange={e => set("start_date", e.target.value)} className={sel} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date to</label>
            <input type="date" value={local.end_date} onChange={e => set("end_date", e.target.value)} className={sel} />
          </div>
        </div>
        <div className="flex gap-2 border-t p-4">
          <button onClick={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS) }} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">{c.clearAll}</button>
          <button onClick={() => { setFilters(local); onClose() }} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {c.apply}{active > 0 ? ` (${active})` : ""}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParkingPage() {
  const { t } = useLang()
  const c = t.common

  const [records, setRecords] = React.useState<ParkingReport[]>([])
  const [meta, setMeta] = React.useState({ total: 0, last_page: 1, current_page: 1 })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const [search, setSearch] = React.useState("")
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [slideOver, setSlideOver] = React.useState<ParkingReport | null | "new">(null)
  const [showFilter, setShowFilter] = React.useState(false)
  const [showCards, setShowCards] = React.useState(false)
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const [exporting, setExporting] = React.useState(false)

  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [drivers, setDrivers] = React.useState<Driver[]>([])

  const searchRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  React.useEffect(() => {
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(searchRef.current)
  }, [search])

  const fetchData = React.useCallback(async (p = page) => {
    setLoading(true)
    setError("")
    try {
      const res = await listParkingReports({
        page: p, limit: 15,
        query: debouncedSearch || undefined,
        vehicle: filters.vehicle || undefined,
        status: filters.status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      })
      const raw = res as unknown as Record<string, unknown>
      const rows = (raw.fuel_reports ?? raw.data ?? []) as ParkingReport[]
      setRecords(rows)
      const m = res.meta ?? { total: 0, last_page: 1, current_page: 1 }
      setMeta({ total: m.total, last_page: m.last_page, current_page: m.current_page })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, filters])

  React.useEffect(() => {
    listVehicles({ limit: 999 }).then(r => setVehicles(r.vehicles)).catch(() => {})
    listDrivers({ limit: 999 }).then(r => setDrivers(r.drivers ?? [])).catch(() => {})
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setPage(1); fetchData(1) }, [debouncedSearch, filters])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { fetchData(page) }, [page])

  const handleDelete = async (uuid: string) => {
    if (!confirm("Delete this parking record?")) return
    setDeleting(uuid)
    try { await deleteParkingReport(uuid); fetchData(page) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed") }
    finally { setDeleting(null) }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} record(s)?`)) return
    try { await bulkDeleteFuelReports([...selected]); setSelected(new Set()); fetchData(page) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed") }
  }

  const handleExport = async () => {
    setExporting(true)
    try { await exportFuelReports({ report_type: "parking", format: "xlsx", from_date: filters.start_date || undefined, to_date: filters.end_date || undefined }) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Export failed") }
    finally { setExporting(false) }
  }

  const handleApprove = async (uuid: string, newStatus: "approved" | "rejected") => {
    try { await updateParkingReport(uuid, { status: newStatus }); fetchData(page) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Update failed") }
  }

  const toggleSelect = (uuid: string) =>
    setSelected(s => { const n = new Set(s); if (n.has(uuid)) n.delete(uuid); else n.add(uuid); return n })
  const toggleAll = () =>
    setSelected(s => s.size === records.length ? new Set() : new Set(records.map(r => r.uuid)))

  const activeFilters = Object.values(filters).filter(Boolean).length
  const totalCost = records.reduce((a, r) => a + Number(r.amount ?? 0), 0)
  const pendingCount = records.filter(r => r.status === "pending").length
  const freeCount = records.filter(r => r.amount === 0).length

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* KPI Cards — toggled by Stats button */}
      {showCards && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Records",    value: meta.total,       sub: "all time",        colour: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",           icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
            { label: "Cost (this page)", value: `£${totalCost.toFixed(2)}`,              sub: "excl. VAT",        colour: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: "Pending Approval", value: pendingCount,     sub: "awaiting review", colour: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",       icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: "Free Nights",      value: freeCount,        sub: "no charge",        colour: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20",  icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> },
          ].map(k => (
            <div key={k.label} className="relative flex flex-col gap-2 rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{k.label}</span>
                <span className={`rounded-lg p-1.5 ${k.colour}`}>{k.icon}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums leading-none">
                {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" /> : k.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div data-help="toolbar" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex-1" />

          {selected.size > 0 && (
            <button onClick={handleBulkDelete}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Delete {selected.size}
            </button>
          )}

          <div className={`relative transition-all duration-200 ${searchFocused ? "w-72" : "w-40"}`}>
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search vehicle, driver…" value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
            <button onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${activeFilters > 0 || showFilter ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>
              <Filter className="h-3 w-3" /> Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </button>
            <button onClick={() => setShowCards(v => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${showCards ? "bg-blue-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2 13V8M6 13V5M10 13V7M14 13V3" /></svg>
              Stats
            </button>
          </div>

          <span className="h-6 w-px bg-border" />

          <button onClick={() => fetchData(page)} title="Refresh"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleExport} disabled={exporting} title="Export"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </button>

          <span className="h-6 w-px bg-border" />

          <button onClick={() => setSlideOver("new")}
            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            {c.addNew}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">No parking records found</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-10 px-3 py-2.5 text-center"><input type="checkbox" checked={selected.size === records.length && records.length > 0} onChange={toggleAll} className="rounded" /></th>
                  {[c.ref, c.date, c.vehicle, c.driver, c.amount, c.method, c.odometer, c.notes, c.status, ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.uuid} className="border-b last:border-0 transition-colors hover:bg-muted/20">
                    <td className="w-10 px-3 py-2.5 text-center"><input type="checkbox" checked={selected.has(r.uuid)} onChange={() => toggleSelect(r.uuid)} className="rounded" /></td>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary whitespace-nowrap">{r.public_id}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-4 py-2.5 font-mono font-bold whitespace-nowrap">{r.vehicle?.plate_number ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.driver?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      {Number(r.amount ?? 0) === 0 ? <span className="text-green-600 dark:text-green-400">Free</span> : `${r.currency} ${Number(r.amount ?? 0).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.payment_method ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.odometer ?? "—"}</td>
                    <td className="px-4 py-2.5 max-w-[180px]"><p className="truncate text-xs text-muted-foreground">{r.report ?? "—"}</p></td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-[100px] border pl-1 pr-3 text-[11px] font-medium capitalize leading-[2] ${STATUS_STYLES[r.status] ?? ""}`}>
                        <span className={`mr-2 ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[r.status] ?? "bg-gray-400"}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.status === "pending" ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleApprove(r.uuid, "approved")}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                            {c.approve}
                          </button>
                          <button onClick={() => handleApprove(r.uuid, "rejected")}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                            {c.reject}
                          </button>
                          <button onClick={() => setSlideOver(r)} title="Edit"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSlideOver(r)} title="Edit"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDelete(r.uuid)} disabled={deleting === r.uuid} title="Delete"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40">
                            {deleting === r.uuid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={11} className="px-4 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>{meta.total} records · Page {meta.current_page} of {meta.last_page}</span>
                      {meta.last_page > 1 && (
                        <span className="flex items-center gap-1">
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="h-6 w-6 rounded border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                            className="h-6 w-6 rounded border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {slideOver !== null && (
        <ParkingSlideOver
          record={slideOver === "new" ? null : slideOver}
          vehicles={vehicles} drivers={drivers}
          onClose={() => setSlideOver(null)}
          onSaved={() => fetchData(page)}
        />
      )}
      <FilterPanel open={showFilter} onClose={() => setShowFilter(false)} filters={filters} setFilters={setFilters} vehicles={vehicles} />
    </div>
  )
}
