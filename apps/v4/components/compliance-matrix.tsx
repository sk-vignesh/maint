"use client"

/**
 * ComplianceMatrixView
 *
 * Full-width analysis tab that replaces the rota grid when "Analysis" is active.
 *
 * Layout:
 *   ┌───────────────┬──────────┬──────────┬──────────┐
 *   │ Rule          │ Driver A │ Driver B │ Driver C │
 *   │               │ ✓ OK     │ ⚠ Warn   │ 🚫 Viol  │
 *   ├───────────────┼──────────┼──────────┼──────────┤
 *   │ Daily hrs     │ ██░ 7h   │ ████ 9h  │ ████ 11h │
 *   │ Weekly hrs    │ ██░ 34h  │ ████ 51h │ ████ 57h │
 *   │ ...           │          │          │          │
 *   └───────────────┴──────────┴──────────┴──────────┘
 *
 * Colour coding:
 *   Green  — compliant  (< warn threshold)
 *   Amber  — warning    (approaching limit)
 *   Red    — violation  (limit exceeded)
 *   Blue   — rest rules where MORE rest = better (inverted bar)
 *
 * For REST_GAP and WEEKLY_REST the bar is inverted — a full bar means
 * LESS rest was taken (worse). Green means plenty of rest, red means
 * dangerously little.
 */

import * as React from "react"
import type { Driver } from "@/lib/drivers-api"
import type { Order } from "@/lib/orders-api"
import type { RotaComplianceReport } from "@/lib/compliance-engine"
import {
  getDriverStats,
  type DriverRuleStat,
} from "@/lib/compliance-engine"
import { ShieldCheck, ShieldAlert, AlertTriangle, Info } from "lucide-react"

// ─── Row definitions (the 6 rules in display order) ─────────────────────────

interface RuleRow {
  ruleId:    string
  label:     string
  sublabel:  string
  inverted:  boolean   // true for rest rules: bar grows as value DECREASES
  section:   "driving" | "resting"
  tooltip:   string
}

const RULE_ROWS: RuleRow[] = [
  // ── Driving section ──────────────────────────────────────────────────────
  {
    ruleId:   "DAILY_HOURS",
    label:    "Peak daily hours",
    sublabel: "9h std / 10h max",
    inverted: false,
    section:  "driving",
    tooltip:  "Highest number of hours worked on a single day this week. Standard limit is 9h; extendable to 10h max twice per week. (EC 561/2006 Art.6)",
  },
  {
    ruleId:   "WEEKLY_HOURS",
    label:    "Weekly hours",
    sublabel: "56h maximum",
    inverted: false,
    section:  "driving",
    tooltip:  "Total trip hours in the visible week. Warning at 50h, violation above 56h. (EC 561/2006 Art.6.3)",
  },
  {
    ruleId:   "BIWEEKLY_HOURS",
    label:    "Bi-weekly hours",
    sublabel: "90h / 2 weeks",
    inverted: false,
    section:  "driving",
    tooltip:  "Total trip hours across the current and immediately prior week. Warning at 80h, violation above 90h. (EC 561/2006 Art.6.3)",
  },
  {
    ruleId:   "OVERLAP",
    label:    "Overlapping trips",
    sublabel: "0 allowed",
    inverted: false,
    section:  "driving",
    tooltip:  "Count of trip pairs assigned to this driver that overlap in time. Any overlap is a hard violation — a driver cannot be in two places at once.",
  },
  // ── Resting section ──────────────────────────────────────────────────────
  {
    ruleId:   "REST_GAP",
    label:    "Worst rest gap",
    sublabel: "11h target / 9h min",
    inverted: true,
    section:  "resting",
    tooltip:  "The shortest gap between any two consecutive trips across the full trip history. Bar fills as the gap shrinks — green means plenty of rest, red means critically short rest. Minimum 9h (hard), target 11h. (EC 561/2006)",
  },
  {
    ruleId:   "WEEKLY_REST",
    label:    "Weekly rest",
    sublabel: "46h policy / 24h min",
    inverted: true,
    section:  "resting",
    tooltip:  "The longest unbroken rest gap within the visible week. Bar fills as rest shrinks — green is good (driver had 46h+ rest), red is a violation (< 24h). Company policy 46h; EC minimum 45h. (EC 561/2006 Art.8.6)",
  },
]

// ─── Helper: status icon ────────────────────────────────────────────────────

