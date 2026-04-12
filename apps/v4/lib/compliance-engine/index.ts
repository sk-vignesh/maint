/**
 * Compliance Engine — Orchestrator
 *
 * This file contains ZERO rule logic.
 * It only:
 *   1. Converts API Order objects → DriverTrip[]
 *   2. Calls each check module in sequence
 *   3. Merges results into RotaComplianceReport
 *
 * To add a new rule:
 *   - Create check-<rule>.ts with a check<Rule>(trips) function
 *   - Import and call it in runComplianceCheck and prospectiveComplianceCheck below
 *   - That is all.
 *
 * Public API:
 *   runComplianceCheck(driverUuid, tripIndex)                  → RotaComplianceReport
 *   prospectiveComplianceCheck(driverUuid, date, order, index) → { violations }
 *   COMPLIANCE_RULES                                           → rule metadata for UI
 *   re-exports: ComplianceViolation, RotaComplianceReport
 */

import type { Order } from "@/lib/orders-api"
import type { DriverTrip } from "./types"
import { checkOverlap }          from "./check-overlap"
import { checkRestGap }          from "./check-rest-gap"
import { checkDailyHours }       from "./check-daily-hours"
import { checkWeeklyHoursRule }  from "./check-weekly-hours"
import { checkWeeklyRest }       from "./check-weekly-rest"
import { findOverlaps }          from "./overlap"

// Re-export types so the UI only needs to import from one place
export type { ComplianceViolation, RotaComplianceReport } from "./types"
export type { RuleId } from "./types"

// ─── Rule Metadata (for the compliance panel drawer) ─────────────────────────

import type { ComplianceRuleDefinition } from "./types"

export const COMPLIANCE_RULES: ComplianceRuleDefinition[] = [
  {
    id:          "OVERLAP",
    title:       "Overlapping Trips",
    description: "Two trips assigned to the same driver overlap in time. A driver cannot be in two places at once.",
    severity:    "hard",
    category:    "Daily Limits",
    limit:       "0 min",
  },
  {
    id:          "REST_GAP",
    title:       "Insufficient Rest Between Shifts",
    description: "EC 561/2006: minimum 11h rest required between shifts. Reduced rest (9–11h) allowed max 3× per week. Gap < 9h = hard violation. Gap 9–11h = soft warning.",
    severity:    "hard",
    category:    "Rest Periods",
    limit:       "11h (min 9h)",
  },
  {
    id:          "DAILY_HOURS",
    title:       "Daily Working Hours",
    description: "EC 561/2006 Art.6: maximum 9h per day (extendable to 10h max twice per week). Exceeding 9h = warning; exceeding 56h in the week = violation.",
    severity:    "hard",
    category:    "Daily Limits",
    limit:       "9h (max 10h ×2/wk)",
  },
  {
    id:          "WEEKLY_HOURS",
    title:       "Weekly Working Hours",
    description: "EC 561/2006 Art.6.3: maximum 56h working in any single week. Warning issued at 50h.",
    severity:    "hard",
    category:    "Weekly Limits",
    limit:       "56h",
  },
  {
    id:          "BIWEEKLY_HOURS",
    title:       "Biweekly Working Hours",
    description: "EC 561/2006 Art.6.3: maximum 90h across any two consecutive weeks. Warning issued at 80h.",
    severity:    "hard",
    category:    "Weekly Limits",
    limit:       "90h / 2 weeks",
  },
  {
    id:          "WEEKLY_REST",
    title:       "Weekly Rest Period",
    description: "EC 561/2006 Art.8.6 + internal policy: drivers must have ≥46h unbroken rest per 7-day period (company policy; EC minimum is 45h). Reduced rest (24h) allowed but must be compensated within 3 weeks. Warning: 24–46h. Violation: < 24h.",
    severity:    "hard",
    category:    "Rest Periods",
    limit:       "46h (internal policy)",
  },
]


// ─── Order → DriverTrip conversion ───────────────────────────────────────────

