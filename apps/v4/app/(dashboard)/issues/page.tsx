"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Download, Trash2, X, Loader2, ChevronDown, AlertTriangle,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import {
  listIssues, createIssue, updateIssue, bulkDeleteIssues, exportIssues,
  type Issue, type IssuePriority, type IssueStatus,
} from "@/lib/issues-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"
import { listVehicles, type Vehicle } from "@/lib/vehicles-api"

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

// ─── Style maps ───────────────────────────────────────────────────────────────

// Priority/Status style maps — labels are filled in at render time from t
const PRIORITY_STYLE: Record<IssuePriority, { badge: string; dot: string }> = {
  low:      { badge: "bg-slate-50 text-slate-600 border border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/40",         dot: "bg-slate-400"   },
  medium:   { badge: "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40",           dot: "bg-amber-500"   },
  high:     { badge: "bg-orange-50 text-orange-700 border border-orange-200/80 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700/40",     dot: "bg-orange-500"  },
  critical: { badge: "bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40",                       dot: "bg-red-500"     },
}

const STATUS_STYLE: Record<IssueStatus, { badge: string; dot: string }> = {
  "pending":     { badge: "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40",         dot: "bg-amber-500"   },
  "in-progress": { badge: "bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/40",               dot: "bg-blue-500"    },
  "resolved":    { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40", dot: "bg-emerald-500" },
  "closed":      { badge: "bg-zinc-100 text-zinc-600 border border-zinc-200/80 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700/40",               dot: "bg-zinc-400"    },
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function ReportCell({ data }: ICellRendererParams<Issue>) {
  if (!data) return null
  return (
    <div className="flex items-center gap-2.5 h-full">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
      </span>
      <p className="truncate text-[13px] font-medium">{data.report ?? "—"}</p>
    </div>
  )
}

function PriorityCell({ value }: ICellRendererParams) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const s = PRIORITY_STYLE[value as IssuePriority]
  if (!s) return <span className="text-xs text-muted-foreground capitalize">{value}</span>
  return (
    <div className="flex items-center h-full">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    </div>
  )
}

function StatusCell({ value }: ICellRendererParams) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const s = STATUS_STYLE[value as IssueStatus]
  if (!s) return <span className="text-xs text-muted-foreground capitalize">{value}</span>
  return (
    <div className="flex items-center h-full">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean
  issue: Issue | null
  drivers: Driver[]
  vehicles: Vehicle[]
  onClose: () => void
  onSaved: () => void
}

const PRIORITIES: IssuePriority[]  = ["low", "medium", "high", "critical"]
const STATUSES:   IssueStatus[]    = ["pending", "in-progress", "resolved", "closed"]

function IssueDrawer({ open, issue, drivers, vehicles, onClose, onSaved }: DrawerProps) {
  const { t } = useLang()
  const i18n = t.issues
  const c = t.common
  const isEdit = !!issue
  const [report,       setReport]       = React.useState("")
  const [driverUuid,   setDriverUuid]   = React.useState("")
  const [vehicleUuid,  setVehicleUuid]  = React.useState("")
  const [priority,     setPriority]     = React.useState<IssuePriority | "">("")
  const [statusVal,    setStatusVal]    = React.useState<IssueStatus>("pending")
  const [category,     setCategory]     = React.useState("")
  const [assignedTo,   setAssignedTo]   = React.useState("")
  const [saving,       setSaving]       = React.useState(false)
  const [error,        setError]        = React.useState<string | null>(null)

  React.useEffect(() => {
    if (issue) {
      setReport(issue.report ?? "")
      setDriverUuid(issue.driver_uuid ?? "")
      setVehicleUuid(issue.vehicle_uuid ?? "")
      setPriority((issue.priority as IssuePriority | null) ?? "")
      setStatusVal(issue.status ?? "pending")
      setCategory(issue.category ?? "")
      setAssignedTo(issue.assigned_to_uuid ?? "")
    } else {
      setReport(""); setDriverUuid(""); setVehicleUuid(""); setPriority("")
      setStatusVal("pending"); setCategory(""); setAssignedTo("")
    }
    setError(null)
  }, [issue, open])

  const handleSave = async () => {
    if (!report.trim()) { setError("Report description is required."); return }
    setSaving(true); setError(null)
    try {
      if (isEdit && issue) {
        await updateIssue(issue.uuid, {
          report:            report.trim(),
          driver_uuid:       driverUuid || undefined,
          vehicle_uuid:      vehicleUuid || undefined,
          priority:          (priority as IssuePriority) || undefined,
          status:            statusVal,
          category:          category || undefined,
          assigned_to_uuid:  assignedTo || undefined,
        } as Parameters<typeof updateIssue>[1])
      } else {
        await createIssue({
          report:           report.trim(),
          driver_uuid:      driverUuid || undefined,
          vehicle_uuid:     vehicleUuid || undefined,
          priority:         (priority as IssuePriority) || undefined,
          status:           statusVal,
          category:         category || undefined,
          assigned_to_uuid: assignedTo || undefined,
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-bold">{isEdit ? i18n.saveChanges : i18n.newIssue}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</div>
          )}

          {/* Report */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{i18n.report} *</label>
            <textarea
              value={report}
              onChange={e => setReport(e.target.value)}
              rows={4}
              placeholder="Describe the issue…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{i18n.priority}</label>
              <div className="relative">
                <select value={priority} onChange={e => setPriority(e.target.value as IssuePriority | "")}
                  className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring capitalize">
                  <option value="">—</option>
                  {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{t.issues[p as keyof typeof t.issues] as string || p}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.status}</label>
              <div className="relative">
                <select value={statusVal} onChange={e => setStatusVal(e.target.value as IssueStatus)}
                  className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Driver + Vehicle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.driver}</label>
              <div className="relative">
                <select value={driverUuid} onChange={e => setDriverUuid(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{c.noData}</option>
                  {drivers.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.vehicle}</label>
              <div className="relative">
                <select value={vehicleUuid} onChange={e => setVehicleUuid(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{c.noData}</option>
                  {vehicles.map(v => <option key={v.uuid} value={v.uuid}>{v.plate_number ?? v.uuid}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Assign To */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{i18n.assignee}</label>
            <div className="relative">
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">{i18n.unassigned}</option>
                {drivers.map(d => <option key={d.uuid} value={d.uuid}>{d.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.type}</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Vehicle, Compliance, Driver…"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-lg border bg-background px-4 text-sm text-muted-foreground hover:bg-muted">{c.cancel}</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? i18n.saveChanges : i18n.createIssue}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IssuesPage() {
  const { t } = useLang()
  const c = t.common
  const i18n = t.issues

  const [issues,        setIssues]        = React.useState<Issue[]>([])
  const [drivers,       setDrivers]       = React.useState<Driver[]>([])
  const [vehicles,      setVehicles]      = React.useState<Vehicle[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [priorityFilter, setPriorityFilter] = React.useState<IssuePriority | "all">("all")
  const [statusFilter,  setStatusFilter]  = React.useState<IssueStatus | "all">("all")
  const [showFilters,   setShowFilters]   = React.useState(false)
  const [selectedCount, setSelectedCount] = React.useState(0)
  const [deleting,      setDeleting]      = React.useState(false)
  const [drawerOpen,    setDrawerOpen]    = React.useState(false)
  const [editIssue,     setEditIssue]     = React.useState<Issue | null>(null)
  const [exporting,     setExporting]     = React.useState(false)

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

  const gridRef = React.useRef<AgGridReact<Issue>>(null)

  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [issuesRes, driversRes, vehiclesRes] = await Promise.all([
        listIssues({ limit: 500, sort: "-created_at" }),
        listDrivers({ limit: 500 }),
        listVehicles({ limit: 500 }),
      ])
      setIssues(issuesRes.issues ?? [])
      setDrivers(driversRes.drivers ?? [])
      setVehicles(vehiclesRes.vehicles ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load issues")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  React.useEffect(() => {
    const api = gridRef.current?.api
    if (!api) return
    api.setGridOption("defaultColDef", {
      sortable: true, resizable: true, filter: "agTextColumnFilter",
      suppressHeaderMenuButton: !showFilters, suppressHeaderFilterButton: !showFilters,
      floatingFilter: false,
    })
    api.refreshHeader()
  }, [showFilters])

  const rowData = React.useMemo(() => {
    let rows = issues
    if (priorityFilter !== "all") rows = rows.filter(i => i.priority === priorityFilter)
    if (statusFilter !== "all")   rows = rows.filter(i => i.status === statusFilter)
    return rows
  }, [issues, priorityFilter, statusFilter])

  const handleDeleteSelected = React.useCallback(async () => {
    if (!window.confirm(`Delete ${selectedCount} issue${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const uuids = (gridRef.current?.api?.getSelectedRows() ?? []).map(r => r.uuid)
      await bulkDeleteIssues(uuids)
      setSelectedCount(0)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }, [selectedCount, load])

  const handleExport = React.useCallback(async () => {
    setExporting(true)
    try {
      const blob = await exportIssues()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `issues-export-${new Date().toISOString().slice(0,10)}.xlsx`
      a.click(); URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }, [])

  const colDefs = React.useMemo<ColDef<Issue>[]>(() => [
    { headerName: c.ref,         field: "public_id",    width: 130, cellRenderer: ({ value }: ICellRendererParams) => <span className="font-mono text-xs text-muted-foreground">{value ?? "—"}</span> },
    { headerName: i18n.report,   field: "report",       flex: 3, minWidth: 200, cellRenderer: ReportCell },
    { headerName: c.driver,      field: "driver_name",  width: 160, cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="text-sm">{value}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { headerName: c.vehicle,     field: "vehicle_name", width: 150, cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="font-mono text-xs">{value}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { headerName: i18n.priority, field: "priority",     width: 130, cellRenderer: PriorityCell },
    { headerName: c.status,      field: "status",       width: 140, cellRenderer: StatusCell },
    { headerName: i18n.assignee, field: "assignee_name",width: 160, cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="text-sm">{value}</span> : <span className="text-muted-foreground text-xs italic">{i18n.unassigned}</span> },
    { headerName: c.date,        field: "created_at",   width: 130, cellRenderer: ({ value }: ICellRendererParams) => <span className="text-xs text-muted-foreground tabular-nums">{value?.slice(0, 10) ?? "—"}</span> },
  ], [c, i18n])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true, resizable: true, filter: "agTextColumnFilter",
    suppressHeaderMenuButton: !showFilters, suppressHeaderFilterButton: !showFilters,
    floatingFilter: false,
  }), [showFilters])

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2">
        <div className="flex-1" />

        {selectedCount > 0 && (
          <button onClick={handleDeleteSelected} disabled={deleting}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-600 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />Delete {selectedCount}
          </button>
        )}

        {/* Search */}
        <div className={`relative transition-all duration-200 ${searchFocused ? "w-72" : "w-40"}`}>
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search issues…" value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Priority + Status filters */}
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
          {(["critical","high","medium","low"] as IssuePriority[]).map(p => (
            <button key={p} onClick={() => setPriorityFilter(v => v === p ? "all" : p)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-all capitalize ${priorityFilter === p ? `${p === "critical" ? "bg-red-500" : p === "high" ? "bg-orange-500" : p === "medium" ? "bg-amber-500" : "bg-slate-500"} text-white shadow-sm` : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>
              {PRIORITY_STYLE[p].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-0.5">
          {(["pending","in-progress","resolved","closed"] as IssueStatus[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(v => v === s ? "all" : s)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${statusFilter === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>
              {STATUS_STYLE[s].label}
            </button>
          ))}
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${showFilters ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}>
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
        <button onClick={handleExport} disabled={exporting} title="Export"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </button>
        <span className="h-6 w-px bg-border" />
        <button onClick={() => { setEditIssue(null); setDrawerOpen(true) }}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          {i18n.newIssue}
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
        <AgGridReact<Issue>
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
          onSelectionChanged={() => setSelectedCount(gridRef.current?.api?.getSelectedRows().length ?? 0)}
          onRowClicked={({ data }) => { if (data) { setEditIssue(data); setDrawerOpen(true) } }}
          rowClass="cursor-pointer"
          overlayLoadingTemplate='<span class="text-sm text-muted-foreground">Loading issues…</span>'
          overlayNoRowsTemplate='<span class="text-sm text-muted-foreground">No issues found.</span>'
        />
      </div>

      {/* ── Drawer ── */}
      <IssueDrawer
        open={drawerOpen}
        issue={editIssue}
        drivers={drivers}
        vehicles={vehicles}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
