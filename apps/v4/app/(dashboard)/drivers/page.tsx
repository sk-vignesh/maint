"use client"

import * as React from "react"
import {
  Search, RefreshCw, Upload, Download,
  LayoutGrid, List,
  MapPin, UserCheck, UserX, Trash2, X, Loader2, ChevronDown, Car,
} from "lucide-react"
import { useLang } from "@/components/lang-context"
import {
  listDrivers, createDriver, updateDriver, updateDriverStatus, exportDrivers, deleteDriver, importDrivers,
  type Driver, type DriverStatus, type ShiftPreferences,
} from "@/lib/drivers-api"
import { listFleets, type Fleet } from "@/lib/fleets-api"
import { listVehicles, type Vehicle } from "@/lib/vehicles-api"
import { ImportModal } from "@/components/import-modal"

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

type DriverRow = Driver & { _fleetNames: string; _vehiclePlate: string }

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


// ─── Driver Drawer ────────────────────────────────────────────────────────────

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const

function DriverDrawer({
  open, driver, fleets, vehicles, onClose, onSaved,
}: {
  open: boolean
  driver: Driver | null
  fleets: Fleet[]
  vehicles: Vehicle[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLang()
  const c = t.common
  const isEdit = !!driver
  const [name,           setName]           = React.useState("")
  const [email,          setEmail]          = React.useState("")
  const [phone,          setPhone]          = React.useState("")
  const [licence,        setLicence]        = React.useState("")
  const [statusVal,      setStatusVal]      = React.useState<DriverStatus>("active")
  const [selectedFleets, setSelectedFleets] = React.useState<string[]>([])
  const [vehicleUuid,    setVehicleUuid]    = React.useState("")
  const [maxTrips,       setMaxTrips]       = React.useState<string>("")
  const [consecDays,     setConsecDays]     = React.useState<string>("")
  // Shift preferences — all_days window
  const [shiftStart,     setShiftStart]     = React.useState("")
  const [shiftEnd,       setShiftEnd]       = React.useState("")
  const [shiftMode,      setShiftMode]      = React.useState<"none" | "all_days">("none")
  const [saving,         setSaving]         = React.useState(false)
  const [error,          setError]          = React.useState<string | null>(null)

  React.useEffect(() => {
    if (driver) {
      setName(driver.name ?? "")
      setEmail(driver.email ?? "")
      setPhone(driver.phone ?? "")
      setLicence(driver.drivers_license_number ?? "")
      setStatusVal(driver.status ?? "active")
      // Fleet UUIDs — prefer embedded fleets objects, fall back to fleet_uuid array
      const fleetIds = driver.fleets?.map(f => f.uuid) ?? driver.fleet_uuid ?? []
      setSelectedFleets(fleetIds)
      setVehicleUuid(driver.vehicle_uuid ?? "")
      setMaxTrips(driver.maximum_trips_per_week != null ? String(driver.maximum_trips_per_week) : "")
      setConsecDays(driver.number_of_consecutive_working_days != null ? String(driver.number_of_consecutive_working_days) : "")
      // Shift preferences
      const allDays = driver.shift_preferences?.all_days
      if (allDays) {
        setShiftMode("all_days")
        setShiftStart(allDays.start ?? allDays.start_time ?? "")
        setShiftEnd(allDays.end ?? "")
      } else {
        setShiftMode("none")
        setShiftStart("")
        setShiftEnd("")
      }
    } else {
      setName(""); setEmail(""); setPhone(""); setLicence("")
      setStatusVal("active"); setSelectedFleets([]); setVehicleUuid("")
      setMaxTrips(""); setConsecDays("")
      setShiftMode("none"); setShiftStart(""); setShiftEnd("")
    }
    setError(null)
  }, [driver, open])

  const toggleFleet = (uuid: string) =>
    setSelectedFleets(prev => prev.includes(uuid) ? prev.filter(f => f !== uuid) : [...prev, uuid])

  const buildShiftPreferences = (): ShiftPreferences | undefined => {
    if (shiftMode === "none" || (!shiftStart && !shiftEnd)) return undefined
    return {
      all_days: {
        ...(shiftStart ? { start: shiftStart, start_time: shiftStart } : {}),
        ...(shiftEnd   ? { end: shiftEnd }                              : {}),
      },
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { setError("Driver name is required."); return }
    setSaving(true); setError(null)
    try {
      const payload: Partial<Driver> = {
        name:                                name.trim(),
        email:                               email || undefined,
        phone:                               phone || undefined,
        drivers_license_number:             licence || undefined,
        status:                              statusVal,
        fleet_uuid:                          selectedFleets.length ? selectedFleets : [],
        vehicle_uuid:                        vehicleUuid || undefined,
        maximum_trips_per_week:             maxTrips ? Number(maxTrips) : undefined,
        number_of_consecutive_working_days: consecDays ? Number(consecDays) : undefined,
        shift_preferences:                  buildShiftPreferences(),
      }
      if (isEdit && driver) {
        await updateDriver(driver.uuid, payload)
      } else {
        await createDriver(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusToggle = async () => {
    if (!driver) return
    setSaving(true); setError(null)
    try {
      await updateDriverStatus(driver.uuid, driver.status === "active" ? "inactive" : "active")
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed")
    } finally {
      setSaving(false)
    }
  }

  const activeFleets = fleets.filter(f => f.status === "active")

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <div className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-bold">{isEdit ? `Edit Driver` : "Add New Driver"}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</div>}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="driver@example.com"
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44..."
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Licence */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Licence Number</label>
            <input type="text" value={licence} onChange={e => setLicence(e.target.value)} placeholder="XXXXXXXXXXXXXXXXXX"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm font-mono outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</label>
            <div className="relative">
              <select value={vehicleUuid} onChange={e => setVehicleUuid(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border bg-background px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">No vehicle assigned</option>
                {vehicles.map(v => (
                  <option key={v.uuid} value={v.uuid}>
                    {v.plate_number}{v.make ? ` — ${v.make}${v.model ? ` ${v.model}` : ""}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Max Trips + Consec Days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Max Trips/Week</label>
              <input type="number" min={1} max={99} value={maxTrips} onChange={e => setMaxTrips(e.target.value)} placeholder="e.g. 5"
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Max Consec. Days</label>
              <input type="number" min={1} max={7} value={consecDays} onChange={e => setConsecDays(e.target.value)} placeholder="e.g. 6"
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
            <div className="flex gap-2">
              {(["active", "inactive"] as DriverStatus[]).map(s => (
                <button key={s} onClick={() => setStatusVal(s)}
                  className={`flex-1 h-8 rounded-lg border text-xs font-semibold capitalize transition-all ${statusVal === s ? s === "active" ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Shift Preferences */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shift Preference</label>
              <div className="flex gap-1">
                <button onClick={() => setShiftMode("none")}
                  className={`h-6 rounded px-2 text-[11px] font-medium transition-all ${shiftMode === "none" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  None
                </button>
                <button onClick={() => setShiftMode("all_days")}
                  className={`h-6 rounded px-2 text-[11px] font-medium transition-all ${shiftMode === "all_days" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  All Days
                </button>
              </div>
            </div>
            {shiftMode === "all_days" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Shift Start</label>
                  <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)}
                    className="h-8 w-full rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Shift End</label>
                  <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}
                    className="h-8 w-full rounded-lg border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            )}
          </div>

          {/* Fleets */}
          {activeFleets.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fleets</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {activeFleets.map(f => (
                  <button key={f.uuid} onClick={() => toggleFleet(f.uuid)}
                    className={`h-8 rounded-lg border px-2 text-xs text-left transition-all truncate ${selectedFleets.includes(f.uuid) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deactivate/Reactivate */}
          {isEdit && (
            <div className="pt-2 border-t">
              <button onClick={handleStatusToggle} disabled={saving}
                className={`h-8 w-full rounded-lg border text-xs font-semibold transition-all ${driver?.status === "active" ? "border-rose-300 text-rose-600 hover:bg-rose-50" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"}`}>
                {driver?.status === "active" ? "Deactivate Driver" : "Reactivate Driver"}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-lg border bg-background px-4 text-sm text-muted-foreground hover:bg-muted">{c.cancel}</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? c.save : c.addNew}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const { t } = useLang()
  const c = t.common
  const [drivers,       setDrivers]       = React.useState<Driver[]>([])
  const [fleets,        setFleetList]     = React.useState<Fleet[]>([])
  const [vehicles,      setVehicleList]   = React.useState<Vehicle[]>([])
  const [fleetMap,      setFleetMap]      = React.useState<Record<string, string>>({})
  const [vehicleMap,    setVehicleMap]    = React.useState<Record<string, string>>({})
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [statusFilter,  setStatusFilter]  = React.useState<"all" | DriverStatus>("active")
  const [view,          setView]          = React.useState<"list" | "cards">("list")
  const [showFilters,   setShowFilters]   = React.useState(false)
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [selectedCount, setSelectedCount] = React.useState(0)
  const [deleting,      setDeleting]      = React.useState(false)
  const [drawerOpen,    setDrawerOpen]    = React.useState(false)
  const [editDriver,    setEditDriver]    = React.useState<Driver | null>(null)
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

  const gridRef = React.useRef<AgGridReact<DriverRow>>(null)

  // ── Fetch ──
  const load = React.useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [driversRes, fleetsRes, vehiclesRes] = await Promise.all([
        listDrivers({ limit: 500 }),
        listFleets({ limit: 500 }),
        listVehicles({ limit: 500 }),
      ])
      // Build fleet lookup map
      const fMap: Record<string, string> = {}
      ;(fleetsRes.fleets ?? []).forEach((f: Fleet) => { fMap[f.uuid] = f.name })
      setFleetMap(fMap)
      setFleetList(fleetsRes.fleets ?? [])
      // Build vehicle lookup map
      const vMap: Record<string, string> = {}
      ;(vehiclesRes.vehicles ?? []).forEach((v: Vehicle) => { vMap[v.uuid] = v.plate_number })
      setVehicleMap(vMap)
      setVehicleList(vehiclesRes.vehicles ?? [])
      setDrivers(driversRes.drivers ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drivers")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDeleteSelected = React.useCallback(async () => {
    if (!window.confirm(`Delete ${selectedCount} driver${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const uuids = (gridRef.current?.api?.getSelectedRows() ?? []).map(r => r.uuid)
      const results = await Promise.allSettled(uuids.map(uuid => deleteDriver(uuid)))
      const deleted = results.filter(r => r.status === "fulfilled").length
      const errors  = results.filter(r => r.status === "rejected").map(r => (r as PromiseRejectedResult).reason)
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
      .map(d => {
        // Fleet names: prefer embedded .fleets objects, fall back to fleet_uuid → fleetMap
        let fleetNames = ""
        if (d.fleets && d.fleets.length > 0) {
          fleetNames = d.fleets.map(f => f.name).filter(Boolean).join(", ")
        } else if (d.fleet_uuid && d.fleet_uuid.length > 0) {
          fleetNames = d.fleet_uuid.map(id => fleetMap[id]).filter(Boolean).join(", ")
        }
        // Vehicle plate
        const vehiclePlate = d.vehicle_uuid ? (vehicleMap[d.vehicle_uuid] ?? d.vehicle_uuid) : ""
        return { ...d, _fleetNames: fleetNames, _vehiclePlate: vehiclePlate }
      })
  }, [drivers, fleetMap, vehicleMap, statusFilter])

  const activeCount   = drivers.filter(d => d.status === "active").length
  const inactiveCount = drivers.filter(d => d.status === "inactive").length

  // ── Column defs ──
  const colDefs = React.useMemo<ColDef<DriverRow>[]>(() => [
    { headerName: c.driver,   field: "name",             cellRenderer: NameCell,   flex: 2, minWidth: 180, filter: "agTextColumnFilter" },
    { headerName: "Email",    field: "email",             flex: 2, minWidth: 160,   cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="text-muted-foreground text-xs">{value}</span> : <span className="text-muted-foreground">—</span> },
    { headerName: c.phone,    field: "phone",             width: 150,              cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="text-muted-foreground text-xs">{value}</span> : <span className="text-muted-foreground">—</span> },
    { headerName: c.fleet,    field: "_fleetNames",       flex: 1.5, minWidth: 140, cellRenderer: FleetCell },
    { headerName: "Vehicle",  field: "_vehiclePlate",     width: 140,              cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="flex items-center gap-1 text-xs font-mono"><Car className="h-3 w-3 text-muted-foreground" />{value}</span> : <span className="text-muted-foreground">—</span> },
    { headerName: c.licence,  field: "drivers_license_number", width: 150,         cellRenderer: ({ value }: ICellRendererParams) => value ? <span className="font-mono text-xs">{value}</span> : <span className="text-muted-foreground">—</span> },
    { headerName: c.status,   field: "status",            width: 120,              cellRenderer: StatusCell },
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

        {/* Delete selected */}
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
            placeholder={c.searchDrivers}
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
            <UserCheck className="h-3 w-3" />{c.active}
            {!loading && <span className="ml-0.5 opacity-70">({activeCount})</span>}
          </button>
          <button
            onClick={() => setStatusFilter(v => v === "inactive" ? "all" : "inactive")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${statusFilter === "inactive" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
          >
            <UserX className="h-3 w-3" />{c.inactive}
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
              {c.filter}
            </button>
          )}
        </div>

        <span className="h-6 w-px bg-border" />

        <button onClick={load} disabled={loading} title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button id="driver-import-btn" title="Import" onClick={() => setShowImport(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Upload className="h-3.5 w-3.5" />
        </button>
        <button title="Export" onClick={async () => { try { const blob = await exportDrivers(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `drivers-export.xlsx`; a.click(); URL.revokeObjectURL(url) } catch(e) { setError(e instanceof Error ? e.message : "Export failed") } }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Download className="h-3.5 w-3.5" />
        </button>

        <span className="h-6 w-px bg-border" />

        <button onClick={() => { setEditDriver(null); setDrawerOpen(true) }} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
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
            rowSelection={{ mode: "multiRow", enableClickSelection: false }}
            onSelectionChanged={() =>
              setSelectedCount(gridRef.current?.api?.getSelectedRows().length ?? 0)
            }
            onRowClicked={({ data }) => { if (data) { setEditDriver(data); setDrawerOpen(true) } }}
            rowClass="cursor-pointer"
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
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{c.noData}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {rowData.map(d => {
                  const st = STATUS_STYLE[d.status] ?? STATUS_STYLE.inactive
                  return (
                    <div key={d.uuid}
                      onClick={() => { setEditDriver(d); setDrawerOpen(true) }}
                      className="group flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
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
                        {d._vehiclePlate && (
                          <span className="flex items-center gap-1 truncate">
                            <Car className="h-2.5 w-2.5 shrink-0 text-sky-400" />
                            <span className="truncate font-mono">{d._vehiclePlate}</span>
                          </span>
                        )}
                        {d._vehiclePlate && (d.city ?? d.country) && <span className="text-border shrink-0">·</span>}
                        {(d.city ?? d.country) && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
                            <span className="truncate">{[d.city, d.country].filter(Boolean).join(", ")}</span>
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

    <DriverDrawer
      open={drawerOpen}
      driver={editDriver}
      fleets={fleets}
      vehicles={vehicles}
      onClose={() => setDrawerOpen(false)}
      onSaved={load}
    />
    <ImportModal
      open={showImport}
      onClose={() => setShowImport(false)}
      onDone={load}
      entityName="Drivers"
      uploadType="driver_import"
      importFn={importDrivers}
    />
    </>
  )
}
