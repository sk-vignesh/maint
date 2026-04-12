"use client"

/**
 * ComplianceMatrixView — Compact Edition
 *
 * Dense layout designed to eliminate vertical scroll:
 *   - Each data row: ~24px  (bar + right-aligned value label + icon)
 *   - Section separators: ~16px (colored accent strip)
 *   - Driver header: ~34px (horizontal compact chip)
 *   - Header bar + footer: ~78px fixed
 *   - Total for 12 rows + 4 sections: ~384px tbody
 *
 * Design choices:
 *   - Value is displayed to the RIGHT of the bar (no contrast issues)
 *   - Limit and sublabel live only in the tooltip (ℹ)
 *   - "↑ more rest" note removed — tooltip explains inversion
 *   - Section names as thin accent row, not full-height header
 *   - Driver header is horizontal (initial + name + status pill)
 */

import * as React from "react"
import type { Driver } from "@/lib/drivers-api"
import type { Order } from "@/lib/orders-api"
import type { RotaComplianceReport } from "@/lib/compliance-engine"
import { getDriverStats, type DriverRuleStat } from "@/lib/compliance-engine"
import { ShieldCheck, ShieldAlert, AlertTriangle, Info } from "lucide-react"

// ─── Row definitions ─────────────────────────────────────────────────────────

type SectionKey = "driving" | "resting" | "weekly_rest" | "integrity"

interface RuleRow {
  ruleId:    string
  label:     string           // short display label for the row
  inverted:  boolean
  section:   SectionKey
  tooltip:   string           // all the detail — limit + rule description
  isCount:   boolean
}

const RULE_ROWS: RuleRow[] = [
  // ── Driving Times ───────────────────────────────────────────────────────
  { ruleId: "CONTINUOUS_4H30", section: "driving", inverted: false, isCount: false,
    label:   "Driving time 4h30",
    tooltip: "Longest continuous driving block (trips with < 45 min gap between them).\nLimit: 4h 30m (EC 561/2006 Art.7). Warning above 4h." },
  { ruleId: "DAILY_HOURS", section: "driving", inverted: false, isCount: false,
    label:   "Daily driving time",
    tooltip: "Peak single-day total this week.\nLimit: 9h standard / 10h max ×2/wk (EC 561/2006 Art.6). Warning above 9h." },
  { ruleId: "DAILY_AMPLITUDE", section: "driving", inverted: false, isCount: false,
    label:   "Daily amplitude",
    tooltip: "Widest day span: last trip end – first trip start on any single day.\nLimit: 15h (EC 561/2006). Warning above 13h." },
  { ruleId: "REDUCED_REST_DAYS", section: "driving", inverted: false, isCount: true,
    label:   "# Reduced rest days",
    tooltip: "Count of inter-trip rest gaps between 9h and 11h (reduced daily rest).\nAllowed: max 3× per 7-day period (EC 561/2006)." },
  { ruleId: "WEEKLY_HOURS", section: "driving", inverted: false, isCount: false,
    label:   "Weekly driving time",
    tooltip: "Total trip hours in the visible week.\nLimit: 56h (EC 561/2006 Art.6.3). Warning above 50h." },
  { ruleId: "BIWEEKLY_HOURS", section: "driving", inverted: false, isCount: false,
    label:   "Bi-weekly driving",
    tooltip: "Total trip hours across current + prior week.\nLimit: 90h / 2 weeks (EC 561/2006 Art.6.3). Warning above 80h." },

  // ── Resting Times ────────────────────────────────────────────────────────
  { ruleId: "BREAK_45", section: "resting", inverted: false, isCount: true,
    label:   "Break 45′",
    tooltip: "Count of continuous driving chains > 4h30 without a 45-min break observed.\n0 = OK. Note: intra-trip breaks are not visible in trip data — only inter-trip gaps are checked." },
  { ruleId: "REST_GAP", section: "resting", inverted: true, isCount: false,
    label:   "Previous daily rest",
    tooltip: "Shortest inter-trip gap across all loaded trips (worst daily rest).\nBar fills as rest shrinks — green = rested, red = critically short.\nMin: 9h (hard limit). Target: 11h (EC 561/2006)." },

  // ── Compensated Weekly Rest ──────────────────────────────────────────────
  { ruleId: "WEEKLY_REST", section: "weekly_rest", inverted: true, isCount: false,
    label:   "Week 0 rest",
    tooltip: "Longest unbroken gap within the current visible week.\nBar fills as rest shrinks. Policy: ≥46h. Reduced rest (≥24h) requires compensation within 3 weeks. (EC 561/2006 Art.8.6)" },
  { ruleId: "WEEKLY_REST_PRIOR", section: "weekly_rest", inverted: true, isCount: false,
    label:   "Week −1 rest",
    tooltip: "Longest unbroken gap in the prior week (used for biweekly hours calculation).\nSame thresholds as Week 0. Needed to assess outstanding compensation." },
  { ruleId: "WEEKLY_REST_PRIOR2", section: "weekly_rest", inverted: true, isCount: false,
    label:   "Week −2 rest",
    tooltip: "Week −2 data is not loaded — page fetches current + one prior week only.\nShown as 'No data' until a week −2 fetch is implemented." },

  // ── Integrity ────────────────────────────────────────────────────────────
  { ruleId: "OVERLAP", section: "integrity", inverted: false, isCount: true,
    label:   "Overlapping trips",
    tooltip: "Count of trip pairs assigned to this driver that overlap in time.\nAny overlap is a hard violation (data integrity, not EC 561/2006)." },
]

