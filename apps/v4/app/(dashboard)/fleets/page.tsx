"use client"

import * as React from "react"
import { Search, RefreshCw, Filter, SlidersHorizontal, Plus, Upload, Download, MoreHorizontal, Truck } from "lucide-react"

// ─── Types & Data ─────────────────────────────────────────────────────────────

type FleetStatus = "Active" | "Inactive"

type Fleet = {
  id: string
  publicId: string
  name: string
  tripLength: number | null
  drivers: number
  activeDrivers: number
  status: FleetStatus
  color: string
}

const fleets: Fleet[] = [
  { id: "1", publicId: "kseAuve", name: "FleetX",  tripLength: null, drivers: 6, activeDrivers: 0, status: "Active", color: "#6366f1" },
  { id: "2", publicId: "cEBDNth", name: "Tramper", tripLength: null, drivers: 6, activeDrivers: 1, status: "Active", color: "#f59e0b" },
  { id: "3", publicId: "oyC1dgU", name: "Solo",    tripLength: 24,   drivers: 7, activeDrivers: 0, status: "Active", color: "#10b981" },
]

// ─── Fleet Card ───────────────────────────────────────────────────────────────

function FleetCard({ fleet }: { fleet: Fleet }) {
  const [copied, setCopied] = React.useState(false)

  function copyId() {
    navigator.clipboard.writeText(fleet.publicId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      {/* Coloured top strip */}
      <div className="h-1 w-full" style={{ background: fleet.color }} />

      {/* Card body */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          {/* Truck icon */}
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${fleet.color}18` }}
          >
            <Truck className="h-5 w-5" style={{ color: fleet.color }} />
          </div>

          {/* Actions */}
          <button className="invisible inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted group-hover:visible">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Name */}
        <div className="mt-3">
          <h3 className="truncate text-sm font-semibold leading-tight">{fleet.name}</h3>
          {/* Copyable ID */}
          <button
            onClick={copyId}
            title="Click to copy"
            className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono">{fleet.publicId}</span>
            <span className="text-[9px]">{copied ? "✓" : "⎘"}</span>
          </button>
        </div>

        {/* Stats grid */}
        <div className="mt-3 grid grid-cols-3 gap-1 border-t pt-3">
          <Stat label="Trip Len" value={fleet.tripLength !== null ? String(fleet.tripLength) : "—"} />
          <Stat label="Drivers"  value={String(fleet.drivers)} />
          <Stat label="Active"   value={String(fleet.activeDrivers)} accent={fleet.activeDrivers > 0} />
        </div>

        {/* Status badge */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            fleet.status === "Active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${fleet.status === "Active" ? "bg-green-500" : "bg-gray-400"}`} />
            {fleet.status}
          </span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-semibold ${accent ? "text-green-600 dark:text-green-400" : ""}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FleetsPage() {
  const [search, setSearch]     = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("All")

  const filtered = fleets.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.name.toLowerCase().includes(q) || f.publicId.toLowerCase().includes(q)
    const matchStatus = statusFilter === "All" || f.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10">

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Fleets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your fleet groups, their drivers and trip assignments.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Fleets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:max-w-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSearch("")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" />
            New
          </button>

          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>

          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {fleets.length} fleets
      </p>

      {/* Card grid — responsive, targets ~5-6 cols on wide screens */}
      {filtered.length > 0 ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map(f => <FleetCard key={f.id} fleet={f} />)}

          {/* "Add fleet" ghost card */}
          <button className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-4 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground min-h-[160px]">
            <Plus className="h-6 w-6" />
            <span className="text-xs font-medium">New Fleet</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center">
          <Truck className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No fleets match your search.</p>
        </div>
      )}
    </div>
  )
}
