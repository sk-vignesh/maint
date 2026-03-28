"use client"

import * as React from "react"
import {
  Search, RefreshCw, Plus, Upload, Download,
  MoreHorizontal, LayoutGrid, List, Phone, MapPin,
  UserCheck, UserX, ChevronLeft, ChevronRight,
} from "lucide-react"
import { listDrivers, type Driver, type DriverStatus } from "@/lib/drivers-api"
import { listFleets, type Fleet } from "@/lib/fleets-api"

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
  inactive: { badge: "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700/40",                 dot: "bg-rose-500",     label: "Inactive" },
}

function StatusBadge({ status }: { status: DriverStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

export default function DriversPage() {
  const [drivers,       setDrivers]       = React.useState<Driver[]>([])
  const [fleetMap,      setFleetMap]      = React.useState<Record<string, string>>({})
  const [loading,       setLoading]       = React.useState(true)
  const [error,         setError]         = React.useState<string | null>(null)
  const [search,        setSearch]        = React.useState("")
  const [statusFilter,  setStatusFilter]  = React.useState<"all" | DriverStatus>("active")
  const [view,          setView]          = React.useState<"list" | "cards">("list")
  const [page,          setPage]          = React.useState(1)
  const [searchFocused, setSearchFocused] = React.useState(false)

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

  // ── Filter ──
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return drivers.filter(d => {
      const fleetNames = (d.fleet_uuid ?? []).map(id => fleetMap[id] ?? "").join(" ").toLowerCase()
      const matchSearch = !q ||
        d.name.toLowerCase().includes(q) ||
        (d.email ?? "").toLowerCase().includes(q) ||
        (d.phone ?? "").toLowerCase().includes(q) ||
        (d.city ?? "").toLowerCase().includes(q) ||
        (d.country ?? "").toLowerCase().includes(q) ||
        (d.drivers_license_number ?? "").toLowerCase().includes(q) ||
        fleetNames.includes(q)
      const matchStatus = statusFilter === "all" || d.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [drivers, search, statusFilter, fleetMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  React.useEffect(() => setPage(1), [search, statusFilter])

  const activeCount   = drivers.filter(d => d.status === "active").length
  const inactiveCount = drivers.filter(d => d.status === "inactive").length

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pt-3 pb-2 md:px-8 lg:px-10">

      {/* ── Toolbar — mirrors Trips page ── */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search — expands on focus */}
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

        {/* Status pills toggle group */}
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
        </div>

        {/* Separator */}
        <span className="h-6 w-px bg-border" />

        {/* Utility icon buttons */}
        <button
          onClick={load}
          disabled={loading}
          title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button title="Import" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Upload className="h-3.5 w-3.5" />
        </button>
        <button title="Export" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Download className="h-3.5 w-3.5" />
        </button>

        {/* Separator */}
        <span className="h-6 w-px bg-border" />

        {/* Primary CTA */}
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

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Driver</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fleet</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Licence</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 rounded bg-muted" style={{ width: `${45 + (i * 11 + j * 19) % 50}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">
                      No drivers match your search.
                    </td>
                  </tr>
                ) : paged.map(d => {
                  const fleetNames = (d.fleet_uuid ?? []).map(id => fleetMap[id]).filter(Boolean)
                  return (
                    <tr key={d.uuid} className="transition-colors hover:bg-muted/30">
                      {/* Name + avatar */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor(d.uuid)}`}>
                            {initials(d.name)}
                          </span>
                          <div>
                            <p className="font-semibold leading-tight">{d.name}</p>
                            {d.internal_id && <p className="text-[10px] text-muted-foreground font-mono">{d.internal_id}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground text-xs">{d.email ?? "—"}</td>

                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground text-xs">{d.phone ?? "—"}</td>

                      {/* Fleet pills */}
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {fleetNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {fleetNames.map(f => (
                              <span key={f} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{f}</span>
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>

                      {/* City / Country */}
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground text-xs">
                        {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{d.drivers_license_number ?? "—"}</td>

                      <td className="whitespace-nowrap px-4 py-2.5">
                        <StatusBadge status={d.status} />
                      </td>

                      <td className="px-4 py-2.5">
                        <button className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              {loading ? "Loading…" : `${filtered.length} drivers · page ${safePage} of ${totalPages}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
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
          ) : filtered.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No drivers match your search.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map(d => {
                  const fleetNames = (d.fleet_uuid ?? []).map(id => fleetMap[id]).filter(Boolean)
                  const st = STATUS_STYLE[d.status] ?? STATUS_STYLE.inactive
                  return (
                    <div
                      key={d.uuid}
                      className="group flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                    >
                      {/* Row 1: avatar (with status dot) + name + fleet */}
                      <div className="flex items-center gap-2.5">
                        {/* Avatar with status dot overlaid */}
                        <div className="relative shrink-0">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColor(d.uuid)}`}>
                            {initials(d.name)}
                          </span>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${st.dot}`} />
                        </div>
                        {/* Name + fleet */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight">{d.name}</p>
                          {fleetNames.length > 0
                            ? <p className="truncate text-[11px] text-muted-foreground leading-tight">{fleetNames.join(" · ")}</p>
                            : <p className="text-[11px] text-muted-foreground leading-tight">No fleet</p>
                          }
                        </div>
                      </div>

                      {/* Row 2: city + phone on one line */}
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

              {/* Card view footer */}
              <div className="mt-3 text-xs text-muted-foreground">
                Showing {filtered.length} of {drivers.length} drivers
              </div>
            </>
          )}
        </div>
      )}

    </div>
  )
}