// ─── Section styling ─────────────────────────────────────────────────────────

const SECTION_META: Record<SectionKey, { label: string; barClass: string; textClass: string; bgClass: string }> = {
  driving:     { label: "Driving Times",           barClass: "bg-blue-400",   textClass: "text-blue-700 dark:text-blue-300",   bgClass: "bg-blue-50/50 dark:bg-blue-900/10" },
  resting:     { label: "Resting Times",           barClass: "bg-teal-400",   textClass: "text-teal-700 dark:text-teal-300",   bgClass: "bg-teal-50/50 dark:bg-teal-900/10" },
  weekly_rest: { label: "Compensated Weekly Rest", barClass: "bg-violet-400", textClass: "text-violet-700 dark:text-violet-300", bgClass: "bg-violet-50/40 dark:bg-violet-900/10" },
  integrity:   { label: "Integrity",               barClass: "bg-rose-400",   textClass: "text-rose-700 dark:text-rose-300",   bgClass: "bg-rose-50/30 dark:bg-rose-900/10" },
}

// ─── Bar colours ──────────────────────────────────────────────────────────────

function barFill(status: DriverRuleStat["status"], inverted: boolean): string {
  if (status === "violation") return "bg-red-500"
  if (status === "warning")   return "bg-amber-400"
  return inverted ? "bg-sky-400" : "bg-emerald-500"
}

// ─── Compact bar + value ─────────────────────────────────────────────────────

function StatBar({ stat, inverted, isCount }: { stat: DriverRuleStat; inverted: boolean; isCount: boolean }) {
  const pct    = Math.round(stat.ratio * 100)
  const colour = barFill(stat.status, inverted)
  const noBar  = isCount && stat.limitMinutes === 0
  const noData = stat.usedLabel === "No data"

  return (
    <div className="flex items-center gap-1 min-w-0">
      {noData ? (
        <span className="text-[9px] text-muted-foreground/40 italic flex-1">No data</span>
      ) : noBar ? (
        // Count-only (OVERLAP, BREAK_45) — just a status chip
        <span className={`flex-1 text-[9px] font-bold tabular-nums ${
          stat.status === "violation" ? "text-red-600" :
          stat.status === "warning"   ? "text-amber-600" : "text-emerald-600"
        }`}>{stat.usedLabel}</span>
      ) : (
        <>
          {/* Thin progress bar */}
          <div className="relative flex-1 h-3.5 rounded-sm overflow-hidden bg-muted/80 min-w-0" title={`${pct}%`}>
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${colour}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Value label — right of bar, fixed width so columns align */}
          <span className={`text-[9px] font-bold tabular-nums leading-none w-10 text-right shrink-0 ${
            stat.status === "violation" ? "text-red-600 dark:text-red-400" :
            stat.status === "warning"   ? "text-amber-600 dark:text-amber-400" :
                                          "text-foreground/70"
          }`}>
            {stat.usedLabel}
          </span>
        </>
      )}
      {/* Status icon */}
      {stat.status === "violation" && <ShieldAlert  className="h-2.5 w-2.5 text-red-500 shrink-0" />}
      {stat.status === "warning"   && <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
      {stat.status === "compliant" && !noData && <ShieldCheck className="h-2.5 w-2.5 text-emerald-500 shrink-0" />}
    </div>
  )
}

