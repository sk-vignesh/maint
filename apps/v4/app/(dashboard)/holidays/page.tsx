"use client"
import * as React from "react"
import {
  Search, RefreshCw, Plus, Download,
  CheckCircle2, Clock, XCircle,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import { listDriverLeave, type LeaveRequest } from "@/lib/leave-requests-api"

import { AgGridReact } from "ag-grid-react"
import {
  type ColDef, type ICellRendererParams,
  ModuleRegistry, AllCommunityModule,
  themeQuartz,
} from "ag-grid-community"

ModuleRegistry.registerModules([AllCommunityModule])

// ─── AG Grid themes (identical to trips / drivers / vehicles) ─────────────────

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

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { icon: React.FC<{ className?: string }>; badge: string; dot: string }> = {
  Approved:  { icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40", dot: "bg-emerald-500" },
  Submitted: { icon: Clock,        badge: "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40",     dot: "bg-amber-500"  },
  Rejected:  { icon: XCircle,      badge: "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700/40",             dot: "bg-rose-500"   },
}

function fmtDay(iso: string) {
  return iso?.slice(0, 10) ?? "—"
}

// ─── Cell renderers ────────────────────────────────────────────────────────────

function DriverCell({ data }: ICellRendererParams<LeaveRequest>) {
  if (!data) return null
  const name = data.user?.name ?? "—"
  const initials = name.trim().split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-2.5 h-full">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
        {initials}
      </span>
      <span className="font-semibold text-[13px] leading-tight">{name}</span>
    </div>
  )
}

function LeaveTypeCell({ value }: ICellRendererParams) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex items-center h-full">
      <span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs font-medium">
        {value}
      </span>
    </div>
  )
}

function StatusCell({ data }: ICellRendererParams<LeaveRequest>) {
  if (!data) return null
  const m = STATUS_META[data.status]
  if (!m) return <span className="text-muted-foreground capitalize">{data.status}</span>
  const Icon = m.icon
  return (
    <div className="flex items-center h-full">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
        <Icon className="h-3 w-3" />
        {data.status}
      </span>
    </div>
  )
}

function DateCell({ value }: ICellRendererParams) {
  return <span className="text-xs text-muted-foreground tabular-nums">{fmtDay(value)}</span>
}

function DaysCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  return <span className="font-bold tabular-nums">{value}</span>
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const { t } = useLang()
  const c = t.common
  const h = t.holidays

  const [leaves,        setLeaves]        = React.useState<LeaveRequest[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [statusFilter,  setStatusFilter]  = React.useState<"all" | "approved" | "submitted" | "rejected">("all")
  const [showFilters,   setShowFilters]   = React.useState(false)
  const [searchFocused, setSearchFocused] = React.useState(false)

  // Dark mode detection
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

  const gridRef = React.useRef<AgGridReact<LeaveRequest>>(null)

  // ── Fetch ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await listDriverLeave({ per_page: 500, sort: "-start_date" })
      setLeaves(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  // Wire search to grid quick filter
  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  // Wire filters toggle to column headers
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
    if (statusFilter === "all") return leaves
    return leaves.filter(l => l.status.toLowerCase() === statusFilter)
  }, [leaves, statusFilter])

  // ── Column defs ──
  const colDefs = React.useMemo<ColDef<LeaveRequest>[]>(() => [
    {
      headerName: c.ref,
      field: "public_id",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: ({ value }: ICellRendererParams) => (
        <span className="font-mono text-xs text-muted-foreground">{value ?? "—"}</span>
      ),
    },
    {
      headerName: c.driver,
      field: "user.name",
      flex: 1.5,
      minWidth: 160,
      filter: "agTextColumnFilter",
      cellRenderer: DriverCell,
    },
    {
      headerName: c.type,
      field: "leave_type",
      width: 160,
      filter: "agTextColumnFilter",
      cellRenderer: LeaveTypeCell,
    },
    { headerName: h.start,  field: "start_date",       width: 120, filter: "agDateColumnFilter", sort: "desc", cellRenderer: DateCell },
    { headerName: h.end,    field: "end_date",         width: 120, filter: "agDateColumnFilter", cellRenderer: DateCell },
    { headerName: h.days,   field: "total_days",       width: 90, cellRenderer: DaysCell },
    { headerName: h.reason, field: "reason",           flex: 2, minWidth: 160, cellRenderer: ({ value }: ICellRendererParams) => <span className="text-xs text-muted-foreground truncate">{value || "—"}</span> },
    {
      headerName: c.status,
      field: "status",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: StatusCell,
    },
  ], [c, h])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: "agTextColumnFilter",
    suppressHeaderMenuButton: !showFilters,
    suppressHeaderFilterButton: !showFilters,
    floatingFilter: false,
  }), [showFilters])

  const approvedCount  = leaves.filter(l => l.status === "Approved").length
  const submittedCount = leaves.filter(l => l.status === "Submitted").length
  const rejectedCount  = leaves.filter(l => l.status === "Rejected").length

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2">

        <div className="flex-1" />

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

        {/* Status filter pills */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
          <button
            onClick={() => setStatusFilter(v => v === "approved" ? "all" : "approved")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "approved" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <CheckCircle2 className="h-3 w-3" />{c.approve}
            {!loading && <span className="ml-0.5 opacity-70">({approvedCount})</span>}
          </button>
          <button
            onClick={() => setStatusFilter(v => v === "submitted" ? "all" : "submitted")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "submitted" ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <Clock className="h-3 w-3" />{c.pending}
            {!loading && <span className="ml-0.5 opacity-70">({submittedCount})</span>}
          </button>
          <button
            onClick={() => setStatusFilter(v => v === "rejected" ? "all" : "rejected")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "rejected" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <XCircle className="h-3 w-3" />{c.reject}
            {!loading && <span className="ml-0.5 opacity-70">({rejectedCount})</span>}
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

        <button onClick={load} disabled={loading} title={c.refresh}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button title={c.export} onClick={() => gridRef.current?.api?.exportDataAsCsv()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Download className="h-3.5 w-3.5" />
        </button>

        <span className="h-6 w-px bg-border" />

        <button className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          {c.addNew}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          {error} — <button onClick={load} className="underline">{c.tryAgain}</button>
        </div>
      )}

      {/* ── AG Grid ── */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card shadow-sm" style={{ height: "100%" }}>
        <AgGridReact<LeaveRequest>
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
          overlayLoadingTemplate='<span class="text-sm text-muted-foreground">Loading leave requests…</span>'
          overlayNoRowsTemplate='<span class="text-sm text-muted-foreground">No leave requests found.</span>'
        />
      </div>
    </div>
  )
}
