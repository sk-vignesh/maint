"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  MoreHorizontal, Search, Filter, Download,
  X, Loader2, AlertCircle, Send, Trash2, UserCheck, Plus, ChevronDown,
  RefreshCw, Upload, HelpCircle, CheckCircle2, FileText,
  ChevronRight as ArrowRight, XCircle,
} from "lucide-react"

import {
  listOrders, createOrder, updateOrder, deleteOrder, dispatchOrder,
  type Order, type OrderStatus, type CreateOrderPayload,
} from "@/lib/orders-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"
import { listFleets, type Fleet } from "@/lib/fleets-api"
import { listPlaces, type Place } from "@/lib/places-api"
import { listVehicles, type Vehicle } from "@/lib/vehicles-api"
import { dedupBy } from "@/lib/utils"
import { ontrackFetch } from "@/lib/ontrack-api"

import { AgGridReact } from "ag-grid-react"
import {
  type ColDef, type ICellRendererParams,
  ModuleRegistry, AllCommunityModule,
  themeQuartz,
} from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

// ─── AG Grid themes (light + dark) ────────────────────────────────────────────
// Use the JS Theming API so font, colors, and spacing are all in one place
// and automatically co-ordinate with the app's Montserrat / design tokens.

const baseParams = {
  fontFamily: "var(--font-sans, 'Montserrat', 'Inter', system-ui, sans-serif)",
  fontSize: 13,
  rowHeight: 36,
  headerHeight: 38,
  // Match app background / card tokens
  backgroundColor: "var(--background, #ffffff)",
  foregroundColor: "var(--foreground, #1a1a1a)",
  headerBackgroundColor: "var(--muted, #f5f5f5)",
  headerTextColor: "var(--muted-foreground, #666666)",
  borderColor: "var(--border, #e5e7eb)",
  rowBorder: false,          // no bottom cell borders — clean like inventory demo
  sideBySideBorders: false,
  wrapperBorder: false,      // remove grid outer border
  headerRowBorder: false,
  columnBorder: false,
  cellHorizontalPaddingScale: 1.1,
  rowVerticalPaddingScale: 1,
  // Selection
  selectedRowBackgroundColor: "var(--accent, #f0f0f0)",
  // Spacing
  gridSize: 5,
}

const lightTheme = themeQuartz.withParams({
  ...baseParams,
  backgroundColor: "#ffffff",
  foregroundColor: "#1f2933",
  headerBackgroundColor: "#f9fafb",
  headerTextColor: "#39485d",
  borderColor: "#eff0f1",
  rowHoverColor: "#f5f7fb",
  selectedRowBackgroundColor: "#edf2ff",
})

const darkTheme = themeQuartz.withParams({
  ...baseParams,
  backgroundColor: "#141414",
  foregroundColor: "#e5e5e5",
  headerBackgroundColor: "#1e2531",
  headerTextColor: "#c9d0da",
  borderColor: "#2a2a2a",
  rowHoverColor: "#1f2937",
  selectedRowBackgroundColor: "#1e3a5f",
})

// ─── Status Config ────────────────────────────────────────────────────────────

const statusStyles: Record<OrderStatus, string> = {
  created:    "bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700",
  dispatched: "bg-violet-100 text-violet-800 ring-1 ring-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-700",
  started:    "bg-sky-100 text-sky-800 ring-1 ring-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-700",
  completed:  "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700",
  canceled:   "bg-rose-100 text-rose-800 ring-1 ring-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-700",
}

const statusDot: Record<OrderStatus, string> = {
  created:    "bg-amber-500",
  dispatched: "bg-violet-500",
  started:    "bg-sky-500",
  completed:  "bg-emerald-500",
  canceled:   "bg-rose-500",
}

const ALL_STATUSES: OrderStatus[] = ["created", "dispatched", "started", "completed", "canceled"]

// ─── Helper ───────────────────────────────────────────────────────────────────

