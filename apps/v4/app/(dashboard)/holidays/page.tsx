"use client"
import { PageHeader } from "@/components/page-header"
import * as React from "react"
import { Search, Plus, CheckCircle2, Clock, XCircle, RefreshCw, Download } from "lucide-react"
import { useLang } from "@/components/lang-context"
import { listDriverLeave, type LeaveRequest } from "@/lib/leave-requests-api"

// ─── Helpers ───────────────────────────────────────────────────────────────────

const statusIcon: Record<string, React.FC<{ className?: string }>> = {
  Approved: CheckCircle2,
  Submitted: Clock,
  Rejected: XCircle,
}

const statusStyle: Record<string, string> = {
  Approved:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Rejected:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

function fmtDay(iso: string) {
  return iso.slice(0, 10)
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const { t } = useLang()
  const c = t.common
  const [leaves,  setLeaves]  = React.useState<LeaveRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error,   setError]   = React.useState<string | null>(null)

  const [search, setSearch] = React.useState("")
  const [driver, setDriver] = React.useState("All")
  const [type,   setType]   = React.useState("All")
  const [status, setStatus] = React.useState("all")

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

  // ── Derived filter option lists ──────────────────────────────────────────────

  const driverNames = React.useMemo(() => {
    const names = [...new Set(leaves.map(l => l.user?.name).filter(Boolean) as string[])].sort()
    return ["All", ...names]
  }, [leaves])

  const leaveTypes = React.useMemo(() => {
    const types = [...new Set(leaves.map(l => l.leave_type).filter(Boolean))].sort()
    return ["All", ...types]
  }, [leaves])

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return leaves.filter(l => {
      const name = l.user?.name ?? ""
      const matchQ   = !q || name.toLowerCase().includes(q) || l.leave_type.toLowerCase().includes(q)
      const matchDrv = driver === "All" || name === driver
      const matchTyp = type === "All"   || l.leave_type === type
      const matchSts = status === "all" || l.status.toLowerCase() === status
      return matchQ && matchDrv && matchTyp && matchSts
    })
  }, [leaves, search, driver, type, status])

  // ── Entitlement summary — count Vacation days per driver ─────────────────────

  const ENTITLEMENT = 25
  const driverSummary = React.useMemo(() => {
    const map: Record<string, number> = {}
    leaves.forEach(l => {
      if (l.leave_type === "Vacation" && l.status === "Approved" && l.user?.name) {
        map[l.user.name] = (map[l.user.name] ?? 0) + l.total_days
      }
    })
    return Object.entries(map)
      .map(([name, taken]) => ({ name, taken, remaining: ENTITLEMENT - taken }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [leaves])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8 lg:p-10">

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader pageKey="holidays" />
          <p className="mt-1 text-sm text-muted-foreground">
            {t.pages.holidays.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {c.refresh}
          </button>
          <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> {c.addNew}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Entitlement summary */}
      {driverSummary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {driverSummary.map(s => (
            <div key={s.name} className="rounded-xl border bg-card p-3 shadow-sm">
              <p className="text-xs font-semibold truncate" title={s.name}>{s.name.split(" ")[0]}</p>
              <p className="mt-1 text-lg font-bold">
                {s.taken}<span className="text-xs font-normal text-muted-foreground">/{ENTITLEMENT}</span>
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.remaining < 5 ? "bg-red-500" : s.remaining < 10 ? "bg-amber-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min((s.taken / ENTITLEMENT) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{s.remaining} days left</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="h-9 w-48 rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={driver}
          onChange={e => setDriver(e.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {driverNames.map(d => <option key={d}>{d}</option>)}
        </select>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {leaveTypes.map(t => <option key={t}>{t}</option>)}
        </select>
        {["all", "approved", "submitted", "rejected"].map(f => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              status === f ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => { setSearch(""); setDriver("All"); setType("All"); setStatus("all") }}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted"
          title="Clear filters"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground animate-pulse">
            {c.loading}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            {c.noData}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {[c.ref, c.driver, c.type, "Start", "End", "Days", "Reason", c.status].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const Icon = statusIcon[l.status] ?? Clock
                return (
                  <tr key={l.uuid} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{l.public_id}</td>
                    <td className="px-4 py-2.5 font-medium">{l.user?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full border px-2 py-0.5 text-[10px]">{l.leave_type}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtDay(l.start_date)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{fmtDay(l.end_date)}</td>
                    <td className="px-4 py-2.5 font-bold">{l.total_days}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px]">
                      <span className="truncate block">{l.reason || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[l.status] ?? ""}`}>
                        <Icon className="h-3 w-3" />
                        {l.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td colSpan={8} className="px-4 py-2 text-xs text-muted-foreground">
                  {filtered.length} {c.records} · {filtered.filter(l => l.status === "Submitted").length} {c.pending}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
