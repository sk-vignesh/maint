"use client"

import * as React from "react"
import {
  ChevronLeft, ChevronRight, Settings2, Check, X,
  Sun, Moon, Clock, AlertTriangle, Calendar,
} from "lucide-react"
import {
  type RotaStatus, type RotaEntry, type ShiftTemplate, type DriverPreference,
  getAllRota, saveRota, getWeekRota, upsertRota, deleteRota,
  getAllTemplates, getTemplate, saveTemplate,
  getAllPreferences, upsertPreference, getPreference,
  weekStart, weekDates, weekKey, fmtDate, fmtDay, getISOWeek,
} from "@/lib/rota-store"
import { listDrivers, type Driver } from "@/lib/drivers-api"
import { dedupBy } from "@/lib/utils"
import * as ReactDOM from "react-dom"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RotaStatus | "NOT_ON_ROTA", {
  label: string
  short: string
  bg: string
  text: string
  border: string
}> = {
  WD:          { label: "Working Day",       short: "WD",   bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700" },
  RD:          { label: "Rest Day",          short: "RD",   bg: "bg-slate-100 dark:bg-slate-800/60",     text: "text-slate-500 dark:text-slate-400",     border: "border-slate-300 dark:border-slate-600" },
  HOL_REQ:     { label: "Holiday Request",   short: "HOL",  bg: "bg-rose-100 dark:bg-rose-900/40",       text: "text-rose-700 dark:text-rose-300",       border: "border-rose-300 dark:border-rose-700" },
  UNAVAILABLE: { label: "Unavailable",       short: "N/A",  bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-700 dark:text-amber-300",     border: "border-amber-300 dark:border-amber-700" },
  OFF:         { label: "Off",               short: "OFF",  bg: "bg-gray-100 dark:bg-gray-800/60",       text: "text-gray-400",                          border: "border-gray-200 dark:border-gray-700" },
  NOT_ON_ROTA: { label: "Not on Rota",       short: "—",    bg: "bg-transparent",                        text: "text-muted-foreground/30",               border: "border-dashed border-muted/30" },
}

const STATUSES: RotaStatus[] = ["WD", "RD", "HOL_REQ", "UNAVAILABLE", "OFF"]
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DEFAULT_SHIFTS: ShiftTemplate = {
  1: { start: "09:00", pushed_later: false },
  2: { start: "10:00", pushed_later: false },
  3: { start: "14:00", pushed_later: false },
  4: { start: "19:00", pushed_later: false },
  5: { start: "19:00", pushed_later: false },
  6: { start: "20:30", pushed_later: false },
  7: { start: "21:00", pushed_later: false },
  8: { start: "22:00", pushed_later: false },
  9: { start: "22:30", pushed_later: false },
  10: { start: "23:00", pushed_later: false },
}

// ─── Cell Popover ─────────────────────────────────────────────────────────────

function CellPopover({
  driver, date, entry, template,
  onSave, onClear, onClose,
}: {
  driver: Driver
  date: string
  entry?: RotaEntry
  template: ShiftTemplate
  onSave: (e: RotaEntry) => void
  onClear: () => void
  onClose: () => void
}) {
  const [status, setStatus] = React.useState<RotaStatus>(entry?.status ?? "WD")
  const [shiftNum, setShiftNum] = React.useState<string>(String(entry?.shift_number ?? ""))
  const [customTime, setCustomTime] = React.useState(entry?.shift_start ?? "")
  const [note, setNote] = React.useState(entry?.note ?? "")

  const resolvedTime = customTime || (shiftNum ? template[Number(shiftNum)]?.start : undefined)

  return (
    <div
      className="flex flex-col gap-3 p-4 min-w-[260px]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{driver.name}</p>
          <p className="text-xs text-muted-foreground">{fmtDay(date)}, {fmtDate(date)}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Status */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
        <div className="grid grid-cols-3 gap-1.5">
          {STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                  status === s
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm`
                    : "border-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                {status === s && <Check className="h-3 w-3 shrink-0" />}
                {cfg.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* Shift — only meaningful for WD */}
      {status === "WD" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Shift #</p>
            <select
              value={shiftNum}
              onChange={(e) => { setShiftNum(e.target.value); setCustomTime("") }}
              className="w-full rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">—</option>
              {Object.entries(template).map(([n, t]) => (
                <option key={n} value={n}>Shift {n} ({t.start}{t.pushed_later ? " ⚠" : ""})</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Custom time</p>
            <input
              type="time"
              value={customTime}
              onChange={(e) => { setCustomTime(e.target.value); setShiftNum("") }}
              className="w-full rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      )}
      {status === "WD" && resolvedTime && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Shift starts at <span className="font-semibold text-foreground">{resolvedTime}</span>
        </p>
      )}

      {/* Note */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Note (optional)</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note…"
          className="w-full resize-none rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ driver_uuid: driver.uuid, date, status, shift_number: shiftNum ? Number(shiftNum) : undefined, shift_start: customTime || undefined, note: note || undefined })}
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save
        </button>
        {entry && (
          <button
            onClick={onClear}
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Preference Editor ────────────────────────────────────────────────────────

function PreferenceCell({ driver, pref, onChange }: {
  driver: Driver
  pref?: DriverPreference
  onChange: (p: DriverPreference) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [start, setStart] = React.useState(pref?.preference_start ?? "")
  const [end, setEnd] = React.useState(pref?.preference_end ?? "")

  const label = pref?.preference_start && pref.preference_end
    ? `${pref.preference_start}–${pref.preference_end}`
    : "No pref"

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Click to edit preference window"
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Sun className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate max-w-[80px]">{label}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 text-[10px]">
      <div className="flex gap-1 items-center">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
          className="w-16 rounded border bg-background px-1 py-0.5 text-[10px]" />
        <span>–</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
          className="w-16 rounded border bg-background px-1 py-0.5 text-[10px]" />
      </div>
      <div className="flex gap-1">
        <button onClick={() => { onChange({ driver_uuid: driver.uuid, preference_start: start || undefined, preference_end: end || undefined }); setEditing(false) }}
          className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">Save</button>
        <button onClick={() => setEditing(false)}
          className="rounded border px-1.5 py-0.5 text-[9px] text-muted-foreground">Cancel</button>
      </div>
    </div>
  )
}

// ─── Shift Template Editor ────────────────────────────────────────────────────

function ShiftTemplatePanel({ wk, template, onChange }: {
  wk: string
  template: ShiftTemplate
  onChange: (t: ShiftTemplate) => void
}) {
  const [local, setLocal] = React.useState<ShiftTemplate>(() =>
    Object.keys(DEFAULT_SHIFTS).reduce<ShiftTemplate>((acc, n) => {
      const num = Number(n)
      acc[num] = template[num] ?? DEFAULT_SHIFTS[num]
      return acc
    }, {})
  )

  const update = (n: number, field: "start" | "pushed_later", val: string | boolean) => {
    setLocal(prev => ({ ...prev, [n]: { ...prev[n], [field]: val } }))
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Relay Shift Start Times</h3>
          <p className="text-xs text-muted-foreground">Setting for {wk}. Red = pushed later (rest period risk).</p>
        </div>
        <button
          onClick={() => onChange(local)}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Save Template
        </button>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const row = local[n] ?? DEFAULT_SHIFTS[n]
          return (
            <div key={n} className={`flex flex-col gap-1 rounded-lg border p-2 ${row.pushed_later ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30" : ""}`}>
              <p className="text-center text-[10px] font-bold text-muted-foreground">S{n}</p>
              <input
                type="time"
                value={row.start}
                onChange={(e) => update(n, "start", e.target.value)}
                className="w-full rounded border bg-background px-1 py-0.5 text-center text-[10px] focus:outline-none"
              />
              <button
                onClick={() => update(n, "pushed_later", !row.pushed_later)}
                className={`rounded text-[9px] font-bold ${row.pushed_later ? "text-rose-600" : "text-muted-foreground/40"}`}
                title="Toggle 'pushed later' risk flag"
              >
                {row.pushed_later ? "⚠ LATE" : "ok"}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RotaPage() {
  const [monday, setMonday] = React.useState<Date>(() => weekStart(new Date()))
  const [drivers, setDrivers] = React.useState<Driver[]>([])
  const [rotas, setRotas] = React.useState<RotaEntry[]>([])
  const [preferences, setPreferences] = React.useState<DriverPreference[]>([])
  const [template, setTemplate] = React.useState<ShiftTemplate>({})
  const [showTemplate, setShowTemplate] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  // Popover state
  const [popover, setPopover] = React.useState<{
    driver: Driver; date: string; rect: DOMRect
  } | null>(null)

  const dates = React.useMemo(() => weekDates(monday), [monday])
  const wk = React.useMemo(() => weekKey(monday), [monday])
  const week = getISOWeek(monday)

  // Load drivers + rota + preferences on mount and week change
  React.useEffect(() => {
    setLoading(true)
    listDrivers()
      .then((r) => {
        const eligible = (r.drivers ?? []).filter((d) => (d.status as string) !== "pending")
        setDrivers(dedupBy(dedupBy(eligible, "uuid"), (d) => `${d.name}|${d.phone ?? ""}`))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    setRotas(getWeekRota(dates))
    setPreferences(getAllPreferences())
    const tpl = getTemplate(wk)
    setTemplate(Object.keys(tpl).length ? tpl : DEFAULT_SHIFTS)
  }, [dates, wk])

  const navWeek = (delta: number) => {
    setMonday(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta * 7)
      return d
    })
    setPopover(null)
  }

  const getEntry = (driverUuid: string, date: string): RotaEntry | undefined =>
    rotas.find((r) => r.driver_uuid === driverUuid && r.date === date)

  const handleSave = (entry: RotaEntry) => {
    upsertRota(entry)
    setRotas(getWeekRota(dates))
    setPopover(null)
  }

  const handleClear = (driverUuid: string, date: string) => {
    deleteRota(driverUuid, date)
    setRotas(getWeekRota(dates))
    setPopover(null)
  }

  const handleCellClick = (e: React.MouseEvent, driver: Driver, date: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover(prev =>
      prev?.driver.uuid === driver.uuid && prev.date === date ? null : { driver, date, rect }
    )
  }

  const handlePreference = (pref: DriverPreference) => {
    upsertPreference(pref)
    setPreferences(getAllPreferences())
  }

  const handleTemplateSave = (tpl: ShiftTemplate) => {
    saveTemplate(wk, tpl)
    setTemplate(tpl)
  }

  // Popover position (flip up if near bottom)
  const popoverStyle = React.useMemo((): React.CSSProperties => {
    if (!popover) return {}
    const { rect } = popover
    const flipUp = window.innerHeight - rect.bottom < 280
    return {
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - 290),
      zIndex: 9999,
      ...(flipUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    }
  }, [popover])

  // Full-time / part-time split (using Fleetbase driver type if available, else show all together)
  const fullTime = drivers.filter((d) => (d as unknown as { type?: string }).type !== "part-time")
  const partTime = drivers.filter((d) => (d as unknown as { type?: string }).type === "part-time")
  const driverGroups: Array<{ label: string; items: Driver[] }> = [
    ...(fullTime.length ? [{ label: "Full-Time Drivers", items: fullTime }] : []),
    ...(partTime.length ? [{ label: "Part-Time Drivers", items: partTime }] : []),
    // If there's no type field, just show all
    ...(fullTime.length === 0 && partTime.length === 0 ? [{ label: "Drivers", items: drivers }] : []),
  ]
  const allDriverGroups = driverGroups.every(g => g.items.length === 0)
    ? [{ label: "Drivers", items: drivers }]
    : driverGroups

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Driver Rota</h1>
        <p className="text-sm text-muted-foreground">Week {week} — {fmtDate(dates[0])} to {fmtDate(dates[6])}</p>
      </div>

      {/* Week navigation toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl border bg-card px-1 py-1">
          <button
            onClick={() => navWeek(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setMonday(weekStart(new Date())); setPopover(null) }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Today
          </button>
          <button
            onClick={() => navWeek(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {(["WD", "RD", "HOL_REQ", "UNAVAILABLE"] as const).map((s) => {
            const cfg = STATUS_CONFIG[s]
            return (
              <span key={s} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                {cfg.short}
              </span>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowTemplate(p => !p)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${showTemplate ? "bg-muted" : "hover:bg-muted"}`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Shift Template
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground text-sm">Loading drivers…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-[180px] px-3 py-2 text-left text-[11px] font-bold text-muted-foreground">Driver</th>
                <th className="w-[90px] px-2 py-2 text-left text-[11px] font-bold text-muted-foreground">Preference</th>
                {dates.map((d, i) => (
                  <th key={d} className="px-1 py-2 text-center min-w-[90px]">
                    <div className="text-[11px] font-bold text-muted-foreground">{DAYS[i]}</div>
                    <div className="text-[11px] font-normal text-muted-foreground/70">{fmtDate(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allDriverGroups.map((group) => (
                <React.Fragment key={group.label}>
                  {/* Group row */}
                  <tr className="border-b bg-muted/20">
                    <td colSpan={2 + 7} className="px-3 py-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.label}</span>
                    </td>
                  </tr>
                  {group.items.map((driver) => {
                    const pref = preferences.find(p => p.driver_uuid === driver.uuid)
                    return (
                      <tr key={driver.uuid} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                        {/* Driver name */}
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                              {(driver.name ?? "?")[0].toUpperCase()}
                            </span>
                            <span className="text-xs font-medium truncate max-w-[110px]">{driver.name}</span>
                          </div>
                        </td>
                        {/* Preference */}
                        <td className="px-2 py-1.5">
                          <PreferenceCell driver={driver} pref={pref} onChange={handlePreference} />
                        </td>
                        {/* Day cells */}
                        {dates.map((date) => {
                          const entry = getEntry(driver.uuid, date)
                          const cfg = STATUS_CONFIG[entry?.status ?? "NOT_ON_ROTA"]
                          const isActive = popover?.driver.uuid === driver.uuid && popover.date === date
                          const resolvedTime = entry?.status === "WD"
                            ? (entry.shift_start ?? (entry.shift_number ? template[entry.shift_number]?.start : undefined))
                            : undefined
                          const pushed = entry?.shift_number ? template[entry.shift_number]?.pushed_later : false

                          return (
                            <td key={date} className="px-1 py-1">
                              <button
                                onClick={(e) => handleCellClick(e, driver, date)}
                                className={`w-full rounded-lg border px-1.5 py-1.5 text-center transition-all hover:shadow-sm ${cfg.bg} ${cfg.border} ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}`}
                              >
                                <div className={`text-[10px] font-bold ${cfg.text}`}>{cfg.short}</div>
                                {resolvedTime && (
                                  <div className={`mt-0.5 text-[9px] font-medium ${pushed ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                                    {pushed && "⚠ "}{resolvedTime}
                                  </div>
                                )}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shift template panel */}
      {showTemplate && (
        <ShiftTemplatePanel wk={wk} template={template} onChange={handleTemplateSave} />
      )}

      {/* Cell popover portal */}
      {popover && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setPopover(null)} />
          <div
            style={{ ...popoverStyle, width: 280 }}
            className="rounded-xl border bg-card shadow-xl"
          >
            <CellPopover
              driver={popover.driver}
              date={popover.date}
              entry={getEntry(popover.driver.uuid, popover.date)}
              template={template}
              onSave={handleSave}
              onClear={() => handleClear(popover.driver.uuid, popover.date)}
              onClose={() => setPopover(null)}
            />
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