/**
 * Convert an API Order to a DriverTrip for the check modules.
 *
 * End-time resolution (priority order):
 *   1. estimated_end_date  — explicit API end time
 *   2. scheduled_at + time — start + duration (time is in seconds per API)
 *   3. scheduled_at + 8h   — conservative fallback; trip is never silently dropped
 *
 * Returns null only when scheduled_at is missing (can't place the trip in time at all).
 */
function orderToTrip(order: Order): DriverTrip | null {
  if (!order.scheduled_at) return null

  const startTime = new Date(order.scheduled_at)

  let endTime: Date
  if (order.estimated_end_date) {
    endTime = new Date(order.estimated_end_date)
  } else if (order.time && order.time > 0) {
    endTime = new Date(startTime.getTime() + order.time * 1000)
  } else {
    endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000)
  }

  // Sanity: end must be after start
  if (endTime <= startTime) {
    endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000)
  }

  return {
    orderId:    order.uuid,
    driverUuid: order.driver_assigned_uuid ?? order.driver_assigned?.uuid ?? "",
    startTime,
    endTime,
  }
}

/** Extract all trips for one driver from the tripIndex */
function getDriverTrips(driverUuid: string, tripIndex: Map<string, Order>): DriverTrip[] {
  const trips: DriverTrip[] = []
  tripIndex.forEach(order => {
    const assigned = order.driver_assigned_uuid ?? order.driver_assigned?.uuid
    if (assigned !== driverUuid) return
    const t = orderToTrip(order)
    if (t) trips.push(t)
  })
  return trips
}

// ─── runComplianceCheck ───────────────────────────────────────────────────────

/**
 * Full compliance check for one driver.
 * Uses the tripIndex already loaded in the rota page — no extra API calls.
 * Calls each rule check module in sequence and merges results.
 *
 * @param driverUuid  Driver to check
 * @param tripIndex   All orders currently loaded in the UI (uuid → Order)
 * @param weekDates   Optional: Sun–Sat date strings for the visible week.
 *                    Required for weekly/biweekly checks. If omitted, those checks are skipped.
 */
export function runComplianceCheck(
  driverUuid: string,
  tripIndex: Map<string, Order>,
  weekDates?: string[],
) {
  const trips = getDriverTrips(driverUuid, tripIndex)

  // ── Check 1: Overlap ──────────────────────────────────────────────────────
  const overlapResult    = checkOverlap(trips)

  // ── Check 2: Rest Gap ─────────────────────────────────────────────────────
  const restGapResult    = checkRestGap(trips)

  // ── Check 3: Daily Hours ───────────────────────────────────────────────────
  const dailyHoursResult = checkDailyHours(trips)

  // ── Check 4: Weekly + Biweekly Hours ───────────────────────────────────────
  // Only runs when weekDates is provided (rota page always passes it).
  // Partitions trips by whether they fall in the current visible week or the prior week.
  const weeklyResult = (() => {
    if (!weekDates || weekDates.length === 0) return { violations: [], warnings: [] }
    const weekSet  = new Set(weekDates)
    const thisWeek = trips.filter(t => weekSet.has(
      `${t.startTime.getFullYear()}-${String(t.startTime.getMonth()+1).padStart(2,"0")}-${String(t.startTime.getDate()).padStart(2,"0")}`
    ))
    const lastWeek = trips.filter(t => !weekSet.has(
      `${t.startTime.getFullYear()}-${String(t.startTime.getMonth()+1).padStart(2,"0")}-${String(t.startTime.getDate()).padStart(2,"0")}`
    ))
    const weekEnd       = weekDates[weekDates.length - 1]  // Saturday
    const weekStart     = weekDates[0]                     // Sunday
    const weekLabel     = `w/c ${weekStart}`
    const biweeklyLabel = `weeks ending ${weekEnd}`
    return checkWeeklyHoursRule(thisWeek, lastWeek, weekEnd, weekLabel, biweeklyLabel)
  })()

  // ── Check 5: Weekly Rest ────────────────────────────────────────────────────
  // Run for the trips visible in the current week only.
  const weeklyRestResult = (() => {
    if (!weekDates || weekDates.length === 0) return { violations: [], warnings: [] }
    const weekEnd = weekDates[weekDates.length - 1]  // Saturday
    return checkWeeklyRest(trips, weekEnd)
  })()

  // ── Merge ─────────────────────────────────────────────────────────────────
  return {
    violations: [
      ...overlapResult.violations,
      ...restGapResult.violations,
      ...dailyHoursResult.violations,
      ...weeklyResult.violations,
      ...weeklyRestResult.violations,
    ],
    warnings: [
      ...overlapResult.warnings,
      ...restGapResult.warnings,
      ...dailyHoursResult.warnings,
      ...weeklyResult.warnings,
      ...weeklyRestResult.warnings,
    ],
  }
}