function StatusIcon({ status }: { status: DriverRuleStat["status"] }) {
  if (status === "violation") return <ShieldAlert className="h-3 w-3 text-red-500 shrink-0" />
  if (status === "warning")   return <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
  return <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
}

// ─── Bar colours ─────────────────────────────────────────────────────────────

function barColour(status: DriverRuleStat["status"], inverted: boolean): string {
  if (status === "violation") return "bg-red-500"
  if (status === "warning")   return "bg-amber-400"
  // compliant — use teal for rest rules (inverted), emerald for driving rules
  return inverted ? "bg-sky-400" : "bg-emerald-500"
}

function cellBg(status: DriverRuleStat["status"]): string {
  if (status === "violation") return "bg-red-50/60 dark:bg-red-900/10"
  if (status === "warning")   return "bg-amber-50/50 dark:bg-amber-900/10"
  return ""
}

// ─── Driver header chip ───────────────────────────────────────────────────────

function DriverHeader({
  driver,
  overallStatus,
}: {
  driver: Driver
  overallStatus: "compliant" | "warning" | "violation"
}) {
  const ring =
    overallStatus === "violation" ? "border-red-300/60 bg-red-50 dark:bg-red-900/15"
    : overallStatus === "warning"   ? "border-amber-300/60 bg-amber-50 dark:bg-amber-900/15"
    :                                  "border-emerald-300/40 bg-emerald-50/30 dark:bg-emerald-900/10"

  return (
    <div className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl border ${ring}`}>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-bold shrink-0">
        {(driver.name ?? "?")[0].toUpperCase()}
        {overallStatus !== "compliant" && (
          <span
            className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
              overallStatus === "violation" ? "bg-red-500" : "bg-amber-500"
            }`}
          />
        )}
      </span>
      <span
        className="text-[10px] font-semibold text-center leading-tight max-w-[72px] truncate"
        title={driver.name}
      >
        {driver.name?.split(" ")[0] ?? "—"}
      </span>
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
        overallStatus === "violation" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
        : overallStatus === "warning"   ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        :                                  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
      }`}>
        {overallStatus === "violation" ? "Violation" : overallStatus === "warning" ? "Warning" : "OK"}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ComplianceMatrixProps {
  drivers:          Driver[]
  tripIndex:        Map<string, Order>
  complianceReports: Map<string, RotaComplianceReport>
  dates:            string[]   // the visible week's YYYY-MM-DD strings
  onOpenPanel:      () => void // open the existing Issues drawer
}

export function ComplianceMatrixView({
  drivers,
  tripIndex,
  complianceReports,
  dates,
  onOpenPanel,
}: ComplianceMatrixProps) {
  // Compute stats for every driver (memoised on tripIndex + dates)
  const driverStats = React.useMemo(() => {
    const m = new Map<string, DriverRuleStat[]>()
    for (const d of drivers) {
      m.set(d.uuid, getDriverStats(d.uuid, tripIndex, dates))
    }
    return m
  }, [drivers, tripIndex, dates])

  // Overall status per driver (from existing compliance engine reports)
  function overallStatus(driverUuid: string): "compliant" | "warning" | "violation" {
    const report = complianceReports.get(driverUuid)
    if (!report) return "compliant"
    const weekSet = new Set(dates)
    if (report.violations.some(v => weekSet.has(v.date))) return "violation"
    if (report.warnings.some(w => weekSet.has(w.date))) return "warning"
    return "compliant"
  }

  // Summary counts
  const summary = React.useMemo(() => {
    let violations = 0, warnings = 0, compliant = 0
    for (const d of drivers) {
      const s = overallStatus(d.uuid)
      if (s === "violation") violations++
      else if (s === "warning") warnings++
      else compliant++
    }
    return { violations, warnings, compliant }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, complianceReports, dates])

  const sections: Array<"driving" | "resting"> = ["driving", "resting"]
  const sectionLabel: Record<string, string> = {
    driving: "🚛  Driving Limits",
    resting: "🛌  Rest Requirements",
  }

  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <ShieldCheck className="h-10 w-10 opacity-20" />
        <p className="text-sm font-semibold">No drivers loaded</p>
        <p className="text-xs">Drivers appear here once the rota page finishes loading.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 h-full min-h-0">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-red-600 leading-none">{summary.violations}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Violations</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600 leading-none">{summary.warnings}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Warnings</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600 leading-none">{summary.compliant}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Compliant</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />OK</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Warning</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Violation</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Rest (inverted)</span>
          </div>
          <button
            onClick={onOpenPanel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            View Issues
          </button>
        </div>
      </div>

      {/* ── Matrix table ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="border-collapse w-full" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {/* Rule label column — fixed width */}
            <col style={{ width: 196, minWidth: 196 }} />
            {/* One column per driver — min 96px, expands to fill */}
            {drivers.map(d => (
              <col key={d.uuid} style={{ minWidth: 96 }} />
            ))}
          </colgroup>

          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
            <tr>
              {/* Corner cell */}
              <th className="border-b border-r border-border/60 px-3 py-2 text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rule</p>
                <p className="text-[9px] text-muted-foreground/60">{drivers.length} drivers · {dates.length} days</p>
              </th>

              {/* Driver headers */}
              {drivers.map(driver => (
                <th
                  key={driver.uuid}
                  className="border-b border-r last:border-r-0 border-border/60 px-1.5 py-1.5 text-center font-normal"
                >
                  <DriverHeader driver={driver} overallStatus={overallStatus(driver.uuid)} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sections.map(section => {
              const rows = RULE_ROWS.filter(r => r.section === section)
              return (
                <React.Fragment key={section}>
                  {/* Section header row */}
                  <tr>
                    <td
                      colSpan={drivers.length + 1}
                      className="bg-muted/40 border-b border-t border-border/40 px-3 py-1.5"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {sectionLabel[section]}
                      </span>
                    </td>
                  </tr>

                  {/* Data rows */}
                  {rows.map((row, rowIdx) => (
                    <tr
                      key={row.ruleId}
                      className={`border-b border-border/30 ${rowIdx % 2 === 0 ? "" : "bg-muted/10"} hover:bg-muted/20 transition-colors`}
                    >
                      {/* Rule label column */}
                      <td className="border-r border-border/40 px-3 py-2.5 align-middle">
                        <div className="flex items-start gap-1.5">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-foreground leading-tight">{row.label}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{row.sublabel}</p>
                          </div>
                          <span
                            className="shrink-0 mt-0.5 text-muted-foreground/40 hover:text-muted-foreground/80 cursor-help transition-colors"
                            title={row.tooltip}
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        </div>
                        {row.inverted && (
                          <p className="text-[8px] text-sky-600/70 dark:text-sky-400/60 mt-0.5 font-medium">
                            ↑ more rest = shorter bar
                          </p>
                        )}
                      </td>

                      {/* Per-driver cells */}
                      {drivers.map(driver => {
                        const stats = driverStats.get(driver.uuid) ?? []
                        const stat = stats.find(s => s.ruleId === row.ruleId)

                        if (!stat) {
                          return (
                            <td
                              key={driver.uuid}
                              className="border-r last:border-r-0 border-border/30 px-2 py-2 text-center"
                            >
                              <span className="text-[9px] text-muted-foreground/40">—</span>
                            </td>
                          )
                        }

                        const colour  = barColour(stat.status, row.inverted)
                        const bg      = cellBg(stat.status)
                        const pct     = Math.round(stat.ratio * 100)

                        return (
                          <td
                            key={driver.uuid}
                            className={`border-r last:border-r-0 border-border/30 px-2 py-2 align-middle ${bg}`}
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              {/* Value + status icon */}
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[10px] font-bold tabular-nums leading-none ${
                                  stat.status === "violation" ? "text-red-600 dark:text-red-400"
                                  : stat.status === "warning"   ? "text-amber-600 dark:text-amber-400"
                                  :                               "text-foreground/80"
                                }`}>
                                  {stat.usedLabel}
                                </span>
                                <StatusIcon status={stat.status} />
                              </div>

                              {/* Progress bar */}
                              {row.ruleId !== "OVERLAP" && (
                                <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden" title={`${pct}% of limit`}>
                                  <div
                                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${colour}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              )}

                              {/* Limit label */}
                              <p className="text-[8px] text-muted-foreground/50 leading-none">
                                {row.ruleId === "OVERLAP" ? stat.limitLabel : `/ ${stat.limitLabel}`}
                              </p>
                            </div>
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

      {/* ── Footer note ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t bg-muted/20 px-4 py-2 flex items-center gap-2">
        <Info className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <p className="text-[9px] text-muted-foreground/60">
          All values are computed from real trip data in the current view.
          REST_GAP and WEEKLY_REST bars are inverted: a shorter bar means more rest was taken.
          UK HGV rules based on EC&nbsp;561/2006 (UK Assimilated Regulation).
        </p>
      </div>
    </div>
  )
}
