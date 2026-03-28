"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  MoreHorizontal, Search, Download,
  X, Loader2, AlertCircle, Send, Trash2, UserCheck, Plus, ChevronDown,
  RefreshCw, Upload, HelpCircle, CheckCircle2, FileText,
  ChevronRight as ArrowRight, XCircle,
} from "lucide-react"

import {
  listOrders, createOrder, updateOrder, deleteOrder, dispatchOrder, getOrder,
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
  rowHeight: 39,   // overridden at runtime by ResizeObserver
  headerHeight: 38,
  // Match app background / card tokens
  backgroundColor: "var(--background, #ffffff)",
  foregroundColor: "var(--foreground, #1a1a1a)",
  headerBackgroundColor: "var(--muted, #f5f5f5)",
  headerTextColor: "var(--muted-foreground, #666666)",
  borderColor: "var(--border, #e5e7eb)",
  rowBorder: false,
  wrapperBorder: false,
  headerRowBorder: false,
  columnBorder: false,
  cellHorizontalPaddingScale: 1.1,
  rowVerticalPaddingScale: 1,
  selectedRowBackgroundColor: "var(--accent, #f0f0f0)",
  gridSize: 5,
  scrollbarWidth: 0,    // no reserved gutter — grid fills width exactly
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

// Inventory-demo style: translucent bg + coloured border (matches StatusCellRenderer.module.css)
const statusStyles: Record<OrderStatus, { bg: string; border: string; text: string; dot: string }> = {
  created:    { bg: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-300/70 dark:border-amber-600/40",   text: "text-amber-800 dark:text-amber-300",   dot: "bg-amber-500" },
  dispatched: { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-300/70 dark:border-violet-600/40", text: "text-violet-800 dark:text-violet-300", dot: "bg-violet-500" },
  started:    { bg: "bg-sky-50 dark:bg-sky-900/20",       border: "border-sky-300/70 dark:border-sky-600/40",       text: "text-sky-800 dark:text-sky-300",       dot: "bg-sky-500" },
  completed:  { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-300/70 dark:border-emerald-600/40", text: "text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-500" },
  canceled:   { bg: "bg-rose-50 dark:bg-rose-900/10",     border: "border-rose-300/60 dark:border-rose-600/40",     text: "text-rose-700 dark:text-rose-400",     dot: "bg-rose-500" },
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
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const [dropRect, setDropRect] = React.useState<DOMRect | null>(null)

  const handleOpen = () => {
    if (loading) return
    if (!open && btnRef.current) setDropRect(btnRef.current.getBoundingClientRect())
    setOpen((v) => !v)
  }
  const flipUp = dropRect ? window.innerHeight - dropRect.bottom < 220 : false

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <UserCheck className="h-3 w-3" />
        {loading ? "Saving…" : current ? current.name : "Assign Driver"}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && dropRect && (
        <div
          style={{
            position: "fixed",
            left: dropRect.left,
            width: 224,
            zIndex: 9999,
            ...(flipUp
              ? { bottom: window.innerHeight - dropRect.top + 4 }
              : { top: dropRect.bottom + 4 }),
          }}
          className="rounded-xl border bg-card shadow-lg"
        >
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
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  d.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}>{d.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assign Vehicle (Truck) Dropdown ─────────────────────────────────────────

function AssignVehicleDropdown({
  order,
  vehicles,
  onAssigned,
}: {
  order: Order
  vehicles: Vehicle[]
  onAssigned: (vehicleUuid: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleSelect = async (vehicle: Vehicle) => {
    setLoading(true)
    setOpen(false)
    try {
      await updateOrder(order.uuid, { vehicle_assigned_uuid: vehicle.uuid })
      onAssigned(vehicle.uuid)
    } finally {
      setLoading(false)
    }
  }

  const current = vehicles.find((v) => v.uuid === order.vehicle_assigned?.uuid)
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const [dropRect, setDropRect] = React.useState<DOMRect | null>(null)

  const handleOpen = () => {
    if (loading) return
    if (!open && btnRef.current) setDropRect(btnRef.current.getBoundingClientRect())
    setOpen((v) => !v)
  }
  const flipUp = dropRect ? window.innerHeight - dropRect.bottom < 220 : false

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {loading ? "Saving…" : current ? current.plate_number : "Assign Truck"}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && dropRect && (
        <div
          style={{
            position: "fixed",
            left: dropRect.left,
            width: 208,
            zIndex: 9999,
            ...(flipUp
              ? { bottom: window.innerHeight - dropRect.top + 4 }
              : { top: dropRect.bottom + 4 }),
          }}
          className="rounded-xl border bg-card shadow-lg"
        >
          <div className="max-h-52 overflow-y-auto py-1">
            {vehicles.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No vehicles available</p>
            )}
            {vehicles.map((v) => (
              <button
                key={v.uuid}
                onClick={() => handleSelect(v)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-bold uppercase">
                  {(v.plate_number ?? "?")[0]}
                </span>
                <span className="flex-1 truncate font-medium">{v.plate_number ?? v.model ?? "—"}</span>
                {v.model && <span className="text-[9px] text-muted-foreground">{v.model}</span>}
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
    id: "summary-cards",
    title: "Summary Cards",
    icon: "📊",
    target: "[data-help='summary-cards']",
    description: "At-a-glance metrics derived from the loaded batch: total trips, how many are unassigned (amber alert), today's scheduled trips, and counts by status. Updates instantly as you change status filters.",
  },
  {
    id: "search",
    title: "Search & Filters",
    icon: "🔍",
    target: "[data-help='toolbar']",
    description: "Type anything to instantly filter across all columns. Use the Status dropdown for a server-side refetch by status. Refresh ↺ reloads from the API. Import uploads a CSV/Excel batch. Export downloads the current view.",
  },
  {
    id: "new-trip",
    title: "New Trip",
    icon: "➕",
    target: "[data-help='toolbar']",
    description: "Click New Trip to open the slide-over. Choose fleet, driver and pickup/dropoff from live Places search. Set scheduled dates and save — the grid refreshes automatically.",
  },
  {
    id: "grid",
    title: "Trips Grid",
    icon: "📋",
    target: "[data-help='grid']",
    description: "AG Grid with 15 rows per page. Click any column header to sort. Drag headers to reorder columns. Resize columns by dragging the edge. Use the ☰ menu icon in each header to open column-level filters.",
  },
  {
    id: "status",
    title: "Status Badges",
    icon: "🏷️",
    target: "[data-help='grid']",
    description: "Each trip shows a colour-coded status pill: Created (amber) → Dispatched (violet) → Started (sky) → Completed (emerald). Canceled shows in rose. Statuses are updated in real-time via the API.",
  },
  {
    id: "pagination",
    title: "Pagination",
    icon: "📄",
    target: "[data-help='grid']",
    description: "15 rows per page by default — use the page-size selector to switch to 30, 50 or 100. Navigate pages with the arrows. The total count shown in the top bar reflects the full API result.",
  },
]

function HelpWalkthrough({ onClose }: { onClose: () => void }) {
  const [step, setStep] = React.useState(0)
  const current = HELP_STEPS[step]
  const isLast = step === HELP_STEPS.length - 1

  // Spotlight effect: dim body, brighten target element
  React.useEffect(() => {
    // Add dim class to body
    document.body.classList.add("help-tour-active")

    // Inject or update spotlight style
    let styleEl = document.getElementById("help-spotlight-style") as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = "help-spotlight-style"
      document.head.appendChild(styleEl)
    }

    const sel = current.target
    styleEl.textContent = `
      body.help-tour-active > * {
        filter: brightness(0.35);
        transition: filter 0.3s ease;
      }
      body.help-tour-active #help-walkthrough-card {
        filter: none !important;
      }
      body.help-tour-active ${sel} {
        filter: brightness(1) !important;
        position: relative;
        z-index: 45;
        border-radius: 12px;
        box-shadow: 0 0 0 3px hsl(var(--primary) / 0.5), 0 0 0 6px hsl(var(--primary) / 0.15);
        transition: box-shadow 0.3s ease, filter 0.3s ease;
      }
    `

    // Scroll target into view
    const el = document.querySelector(sel)
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })

    return () => {
      document.body.classList.remove("help-tour-active")
      styleEl?.remove()
    }
  }, [current.target])

  return (
    <>
      {/* Invisible click-away to close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Floating card — bottom-right so it doesn't block content */}
      <div
        id="help-walkthrough-card"
        className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border bg-card shadow-2xl"
        style={{ filter: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress dots */}
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

        <div className="p-5">
          <div className="mb-3 flex items-start gap-3">
            <span className="text-3xl leading-none">{current.icon}</span>
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Step {step + 1} of {HELP_STEPS.length}
              </p>
              <h3 className="mt-0.5 text-lg font-bold">{current.title}</h3>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{current.description}</p>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
              Skip tour
            </button>
            {isLast ? (
              <button onClick={onClose} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Done
              </button>
            ) : (
              <button onClick={() => setStep(s => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
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

function StatusCellRenderer({ data, value, context }: ICellRendererParams<Order, OrderStatus> & { context: RowCallbacks }) {
  const canDispatch = data?.status === "created" && !!data?.driver_assigned_uuid
  const s = value
    ? (statusStyles[value as OrderStatus] ?? { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", dot: "bg-gray-400" })
    : null
  return (
    <div className="flex items-center gap-1.5">
      {s ? (
        <span className={`inline-flex items-center rounded-[100px] border pl-1 pr-3 text-[12px] font-medium capitalize leading-[2] ${s.bg} ${s.border} ${s.text}`}>
          <span className={`mr-2 ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
          {value}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      {canDispatch && data && (
        <button
          onClick={() => context?.onDispatch(data)}
          title="Dispatch trip"
          className="inline-flex items-center gap-1 rounded-md bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors"
        >
          <Send className="h-2.5 w-2.5" /> Dispatch
        </button>
      )}
    </div>
  )
}

function DriverCellRenderer({ data, context }: ICellRendererParams<Order> & { context: RowCallbacks }) {
  if (!data) return null
  if (!data.driver_assigned) {
    return (
      <AssignDriverDropdown
        order={data}
        drivers={context?.drivers ?? []}
        onAssigned={(uuid) => context?.onAssigned(data, uuid)}
      />
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium uppercase">
        {driverInitial(data.driver_assigned.name)}
      </div>
      <span className="truncate">{data.driver_assigned.name}</span>
    </div>
  )
}

function VehicleCellRenderer({ data, context }: ICellRendererParams<Order> & { context: RowCallbacks }) {
  if (!data) return null
  const plate = data.vehicle_assigned?.plate_number
  if (!plate) {
    return (
      <AssignVehicleDropdown
        order={data}
        vehicles={context?.vehicles ?? []}
        onAssigned={(uuid) => context?.onVehicleAssigned(data, uuid)}
      />
    )
  }
  return <span className="font-mono text-xs">{plate}</span>
}

type LegData = {
  legIndex: number
  vrId:     string    // waypoint public_id or generated
  from:     string
  to:       string
  legType:  "pickup" | "waypoint" | "dropoff"
}

// Pure function — no component state needed
function buildLegs(order: Order): LegData[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = order.payload as any
  if (!payload) return []

  type Stop = { name: string; publicId?: string }
  const stops: Stop[] = []

  if (payload.pickup)
    stops.push({ name: payload.pickup.name ?? "Pickup", publicId: payload.pickup.public_id })

  const waypoints: Record<string, unknown>[] = Array.isArray(payload.waypoints) ? payload.waypoints : []
  waypoints.forEach((wp) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = wp as any
    stops.push({ name: w.name ?? w.address ?? w.place?.name ?? "Waypoint", publicId: w.public_id })
  })

  if (payload.dropoff)
    stops.push({ name: payload.dropoff.name ?? "Dropoff", publicId: payload.dropoff.public_id })

  if (stops.length < 2) return []

  return stops.slice(0, -1).map((stop, i): LegData => ({
    legIndex: i,
    vrId:     stops[i + 1].publicId ?? `VR-${String(i + 1).padStart(3, "0")}`,
    from:     stop.name,
    to:       stops[i + 1].name,
    legType:  i === 0 ? "pickup" : i === stops.length - 2 ? "dropoff" : "waypoint",
  }))
}

// ─── Page component uses a stable context passed into AG Grid cell renderers ──
type RowCallbacks = {
  onDelete:          (o: Order) => void
  onDispatch:        (o: Order) => void
  onAssigned:        (o: Order, driverUuid: string) => void
  onVehicleAssigned: (o: Order, vehicleUuid: string) => void
  drivers:           Driver[]
  vehicles:          Vehicle[]
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
  const [showNewTrip, setShowNewTrip] = React.useState(false)
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [fleets, setFleets] = React.useState<Fleet[]>([])
  const [showImport, setShowImport] = React.useState(false)
  const [showHelp, setShowHelp] = React.useState(false)
  const [showCompleted, setShowCompleted] = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [selectedCount, setSelectedCount] = React.useState(0)
  const [showCards, setShowCards] = React.useState(false)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [searchFocused, setSearchFocused] = React.useState(false)

  // Detect dark mode reactively — declared here so detailCellRendererParams can use it
  const [isDark, setIsDark] = React.useState(() =>
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  )
  React.useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // Tabs
  const [tab, setTab] = React.useState<"current" | "history">("current")

  // Last Sunday 00:00 — default start for Current tab
  const lastSunday = React.useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // History date range
  const todayStr = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = React.useState(todayStr)
  const [dateTo, setDateTo] = React.useState(todayStr)
  const [dateError, setDateError] = React.useState<string | null>(null)

  const validateDates = (from: string, to: string): string | null => {
    if (!from || !to) return "Both dates are required"
    const f = new Date(from), t = new Date(to)
    if (f < new Date("2025-01-01")) return "Earliest date is 1 Jan 2025"
    if (t < f) return "End date must be on or after start date"
    const diffDays = (t.getTime() - f.getTime()) / 86_400_000
    if (diffDays > 31) return "Date range cannot exceed 31 days"
    return null
  }

  // Keep a ref so fetchOrders can read current fleets without depending on them
  const fleetsRef = React.useRef<Fleet[]>([])
  React.useEffect(() => { fleetsRef.current = fleets }, [fleets])


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

  const fetchOrders = React.useCallback(async (opts?: { from?: string; to?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listOrders({
        page,
        per_page: 200,
        sort: "-created_at",
        ...(opts?.from ? { scheduled_at: opts.from } : {}),
        ...(opts?.to   ? { end_date: opts.to }        : {}),
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
  }, [page, patchFleetNames])

  // Fetch on mount and when page/status changes (Current tab)
  React.useEffect(() => {
    if (tab === "current") fetchOrders()
  }, [fetchOrders, tab])

  React.useEffect(() => {
    listDrivers().then((r) => setDrivers(dedupBy(r.drivers ?? [], "uuid"))).catch(() => {})
    listFleets().then((r) => setFleets(dedupBy(r.fleets ?? [], "uuid"))).catch(() => {})
    listVehicles().then((r) => setVehicles(dedupBy(r.vehicles ?? [], "uuid"))).catch(() => {})
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

  const handleVehicleAssigned = React.useCallback((order: Order, vehicleUuid: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.uuid !== order.uuid) return o
        const vehicle = vehicles.find((v) => v.uuid === vehicleUuid)
        return {
          ...o,
          vehicle_assigned: vehicle ?? o.vehicle_assigned,
        }
      })
    )
  }, [vehicles])

  const handleDeleteSelected = React.useCallback(async () => {
    const api = gridRef.current?.api
    if (!api) return
    const selected = api.getSelectedRows() as Order[]
    if (selected.length === 0) return
    if (!confirm(`Delete ${selected.length} trip${selected.length > 1 ? "s" : ""}? This cannot be undone.`)) return
    for (const order of selected) {
      try {
        await deleteOrder(order.uuid)
        setOrders((prev) => prev.filter((o) => o.uuid !== order.uuid))
      } catch { /* best-effort */ }
    }
    setSelectedCount(0)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOrders()
    setRefreshing(false)
  }

  const toggleRow = React.useCallback((uuid: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
    // Tell AG Grid to re-measure all row heights after the state flush
    setTimeout(() => {
      const api = gridRef.current?.api
      if (!api) return
      api.resetRowHeights()
      api.refreshCells({ force: true })
    }, 0)
  }, [])

  // Stable context object passed down into AG Grid cell renderers
  const gridContext = React.useMemo<RowCallbacks & { expandedRows: Set<string>; toggleRow: (id: string) => void }>(() => ({
    onDelete:          handleDelete,
    onDispatch:        handleDispatch,
    onAssigned:        handleDriverAssigned,
    onVehicleAssigned: handleVehicleAssigned,
    drivers,
    vehicles,
    expandedRows,
    toggleRow,
  }), [handleDelete, handleDispatch, handleDriverAssigned, handleVehicleAssigned, drivers, vehicles, expandedRows, toggleRow])


  // Filtered orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      if (!showCompleted && o.status === "completed") return false
      if (tab === "current" && o.status !== "completed" && o.scheduled_at && new Date(o.scheduled_at) < lastSunday) return false
      return true
    })
  }, [orders, showCompleted, lastSunday, tab])

  // Column definitions
  const colDefs = React.useMemo<ColDef<Order>[]>(() => [
    {
      headerName: "Public ID",
      field: "public_id",
      filter: "agTextColumnFilter",
      width: 140,
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
      headerName: "Status",
      field: "status",
      filter: "agTextColumnFilter",
      width: 180,
      cellRenderer: StatusCellRenderer,
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
      headerName: "Vehicle",
      valueGetter: ({ data }) => data?.vehicle_assigned?.plate_number ?? "",
      filter: "agTextColumnFilter",
      width: 140,
      minWidth: 120,
      cellRenderer: VehicleCellRenderer,
    },
    {
      headerName: "Route",
      colId: "_route",
      autoHeight: true,
      flex: 2,
      minWidth: 220,
      sortable: false,
      filter: false,
      cellRenderer: ({ data, context }: ICellRendererParams<Order> & { context: RowCallbacks & { expandedRows: Set<string>; toggleRow: (id: string) => void } }) => {
        if (!data) return null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = data.payload as any
        if (!payload) return <span className="text-muted-foreground text-xs">No route</span>

        type Stop = { name?: string; publicId?: string }
        const stops: Stop[] = []

        const pickup = payload.pickup
        if (pickup) stops.push({ name: pickup.name ?? pickup.street1 ?? "Pickup", publicId: pickup.public_id ?? pickup.publicId })

        const waypoints: unknown[] = Array.isArray(payload.waypoints) ? payload.waypoints : []
        waypoints.forEach((w: any) => {
          stops.push({ name: w.name ?? w.street1 ?? "Waypoint", publicId: w.public_id ?? w.publicId })
        })

        const dropoff = payload.dropoff
        if (dropoff) stops.push({ name: dropoff.name ?? dropoff.street1 ?? "Dropoff", publicId: dropoff.public_id ?? dropoff.publicId })

        if (stops.length === 0) return <span className="text-muted-foreground text-xs">No route</span>

        const isExpanded = context?.expandedRows?.has(data.uuid)
        const from = stops[0]?.name ?? "—"
        const to = stops[stops.length - 1]?.name ?? "—"

        if (!isExpanded) {
          // Compact: From → To with expand chevron
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => context?.toggleRow(data.uuid)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted transition-colors"
                title="Show all stops"
              >
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
              <span className="flex items-center gap-1 text-[12px]">
                <span className="font-medium truncate max-w-[120px]" title={from}>{from}</span>
                <span className="text-muted-foreground shrink-0">→</span>
                <span className="font-medium truncate max-w-[120px]" title={to}>{to}</span>
                {stops.length > 2 && (
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    +{stops.length - 2}
                  </span>
                )}
              </span>
            </div>
          )
        }

        // Expanded: full stop list, capped at 10
        const MAX_LEGS = 10
        const visible = stops.slice(0, MAX_LEGS)
        const hidden  = stops.length - visible.length
        return (
          <div className="py-1 leading-none">
            <button
              onClick={() => context?.toggleRow(data.uuid)}
              className="mb-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="h-3 w-3 rotate-90" /> Collapse
            </button>
            {visible.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="flex flex-col items-center" style={{ minWidth: 14 }}>
                  <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    i === 0 ? "bg-emerald-500" : i === stops.length - 1 ? "bg-rose-500" : "bg-violet-400"
                  }`} />
                  {i < visible.length - 1 && <span className="w-px flex-1 bg-border" style={{ minHeight: 12 }} />}
                </div>
                <div className="pb-2">
                  <span className="text-[12px] font-medium leading-tight">{s.name ?? "—"}</span>
                  {s.publicId && <span className="ml-1 font-mono text-[10px] text-muted-foreground">({s.publicId})</span>}
                </div>
              </div>
            ))}
            {hidden > 0 && (
              <div className="mt-0.5 ml-4 text-[10px] text-muted-foreground">
                +{hidden} more stop{hidden > 1 ? "s" : ""} (not shown)
              </div>
            )}
          </div>
        )
      },
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
  ], [showCompleted])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    suppressHeaderMenuButton: !showFilters,
    suppressHeaderFilterButton: !showFilters,
    floatingFilter: false,
  }), [showFilters])

  // Grid ref — declared early so both effects below can reference it
  const gridRef = React.useRef<AgGridReact<Order>>(null)

  // Force AG Grid to re-apply defaultColDef when filters toggle changes
  React.useEffect(() => {
    const api = gridRef.current?.api
    if (!api) return
    api.setGridOption("defaultColDef", {
      sortable: true,
      resizable: true,
      suppressHeaderMenuButton: !showFilters,
      suppressHeaderFilterButton: !showFilters,
      floatingFilter: false,
    })
    api.refreshHeader()
  }, [showFilters])

  // Quick search
  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  // Grid container ref
  const gridContainerRef = React.useRef<HTMLDivElement>(null)

  return (

    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Summary Cards (hidden by default, toggled by Stats button in toolbar) ─── */}
      {showCards && (() => {
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
          <div data-help="summary-cards" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div data-help="toolbar" className="flex flex-col gap-2">

        {/* Single row: [Tabs + date range?] ···spacer··· [Delete?] [🔍] [toggles] │ [utils] │ [New Trip] [?] */}
        <div className="flex items-center gap-2">

          {/* LEFT: Tabs */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            {(["current", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
                  tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "current" ? "Current" : "History"}
              </button>
            ))}
          </div>

          {/* History date range — sits right beside the History tab, defines what you're viewing */}
          {tab === "history" && (
            <>
              <span className="h-6 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  min="2025-01-01"
                  max={dateTo}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setDateError(validateDates(e.target.value, dateTo))
                  }}
                  className="h-8 rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">→</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || "2025-01-01"}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setDateError(validateDates(dateFrom, e.target.value))
                  }}
                  className="h-8 rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  disabled={!!dateError || !dateFrom || !dateTo}
                  onClick={() => {
                    const err = validateDates(dateFrom, dateTo)
                    if (err) { setDateError(err); return }
                    fetchOrders({ from: dateFrom, to: dateTo })
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                >
                  <Search className="h-3 w-3" /> Go
                </button>
                {dateError && <span className="text-xs text-red-500 whitespace-nowrap">{dateError}</span>}
              </div>
            </>
          )}

          {/* Flex spacer — everything below is pushed to the right */}
          <div className="flex-1" />

          {/* Delete selected — appears when rows are checked */}
          {selectedCount > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedCount}
            </button>
          )}

          {/* Search — expands on focus */}
          <div className={`relative transition-all duration-200 ${searchFocused ? "w-72" : "w-40"}`}>
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Pill toggles — view options grouped together */}
          <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
            <button
              onClick={() => setShowCompleted(v => !v)}
              title={showCompleted ? "Hide completed trips" : "Show completed trips"}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                showCompleted
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </button>
            <button
              onClick={() => setShowFilters(v => !v)}
              title={showFilters ? "Hide column filters" : "Show column filters"}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                showFilters
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" d="M2 4h12M4 8h8M6 12h4" />
              </svg>
              Filters
            </button>
            {/* Stats toggle — shows/hides summary cards */}
            <button
              onClick={() => setShowCards(v => !v)}
              title={showCards ? "Hide summary stats" : "Show summary stats"}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                showCards
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 13V8M6 13V5M10 13V7M14 13V3" />
              </svg>
              Stats
            </button>
          </div>

          {/* Separator */}
          <span className="h-6 w-px bg-border" />

          {/* Utility icon buttons */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowImport(true)}
            title="Import CSV"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => gridRef.current?.api?.exportDataAsCsv()}
            title="Export CSV"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Separator */}
          <span className="h-6 w-px bg-border" />

          {/* Primary CTA */}
          <button
            onClick={() => setShowNewTrip(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> New Trip
          </button>

          {/* Help — icon only */}
          <button
            onClick={() => setShowHelp(true)}
            title="Page guide"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

        </div>

      </div>


      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => fetchOrders()} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}
      {/* AG Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading trips…</span>
        </div>
      ) : (
        <div ref={gridContainerRef} data-help="grid" className="flex-1 min-h-0" style={{ height: "100%", width: "100%" }}>
          <AgGridReact<Order>
            ref={gridRef}
            rowData={filteredOrders}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            context={gridContext}
            theme={isDark ? darkTheme : lightTheme}
            pagination
            paginationPageSize={15}
            paginationPageSizeSelector={[15, 30, 50, 100]}
            rowSelection={{ mode: "multiRow", enableClickSelection: false }}
            animateRows
            suppressCellFocus
            getRowId={({ data }) => data.uuid}
            onSelectionChanged={() => {
              const api = gridRef.current?.api
              setSelectedCount(api ? api.getSelectedRows().length : 0)
            }}
            onGridReady={() => {
              const el = gridContainerRef.current
              if (!el) return
              const available = el.clientHeight - 38 - 40 - 8
              const rh = Math.max(32, Math.floor(available / 15))
              gridRef.current?.api?.setGridOption("rowHeight", rh)
              gridRef.current?.api?.resetRowHeights()
            }}
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
