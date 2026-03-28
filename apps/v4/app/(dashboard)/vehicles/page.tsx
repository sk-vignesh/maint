"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Upload, Download,
  LayoutGrid, List, Car, Trash2,
} from "lucide-react"
import { listVehicles, bulkDeleteVehicles, type Vehicle } from "@/lib/vehicles-api"

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const [vehicles,      setVehicles]      = React.useState<Vehicle[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [statusFilter,  setStatusFilter]  = React.useState<"all" | VehicleStatus>("active")
  const [view,          setView]          = React.useState<"list" | "cards">("list")
  const [showFilters,   setShowFilters]   = React.useState(false)
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [selectedCount, setSelectedCount] = React.useState(0)
  const [deleting,      setDeleting]      = React.useState(false)

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
      const res = await listVehicles({ limit: 500 })
      setVehicles(res.vehicles ?? [])
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
      const { deleted, errors } = await bulkDeleteVehicles(uuids)
      setSelectedCount(0)
      await load()
      if (errors.length) setError(`Deleted ${deleted}, ${errors.length} failed: ${errors[0]}`)
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
    {
      headerName: "Plate",
      field: "plate_number",
      cellRenderer: PlateCell,
      flex: 1.5,
      minWidth: 160,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Make / Model",
      field: "make",
      cellRenderer: MakeModelCell,
      flex: 2,
      minWidth: 160,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Year",
      field: "year",
      width: 90,
      cellRenderer: ({ value }: ICellRendererParams) =>
        value ? <span className="font-mono text-sm">{value}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Colour",
      field: "colour",
      width: 120,
      valueGetter: ({ data }) => data?.colour ?? data?.color,
      cellRenderer: ({ value }: ICellRendererParams) =>
        value
          ? <div className="flex items-center gap-2 h-full">
              <span className="text-sm">{value}</span>
            </div>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Driver",
      field: "driver_name",
      flex: 1.5,
      minWidth: 140,
      cellRenderer: ({ value }: ICellRendererParams) =>
        value
          ? <span className="text-sm">{value}</span>
          : <span className="text-muted-foreground text-xs italic">Unassigned</span>,
    },
    {
      headerName: "Status",
      field: "status",
      width: 140,
      cellRenderer: StatusCell,
    },
  ], [])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: "agTextColumnFilter",
    suppressHeaderMenuButton: !showFilters,
    suppressHeaderFilterButton: !showFilters,
    floatingFilter: false,
  }), [showFilters])

  return (
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
            placeholder="Search…"
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
            <Car className="h-3 w-3" />Active
          </button>
          <button
            onClick={() => setStatusFilter(v => v === "inactive" ? "all" : "inactive")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "inactive" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <Car className="h-3 w-3" />Inactive
          </button>
          {view === "list" && (
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${showFilters ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" d="M2 4h12M4 8h8M6 12h4" />
              </svg>
              Filters
            </button>
          )}
        </div>

        <span className="h-6 w-px bg-border" />

        <button onClick={load} disabled={loading} title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button title="Import"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Upload className="h-3.5 w-3.5" />
        </button>
        <button title="Export" onClick={() => gridRef.current?.api?.exportDataAsCsv()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Download className="h-3.5 w-3.5" />
        </button>

        <span className="h-6 w-px bg-border" />

        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> New Vehicle
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
            onSelectionChanged={() =>
              setSelectedCount(gridRef.current?.api?.getSelectedRows().length ?? 0)
            }
            overlayLoadingTemplate='<span class="text-sm text-muted-foreground">Loading vehicles…</span>'
            overlayNoRowsTemplate='<span class="text-sm text-muted-foreground">No vehicles found.</span>'
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
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No vehicles found.</div>
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
  )
}
