"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Upload, Download,
  Truck, Trash2, Users, Activity,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import { listFleets, bulkDeleteFleets, type Fleet, type FleetStatus } from "@/lib/fleets-api"

import { AgGridReact } from "ag-grid-react"
import {
  type ColDef, type ICellRendererParams,
  ModuleRegistry, AllCommunityModule,
  themeQuartz,
} from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

// ─── AG Grid themes ───────────────────────────────────────────────────────────

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

// Deterministic colour from uuid
const FLEET_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-teal-500",
  "bg-rose-500",   "bg-amber-500",  "bg-pink-500", "bg-cyan-500",
]
function fleetColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
  return FLEET_COLORS[Math.abs(h) % FLEET_COLORS.length]
}

const STATUS_STYLE: Record<FleetStatus, { badge: string; dot: string; label: string }> = {
  active:          { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40", dot: "bg-emerald-500", label: "Active" },
  disabled:        { badge: "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700/40",                     dot: "bg-rose-500",   label: "Disabled" },
  decommissioned:  { badge: "bg-zinc-100 text-zinc-600 border border-zinc-200/80 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700/40",                    dot: "bg-zinc-400",   label: "Decommissioned" },
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function NameCell({ data }: ICellRendererParams<Fleet>) {
  if (!data) return null
  return (
    <div className="flex items-center gap-2.5 h-full">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${fleetColor(data.uuid)}`}>
        <Truck className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="font-semibold text-[13px] leading-tight">{data.name}</p>
        {data.task && (
          <p className="text-[10px] text-muted-foreground leading-tight">{data.task}</p>
        )}
      </div>
    </div>
  )
}

function DriversCell({ data }: ICellRendererParams<Fleet>) {
  if (!data) return null
  const total  = data.drivers_count        ?? 0
  const online = data.drivers_online_count ?? 0
  return (
    <div className="flex items-center gap-2 h-full">
      <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-sm">{total}</span>
      {online > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {online} online
        </span>
      )}
    </div>
  )
}

function TripLengthCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex items-center gap-1 h-full">
      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-sm">{value}h</span>
    </div>
  )
}

function StatusCell({ data }: ICellRendererParams<Fleet>) {
  if (!data) return null
  const s = STATUS_STYLE[data.status] ?? STATUS_STYLE.disabled
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

export default function FleetsPage() {
  const { t } = useLang()
  const c = t.common
  const [fleets,        setFleets]        = React.useState<Fleet[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [statusFilter,  setStatusFilter]  = React.useState<"all" | FleetStatus>("active")
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

  const gridRef = React.useRef<AgGridReact<Fleet>>(null)

  // ── Fetch ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await listFleets({ limit: 500 })
      setFleets(res.fleets ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleets")
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Delete selected ──
  const handleDeleteSelected = React.useCallback(async () => {
    if (!window.confirm(`Delete ${selectedCount} fleet${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const uuids = (gridRef.current?.api?.getSelectedRows() ?? []).map(r => r.uuid)
      const { deleted, errors } = await bulkDeleteFleets(uuids)
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

  // Wire Filters toggle
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
    if (statusFilter === "all") return fleets
    return fleets.filter(f => f.status === statusFilter)
  }, [fleets, statusFilter])

  // ── Column defs ──
  const colDefs = React.useMemo<ColDef<Fleet>[]>(() => [
    { headerName: c.fleet, field: "name", cellRenderer: NameCell, flex: 2, minWidth: 180, filter: "agTextColumnFilter" },
    { headerName: c.driver, field: "drivers_count", cellRenderer: DriversCell, width: 180 },
    { headerName: c.duration, field: "trip_length", cellRenderer: TripLengthCell, width: 140 },
    { headerName: c.status, field: "status", cellRenderer: StatusCell, width: 160 },
    { headerName: "ID", field: "public_id", width: 140, cellRenderer: ({ value }: ICellRendererParams) => <span className="font-mono text-xs text-muted-foreground">{value ?? "—"}</span> },
  ], [c])

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

        <div className="flex-1" />

        {/* Delete selected */}
        {selectedCount > 0 && (
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
            placeholder={c.searchPlaceholder}
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
            <Truck className="h-3 w-3" />{c.active}
          </button>
          <button
            onClick={() => setStatusFilter(v => v === "disabled" ? "all" : "disabled")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "disabled" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <Truck className="h-3 w-3" />{c.inactive}
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${showFilters ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M2 4h12M4 8h8M6 12h4" />
            </svg>
            {c.filter}
          </button>
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
          <Plus className="h-3.5 w-3.5" /> {c.addNew}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          {error} — <button onClick={load} className="underline">retry</button>
        </div>
      )}

      {/* ── AG Grid ── */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card shadow-sm" style={{ height: "100%" }}>
        <AgGridReact<Fleet>
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
          overlayLoadingTemplate='<span class="text-sm text-muted-foreground">Loading fleets…</span>'
          overlayNoRowsTemplate='<span class="text-sm text-muted-foreground">No fleets found.</span>'
        />
      </div>
    </div>
  )
}
