"use client"
import { PageHeader } from "@/components/page-header"

import * as React from "react"
import { Search, Upload, Download, MoreHorizontal, Pencil } from "lucide-react"

type DriverStatus = "Active" | "Inactive" | "Pending"

type Driver = {
  id: number
  name: string
  email: string
  fleet: string
  vehicle: string
  license: string
  phone: string
  country: string
  city: string
  maxTrips: number
  status: DriverStatus
}

const drivers: Driver[] = [
  { id:  1, name: "Alice",        email: "developer+test@fleetyes.com",    fleet: "Tramper",             vehicle: "",         license: "B1234567UK",    phone: "+447563565626",   country: "United Kingdom", city: "Manchester", maxTrips: 5, status: "Active"   },
  { id:  2, name: "Henry",        email: "fleetyesafp+driver@gmail.com",   fleet: "Solo",                vehicle: "S-NUX9VAM", license: "SUV34576",      phone: "+4474755353535",  country: "United Kingdom", city: "London",     maxTrips: 5, status: "Active"   },
  { id:  3, name: "James Walker", email: "test@gmail.com",                 fleet: "Solo",                vehicle: "F-LIFLLJW", license: "UK123456A",     phone: "+44 7711123456",  country: "United Kingdom", city: "London",     maxTrips: 5, status: "Active"   },
  { id:  4, name: "James Walker", email: "test76322@gmail.com",            fleet: "FleetX",              vehicle: "",         license: "UK123456A87",   phone: "+44 7711123456",  country: "United Kingdom", city: "London",     maxTrips: 5, status: "Active"   },
  { id:  5, name: "Sarah Patel",  email: "test6677665@gmail.com",          fleet: "Tramper",             vehicle: "",         license: "UK654321B8777", phone: "+44 786386383683",country: "United Kingdom", city: "London",     maxTrips: 5, status: "Active"   },
  { id:  6, name: "James Walker", email: "test763224@gmail.com",           fleet: "Solo",                vehicle: "",         license: "UK123456A8744", phone: "+44 7711123456",  country: "United Kingdom", city: "London",     maxTrips: 5, status: "Active"   },
  { id:  7, name: "Sarah Patel",  email: "test66776654@gmail.com",         fleet: "Tramper, Solo",       vehicle: "",         license: "UK654321B877733",phone: "+44 786386383683",country:"United Kingdom",  city: "London",     maxTrips: 5, status: "Active"   },
  { id:  8, name: "Zaraff",       email: "developer+driver@fleetyes.com",  fleet: "FleetX",              vehicle: "",         license: "463876893ufff", phone: "+44567989909",    country: "Angola",          city: "London",     maxTrips: 5, status: "Pending"  },
  { id:  9, name: "FleetYes",     email: "developer@fleetyes.com",         fleet: "",                    vehicle: "",         license: "346yutdcgnv",   phone: "+446379564714",   country: "Anguilla",        city: "C",          maxTrips: 5, status: "Active"   },
  { id: 10, name: "Azra",         email: "developer+az@fleetyes.com",      fleet: "Tramper, FleetX",     vehicle: "",         license: "1314356 HUJ",   phone: "+447686897897",   country: "Belize",          city: "UK",         maxTrips: 5, status: "Pending"  },
  { id: 11, name: "Zara Zyna",    email: "akileswari+f43786@agilecyber.com",fleet:"Solo, Tramper, FleetX",vehicle:"",         license: "A989KILWE",     phone: "+445644678897",   country: "United Kingdom", city: "London",     maxTrips: 5, status: "Active"   },
  { id: 12, name: "Akila",        email: "testerakila@gmail.com",          fleet: "FleetX, Solo",        vehicle: "F-LIFLLJW",license: "ABC779787",     phone: "+447474415656",   country: "Anguilla",        city: "London",     maxTrips: 5, status: "Active"   },
  { id: 13, name: "Zaith",        email: "Developer+78@agilecyber.com",    fleet: "Solo, FleetX, Tramper",vehicle:"S-NUX5AVZ",license: "UK890879907",   phone: "+447867878686",   country: "Azerbaijan",      city: "London",     maxTrips: 5, status: "Inactive" },
  { id: 14, name: "Akila",        email: "akileswari+67@agilecyber.com",   fleet: "FleetX",              vehicle: "T-LD71ABC",license: "UK78474847",    phone: "+44776766767",    country: "Albania",         city: "London",     maxTrips: 4, status: "Pending"  },
]

const statusStyles: Record<DriverStatus, string> = {
  Active:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Inactive: "bg-gray-100 text-foreground dark:bg-gray-800 dark:text-foreground",
  Pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
}
const statusDot: Record<DriverStatus, string> = {
  Active:   "bg-green-500",
  Inactive: "bg-gray-400",
  Pending:  "bg-yellow-500",
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  "bg-blue-500","bg-purple-500","bg-indigo-500","bg-rose-500",
  "bg-amber-500","bg-teal-500","bg-cyan-500","bg-pink-500",
]

const fleetOptions = ["Solo", "Tramper", "FleetX"]
const statusOptions: DriverStatus[] = ["Active", "Inactive", "Pending"]

export default function DriversPage() {
  const [search, setSearch]       = React.useState("")
  const [fleetFilter, setFleetFilter]   = React.useState("All")
  const [statusFilter, setStatusFilter] = React.useState("All")

  const filtered = drivers.filter(d => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.fleet.toLowerCase().includes(q) ||
      d.license.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      d.country.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q)
    const matchFleet  = fleetFilter === "All"  || d.fleet.includes(fleetFilter)
    const matchStatus = statusFilter === "All" || d.status === statusFilter
    return matchSearch && matchFleet && matchStatus
  })

  return (
    <div className="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader pageKey="drivers" />
          <p className="mt-1 text-sm text-muted-foreground">
            Manage drivers, their assignments, and shift preferences.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
          + Add Driver
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Drivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:max-w-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={fleetFilter}
            onChange={e => setFleetFilter(e.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Fleets</option>
            {fleetOptions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="All">All Statuses</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
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
                <th className="w-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                <th className="w-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shift</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fleet</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  License <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Country <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  City <span className="text-destructive">*</span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max / Wk</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status <span className="text-destructive">*</span>
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(d => (
                <tr key={d.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{d.id}</td>

                  {/* Shift preferences button */}
                  <td className="px-4 py-2.5 text-center">
                    <button className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </button>
                  </td>

                  {/* Name + avatar */}
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${AVATAR_COLORS[d.id % AVATAR_COLORS.length]}`}>
                        {initials(d.name)}
                      </span>
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-2.5 text-muted-foreground">{d.email}</td>

                  {/* Fleet pills */}
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {d.fleet ? d.fleet.split(", ").map(f => (
                        <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{f}</span>
                      )) : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{d.vehicle || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{d.license}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{d.phone}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{d.country}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground capitalize">{d.city}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-muted-foreground">{d.maxTrips}</td>

                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[d.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[d.status]}`} />
                      {d.status}
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
                  <td colSpan={13} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No drivers match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {drivers.length} drivers
        </div>
      </div>
    </div>
  )
}
