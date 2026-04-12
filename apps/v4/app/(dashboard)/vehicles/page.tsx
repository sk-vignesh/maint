"use client"

import * as React from "react"
import {
  Search, RefreshCw, Upload, Download,
  LayoutGrid, List, Car, Trash2, X, Loader2, ChevronDown, CheckCircle2, AlertCircle,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import { listVehicles, createVehicle, updateVehicle, exportVehicles, bulkDeleteVehicles, importVehicles, type Vehicle } from "@/lib/vehicles-api"
import { listFleets, type Fleet } from "@/lib/fleets-api"
import { ImportModal } from "@/components/import-modal"

import { AgGridReact } from "ag-grid-react"
import {
  type ColDef, type ICellRendererParams,
  ModuleRegistry, AllCommunityModule,
  themeQuartz,
} from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

// ─── AG Grid themes (identical baseParams to trips/drivers/places) ────────────

const baseParams = {
  fontFamily: "var(--font-sans, 'Montserrat', 'Inter', system-ui, sans-serif)",
  fontSize: 13,
  rowHeight: 39,
  headerHeight: 38,
  rowBorder: false,
  wrapperBorder: false,
  headerRowBorder: false,
  columnBorder: false,
  cellHorizontalPaddingScale: 1.1,
  rowVerticalPaddingScale: 1,
  gridSize: 5,
  scrollbarWidth: 6,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Deterministic colour from uuid (same algo as drivers)
const PLATE_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-teal-500",
  "bg-rose-500",   "bg-amber-500",  "bg-pink-500", "bg-cyan-500",
]
function plateColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
  return PLATE_COLORS[Math.abs(h) % PLATE_COLORS.length]
}

function plateInitials(plate: string | null | undefined) {
  if (!plate) return "?"
  return plate.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase()
}

// Normalise status from API — may come as "active"/"inactive" or "Active"/"Inactive"
type VehicleStatus = "active" | "inactive" | "maintenance"

function normaliseStatus(s?: string): VehicleStatus {
  const l = (s ?? "").toLowerCase()
  if (l.includes("mainten")) return "maintenance"
  if (l === "inactive") return "inactive"
  return "active"
}