function fleetLabel(order: Order): string {
  if (order.fleet_name) return order.fleet_name
  if (order.fleet_uuid) return order.fleet_uuid.slice(0, 8) + "…"
  return "—"
}

function driverInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?"
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const day   = d.getDate().toString().padStart(2, "0")
  const month = d.toLocaleString("en-GB", { month: "short" })
  const year  = d.getFullYear().toString().slice(-2)
  const time  = d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${day} ${month} ${year} ${time}`
}

// ─── Place Search Combobox ────────────────────────────────────────────────────

function PlaceSearchSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: string   // uuid
  onChange: (uuid: string, name: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<Place[]>([])
  const [open, setOpen] = React.useState(false)
  const [selectedName, setSelectedName] = React.useState("")
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await listPlaces({ query: query || undefined, limit: 30 })
        setResults(dedupBy(res.places ?? [], "uuid"))
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const displayValue = selectedName || (value ? value.slice(0, 12) + "…" : "")

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={`Search ${label.toLowerCase()}…`}
          value={open ? query : displayValue}
          onFocus={() => { setOpen(true); setQuery("") }}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border bg-card shadow-lg">
          <div className="max-h-48 overflow-y-auto py-1">
            {results.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {query ? "No places found" : "Type to search places…"}
              </p>
            )}
            {results.map((p) => (
              <button
                key={p.uuid}
                type="button"
                onClick={() => {
                  onChange(p.uuid, p.name)
                  setSelectedName(p.name)
                  setOpen(false)
                  setQuery("")
                }}
                className="flex w-full flex-col px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
              >
                <span className="font-medium">{p.name}</span>
                {(p.code || p.address) && (
                  <span className="text-muted-foreground truncate">
                    {[p.code, p.address].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assign Driver Dropdown ───────────────────────────────────────────────────

function AssignDriverDropdown({
  order,
  drivers,
  onAssigned,
}: {
  order: Order
  drivers: Driver[]
  onAssigned: (driverUuid: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleSelect = async (driver: Driver) => {
    setLoading(true)
    setOpen(false)
    try {
      await updateOrder(order.uuid, { driver_assigned_uuid: driver.uuid })
      onAssigned(driver.uuid)
    } finally {
      setLoading(false)
    }
  }

  const current = drivers.find((d) => d.uuid === order.driver_assigned_uuid)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <UserCheck className="h-3 w-3" />
        {loading ? "Saving…" : current ? current.name : "Assign Driver"}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border bg-card shadow-lg">
          <div className="max-h-52 overflow-y-auto py-1">
            {drivers.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No drivers available</p>
            )}
            {drivers.map((d) => (
              <button
                key={d.uuid}
                onClick={() => handleSelect(d)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold uppercase">
                  {driverInitial(d.name)}
                </span>
                <span className="flex-1 truncate font-medium">{d.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    d.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {d.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Filter Panel ───────────────────────────────────────────────────────────

type Filters = {
  status: string
  driver_uuid: string
  fleet_uuid: string
  pickup: string
  dropoff: string
  date_from: string
  date_to: string
}

const EMPTY_FILTERS: Filters = {
  status: "",
  driver_uuid: "",
  fleet_uuid: "",
  pickup: "",
  dropoff: "",
  date_from: "",
  date_to: "",
}

function FilterPanel({
  open, onClose, filters, setFilters, drivers, fleets,
}: {
  open: boolean
  onClose: () => void
  filters: Filters
  setFilters: (f: Filters) => void
  drivers: Driver[]
  fleets: Fleet[]
}) {
  const [local, setLocal] = React.useState<Filters>(filters)
  const set = <K extends keyof Filters>(k: K, v: string) => setLocal(f => ({ ...f, [k]: v }))
  const activeCount = Object.values(filters).filter(Boolean).length

  React.useEffect(() => { setLocal(filters) }, [filters])

  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-base">Filter Trips</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Narrow results by any column</p>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select value={local.status} onChange={e => set("status", e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">All statuses</option>
              {ALL_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Driver */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Driver</label>
            <select value={local.driver_uuid} onChange={e => set("driver_uuid", e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Any driver</option>
              {drivers.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
            </select>
          </div>

          {/* Fleet */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fleet</label>
            <select value={local.fleet_uuid} onChange={e => set("fleet_uuid", e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Any fleet</option>
              {fleets.map(f => <option key={f.uuid} value={f.uuid}>{f.name}</option>)}
            </select>
          </div>

          {/* Pickup */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Pickup contains</label>
            <input type="text" placeholder="e.g. Warehouse A" value={local.pickup}
              onChange={e => set("pickup", e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Dropoff */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Dropoff contains</label>
            <input type="text" placeholder="e.g. Customer HQ" value={local.dropoff}
              onChange={e => set("dropoff", e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Date range */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Scheduled from</label>
            <input type="date" value={local.date_from} onChange={e => set("date_from", e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Scheduled to</label>
            <input type="date" value={local.date_to} onChange={e => set("date_to", e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex gap-2 border-t p-4">
          <button onClick={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS) }}
            className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            Clear all
          </button>
          <button onClick={() => { setFilters(local); onClose() }}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Apply{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── CSV Import Wizard ───────────────────────────────────────────────────

type ImportStep = "upload" | "creating-places" | "importing" | "done" | "error"

function ImportWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = React.useState<ImportStep>("upload")
  const [file, setFile] = React.useState<File | null>(null)
  const [result, setResult] = React.useState<{ created: number; updated: number; errors: {row:number;message:string}[]; failed_rows_file?: string } | null>(null)
  const [placeResult, setPlaceResult] = React.useState<{ created: number; errors: {row:number;message:string}[] } | null>(null)
  const [errMsg, setErrMsg] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const runImport = async () => {
    if (!file) return
    try {
      // Step 1 — create missing places
      setStep("creating-places")
      const fd1 = new FormData()
      fd1.append("file", file)
      const pr = await ontrackFetch<{ created: number; errors: {row:number;message:string}[] }>(
        "/orders/process-import-create-missing-places",
        { method: "POST", body: fd1 }
      )
      setPlaceResult(pr)

      // Step 2 — import orders
      setStep("importing")
      const fd2 = new FormData()
      fd2.append("file", file)
      const ir = await ontrackFetch<{ created: number; updated: number; errors: {row:number;message:string}[]; failed_rows_file?: string }>(
        "/orders/process-import-orders",
        { method: "POST", body: fd2 }
      )
      setResult(ir)
      setStep("done")
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Import failed")
      setStep("error")
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={step === "upload" ? onClose : undefined} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-base">Import Trips</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload an Excel or CSV file to bulk-create trips</p>
          </div>
          <button onClick={onClose} className="rounded-lg border p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">

          {/* Format guide */}
          {step === "upload" && (
            <>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required columns</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[["block_id","Groups rows into one trip"],["driver_name","Matched to existing driver"],["plate_number","Matched to vehicle"],["scheduled_at","Date/time of pickup"],["estimated_end_date","Expected end date/time"],["pickup_code","Place code for pickup"],["dropoff_code","Place code for dropoff"],["fleet_name","Fleet assignment"]].map(([col,desc]) => (
                    <div key={col}>
                      <span className="font-mono font-medium">{col}</span>
                      <span className="ml-1 text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 py-10 transition-colors hover:border-primary/40 hover:bg-muted/20"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">{file ? file.name : "Click to select file"}</p>
                  <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv accepted</p>
                </div>
                {file && <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Ready to import</span>}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </>
          )}

          {/* Progress */}
          {(step === "creating-places" || step === "importing") && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">{step === "creating-places" ? "Step 1 / 2 — Creating missing places…" : "Step 2 / 2 — Importing trips…"}</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a moment for large files</p>
              </div>
              {placeResult && step === "importing" && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 px-4 py-2 text-xs text-green-700 dark:text-green-400">
                  ✓ {placeResult.created} places created
                </div>
              )}
            </div>
          )}

          {/* Done */}
          {step === "done" && result && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-950/20 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Import complete</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                    {result.created} created · {result.updated} updated
                    {placeResult && ` · ${placeResult.created} places created`}
                  </p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
                  <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">{result.errors.length} rows had errors</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-600 dark:text-amber-400">Row {e.row}: {e.message}</p>
                    ))}
                  </div>
                  {result.failed_rows_file && (
                    <a href={result.failed_rows_file} className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 underline" target="_blank" rel="noreferrer">
                      <FileText className="h-3 w-3" /> Download error log
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-950/20 p-4">
              <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">Import failed</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errMsg}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t p-4">
          {step === "upload" && (
            <>
              <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={runImport} disabled={!file}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                Start Import
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={() => { onDone(); onClose() }}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Done — Refresh List
            </button>
          )}
          {step === "error" && (
            <>
              <button onClick={() => setStep("upload")} className="flex-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Try Again</button>
              <button onClick={onClose} className="flex-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted">Close</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Help Walkthrough ───────────────────────────────────────────────────────

const HELP_STEPS = [
  {
    id: "search",
    title: "Search",
    icon: "🔍",
    description: "Type anything to instantly filter by Public ID, Internal ID, Trip Hash, Driver name, Pickup or Dropoff location. Search runs client-side — no waiting for API responses.",
  },
  {
    id: "filters",
    title: "Filters Panel",
    icon: "⚙️",
    description: "Click \"Filters\" to open a panel where you can narrow trips by Status, Driver, Fleet, Pickup/Dropoff name, and a Scheduled date range. Active filters show a badge count. Click \"Clear all\" to reset.",
  },
  {
    id: "status-filter",
    title: "Status Quick Filter",
    icon: "🏷️",
    description: "Use the Status dropdown in the toolbar to quickly jump to one status: Created, Dispatched, Started, Completed, or Cancelled. This triggers a server-side API refetch for accuracy.",
  },
  {
    id: "new-trip",
    title: "New Trip",
    icon: "➕",
    description: "Open the New Trip slide-over to create an order. Fill in the fleet, driver, vehicle (all from live dropdowns), then set pickup and dropoff by searching your saved Places. Add scheduled dates and dispatch immediately if needed.",
  },
  {
    id: "row-actions",
    title: "Row Actions",
    icon: "⋯",
    description: "Each row has a ⋯ menu. From here you can: Dispatch a trip (sends it to the driver in real-time), Assign or reassign a driver (shown with their active/inactive status), or Delete the trip after confirmation.",
  },
  {
    id: "import",
    title: "Bulk Import",
    icon: "📥",
    description: "Click Import to upload an Excel or CSV file. The wizard runs in two steps: first it geocodes and creates any missing Places, then it bulk-creates or updates all trips. Errors are shown row-by-row and a download link for failed rows is provided.",
  },
  {
    id: "refresh",
    title: "Refresh",
    icon: "🔄",
    description: "Manually refetch the latest trips from the API. Useful after making external changes or after an import completes. The page also auto-refreshes when you create or import new trips.",
  },
  {
    id: "pagination",
    title: "Pagination",
    icon: "📄",
    description: "The table loads 50 trips per page. Use Prev / Next at the bottom to navigate. The total count is shown above the table. Status filter and page reset automatically when you change filters.",
  },
]

function HelpWalkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = React.useState(0)
  const current = HELP_STEPS[step]
  const isLast = step === HELP_STEPS.length - 1

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card shadow-2xl">
          {/* Progress bar */}
          <div className="flex gap-1 rounded-t-2xl bg-muted/40 px-5 pt-4 pb-3">
            {HELP_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted-foreground/20"
                }`}
                title={s.title}
              />
            ))}
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-start gap-4">
              <span className="text-4xl leading-none">{current.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step + 1} of {HELP_STEPS.length}
                </p>
                <h3 className="mt-0.5 text-xl font-bold">{current.title}</h3>
              </div>
              <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{current.description}</p>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              Back
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
                Skip tour
              </button>
              {isLast ? (
                <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Done
                </button>
              ) : (
                <button onClick={() => setStep(s => s + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Row Actions Menu ──────────────────────────────────────────────────────────

function RowMenu({
  order,
  drivers,
  onAssigned,
  onDelete,
  onDispatch,
}: {
  order: Order
  drivers: Driver[]
  onAssigned: (driverUuid: string) => void
  onDelete: () => void
  onDispatch: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const canDispatch =
    order.status === "created" && !!order.driver_assigned_uuid

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border bg-card py-1 shadow-lg">
          {/* Dispatch */}
          {canDispatch && (
            <button
              onClick={() => { setOpen(false); onDispatch() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-purple-600 transition-colors hover:bg-muted dark:text-purple-400"
            >
              <Send className="h-3.5 w-3.5" /> Dispatch
            </button>
          )}

          {/* Assign Driver */}
          <div className="px-2 py-1">
            <AssignDriverDropdown order={order} drivers={drivers} onAssigned={(uuid) => { setOpen(false); onAssigned(uuid) }} />
          </div>

          <div className="my-1 border-t" />

          {/* Delete */}
          <button
            onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-muted"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Trip
          </button>
        </div>
      )}
    </div>
  )
}

// ─── New Trip Form ────────────────────────────────────────────────────────────

function NewTripDrawer({
  drivers,
  fleets,
  onClose,
  onCreated,
}: {
  drivers: Driver[]
  fleets: Fleet[]
  onClose: () => void
  onCreated: () => void
}) {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [form, setForm] = React.useState<CreateOrderPayload>({
    status: "created",
    pod_required: false,
    dispatched: false,
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load vehicles once
  React.useEffect(() => {
    listVehicles().then((r) =>
      setVehicles(dedupBy(r.vehicles ?? [], "uuid"))
    ).catch(() => {})
  }, [])

  const set = <K extends keyof CreateOrderPayload>(k: K, v: CreateOrderPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createOrder(form)
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create trip")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold text-base">New Trip</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in the details to create a new order</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 p-5">

            {/* Internal ID & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Internal ID</label>
                <input
                  type="text"
                  placeholder="ORD-001"
                  value={form.internal_id ?? ""}
                  onChange={(e) => set("internal_id", e.target.value)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                <input
                  type="text"
                  placeholder="delivery"
                  value={form.type ?? ""}
                  onChange={(e) => set("type", e.target.value)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Fleet */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fleet</label>
              <select
                value={form.fleet_uuid ?? ""}
                onChange={(e) => set("fleet_uuid", e.target.value || null as never)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Select fleet —</option>
                {fleets.map((f) => (
                  <option key={f.uuid} value={f.uuid}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Assign Driver</label>
              <select
                value={form.driver_assigned_uuid ?? ""}
                onChange={(e) => set("driver_assigned_uuid", e.target.value || null as never)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— No driver —</option>
                {drivers.map((d) => (
                  <option key={d.uuid} value={d.uuid}>
                    {d.name} ({d.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Vehicle</label>
              <select
                value={form.vehicle_assigned_uuid ?? ""}
                onChange={(e) => set("vehicle_assigned_uuid", e.target.value || undefined)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— No vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v.uuid} value={v.uuid}>
                    {v.plate_number}{v.make ? ` — ${v.make}${v.model ? ` ${v.model}` : ""}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Pickup & Dropoff */}
            <div className="grid grid-cols-2 gap-3">
              <PlaceSearchSelect
                label="Pickup"
                value={(form.payload as { pickup_uuid?: string })?.pickup_uuid ?? ""}
                onChange={(uuid) =>
                  setForm((f) => ({ ...f, payload: { ...f.payload, pickup_uuid: uuid } }))
                }
              />
              <PlaceSearchSelect
                label="Dropoff"
                value={(form.payload as { dropoff_uuid?: string })?.dropoff_uuid ?? ""}
                onChange={(uuid) =>
                  setForm((f) => ({ ...f, payload: { ...f.payload, dropoff_uuid: uuid } }))
                }
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at?.slice(0, 16) ?? ""}
                  onChange={(e) => set("scheduled_at", e.target.value ? new Date(e.target.value).toISOString() : null as never)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Est. End Date</label>
                <input
                  type="datetime-local"
                  value={form.estimated_end_date?.slice(0, 16) ?? ""}
                  onChange={(e) => set("estimated_end_date", e.target.value ? new Date(e.target.value).toISOString() : null as never)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                rows={3}
                placeholder="Any special instructions…"
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>


            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Creating…" : "Create Trip"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── AG Grid custom cell renderers ──────────────────────────────────────────────────────

function StatusCellRenderer({ value }: ICellRendererParams<Order, OrderStatus>) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-px text-[11px] font-semibold capitalize ${statusStyles[value]}`}>
      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[value]}`} />
      {value}
    </span>
  )
}

function DriverCellRenderer({ data }: ICellRendererParams<Order>) {
  if (!data) return null
  if (!data.driver_assigned) {
    return <span className="text-muted-foreground text-xs italic">No driver</span>
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium uppercase">
        {driverInitial(data.driver_assigned.name)}
      </div>
      <span className="truncate">{data.driver_assigned.name}</span>
      {data.vehicle_assigned?.plate_number && (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {data.vehicle_assigned.plate_number}
        </span>
      )}
    </div>
  )
}

// Page component uses a stable ref to pass callbacks into AG Grid cell renderers
type RowCallbacks = {
  onDelete: (o: Order) => void
  onDispatch: (o: Order) => void
  onAssigned: (o: Order, driverUuid: string) => void
  drivers: Driver[]
}

function ActionsCellRenderer({ data, context }: ICellRendererParams<Order> & { context: RowCallbacks }) {
  if (!data) return null
  const { onDelete, onDispatch, onAssigned, drivers } = context
  return (
    <RowMenu
      order={data}
      drivers={drivers}
      onDelete={() => onDelete(data)}
      onDispatch={() => onDispatch(data)}
      onAssigned={(uuid) => onAssigned(data, uuid)}
    />
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all")
  const [showNewTrip, setShowNewTrip] = React.useState(false)
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [fleets, setFleets] = React.useState<Fleet[]>([])
  const [showImport, setShowImport] = React.useState(false)
  const [showHelp, setShowHelp] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  // Keep a ref so fetchOrders can read current fleets without depending on them
  const fleetsRef = React.useRef<Fleet[]>([])
  React.useEffect(() => { fleetsRef.current = fleets }, [fleets])

  // Reset to page 1 on status filter change
  React.useEffect(() => { setPage(1) }, [statusFilter])

  // Resolve fleet_name onto orders from in-memory fleet map
  const patchFleetNames = React.useCallback(
    (rawOrders: Order[], fleetMap: Map<string, string>) =>
      rawOrders.map((o) =>
        o.fleet_uuid && !o.fleet_name && fleetMap.has(o.fleet_uuid)
          ? { ...o, fleet_name: fleetMap.get(o.fleet_uuid) }
          : o
      ),
    []
  )

  const fetchOrders = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listOrders({
        page,
        per_page: 200, // load a generous batch; AG Grid paginates client-side at 20
        sort: "-created_at",
        status: statusFilter !== "all" ? statusFilter : undefined,
      })
      const fleetMap = new Map(fleetsRef.current.map((f) => [f.uuid, f.name]))
      setOrders(patchFleetNames(res.orders ?? [], fleetMap))
      setTotalPages(res.meta?.last_page ?? 1)
      setTotal(res.meta?.total ?? 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load trips")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, patchFleetNames])

  React.useEffect(() => { fetchOrders() }, [fetchOrders])

  React.useEffect(() => {
    listDrivers().then((r) => setDrivers(dedupBy(r.drivers ?? [], "uuid"))).catch(() => {})
    listFleets().then((r) => setFleets(dedupBy(r.fleets ?? [], "uuid"))).catch(() => {})
  }, [])

  React.useEffect(() => {
    if (fleets.length === 0) return
    const fleetMap = new Map(fleets.map((f) => [f.uuid, f.name]))
    setOrders((prev) => patchFleetNames(prev, fleetMap))
  }, [fleets, patchFleetNames])

  // Actions
  const handleDelete = React.useCallback(async (order: Order) => {
    if (!confirm(`Delete trip ${order.public_id}? This cannot be undone.`)) return
    try {
      await deleteOrder(order.uuid)
      setOrders((prev) => prev.filter((o) => o.uuid !== order.uuid))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }, [])

  const handleDispatch = React.useCallback(async (order: Order) => {
    try {
      await dispatchOrder(order.uuid)
      setOrders((prev) =>
        prev.map((o) =>
          o.uuid === order.uuid
            ? { ...o, status: "dispatched" as OrderStatus, dispatched: true }
            : o
        )
      )
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Dispatch failed")
    }
  }, [])

  const handleDriverAssigned = React.useCallback((order: Order, driverUuid: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.uuid !== order.uuid) return o
        const driver = drivers.find((d) => d.uuid === driverUuid)
        return {
          ...o,
          driver_assigned_uuid: driverUuid,
          driver_name: driver?.name ?? o.driver_name,
          driver_assigned: driver
            ? { uuid: driver.uuid, public_id: driver.public_id, name: driver.name, phone: driver.phone }
            : o.driver_assigned,
        }
      })
    )
  }, [drivers])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  // Stable context object passed down into AG Grid cell renderers
  const gridContext = React.useMemo<RowCallbacks>(() => ({
    onDelete: handleDelete,
    onDispatch: handleDispatch,
    onAssigned: handleDriverAssigned,
    drivers,
  }), [handleDelete, handleDispatch, handleDriverAssigned, drivers])

  // Column definitions
  const colDefs = React.useMemo<ColDef<Order>[]>(() => [
    {
      headerName: "Public ID",
      field: "public_id",
      filter: "agTextColumnFilter",
      width: 120,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="font-medium text-primary">{value ?? "—"}</span>
      ),
    },
    {
      headerName: "Internal ID",
      field: "internal_id",
      filter: "agTextColumnFilter",
      width: 110,
      cellRenderer: ({ value }: ICellRendererParams) => value ?? <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Trip Hash",
      field: "trip_hash_id",
      filter: "agTextColumnFilter",
      width: 110,
      cellClass: "font-mono text-xs",
      cellRenderer: ({ value }: ICellRendererParams) => value ?? <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Driver",
      field: "driver_assigned",
      filter: "agTextColumnFilter",
      filterValueGetter: ({ data }) =>
        data?.driver_assigned?.name ?? data?.driver_name ?? "",
      flex: 1.5,
      minWidth: 160,
      cellRenderer: DriverCellRenderer,
    },
    {
      headerName: "Pickup",
      valueGetter: ({ data }) => data?.pickup_name ?? data?.payload?.pickup?.name ?? "",
      filter: "agTextColumnFilter",
      flex: 1.2,
      minWidth: 120,
      cellRenderer: ({ value }: ICellRendererParams) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Dropoff",
      valueGetter: ({ data }) => data?.dropoff_name ?? data?.payload?.dropoff?.name ?? "",
      filter: "agTextColumnFilter",
      flex: 1.2,
      minWidth: 120,
      cellRenderer: ({ value }: ICellRendererParams) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Scheduled",
      field: "scheduled_at",
      filter: "agDateColumnFilter",
      width: 132,
      sort: "desc",
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="text-xs text-muted-foreground">{formatDate(value)}</span>
      ),
    },
    {
      headerName: "Est. End",
      field: "estimated_end_date",
      filter: "agDateColumnFilter",
      width: 132,
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="text-xs text-muted-foreground">{formatDate(value)}</span>
      ),
    },
    {
      headerName: "Fleet",
      valueGetter: ({ data }) => data ? fleetLabel(data) : "",
      filter: "agTextColumnFilter",
      width: 110,
      cellRenderer: ({ value }: ICellRendererParams) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Status",
      field: "status",
      filter: "agTextColumnFilter",
      width: 120,
      cellRenderer: StatusCellRenderer,
    },
  ], [])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressHeaderMenuButton: false,
    floatingFilter: false,   // hidden by default; open column menu to filter
  }), [])

  // Quick search filter applied to the grid via the external search box
  const gridRef = React.useRef<AgGridReact<Order>>(null)
  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  // Detect dark mode reactively for AG Grid theme selection
  const [isDark, setIsDark] = React.useState(() =>
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  )
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader pageKey="trips" />
        <button
          onClick={() => setShowNewTrip(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Trip
        </button>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────── */}
      {(() => {
        const todayStr   = new Date().toDateString()
        const unassigned = orders.filter(o => !o.driver_assigned_uuid).length
        const todayCount = orders.filter(o => o.scheduled_at && new Date(o.scheduled_at).toDateString() === todayStr).length
        const inTransit  = orders.filter(o => o.status === "started").length
        const dispatched = orders.filter(o => o.status === "dispatched").length
        const completed  = orders.filter(o => o.status === "completed").length

        const cards = [
          { label: "Total trips",  value: total,      sub: "in current batch",  alert: false,              colour: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20",    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
          { label: "Unassigned",   value: unassigned, sub: "no driver yet",     alert: unassigned > 0,     colour: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",  icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
          { label: "Today",        value: todayCount, sub: "scheduled today",   alert: false,              colour: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
          { label: "In transit",   value: inTransit,  sub: "status: started",   alert: false,              colour: "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-900/20",        icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
          { label: "Dispatched",   value: dispatched, sub: "awaiting start",    alert: false,              colour: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
          { label: "Completed",    value: completed,  sub: "in this batch",     alert: false,              colour: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20", icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ]

        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map((c) => (
              <div
                key={c.label}
                className={`relative flex flex-col gap-2 rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${
                  c.alert ? "border-amber-300 dark:border-amber-700" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">{c.label}</span>
                  <span className={`rounded-lg p-1.5 ${c.colour}`}>{c.icon}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" /> : c.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{c.sub}</p>
                {c.alert && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-500" />}
              </div>
            ))}
          </div>
        )
      })()}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Quick search — drives AG Grid quickFilterText */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Quick search across all columns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:max-w-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status API filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
              className="h-9 appearance-none rounded-lg border bg-background pl-9 pr-8 text-sm capitalize outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh from API"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Import */}
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>

          {/* Export */}
          <button
            onClick={() => gridRef.current?.api?.exportDataAsCsv()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>

          {/* Help */}
          <button
            onClick={() => setShowHelp(true)}
            title="Page guide"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {loading ? "Loading trips…" : `${total} trips total · column filters active in header rows`}
      </p>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchOrders} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}
      {/* AG Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading trips…</span>
        </div>
      ) : (
        <div style={{ height: "calc(100vh - 280px)", width: "100%", minHeight: 400 }}>
          <AgGridReact<Order>
            ref={gridRef}
            rowData={orders}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            context={gridContext}
            theme={isDark ? darkTheme : lightTheme}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
            rowSelection="multiple"
            suppressRowClickSelection
            animateRows
            suppressCellFocus
            getRowId={({ data }) => data.uuid}
          />
        </div>
      )}

      {/* Import Wizard */}
      {showImport && (
        <ImportWizard
          onClose={() => setShowImport(false)}
          onDone={() => fetchOrders()}
        />
      )}

      {/* Help Walkthrough */}
      {showHelp && <HelpWalkthrough onClose={() => setShowHelp(false)} />}

      {/* New Trip Drawer */}
      {showNewTrip && (
        <NewTripDrawer
          drivers={drivers}
          fleets={fleets}
          onClose={() => setShowNewTrip(false)}
          onCreated={() => fetchOrders()}
        />
      )}
    </div>
  )
}