// ─── prospectiveComplianceCheck ───────────────────────────────────────────────

/**
 * Check if assigning a new trip to a driver would create a VIOLATION.
 * Called before saving. Only violations block the assignment — warnings do not.
 *
 * Calls each rule check module in sequence with the combined trip set,
 * then filters to only pairs involving the new trip.
 *
 * @param driverUuid  Driver being assigned
 * @param _date       Assignment date (unused — we scan all trips in tripIndex)
 * @param newOrder    The order being newly assigned
 * @param tripIndex   All orders currently in the UI (uuid → Order)
 */
export function prospectiveComplianceCheck(
  driverUuid: string,
  _date: string,
  newOrder: Order,
  tripIndex: Map<string, Order>,
) {
  const newTrip = orderToTrip(newOrder)
  if (!newTrip) return { violations: [] }
  newTrip.driverUuid = driverUuid

  // Existing trips for this driver (excluding the one being assigned)
  const existing = getDriverTrips(driverUuid, tripIndex).filter(
    t => t.orderId !== newOrder.uuid
  )
  if (existing.length === 0) return { violations: [] }

  const all = [...existing, newTrip]

  // ── Check 1: Overlap (prospective) ────────────────────────────────────────
  const overlapResult = checkOverlap(all)
  const overlapViolations = overlapResult.violations.filter(
    v => v.tripAUuid === newOrder.uuid || v.tripBUuid === newOrder.uuid
  )

  // ── Check 2: Rest Gap (prospective — violations only, warnings don't block) ──
  const restGapResult = checkRestGap(all)
  const restGapViolations = restGapResult.violations.filter(
    v => v.tripAUuid === newOrder.uuid || v.tripBUuid === newOrder.uuid
  )

  // ── Check 3: Daily Hours (prospective) ────────────────────────────────────
  const dailyHoursResult = checkDailyHours(all)
  const dailyHoursViolations = dailyHoursResult.violations.filter(
    v => v.tripAUuid === newOrder.uuid || v.tripBUuid === newOrder.uuid
  )

  return {
    violations: [
      ...overlapViolations,
      ...restGapViolations,
      ...dailyHoursViolations,
    ],
  }
}

// ─── getDriverStats ───────────────────────────────────────────────────────────

/**
 * Raw measured values for every compliance rule for a single driver.
 * Used to populate utilisation bars in the Compliance Matrix view.
 *
 * All "minutes" fields are actual computed durations — not pass/fail.
 * The UI can then compare them against the rule limits to draw bars.
 */
export interface DriverRuleStat {
  ruleId:       string
  /** Actual measured value (minutes, or count for OVERLAP) */
  usedMinutes:  number
  /** Rule limit / target (minutes) */
  limitMinutes: number
  /** 0–1 fill ratio for the progress bar ( usedMinutes / limitMinutes, capped at 1 ) */
  ratio:        number
  /** Formatted "used" string, e.g. "34h 20m" or "2 pairs" */
  usedLabel:    string
  /** Formatted limit string, e.g. "56h" */
  limitLabel:   string
  /** Worst computed value label (for rest rules where higher = better) */
  detail:       string
  status:       "compliant" | "warning" | "violation"
}

