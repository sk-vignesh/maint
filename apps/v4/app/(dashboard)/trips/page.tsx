"use client"

import { PageHeader } from "@/components/page-header"
import * as React from "react"
import {
  MoreHorizontal, Search, Filter, Download, ChevronLeft, ChevronRight,
  X, Loader2, AlertCircle, Send, Trash2, UserCheck, Plus, ChevronDown,
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

// ─── Status Config ────────────────────────────────────────────────────────────

const statusStyles: Record<OrderStatus, string> = {
  created:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  dispatched: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  started:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  canceled:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const statusDot: Record<OrderStatus, string> = {
  created:    "bg-yellow-500",
  dispatched: "bg-purple-500",
  started:    "bg-blue-500",
  completed:  "bg-green-500",
  canceled:   "bg-red-500",
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
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
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

// ─── Row Actions Menu ─────────────────────────────────────────────────────────

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

            {/* POD */}
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Proof of Delivery</p>
                  <p className="text-xs text-muted-foreground">Require POD on completion</p>
                </div>
                <button
                  type="button"
                  onClick={() => set("pod_required", !form.pod_required)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                    form.pod_required ? "bg-primary" : "bg-muted border"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                      form.pod_required ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {form.pod_required && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">POD Method</label>
                  <select
                    value={form.pod_method ?? "signature"}
                    onChange={(e) => set("pod_method", e.target.value as CreateOrderPayload["pod_method"])}
                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="signature">Signature</option>
                    <option value="photo">Photo</option>
                    <option value="qr_scan">QR Scan</option>
                  </select>
                </div>
              )}
            </div>

            {/* Dispatch immediately */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Dispatch Immediately</p>
                <p className="text-xs text-muted-foreground">Set status to dispatched on create</p>
              </div>
              <button
                type="button"
                onClick={() => set("dispatched", !form.dispatched)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  form.dispatched ? "bg-primary" : "bg-muted border"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                    form.dispatched ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 11 }).map((_, j) => (
            <td key={j} className="px-3 py-2.5">
              <div className="h-4 rounded bg-muted animate-pulse" style={{ width: j === 3 ? "80px" : j === 10 ? "24px" : "60px" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "all">("all")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [showNewTrip, setShowNewTrip] = React.useState(false)
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [fleets, setFleets] = React.useState<Fleet[]>([])

  // Reset to page 1 on status filter change
  React.useEffect(() => {
    setPage(1)
  }, [statusFilter])

  // Fetch orders — status filter and pagination only; search is client-side
  const fetchOrders = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listOrders({
        page,
        per_page: 50,
        sort: "-created_at",
        status: statusFilter !== "all" ? statusFilter : undefined,
      })
      setOrders(res.orders ?? [])
      setTotalPages(res.meta?.last_page ?? 1)
      setTotal(res.meta?.total ?? 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load trips")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  React.useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Fetch drivers + fleets once
  React.useEffect(() => {
    listDrivers().then((r) => setDrivers(dedupBy(r.drivers ?? [], "uuid"))).catch(() => {})
    listFleets().then((r) => setFleets(dedupBy(r.fleets ?? [], "uuid"))).catch(() => {})
  }, [])

  // Client-side search across all visible fields
  const q = search.trim().toLowerCase()
  const filtered = q
    ? orders.filter(
        (o) =>
          (o.public_id ?? "").toLowerCase().includes(q) ||
          (o.internal_id ?? "").toLowerCase().includes(q) ||
          (o.trip_hash_id ?? "").toLowerCase().includes(q) ||
          (o.driver_assigned?.name ?? o.driver_name ?? "").toLowerCase().includes(q) ||
          (o.vehicle_assigned?.plate_number ?? "").toLowerCase().includes(q) ||
          (o.pickup_name ?? o.payload?.pickup?.name ?? "").toLowerCase().includes(q) ||
          (o.dropoff_name ?? o.payload?.dropoff?.name ?? "").toLowerCase().includes(q) ||
          (o.fleet_name ?? "").toLowerCase().includes(q)
      )
    : orders

  const allSelected = filtered.length > 0 && filtered.every((o) => selectedRows.has(o.uuid))
  const toggleAll = () => {
    setSelectedRows(allSelected ? new Set() : new Set(filtered.map((o) => o.uuid)))
  }
  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Actions
  const handleDelete = async (order: Order) => {
    if (!confirm(`Delete trip ${order.public_id}? This cannot be undone.`)) return
    try {
      await deleteOrder(order.uuid)
      setOrders((prev) => prev.filter((o) => o.uuid !== order.uuid))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const handleDispatch = async (order: Order) => {
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
  }

  const handleDriverAssigned = async (order: Order, driverUuid: string) => {
    const driver = drivers.find((d) => d.uuid === driverUuid)
    setOrders((prev) =>
      prev.map((o) =>
        o.uuid === order.uuid
          ? {
              ...o,
              driver_assigned_uuid: driverUuid,
              driver_name: driver?.name ?? o.driver_name,
              driver_assigned: driver
                ? { uuid: driver.uuid, public_id: driver.public_id, name: driver.name, phone: driver.phone }
                : o.driver_assigned,
            }
          : o
      )
    )
  }

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

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, driver, pickup, dropoff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
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
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {loading ? "Loading trips…" : `Showing ${orders.length} of ${total} trips`}
        {selectedRows.size > 0 && (
          <span className="ml-2 font-medium text-foreground">
            · {selectedRows.size} selected
          </span>
        )}
      </p>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchOrders} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                {[
                  "Public ID", "Internal ID", "Trip Hash", "Driver",
                  "Pickup", "Dropoff", "Scheduled", "Est. End", "Fleet", "Status", "",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <TableSkeleton />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    {error ? "Error loading trips." : "No trips match your criteria."}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.uuid}
                    className={`transition-colors hover:bg-muted/30 ${selectedRows.has(order.uuid) ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(order.uuid)}
                        onChange={() => toggleRow(order.uuid)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>

                    {/* Public ID */}
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <button className="font-medium text-primary hover:underline text-left">
                        {order.public_id}
                      </button>
                    </td>

                    {/* Internal ID */}
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {order.internal_id ?? "—"}
                    </td>

                    {/* Trip Hash */}
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground font-mono text-xs">
                      {order.trip_hash_id ?? "—"}
                    </td>

                    {/* Driver */}
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {order.driver_assigned ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-medium uppercase">
                            {driverInitial(order.driver_assigned.name)}
                          </div>
                          <span>{order.driver_assigned.name}</span>
                          {order.vehicle_assigned?.plate_number && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {order.vehicle_assigned.plate_number}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">No driver assigned</span>
                      )}
                    </td>

                    {/* Pickup */}
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {order.pickup_name ?? order.payload?.pickup?.name ?? "—"}
                    </td>

                    {/* Dropoff */}
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">
                      {order.dropoff_name ?? order.payload?.dropoff?.name ?? "—"}
                    </td>

                    {/* Scheduled */}
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground text-xs">
                      {formatDate(order.scheduled_at)}
                    </td>

                    {/* Est End */}
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground text-xs">
                      {formatDate(order.estimated_end_date)}
                    </td>

                    {/* Fleet */}
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {fleetLabel(order)}
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[order.status]}`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusDot[order.status]}`} />
                        {order.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5">
                      <RowMenu
                        order={order}
                        drivers={drivers}
                        onAssigned={(uuid) => handleDriverAssigned(order, uuid)}
                        onDelete={() => handleDelete(order)}
                        onDispatch={() => handleDispatch(order)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex h-8 items-center gap-1 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex h-8 items-center gap-1 rounded-lg border bg-background px-3 text-xs transition-colors hover:bg-muted disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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