const STATUS_STYLE: Record<VehicleStatus, { badge: string; dot: string; label: string }> = {
  active:      { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40", dot: "bg-emerald-500", label: "Active" },
  inactive:    { badge: "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700/40",                     dot: "bg-rose-500",   label: "Inactive" },
  maintenance: { badge: "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40",               dot: "bg-amber-500",  label: "Maintenance" },
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function PlateCell({ data }: ICellRendererParams<Vehicle>) {
  if (!data) return null
  return (
    <div className="flex items-center gap-2.5 h-full">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold text-white ${plateColor(data.uuid)}`}>
        {plateInitials(data.plate_number)}
      </span>
      <p className="font-semibold text-[13px] font-mono leading-tight tracking-wide">{data.plate_number ?? "—"}</p>
    </div>
  )
}

function MakeModelCell({ data }: ICellRendererParams<Vehicle>) {
  if (!data) return null
  const make  = data.make  ?? "—"
  const model = data.model ?? ""
  return (
    <div className="flex items-center h-full gap-1">
      <span className="font-medium">{make}</span>
      {model && <span className="text-muted-foreground">{model}</span>}
    </div>
  )
}

function StatusCell({ data }: ICellRendererParams<Vehicle>) {
  if (!data) return null
  const s = STATUS_STYLE[normaliseStatus(data.status)]
  return (
    <div className="flex items-center h-full">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    </div>
  )
}

// ─── Vehicle Drawer ────────────────────────────────────────────────────────────

function VehicleDrawer({ open, vehicle, fleets, onClose, onSaved }: {
  open: boolean; vehicle: Vehicle | null; fleets: Fleet[]; onClose: () => void; onSaved: () => void
}) {
  const { t } = useLang()
  const c = t.common
  const v18n = t.vehicles
  const isEdit = !!vehicle
  const [plate,     setPlate]     = React.useState("")
  const [make,      setMake]      = React.useState("")
  const [model,     setModel]     = React.useState("")
  const [year,      setYear]      = React.useState("")
  const [fleetUuid, setFleetUuid] = React.useState("")
  const [pmiDate,   setPmiDate]   = React.useState("")
  const [tachoDate, setTachoDate] = React.useState("")
  const [statusVal, setStatusVal] = React.useState<VehicleStatus>("active")
  const [saving,    setSaving]    = React.useState(false)
  const [error,     setError]     = React.useState<string | null>(null)

  React.useEffect(() => {
    if (vehicle) {
      setPlate(vehicle.plate_number ?? "")
      setMake(vehicle.make ?? "")
      setModel(vehicle.model ?? "")
      setYear(vehicle.year != null ? String(vehicle.year) : "")
      setFleetUuid(vehicle.fleet_uuid ?? "")
      setPmiDate(vehicle.last_pmi_date?.slice(0,10) ?? "")
      setTachoDate(vehicle.tachograph_cal_date?.slice(0,10) ?? "")
      setStatusVal(normaliseStatus(vehicle.status))
    } else {
      setPlate(""); setMake(""); setModel(""); setYear("")
      setFleetUuid(""); setPmiDate(""); setTachoDate(""); setStatusVal("active")
    }
    setError(null)
  }, [vehicle, open])

  const handleSave = async () => {
    if (!plate.trim()) { setError("Plate number is required."); return }
    if (!make.trim())  { setError("Make is required."); return }
    setSaving(true); setError(null)
    try {
      const common = {
        plate_number:         plate.trim().toUpperCase(),
        make:                 make.trim(),
        model:                model      || undefined,
        year:                 year       || undefined,
        fleet_uuid:           fleetUuid  || undefined,
        last_pmi_date:        pmiDate    || undefined,
        tachograph_cal_date:  tachoDate  || undefined,
        status:               (statusVal === "active" ? "active" : "inactive") as "active" | "inactive",
      }
      if (isEdit && vehicle) {
        await updateVehicle(vehicle.uuid, common)
      } else {
        await createVehicle(common)
      }
      onSaved(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const isPmiOverdue   = pmiDate   && new Date(pmiDate)   < sixMonthsAgo
  const isTachoOverdue = tachoDate && new Date(tachoDate) < sixMonthsAgo

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <div className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-bold">{isEdit ? c.edit : v18n.addVehicle}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</div>}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plate *</label>
            <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="AB12 CDE"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-mono outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Make *</label>
              <input type="text" value={make} onChange={e => setMake(e.target.value)} placeholder="Mercedes"
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model</label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="Sprinter"
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{v18n.year}</label>
            <input type="number" min={1990} max={2030} value={year} onChange={e => setYear(e.target.value)} placeholder="2022"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.fleet}</label>
            <div className="relative">
              <select value={fleetUuid} onChange={e => setFleetUuid(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">No fleet</option>
                {fleets.map(f => <option key={f.uuid} value={f.uuid}>{f.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wide ${isPmiOverdue ? "text-amber-600" : "text-muted-foreground"}`}>
                {v18n.lastPmi} {isPmiOverdue && "⚠"}
              </label>
              <input type="date" value={pmiDate} onChange={e => setPmiDate(e.target.value)}
                className={`h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring ${isPmiOverdue ? "border-amber-400" : ""}`} />
            </div>
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold uppercase tracking-wide ${isTachoOverdue ? "text-amber-600" : "text-muted-foreground"}`}>
                {v18n.tachographCal} {isTachoOverdue && "⚠"}
              </label>
              <input type="date" value={tachoDate} onChange={e => setTachoDate(e.target.value)}
                className={`h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring ${isTachoOverdue ? "border-amber-400" : ""}`} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.status}</label>
            <div className="flex gap-2">
              {(["active", "inactive"] as VehicleStatus[]).map(s => (
                <button key={s} onClick={() => setStatusVal(s)}
                  className={`flex-1 h-8 rounded-lg border text-xs font-semibold capitalize transition-all ${statusVal === s ? s === "active" ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-lg border bg-background px-4 text-sm text-muted-foreground hover:bg-muted">{c.cancel}</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? c.save : v18n.addVehicle}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const { t } = useLang()
  const c = t.common
  const v18n = t.vehicles
  const [vehicles,      setVehicles]      = React.useState<Vehicle[]>([])
  const [fleets,        setFleetList]     = React.useState<Fleet[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [statusFilter,  setStatusFilter]  = React.useState<"all" | VehicleStatus>("active")
  const [view,          setView]          = React.useState<"list" | "cards">("list")
  const [showFilters,   setShowFilters]   = React.useState(false)
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [selectedCount, setSelectedCount] = React.useState(0)
  const [deleting,      setDeleting]      = React.useState(false)
  const [drawerOpen,    setDrawerOpen]    = React.useState(false)
  const [editVehicle,   setEditVehicle]   = React.useState<Vehicle | null>(null)
  const [showImport,    setShowImport]    = React.useState(false)

  // Dark mode
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

  const gridRef = React.useRef<AgGridReact<Vehicle>>(null)

  // ── Fetch ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [vehiclesRes, fleetsRes] = await Promise.all([
        listVehicles({ limit: 500 }),
        listFleets({ limit: 500 }),
      ])
      setVehicles(vehiclesRes.vehicles ?? [])
      setFleetList(fleetsRes.fleets ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vehicles")
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Delete selected ──
  const handleDeleteSelected = React.useCallback(async () => {
    if (!window.confirm(`Delete ${selectedCount} vehicle${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const uuids = (gridRef.current?.api?.getSelectedRows() ?? []).map(r => r.uuid)
      const res = await bulkDeleteVehicles(uuids)
      setSelectedCount(0)
      await load()
      if (res.status !== "success") setError(res.message ?? "Some deletes failed")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }, [selectedCount, load])

  React.useEffect(() => { load() }, [load])

  // Wire search to grid quick filter
  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  // Wire Filters toggle to column headers
  React.useEffect(() => {
    const api = gridRef.current?.api
    if (!api) return
    api.setGridOption("defaultColDef", {
      sortable: true,
      resizable: true,
      filter: "agTextColumnFilter",
      suppressHeaderMenuButton: !showFilters,
      suppressHeaderFilterButton: !showFilters,
      floatingFilter: false,
    })
    api.refreshHeader()
  }, [showFilters])

  // ── Status-filtered row data ──
  const rowData = React.useMemo(() => {
    if (statusFilter === "all") return vehicles
    return vehicles.filter(v => normaliseStatus(v.status) === statusFilter)
  }, [vehicles, statusFilter])

  // ── Column defs ──
  const colDefs = React.useMemo<ColDef<Vehicle>[]>(() => [
    { headerName: c.vehicle, field: "plate_number", cellRenderer: PlateCell, flex: 1.5, minWidth: 160 },
    { headerName: "Make / Model", field: "make", cellRenderer: MakeModelCell, flex: 2, minWidth: 160 },
    { headerName: v18n.year, field: "year", width: 90, cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="font-mono text-sm">{value}</span> : <span className="text-muted-foreground">—</span> },
    { headerName: c.fleet, field: "fleet_vehicles", flex: 1.5, minWidth: 130, valueGetter: ({ data }) => data?.fleet_vehicles?.map((fv: { fleet_name: string }) => fv.fleet_name).join(", ") ?? "", cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{value}</span> : <span className="text-muted-foreground">—</span> },
    { headerName: v18n.lastPmi, field: "last_pmi_date", width: 130, cellRenderer: ({ value }: ICellRendererParams) => {
      if (!value) return <span className="text-muted-foreground text-xs">—</span>
      const d = new Date(value); const ago = new Date(); ago.setMonth(ago.getMonth() - 6)
      return <span className={`text-xs tabular-nums ${d < ago ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>{value.slice(0,10)}</span>
    }},
    { headerName: v18n.tachographCal, field: "tachograph_cal_date", width: 145, cellRenderer: ({ value }: ICellRendererParams) => {
      if (!value) return <span className="text-muted-foreground text-xs">—</span>
      const d = new Date(value); const ago = new Date(); ago.setMonth(ago.getMonth() - 6)
      return <span className={`text-xs tabular-nums ${d < ago ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>{value.slice(0,10)}</span>
    }},
    { headerName: c.driver, field: "driver_name", flex: 1.5, minWidth: 140, cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="text-sm">{value}</span> : <span className="text-muted-foreground text-xs italic">—</span> },
    { headerName: c.status, field: "status", width: 140, cellRenderer: StatusCell },
  ], [c, v18n])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: "agTextColumnFilter",
    suppressHeaderMenuButton: !showFilters,
    suppressHeaderFilterButton: !showFilters,
    floatingFilter: false,
  }), [showFilters])

  return (
    <>
      <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2">

        {/* LEFT: View tabs */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView("cards")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${view === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
        </div>

        <div className="flex-1" />

        {/* Delete selected — appears in toolbar when rows checked */}
        {selectedCount > 0 && view === "list" && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selectedCount}
          </button>
        )}

        {/* Search */}
        <div className={`relative transition-all duration-200 ${searchFocused ? "w-72" : "w-40"}`}>
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={c.searchVehicles}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Status + Filters pill group */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
          <button
            onClick={() => setStatusFilter(v => v === "active" ? "all" : "active")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "active" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <Car className="h-3 w-3" />{c.active}
          </button>
          <button
            onClick={() => setStatusFilter(v => v === "inactive" ? "all" : "inactive")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "inactive" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <Car className="h-3 w-3" />{c.inactive}
          </button>
          {view === "list" && (
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${showFilters ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" d="M2 4h12M4 8h8M6 12h4" />
              </svg>
              {c.filter}
            </button>
          )}
        </div>

        <span className="h-6 w-px bg-border" />

        <button onClick={load} disabled={loading} title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button title="Import" onClick={() => setShowImport(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Upload className="h-3.5 w-3.5" />
        </button>
        <button title="Export" onClick={async () => { try { const blob = await exportVehicles(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `vehicles-export.xlsx`; a.click(); URL.revokeObjectURL(url) } catch(e) { setError(e instanceof Error ? e.message : "Export failed") } }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Download className="h-3.5 w-3.5" />
        </button>

        <span className="h-6 w-px bg-border" />

        <button onClick={() => { setEditVehicle(null); setDrawerOpen(true) }} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          {c.addNew}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          {error} — <button onClick={load} className="underline">retry</button>
        </div>
      )}

      {/* ── LIST VIEW — AG Grid ── */}
      {view === "list" && (
        <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card shadow-sm" style={{ height: "100%" }}>
          <AgGridReact<Vehicle>
            ref={gridRef}
            rowData={loading ? undefined : rowData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            theme={isDark ? darkTheme : lightTheme}
            pagination
            paginationPageSize={25}
            paginationPageSizeSelector={[25, 50, 100]}
            animateRows
            suppressCellFocus
            getRowId={({ data }) => data.uuid}
            rowSelection={{ mode: "multiRow", enableClickSelection: false }}
            onRowClicked={({ data }) => { if (data) { setEditVehicle(data); setDrawerOpen(true) } }}
            rowClass="cursor-pointer"
            onSelectionChanged={() => setSelectedCount(gridRef.current?.api?.getSelectedRows().length ?? 0)}
            overlayLoadingTemplate='<span class="ag-custom-loading">Loading vehicles…</span>'
            overlayNoRowsTemplate='<span class="ag-custom-no-rows">No vehicles found.</span>'
          />
        </div>
      )}

      {/* ── CARDS VIEW ── */}
      {view === "cards" && (
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 rounded bg-muted w-3/4" />
                      <div className="h-2.5 rounded bg-muted w-1/2" />
                    </div>
                  </div>
                  <div className="mt-2 h-2.5 rounded bg-muted w-2/3" />
                </div>
              ))}
            </div>
          ) : rowData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{c.noData}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {rowData.map(v => {
                  const st = STATUS_STYLE[normaliseStatus(v.status)]
                  const colour = v.colour ?? v.color
                  return (
                    <div key={v.uuid} className="group flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-[9px] font-bold text-white ${plateColor(v.uuid)}`}>
                            {plateInitials(v.plate_number)}
                          </span>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${st.dot}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold font-mono leading-tight tracking-wide">{v.plate_number ?? "—"}</p>
                          <p className="truncate text-[11px] text-muted-foreground leading-tight">
                            {[v.make, v.model].filter(Boolean).join(" ") || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                        {v.year && <span className="font-mono">{v.year}</span>}
                        {v.year && colour && <span className="text-border">·</span>}
                        {colour && <span>{colour}</span>}
                        {(v.year || colour) && v.driver_name && <span className="text-border">·</span>}
                        {v.driver_name && (
                          <span className="truncate text-indigo-400">{v.driver_name}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Showing {rowData.length} of {vehicles.length} vehicles
              </div>
            </>
          )}
        </div>
      )}
    </div>
    <VehicleDrawer
      open={drawerOpen}
      vehicle={editVehicle}
      fleets={fleets}
      onClose={() => setDrawerOpen(false)}
      onSaved={load}
    />
    <ImportModal
      open={showImport}
      onClose={() => setShowImport(false)}
      onDone={load}
      entityName="Vehicles"
      uploadType="vehicle_import"
      importFn={importVehicles}
    />
    </>
  )
}
