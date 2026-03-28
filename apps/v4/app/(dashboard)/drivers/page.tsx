"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Upload, Download,
  MoreHorizontal, LayoutGrid, List,
  Phone, MapPin, UserCheck, UserX,
} from "lucide-react"
import { listDrivers, type Driver, type DriverStatus } from "@/lib/drivers-api"
import { listFleets, type Fleet } from "@/lib/fleets-api"

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
  scrollbarWidth: 0,
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

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-teal-500",
  "bg-rose-500",   "bg-amber-500",  "bg-pink-500", "bg-cyan-500",
]
function avatarColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const STATUS_STYLE: Record<DriverStatus, { badge: string; dot: string; label: string }> = {
  active:   { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40", dot: "bg-emerald-500", label: "Active" },
  inactive: { badge: "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700/40",                 dot: "bg-rose-500",   label: "Inactive" },
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

type DriverRow = Driver & { _fleetNames: string }

function NameCell({ data }: ICellRendererParams<DriverRow>) {
  if (!data) return null
  return (
    <div className="flex items-center gap-2.5 h-full">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor(data.uuid)}`}>
        {initials(data.name)}
      </span>
      <p className="font-semibold text-[13px] leading-tight">{data.name}</p>
    </div>
  )
}

function FleetCell({ data }: ICellRendererParams<DriverRow>) {
  if (!data?._fleetNames) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1 items-center h-full">
      {data._fleetNames.split(", ").map(f => (
        <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{f}</span>
      ))}
    </div>
  )
}

function StatusCell({ data }: ICellRendererParams<DriverRow>) {
  if (!data) return null
  const s = STATUS_STYLE[data.status] ?? STATUS_STYLE.inactive
  return (
    <div className="flex items-center h-full">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    </div>
  )
}

function ActionsCell() {
  return (
    <div className="flex items-center justify-center h-full">
      <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const [drivers,       setDrivers]       = React.useState<Driver[]>([])
  const [fleetMap,      setFleetMap]      = React.useState<Record<string, string>>({})
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [statusFilter,  setStatusFilter]  = React.useState<"all" | DriverStatus>("active")
  const [view,          setView]          = React.useState<"list" | "cards">("list")
  const [showFilters,   setShowFilters]   = React.useState(false)
  const [searchFocused, setSearchFocused] = React.useState(false)

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

  const gridRef = React.useRef<AgGridReact<DriverRow>>(null)

  // ── Fetch ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [driversRes, fleetsRes] = await Promise.all([
        listDrivers({ limit: 500 }),
        listFleets({ limit: 500 }),
      ])
      const map: Record<string, string> = {}
      ;(fleetsRes.fleets ?? []).forEach((f: Fleet) => { map[f.uuid] = f.name })
      setFleetMap(map)
      setDrivers(driversRes.drivers ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drivers")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // Wire search to grid quick filter
  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  // Wire showFilters to grid column defs
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

  // ── Row data ──
  const rowData = React.useMemo<DriverRow[]>(() => {
    return drivers
      .filter(d => statusFilter === "all" || d.status === statusFilter)
      .map(d => ({
        ...d,
        _fleetNames: (d.fleet_uuid ?? []).map(id => fleetMap[id]).filter(Boolean).join(", "),
      }))
  }, [drivers, fleetMap, statusFilter])

  const activeCount   = drivers.filter(d => d.status === "active").length
  const inactiveCount = drivers.filter(d => d.status === "inactive").length

  // ── Column defs ──
  const colDefs = React.useMemo<ColDef<DriverRow>[]>(() => [
    {
      headerName: "Driver",
      field: "name",
      cellRenderer: NameCell,
      flex: 2,
      minWidth: 180,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Email",
      field: "email",
      flex: 2,
      minWidth: 180,
      cellRenderer: ({ value }: ICellRendererParams) =>
        value ? <span className="text-muted-foreground text-xs">{value}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Phone",
      field: "phone",
      width: 160,
      cellRenderer: ({ value }: ICellRendererParams) =>
        value ? <span className="text-muted-foreground text-xs">{value}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Fleet",
      field: "_fleetNames",
      flex: 1.5,
      minWidth: 140,
      cellRenderer: FleetCell,
    },
    {
      headerName: "Location",
      valueGetter: ({ data }) => [data?.city, data?.country].filter(Boolean).join(", ") || "—",
      width: 160,
      cellRenderer: ({ value }: ICellRendererParams) =>
        <span className="text-muted-foreground text-xs">{value}</span>,
    },
    {
      headerName: "Licence",
      field: "drivers_license_number",
      width: 150,
      cellRenderer: ({ value }: ICellRendererParams) =>
        value
          ? <span className="font-mono text-xs">{value}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      headerName: "Status",
      field: "status",
      width: 120,
      cellRenderer: StatusCell,
    },
    {
      headerName: "",
      colId: "_actions",
      width: 52,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCell,
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
            <UserCheck className="h-3 w-3" />Active
            {!loading && <span className="ml-0.5 opacity-70">({activeCount})</span>}
          </button>
          <button
            onClick={() => setStatusFilter(v => v === "inactive" ? "all" : "inactive")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "inactive" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <UserX className="h-3 w-3" />Inactive
            {!loading && <span className="ml-0.5 opacity-70">({inactiveCount})</span>}
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
          <Plus className="h-3.5 w-3.5" /> New Driver
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
          <AgGridReact<DriverRow>
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
            overlayLoadingTemplate='<span class="text-sm text-muted-foreground">Loading drivers…</span>'
            overlayNoRowsTemplate='<span class="text-sm text-muted-foreground">No drivers found.</span>'
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
                    <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
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
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No drivers found.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {rowData.map(d => {
                  const st = STATUS_STYLE[d.status] ?? STATUS_STYLE.inactive
                  return (
                    <div key={d.uuid} className="group flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColor(d.uuid)}`}>
                            {initials(d.name)}
                          </span>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${st.dot}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight">{d.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground leading-tight">{d._fleetNames || "No fleet"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {(d.city ?? d.country) && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
                            <span className="truncate">{[d.city, d.country].filter(Boolean).join(", ")}</span>
                          </span>
                        )}
                        {d.phone && (d.city ?? d.country) && <span className="text-border shrink-0">·</span>}
                        {d.phone && (
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="h-2.5 w-2.5 shrink-0 text-teal-400" />
                            <span className="truncate">{d.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Showing {rowData.length} of {drivers.length} drivers
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