// ─── Compact driver header ────────────────────────────────────────────────────

function DriverChip({
  driver,
  overallStatus,
}: {
  driver: Driver
  overallStatus: "compliant" | "warning" | "violation"
}) {
  const colours = {
    compliant: "border-emerald-200/60 bg-emerald-50/30 dark:bg-emerald-900/10",
    warning:   "border-amber-200/60 bg-amber-50/40 dark:bg-amber-900/15",
    violation: "border-red-200/60 bg-red-50/40 dark:bg-red-900/15",
  }
  const dotColour = {
    compliant: "bg-emerald-500",
    warning:   "bg-amber-500",
    violation: "bg-red-500",
  }
  // Split on space and take first letter of each word for initials (max 2)
  const initials = (driver.name ?? "?")
    .split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("")

  return (
    <div className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg border ${colours[overallStatus]}`}>
      {/* Avatar + dot */}
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold shrink-0">
        {initials}
        <span className={`absolute -top-px -right-px h-2 w-2 rounded-full border border-card ${dotColour[overallStatus]}`} />
      </span>
      {/* First name */}
      <span className="text-[8px] font-semibold leading-none text-center truncate max-w-[64px]"
            title={driver.name}>
        {driver.name?.split(" ")[0] ?? "—"}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ComplianceMatrixProps {
  drivers:           Driver[]
  tripIndex:         Map<string, Order>
  complianceReports: Map<string, RotaComplianceReport>
  dates:             string[]
  onOpenPanel:       () => void
}

export function ComplianceMatrixView({
  drivers,
  tripIndex,
  complianceReports,
  dates,
  onOpenPanel,
}: ComplianceMatrixProps) {

  // Compute stats for all drivers — memoised on data
  const driverStats = React.useMemo(() => {
    const m = new Map<string, DriverRuleStat[]>()
    for (const d of drivers) m.set(d.uuid, getDriverStats(d.uuid, tripIndex, dates))
    return m
  }, [drivers, tripIndex, dates])

  // Overall status from the existing compliance report (violations/warnings for this week)
  function overallStatus(driverUuid: string): "compliant" | "warning" | "violation" {
    const report = complianceReports.get(driverUuid)
    if (!report) return "compliant"
    const weekSet = new Set(dates)
    if (report.violations.some(v => weekSet.has(v.date))) return "violation"
    if (report.warnings.some(w => weekSet.has(w.date))) return "warning"
    return "compliant"
  }

  const summary = React.useMemo(() => {
    let v = 0, w = 0, c = 0
    for (const d of drivers) {
      const s = overallStatus(d.uuid)
      if (s === "violation") v++
      else if (s === "warning") w++
      else c++
    }
    return { violations: v, warnings: w, compliant: c }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, complianceReports, dates])

  // Group rows by section (preserve order)
  const sections: SectionKey[] = ["driving", "resting", "weekly_rest", "integrity"]

  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <ShieldCheck className="h-10 w-10 opacity-20" />
        <p className="text-sm font-semibold">No drivers loaded</p>
        <p className="text-xs">Drivers appear here once the rota finishes loading.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 select-none">

      {/* ── Summary header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card shrink-0 flex-wrap">

        {/* Stat chips */}
        <div className="flex items-center gap-3">
          {[
            { n: summary.violations, label: "Violations", colour: "text-red-600" },
            { n: summary.warnings,   label: "Warnings",   colour: "text-amber-600" },
            { n: summary.compliant,  label: "Compliant",  colour: "text-emerald-600" },
          ].map(({ n, label, colour }) => (
            <div key={label} className="flex items-baseline gap-1">
              <span className={`text-base font-bold leading-none ${colour}`}>{n}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-2.5 text-[9px] text-muted-foreground">
            {[
              { colour: "bg-emerald-500", label: "OK" },
              { colour: "bg-amber-400",   label: "Warning" },
              { colour: "bg-red-500",     label: "Violation" },
              { colour: "bg-sky-400",     label: "Rest (inverted)" },
            ].map(({ colour, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${colour}`} />
                {label}
              </span>
            ))}
          </div>
          <button
            onClick={onOpenPanel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-[10px] font-semibold hover:bg-muted transition-colors"
          >
            <ShieldAlert className="h-3 w-3" />
            Issues
          </button>
        </div>
      </div>

      {/* ── Matrix ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="border-collapse w-full text-left" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {/* Rule column — fixed width */}
            <col style={{ width: 168, minWidth: 168 }} />
            {drivers.map(d => <col key={d.uuid} style={{ minWidth: 88 }} />)}
          </colgroup>

          {/* ── thead — driver headers ──────────────────────────────────────── */}
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <tr>
              {/* Corner */}
              <th className="border-b border-r border-border/60 px-2.5 py-1.5 align-bottom">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Rule</p>
                <p className="text-[8px] text-muted-foreground/50">{drivers.length} drivers · {dates.length}d</p>
              </th>
              {drivers.map(driver => (
                <th key={driver.uuid}
                    className="border-b border-r last:border-r-0 border-border/60 px-1 py-1 font-normal align-bottom">
                  <DriverChip driver={driver} overallStatus={overallStatus(driver.uuid)} />
                </th>
              ))}
            </tr>
          </thead>

          {/* ── tbody — sections + rows ─────────────────────────────────────── */}
          <tbody>
            {sections.map(section => {
              const meta = SECTION_META[section]
              const rows = RULE_ROWS.filter(r => r.section === section)
              return (
                <React.Fragment key={section}>

                  {/* Thin section separator */}
                  <tr>
                    <td colSpan={drivers.length + 1}
                        className={`${meta.bgClass} border-b border-t border-border/30 py-px`}>
                      <div className="flex items-center gap-1.5 px-2.5">
                        <span className={`inline-block h-2.5 w-1 rounded-full ${meta.barClass}`} />
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${meta.textClass}`}>
                          {meta.label}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Data rows */}
                  {rows.map((row, rowIdx) => (
                    <tr key={row.ruleId}
                        className={`border-b border-border/20 ${
                          rowIdx % 2 === 0 ? "" : "bg-muted/[0.04]"
                        } hover:bg-muted/10 transition-colors`}>

                      {/* Rule label */}
                      <td className="border-r border-border/30 px-2.5 py-1 align-middle">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-foreground/80 truncate leading-none">
                            {row.label}
                          </span>
                          <button
                            className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
                            title={row.tooltip}
                          >
                            <Info className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        {row.inverted && (
                          <p className="text-[7px] text-sky-500/60 leading-none mt-0.5 font-medium">
                            ↑ less rest = longer bar
                          </p>
                        )}
                      </td>

                      {/* Per-driver cells */}
                      {drivers.map(driver => {
                        const stats = driverStats.get(driver.uuid) ?? []
                        const stat  = stats.find(s => s.ruleId === row.ruleId)

                        if (!stat) {
                          return (
                            <td key={driver.uuid}
                                className="border-r last:border-r-0 border-border/20 px-2 py-1">
                              <span className="text-[8px] text-muted-foreground/30">—</span>
                            </td>
                          )
                        }

                        // Cell background for violations/warnings
                        const cellBg =
                          stat.status === "violation" ? "bg-red-50/50 dark:bg-red-900/10"
                        : stat.status === "warning"   ? "bg-amber-50/40 dark:bg-amber-900/10"
                        : ""

                        return (
                          <td key={driver.uuid}
                              className={`border-r last:border-r-0 border-border/20 px-1.5 py-1 align-middle ${cellBg}`}>
                            <StatBar stat={stat} inverted={row.inverted} isCount={row.isCount} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t bg-muted/10 px-4 py-1.5 flex items-center gap-2">
        <Info className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
        <p className="text-[8px] text-muted-foreground/50 leading-tight">
          Real trip data. REST_GAP · WEEKLY_REST · WEEKLY_REST_PRIOR bars are inverted (shorter = more rest = better).
          CONTINUOUS_4H30 &amp; BREAK_45 use inter-trip gaps only — intra-trip breaks not visible.
          EC 561/2006 (UK Assimilated).
        </p>
      </div>
    </div>
  )
}