function fmtMins(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Compute raw stats for all 6 compliance rules for one driver.
 *
 * @param driverUuid  Driver to measure
 * @param tripIndex   All orders currently in the UI
 * @param weekDates   The visible week's date strings (Sunday→Saturday)
 */
export function getDriverStats(
  driverUuid: string,
  tripIndex: Map<string, Order>,
  weekDates: string[],
): DriverRuleStat[] {
  const trips = getDriverTrips(driverUuid, tripIndex)
  const weekSet = new Set(weekDates)

  // ── Filter trips by window ─────────────────────────────────────────────────
  const thisWeekTrips = trips.filter(t => {
    const d = `${t.startTime.getFullYear()}-${String(t.startTime.getMonth()+1).padStart(2,'0')}-${String(t.startTime.getDate()).padStart(2,'0')}`
    return weekSet.has(d)
  })
  const priorWeekTrips = trips.filter(t => {
    const d = `${t.startTime.getFullYear()}-${String(t.startTime.getMonth()+1).padStart(2,'0')}-${String(t.startTime.getDate()).padStart(2,'0')}`
    return !weekSet.has(d)
  })

  // ── 1. DAILY_HOURS — peak day in the visible week ─────────────────────────
  const dailyStat: DriverRuleStat = (() => {
    const dayTotals = new Map<string, number>()
    for (const trip of thisWeekTrips) {
      const dayStr = `${trip.startTime.getFullYear()}-${String(trip.startTime.getMonth()+1).padStart(2,'0')}-${String(trip.startTime.getDate()).padStart(2,'0')}`
      const durationMs = trip.endTime.getTime() - trip.startTime.getTime()
      dayTotals.set(dayStr, (dayTotals.get(dayStr) ?? 0) + durationMs)
    }
    const peakMs = dayTotals.size > 0 ? Math.max(...dayTotals.values()) : 0
    const peakMins = peakMs / 60000
    const limitMins = 10 * 60  // 10h absolute max
    const ratio = Math.min(1, peakMins / limitMins)
    const status = peakMs > 10 * 3600000 ? "violation" : peakMs > 9 * 3600000 ? "warning" : "compliant"
    return {
      ruleId: "DAILY_HOURS", usedMinutes: peakMins, limitMinutes: limitMins,
      ratio, usedLabel: fmtMins(peakMins), limitLabel: "10h max",
      detail: `Peak day: ${fmtMins(peakMins)}`, status,
    }
  })()

  // ── 2. WEEKLY_HOURS — total this week ─────────────────────────────────────
  const weeklyStat: DriverRuleStat = (() => {
    const totalMs = thisWeekTrips.reduce((s, t) => s + (t.endTime.getTime() - t.startTime.getTime()), 0)
    const totalMins = totalMs / 60000
    const limitMins = 56 * 60
    const ratio = Math.min(1, totalMins / limitMins)
    const status = totalMs > 56 * 3600000 ? "violation" : totalMs > 50 * 3600000 ? "warning" : "compliant"
    return {
      ruleId: "WEEKLY_HOURS", usedMinutes: totalMins, limitMinutes: limitMins,
      ratio, usedLabel: fmtMins(totalMins), limitLabel: "56h",
      detail: `Total: ${fmtMins(totalMins)}`, status,
    }
  })()

  // ── 3. BIWEEKLY_HOURS — total this week + prior ────────────────────────────
  const biweeklyStat: DriverRuleStat = (() => {
    const allMs = [...thisWeekTrips, ...priorWeekTrips].reduce(
      (s, t) => s + (t.endTime.getTime() - t.startTime.getTime()), 0
    )
    const totalMins = allMs / 60000
    const limitMins = 90 * 60
    const ratio = Math.min(1, totalMins / limitMins)
    const status = allMs > 90 * 3600000 ? "violation" : allMs > 80 * 3600000 ? "warning" : "compliant"
    return {
      ruleId: "BIWEEKLY_HOURS", usedMinutes: totalMins, limitMinutes: limitMins,
      ratio, usedLabel: fmtMins(totalMins), limitLabel: "90h",
      detail: `2-week total: ${fmtMins(totalMins)}`, status,
    }
  })()

  // ── 4. REST_GAP — worst (shortest) gap between consecutive trips this week ─
  const restGapStat: DriverRuleStat = (() => {
    // Use all trips (not just this week) so overnight cross-week gaps are caught
    const sorted = [...trips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    let worstGapMs = Infinity
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].startTime.getTime() - sorted[i].endTime.getTime()
      if (gap > 0 && gap < worstGapMs) worstGapMs = gap
    }
    const hasTrips = trips.length >= 2
    const worstGapMins = hasTrips && isFinite(worstGapMs) ? worstGapMs / 60000 : 11 * 60
    const limitMins = 11 * 60  // standard rest target
    // For rest gap, lower ratio is WORSE (less rest = more utilisation BAR filled)
    // So ratio = 1 - (worstGap / limitMins), capped at [0,1]
    const ratio = hasTrips ? Math.min(1, Math.max(0, 1 - (worstGapMins / limitMins))) : 0
    const status = hasTrips && worstGapMs < 9 * 3600000 ? "violation"
      : hasTrips && worstGapMs < 11 * 3600000 ? "warning" : "compliant"
    const label = hasTrips && isFinite(worstGapMs) ? fmtMins(worstGapMins) : "N/A"
    return {
      ruleId: "REST_GAP", usedMinutes: worstGapMins, limitMinutes: limitMins,
      ratio, usedLabel: label, limitLabel: "11h target",
      detail: `Worst gap: ${label}`, status,
    }
  })()

  // ── 5. WEEKLY_REST — longest gap this week (the weekly rest window) ─────────
  const weeklyRestStat: DriverRuleStat = (() => {
    const sorted = [...thisWeekTrips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    let maxGapMs = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1].startTime.getTime() - sorted[i].endTime.getTime()
      if (gap > maxGapMs) maxGapMs = gap
    }
    const hasTrips = thisWeekTrips.length >= 2
    const maxGapMins = hasTrips ? maxGapMs / 60000 : 46 * 60
    const limitMins = 46 * 60  // company policy (above EC 45h)
    // For weekly rest: lower ratio is WORSE (less rest = bar MORE filled)
    const ratio = hasTrips ? Math.min(1, Math.max(0, 1 - (maxGapMins / limitMins))) : 0
    const status = hasTrips && maxGapMs < 24 * 3600000 ? "violation"
      : hasTrips && maxGapMs < 46 * 3600000 ? "warning" : "compliant"
    const label = hasTrips ? fmtMins(maxGapMins) : "N/A"
    return {
      ruleId: "WEEKLY_REST", usedMinutes: maxGapMins, limitMinutes: limitMins,
      ratio, usedLabel: label, limitLabel: "46h policy",
      detail: `Best rest: ${label}`, status,
    }
  })()

  // ── 6. OVERLAP — count of overlapping trip pairs this week ────────────────
  const overlapStat: DriverRuleStat = (() => {
    const overlaps = findOverlaps(thisWeekTrips)
    const count = overlaps.length
    const status = count > 0 ? "violation" : "compliant"
    return {
      ruleId: "OVERLAP", usedMinutes: count, limitMinutes: 0,
      ratio: count > 0 ? 1 : 0,
      usedLabel: count === 0 ? "None" : `${count} pair${count !== 1 ? "s" : ""}`,
      limitLabel: "0 allowed",
      detail: count === 0 ? "No overlaps" : `${count} overlap${count !== 1 ? "s" : ""} detected`,
      status,
    }
  })()

  return [dailyStat, weeklyStat, biweeklyStat, restGapStat, weeklyRestStat, overlapStat]
}
