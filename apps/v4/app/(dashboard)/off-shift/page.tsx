"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Trash2, X, Loader2, ChevronDown,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import {
  listOffShifts, createOffShift, updateOffShift, deleteOffShift,
  type OffShiftPlan,
} from "@/lib/off-shift-api"
import { listDrivers, type Driver } from "@/lib/drivers-api"

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

function fmtDate(iso?: string) {
  return iso?.slice(0, 10) ?? "—"
}

function dayLabel(n: number) {
  return `${n} day${n !== 1 ? "s" : ""}`
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

function DriverCell({ data }: ICellRendererParams<OffShiftPlan>) {
  if (!data) return null
  const driverName = (data as OffShiftPlanEx)._driverName ?? "—"
  const initials = driverName.trim().split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center gap-2.5 h-full">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
        {initials}
      </span>
      <span className="font-semibold text-[13px] leading-tight">{driverName}</span>
    </div>
  )
}

function DayCycleCell({ data }: ICellRendererParams<OffShiftPlan>) {
  if (!data) return null
  return (
    <div className="flex items-center gap-1.5 h-full">
      <span className="rounded-md bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40">
        {data.work_days}W
      </span>
      <span className="text-muted-foreground text-xs">/</span>
      <span className="rounded-md bg-violet-50 border border-violet-200/60 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700/40">
        {data.off_days}O
      </span>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type OffShiftPlanEx = OffShiftPlan & { _driverName: string }

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean
  plan: OffShiftPlan | null
  drivers: Driver[]
  onClose: () => void
  onSaved: () => void
}

function OffShiftDrawer({ open, plan, drivers, onClose, onSaved }: DrawerProps) {
  const { t } = useLang()
  const c = t.common
  const o = t.offShift
  const isEdit = !!plan
  const [driverUuid,       setDriverUuid]       = React.useState("")
  const [workDays,         setWorkDays]         = React.useState(5)
  const [offDays,          setOffDays]          = React.useState(2)
  const [firstLeaveDay,    setFirstLeaveDay]    = React.useState("")
  const [planUpto,         setPlanUpto]         = React.useState("")
  const [saving,           setSaving]           = React.useState(false)
  const [error,            setError]            = React.useState<string | null>(null)
  const [banner,           setBanner]           = React.useState<string | null>(null)

  // Reset form when plan changes
  React.useEffect(() => {
    if (plan) {
      setDriverUuid(plan.driver_uuid ?? "")
      setWorkDays(plan.work_days)
      setOffDays(plan.off_days)
      setFirstLeaveDay(plan.first_leave_day?.slice(0, 10) ?? "")
      setPlanUpto(plan.plan_calendar_upto?.slice(0, 10) ?? "")
    } else {
      setDriverUuid("")
      setWorkDays(5)
      setOffDays(2)
      setFirstLeaveDay("")
      setPlanUpto("")
    }
    setError(null)
    setBanner(null)
  }, [plan, open])

  const handleSave = async () => {
    if (!driverUuid || !firstLeaveDay || !planUpto) {
      setError("Driver, First Leave Day, and Plan Until are required.")
      return
    }
    setSaving(true); setError(null)
    try {
      if (isEdit && plan) {
        const res = await updateOffShift(plan.uuid, {
          driver_uuid:        driverUuid,
          work_days:          workDays,
          off_days:           offDays,
          first_leave_day:    firstLeaveDay,
          plan_calendar_upto: planUpto,
        })
        setBanner(
          `Plan updated — ${res.leave_generation?.created_count ?? 0} leave records regenerated, ` +
          `${res.leave_generation?.skipped_count ?? 0} skipped.`
        )
      } else {
        const res = await createOffShift({
          driver_uuid:        driverUuid,
          work_days:          workDays,
          off_days:           offDays,
          first_leave_day:    firstLeaveDay,
          plan_calendar_upto: planUpto,
        })
        setBanner(
          `Plan created — ${res.leave_generation?.created_count ?? 0} leave records generated, ` +
          `${res.leave_generation?.skipped_count ?? 0} skipped.`
        )
      }
      onSaved()
      setTimeout(() => { setBanner(null); onClose() }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const days = Array.from({ length: 5 }, (_, i) => i + 1)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-bold">{isEdit ? "Edit Recurring Plan" : "New Recurring Off-Shift Plan"}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {banner && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              ✓ {banner}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Driver */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Driver *</label>
            <div className="relative">
              <select
                value={driverUuid}
                onChange={e => setDriverUuid(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a driver…</option>
                {drivers.filter(d => d.status === "active").map(d => (
                  <option key={d.uuid} value={d.uuid}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Work / Off days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Days *</label>
              <div className="relative">
                <select
                  value={workDays}
                  onChange={e => setWorkDays(Number(e.target.value))}
                  className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {days.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Off Days *</label>
              <div className="relative">
                <select
                  value={offDays}
                  onChange={e => setOffDays(Number(e.target.value))}
                  className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {days.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">First Leave Day *</label>
              <input
                type="date"
                value={firstLeaveDay}
                onChange={e => setFirstLeaveDay(e.target.value)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan Until *</label>
              <input
                type="date"
                value={planUpto}
                onChange={e => setPlanUpto(e.target.value)}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground rounded-lg border bg-muted/30 px-3 py-2">
            This plan cycles the driver through <strong>{workDays} working day{workDays !== 1 ? "s" : ""}</strong> followed by{" "}
            <strong>{offDays} rest day{offDays !== 1 ? "s" : ""}</strong>. Leave records are automatically generated from the first
            leave day until the plan-until date, and deleted if this plan is removed.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-lg border bg-background px-4 text-sm text-muted-foreground hover:bg-muted">
            {c.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? c.save : c.new + " Plan"}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OffShiftPage() {
  const { t } = useLang()
  const c = t.common
  const o = t.offShift

  const [plans,         setPlans]         = React.useState<OffShiftPlanEx[]>([])
  const [drivers,       setDrivers]       = React.useState<Driver[]>([])
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [drawerOpen,    setDrawerOpen]    = React.useState(false)
  const [editPlan,      setEditPlan]      = React.useState<OffShiftPlan | null>(null)
  const [deleting,      setDeleting]      = React.useState<string | null>(null)

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

  const gridRef = React.useRef<AgGridReact<OffShiftPlanEx>>(null)

  // ── Fetch ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [planRes, driversRes] = await Promise.all([
        listOffShifts({ per_page: 500, sort: "-created_at" }),
        listDrivers({ limit: 500 }),
      ])
      const driverMap: Record<string, string> = {}
      ;(driversRes.drivers ?? []).forEach(d => { driverMap[d.uuid] = d.name })
      setDrivers(driversRes.drivers ?? [])
      setPlans((planRes.data ?? []).map(p => ({
        ...p,
        _driverName: p.driver?.public_id
          ? `${p.driver.drivers_license_number ?? ""}`
          : driverMap[p.driver_uuid] ?? "Unknown Driver",
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load off-shift plans")
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload drivers for name lookup separately if needed
  const loadWithDriverNames = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [planRes, driversRes] = await Promise.all([
        listOffShifts({ per_page: 500 }),
        listDrivers({ limit: 500 }),
      ])
      const driverMap: Record<string, string> = {}
      ;(driversRes.drivers ?? []).forEach(d => { driverMap[d.uuid] = d.name })
      setDrivers(driversRes.drivers ?? [])
      setPlans((planRes.data ?? []).map(p => ({
        ...p,
        _driverName: driverMap[p.driver_uuid] ?? p.driver?.public_id ?? "Unknown",
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { loadWithDriverNames() }, [loadWithDriverNames])

  // Wire search
  React.useEffect(() => {
    gridRef.current?.api?.setGridOption("quickFilterText", search)
  }, [search])

  // ── Delete ──
  const handleDelete = React.useCallback(async (plan: OffShiftPlan) => {
    if (!window.confirm(
      `Delete this recurring plan for ${(plan as OffShiftPlanEx)._driverName ?? "this driver"}?\n\n` +
      `All automatically generated leave records will also be deleted.`
    )) return
    setDeleting(plan.uuid)
    try {
      await deleteOffShift(plan.uuid)
      await loadWithDriverNames()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleting(null)
    }
  }, [loadWithDriverNames])

  // ── Column defs ──
  const colDefs = React.useMemo<ColDef<OffShiftPlanEx>[]>(() => [
    { headerName: c.ref, field: "public_id", width: 140, cellRenderer: ({ value }: ICellRendererParams) => <span className="font-mono text-xs text-muted-foreground">{value ?? "—"}</span> },
    {
      headerName: c.driver,
      field: "_driverName",
      flex: 2,
      minWidth: 180,
      cellRenderer: DriverCell,
    },
    { headerName: o.cycle, colId: "cycle", flex: 1, minWidth: 120, cellRenderer: DayCycleCell },
    { headerName: o.firstLeaveDay, field: "first_leave_day", width: 150, cellRenderer: ({ value }: ICellRendererParams) => <span className="text-xs tabular-nums text-muted-foreground">{fmtDate(value)}</span> },
    { headerName: o.planUntil, field: "plan_calendar_upto", width: 130, cellRenderer: ({ value }: ICellRendererParams) => <span className="text-xs tabular-nums text-muted-foreground">{fmtDate(value)}</span> },
    {
      headerName: "",
      colId: "actions",
      width: 120,
      sortable: false,
      resizable: false,
      cellRenderer: ({ data }: ICellRendererParams<OffShiftPlanEx>) => {
        if (!data) return null
        return (
          <div className="flex items-center gap-1 h-full">
            <button
              onClick={() => { setEditPlan(data); setDrawerOpen(true) }}
              className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {c.edit}
            </button>
            <button
              onClick={() => handleDelete(data)}
              disabled={deleting === data.uuid}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200/60 bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40 dark:bg-red-950/20 dark:border-red-800/40"
            >
              {deleting === data.uuid
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Trash2 className="h-3 w-3" />
              }
            </button>
          </div>
        )
      },
    },
  ], [c, deleting, handleDelete])

  const defaultColDef = React.useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: "agTextColumnFilter",
    suppressHeaderMenuButton: true,
    suppressHeaderFilterButton: true,
    floatingFilter: false,
  }), [])

  const total = plans.length

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
            placeholder={o.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="h-8 w-full rounded-lg border bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
        </div>

        <span className="h-6 w-px bg-border" />

        <button onClick={loadWithDriverNames} disabled={loading} title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        <span className="h-6 w-px bg-border" />

        <button
          onClick={() => { setEditPlan(null); setDrawerOpen(true) }}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          {c.new} Plan
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          {error} — <button onClick={loadWithDriverNames} className="underline">retry</button>
        </div>
      )}

      {/* ── AG Grid ── */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card shadow-sm" style={{ height: "100%" }}>
        <AgGridReact<OffShiftPlanEx>
          ref={gridRef}
          rowData={loading ? undefined : plans}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          theme={isDark ? darkTheme : lightTheme}
          pagination
          paginationPageSize={25}
          paginationPageSizeSelector={[25, 50, 100]}
          animateRows
          suppressCellFocus
          getRowId={({ data }) => data.uuid}
          overlayLoadingTemplate='<span class="text-sm text-muted-foreground">Loading plans…</span>'
          overlayNoRowsTemplate='<span class="text-sm text-muted-foreground">No recurring plans found. Click "+ New Plan" to create one.</span>'
        />
      </div>

      {/* Footer count */}
      {!loading && (
        <p className="shrink-0 text-xs text-muted-foreground">{total} recurring plan{total !== 1 ? "s" : ""}</p>
      )}

      {/* ── Drawer ── */}
      <OffShiftDrawer
        open={drawerOpen}
        plan={editPlan}
        drivers={drivers}
        onClose={() => setDrawerOpen(false)}
        onSaved={loadWithDriverNames}
      />
    </div>
  )
}
