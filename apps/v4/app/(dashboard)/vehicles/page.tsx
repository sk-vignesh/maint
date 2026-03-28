"use client"
import { PageHeader } from "@/components/page-header"

import * as React from "react"
import { Search, Upload, Download, MoreHorizontal } from "lucide-react"

type VehicleStatus = "Active" | "Inactive" | "In Maintenance"

type Vehicle = {
  id: number
  plate: string
  make: string
  model: string
  year: number
  fleet: string
  status: VehicleStatus
}

const vehicles: Vehicle[] = [
  { id: 1, plate: "LD71ABC",   make: "Land Rover", model: "Defender 110", year: 2022, fleet: "Tramper", status: "Active" },
  { id: 2, plate: "LC6737A",   make: "896",         model: "Truck",         year: 2022, fleet: "Solo",    status: "Active" },
  { id: 3, plate: "LN22DLV",   make: "Volkswagen",  model: "Crafter",       year: 2022, fleet: "Solo",    status: "Active" },
  { id: 4, plate: "AUK 896 43",make: "Arcoss",      model: "Mercedes",      year: 2024, fleet: "Solo",    status: "Active" },
  { id: 5, plate: "NUC45X78",  make: "Truck",       model: "Bercedes",      year: 2021, fleet: "Solo",    status: "Active" },
  { id: 6, plate: "LIFLLJW",   make: "Man8",        model: "Truck",         year: 2024, fleet: "FleetX",  status: "Active" },
  { id: 7, plate: "NUX9VAM",   make: "MAN",         model: "TGX",           year: 2022, fleet: "Solo",    status: "Active" },
  { id: 8, plate: "NUX5AVZ",   make: "MAN",         model: "TXZ",           year: 2021, fleet: "Solo",    status: "Active" },
]

const statusStyles: Record<VehicleStatus, string> = {
  Active:         "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Inactive:       "bg-gray-100 text-foreground dark:bg-gray-800 dark:text-foreground",
  "In Maintenance": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
}
const statusDot: Record<VehicleStatus, string> = {
  Active:         "bg-green-500",
  Inactive:       "bg-gray-400",
  "In Maintenance": "bg-yellow-500",
}

const fleetOptions = ["Solo", "Tramper", "FleetX"]
const statusOptions: VehicleStatus[] = ["Active", "Inactive", "In Maintenance"]

export default function VehiclesPage() {
  const [search, setSearch]   = React.useState("")
  const [fleetFilter, setFleetFilter] = React.useState("All")

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      v.plate.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.fleet.toLowerCase().includes(q) ||
      String(v.year).includes(q)
    const matchFleet = fleetFilter === "All" || v.fleet === fleetFilter
    return matchSearch && matchFleet
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader pageKey="vehicles" />
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your fleet vehicles, plate numbers, and status.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          + Add Vehicle
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Vehicles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fleetFilter}
            onChange={e => setFleetFilter(e.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="All">All Fleets</option>
            {fleetOptions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plate Number <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Make <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fleet</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status <span className="text-destructive">*</span>
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(v => (
                <tr key={v.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{v.id}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">{v.plate}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{v.make}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{v.model}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{v.year}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{v.fleet}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[v.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[v.status]}`} />
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No vehicles match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {vehicles.length} vehicles
        </div>
      </div>
    </div>
  )
}
