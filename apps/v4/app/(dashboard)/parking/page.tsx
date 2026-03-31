"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  Search, Download, Plus, RefreshCw, X, Loader2,
  AlertCircle, Trash2, Filter, ChevronLeft, ChevronRight,
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
  pending:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
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
            <h2 className="text-base font-bold">{isEdit ? "Edit Parking Record" : "Add Parking Record"}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{isEdit ? `Editing ${record?.public_id}` : "Create a new parking expense record"}</p>
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
            <Field label="Driver *">
              <select value={form.driver_uuid} onChange={e => set("driver_uuid", e.target.value)} className={sel}>
                <option value="">Select driver…</option>
                {drivers.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Vehicle *">
              <select value={form.vehicle_uuid} onChange={e => set("vehicle_uuid", e.target.value)} className={sel}>
                <option value="">Select vehicle…</option>
                {vehicles.map(v => <option key={v.uuid} value={v.uuid}>{v.plate_number}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount *"><input type="number" step="0.01" min="0" value={form.amount} onChange={e => set("amount", Number(e.target.value))} className={input} /></Field>
            <Field label="Currency *"><input value={form.currency} onChange={e => set("currency", e.target.value)} className={input} placeholder="GBP" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment Method *">
              <select value={form.payment_method} onChange={e => set("payment_method", e.target.value as "Card" | "Other")} className={sel}>
                {PARKING_PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Card Type"><input value={form.card_type ?? ""} onChange={e => set("card_type", e.target.value)} className={input} placeholder="Visa, Mastercard…" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status *">
              <select value={form.status} onChange={e => set("status", e.target.value as "pending" | "approved" | "rejected")} className={sel}>
                {REPORT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Odometer"><input value={form.odometer ?? ""} onChange={e => set("odometer", e.target.value)} className={input} placeholder="45200" /></Field>
          </div>
          <Field label="Notes / Location">
            <textarea value={form.report ?? ""} onChange={e => set("report", e.target.value)} className="h-16 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Parking at Manchester depot, Bay 12…" />
          </Field>
        </div>

        <div className="flex gap-2 border-t p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.driver_uuid || !form.vehicle_uuid}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Record"}
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
          <h2 className="font-bold">Filter Parking</h2>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Vehicle</label>
            <select value={local.vehicle} onChange={e => set("vehicle", e.target.value)} className={sel}>
              <option value="">Any vehicle</option>
              {vehicles.map(v => <option key={v.uuid} value={v.uuid}>{v.plate_number}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
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
          <button onClick={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS) }} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Clear all</button>
          <button onClick={() => { setFilters(local); onClose() }} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Apply{active > 0 ? ` (${active})` : ""}
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
      setRecords(res.fuel_reports)
      setMeta({ total: res.meta.total, last_page: res.meta.last_page, current_page: res.meta.current_page })
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
  const totalCost = records.reduce((a, r) => a + (r.amount ?? 0), 0)
  const pendingCount = records.filter(r => r.status === "pending").length
  const freeCount = records.filter(r => r.amount === 0).length

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader pageKey="parkingMonitoring" />
          <p className="mt-1 text-sm text-muted-foreground">{t.pages.parkingMonitoring.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {c.export}
          </button>
          <button onClick={() => setSlideOver("new")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> {c.addNew}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Records", value: meta.total },
          { label: "Total Cost (page)", value: `£${totalCost.toFixed(2)}` },
          { label: "Pending Approval", value: pendingCount },
          { label: "Free / Depot Nights", value: freeCount },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle, driver…"
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={() => setShowFilter(true)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${activeFilters > 0 ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}>
          <Filter className="h-3.5 w-3.5" /> Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
        <button onClick={() => fetchData(page)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        {selected.size > 0 && (
          <button onClick={handleBulkDelete}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-sm text-red-700 hover:bg-red-100 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
            <Trash2 className="h-3.5 w-3.5" /> Delete {selected.size}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No parking records found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5"><input type="checkbox" checked={selected.size === records.length && records.length > 0} onChange={toggleAll} className="rounded" /></th>
                {[c.ref, c.date, c.vehicle, c.driver, c.amount, "Payment", "Odometer", "Notes", c.status, c.action].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.uuid} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(r.uuid)} onChange={() => toggleSelect(r.uuid)} className="rounded" /></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{r.public_id}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-4 py-2.5 font-mono font-bold whitespace-nowrap">{r.vehicle?.plate_number ?? "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{r.driver?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                    {r.amount === 0 ? <span className="text-green-600 dark:text-green-400">Free</span> : `${r.currency} ${r.amount?.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.payment_method ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.odometer ?? "—"}</td>
                  <td className="px-4 py-2.5 max-w-[180px]">
                    <p className="truncate text-xs text-muted-foreground">{r.report ?? "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLES[r.status] ?? ""}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {r.status === "pending" ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApprove(r.uuid, "approved")} className="text-xs text-green-600 hover:underline">{c.approve}</button>
                        <button onClick={() => handleApprove(r.uuid, "rejected")} className="text-xs text-red-500 hover:underline">{c.reject}</button>
                        <button onClick={() => setSlideOver(r)} className="text-xs text-muted-foreground hover:underline">Edit</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSlideOver(r)} className="text-xs text-indigo-500 hover:underline">{c.view}</button>
                        <button onClick={() => handleDelete(r.uuid)} disabled={deleting === r.uuid}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50">{deleting === r.uuid ? "…" : "Del"}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td colSpan={11} className="px-4 py-2 text-xs text-muted-foreground">
                  {meta.total} {c.records} · {c.totalCost}: £{totalCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {meta.current_page} of {meta.last_page}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="h-8 w-8 rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
              className="h-8 w-8 rounded-lg border bg-background text-muted-foreground hover:bg-muted disabled:opacity-40 flex items-center justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
