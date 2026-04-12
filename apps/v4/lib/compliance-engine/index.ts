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
 *   getDriverStats(driverUuid, tripIndex, weekDates)           → DriverRuleStat[]
 *   COMPLIANCE_RULES                                           → rule metadata for UI
 *   re-exports: ComplianceViolation, RotaComplianceReport
 */

import type { Order } from "@/lib/orders-api"
import type { DriverTrip } from "./types"
import { checkOverlap }          from "./check-overlap"
import { checkRestGap }          from "./check-rest-gap"
import { checkWeeklyHoursRule }  from "./check-weekly-hours"
import { checkWeeklyRest }       from "./check-weekly-rest"
import { findOverlaps }          from "./overlap"
import { findWeeklyRestViolation } from "./weekly-rest"

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

  // NOTE: checkDailyHours is intentionally omitted.
  // Daily hours (9h/10h) is a DRIVING hours limit enforced by Relay.
  // This system records WORKING/SHIFT hours only. 12.5h shifts are normal
  // and must not trigger false violations here.

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

  // ── Check 5: Weekly Rest ─────────────────────────────────────────────────────
  // Run for the trips visible in the current week only.
  // Pass the last prior-week trip end so pre-week rest gaps (Sun/Mon before first
  // Tuesday shift) are correctly included in the "longest rest" calculation.
  const weeklyRestResult = (() => {
    if (!weekDates || weekDates.length === 0) return { violations: [], warnings: [] }
    const weekSet    = new Set(weekDates)
    const dayStr = (t: { startTime: Date }) =>
      `${t.startTime.getFullYear()}-${String(t.startTime.getMonth()+1).padStart(2,"0")}-${String(t.startTime.getDate()).padStart(2,"0")}`
    const weekTrips  = trips.filter(t =>  weekSet.has(dayStr(t)))
    const priorTrips = trips.filter(t => !weekSet.has(dayStr(t)))
    const priorSorted = [...priorTrips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    const lastPriorEnd = priorSorted.length > 0 ? priorSorted[priorSorted.length - 1].endTime : null
    const weekEnd   = weekDates[weekDates.length - 1]
    const weekStart = weekDates[0]
    return checkWeeklyRest(weekTrips, weekEnd, lastPriorEnd, weekStart)
  })()

  // ── Merge ─────────────────────────────────────────────────────────────────
  return {
    violations: [
      ...overlapResult.violations,
      ...restGapResult.violations,
      ...weeklyResult.violations,
      ...weeklyRestResult.violations,
    ],
    warnings: [
      ...overlapResult.warnings,
      ...restGapResult.warnings,
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

  // NOTE: Daily hours check omitted — driving hours are managed by Relay.

  return {
    violations: [
      ...overlapViolations,
      ...restGapViolations,
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
  /** Actual measured value (minutes, or count for OVERLAP/BREAK_45/REDUCED_REST_DAYS) */
  usedMinutes:  number
  /** Rule limit / target (minutes, or count) */
  limitMinutes: number
  /** 0–1 fill ratio for the progress bar ( usedMinutes / limitMinutes, capped at 1 ) */
  ratio:        number
  /** Formatted "used" string, e.g. "34h 20m" or "2 pairs" */
  usedLabel:    string
  /** Formatted limit string, e.g. "56h" */
  limitLabel:   string
  /** Human-readable detail for the tooltip */
  detail:       string
  status:       "compliant" | "warning" | "violation"
}

function fmtMins(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Compute raw stats for all 12 compliance rows for one driver.
 * Matches the 10 rows in analysis.html (Driving Times + Resting Times +
 * Compensated Weekly Rest) plus Overlap integrity check.
 *
 * Row order:
 *   DRIVING TIMES:          CONTINUOUS_4H30, DAILY_HOURS, DAILY_AMPLITUDE,
 *                           REDUCED_REST_DAYS, WEEKLY_HOURS, BIWEEKLY_HOURS
 *   RESTING TIMES:          BREAK_45, REST_GAP
 *   COMPENSATED WEEKLY REST: WEEKLY_REST, WEEKLY_REST_PRIOR, WEEKLY_REST_PRIOR2
 *   INTEGRITY:              OVERLAP
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

  // ── Shared helpers ──────────────────────────────────────────────────────────
  function toDayStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
  }

  // ── Filter trips by window ─────────────────────────────────────────────────
  const thisWeekTrips  = trips.filter(t =>  weekSet.has(toDayStr(t.startTime)))
  const priorWeekTrips = trips.filter(t => !weekSet.has(toDayStr(t.startTime)))

  // Pre-sorted arrays used by multiple stats
  const allSorted  = [...trips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  const weekSorted = [...thisWeekTrips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  /** Longest gap (ms) between any consecutive end→start pair in a sorted trip list */
  function longestGapMs(sortedTrips: typeof trips): number {
    let max = 0
    for (let i = 0; i < sortedTrips.length - 1; i++) {
      const g = sortedTrips[i + 1].startTime.getTime() - sortedTrips[i].endTime.getTime()
      if (g > max) max = g
    }
    return max
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 1 — DRIVING TIMES
  // ───────────────────────────────────────────────────────────────────────────

  // ── 1. CONTINUOUS_4H30 ─────────────────────────────────────────────────────
  //  EC 561/2006 Art.7: no more than 4h 30m of continuous driving without a
  //  45-minute break (may be split into 15+30 min).
  //  We can only observe inter-trip gaps; intra-trip breaks are not in the data.
  //  "Chain" = run of trips where each consecutive gap < 45 min.
  //  Stat: longest chain's total driving duration vs 4h 30m limit.
  const continuousStat: DriverRuleStat = (() => {
    const BREAK_MS  = 45 * 60 * 1000
    const limitMins = 4.5 * 60              // 270 min
    if (weekSorted.length === 0) {
      return { ruleId: "CONTINUOUS_4H30", usedMinutes: 0, limitMinutes: limitMins,
        ratio: 0, usedLabel: "N/A", limitLabel: "4h 30m",
        detail: "No trips this week", status: "compliant" as const }
    }
    let maxChainMs = 0
    let curChainMs = weekSorted[0].endTime.getTime() - weekSorted[0].startTime.getTime()
    for (let i = 0; i < weekSorted.length - 1; i++) {
      const gapMs  = weekSorted[i + 1].startTime.getTime() - weekSorted[i].endTime.getTime()
      const nextMs = weekSorted[i + 1].endTime.getTime()   - weekSorted[i + 1].startTime.getTime()
      if (gapMs > 0 && gapMs < BREAK_MS) {
        curChainMs += nextMs
      } else {
        maxChainMs = Math.max(maxChainMs, curChainMs)
        curChainMs = nextMs
      }
    }
    maxChainMs = Math.max(maxChainMs, curChainMs)
    const usedMins = maxChainMs / 60000
    const ratio    = Math.min(1, usedMins / limitMins)
    const status   = usedMins > limitMins ? "violation" : usedMins > 4 * 60 ? "warning" : "compliant"
    return {
      ruleId: "CONTINUOUS_4H30", usedMinutes: usedMins, limitMinutes: limitMins,
      ratio, usedLabel: fmtMins(usedMins), limitLabel: "4h 30m",
      detail: `Longest continuous block: ${fmtMins(usedMins)}`, status,
    }
  })()

  // ── 2. DAILY_HOURS — peak single-day total this week ──────────────────────
  //  EC 561/2006 Art.6: 9h standard (10h max, max twice per week).
  const dailyStat: DriverRuleStat = (() => {
    const dayTotals = new Map<string, number>()
    for (const trip of thisWeekTrips) {
      const ms = trip.endTime.getTime() - trip.startTime.getTime()
      const d  = toDayStr(trip.startTime)
      dayTotals.set(d, (dayTotals.get(d) ?? 0) + ms)
    }
    const peakMs    = dayTotals.size > 0 ? Math.max(...dayTotals.values()) : 0
    const peakMins  = peakMs / 60000
    const limitMins = 10 * 60
    const ratio     = Math.min(1, peakMins / limitMins)
    const status    = peakMs > 10 * 3600000 ? "violation" : peakMs > 9 * 3600000 ? "warning" : "compliant"
    return {
      ruleId: "DAILY_HOURS", usedMinutes: peakMins, limitMinutes: limitMins,
      ratio, usedLabel: thisWeekTrips.length === 0 ? "N/A" : fmtMins(peakMins), limitLabel: "10h max",
      detail: `Peak day: ${fmtMins(peakMins)}`, status,
    }
  })()

  // ── 3. DAILY_AMPLITUDE — max span from first to last activity on any day ──
  //  "Amplitude" = last trip end − first trip start on the same calendar day.
  //  Limit: 15h (EC 561/2006: working period must not exceed 15h with reduced rest).
  //  Warning at 13h.
  const amplitudeStat: DriverRuleStat = (() => {
    const dayBounds = new Map<string, { min: number; max: number }>()
    for (const trip of thisWeekTrips) {
      const d  = toDayStr(trip.startTime)
      const ex = dayBounds.get(d)
      dayBounds.set(d, {
        min: ex ? Math.min(ex.min, trip.startTime.getTime()) : trip.startTime.getTime(),
        max: ex ? Math.max(ex.max, trip.endTime.getTime())   : trip.endTime.getTime(),
      })
    }
    let maxAmpMs = 0
    dayBounds.forEach(({ min, max }) => { if (max - min > maxAmpMs) maxAmpMs = max - min })
    const usedMins  = maxAmpMs / 60000
    const limitMins = 15 * 60
    const ratio     = Math.min(1, usedMins / limitMins)
    const status    = usedMins > limitMins ? "violation" : usedMins > 13 * 60 ? "warning" : "compliant"
    return {
      ruleId: "DAILY_AMPLITUDE", usedMinutes: usedMins, limitMinutes: limitMins,
      ratio, usedLabel: thisWeekTrips.length === 0 ? "N/A" : fmtMins(usedMins), limitLabel: "15h max",
      detail: `Peak amplitude: ${fmtMins(usedMins)}`, status,
    }
  })()

  // ── 4. REDUCED_REST_DAYS — count of inter-trip gaps that are 9h–11h ────────
  //  EC 561/2006: reduced daily rest (9–11h) allowed max 3× per 7-day period.
  //  We scan the full sorted trip list so cross-week overnight pairs are caught.
  const reducedRestStat: DriverRuleStat = (() => {
    let count = 0
    for (let i = 0; i < allSorted.length - 1; i++) {
      const gapMs = allSorted[i + 1].startTime.getTime() - allSorted[i].endTime.getTime()
      if (gapMs > 9 * 3600000 && gapMs < 11 * 3600000) count++
    }
    const limitCount = 3
    const ratio   = Math.min(1, count / limitCount)
    const status  = count > limitCount ? "violation" : count === limitCount ? "warning" : "compliant"
    return {
      ruleId: "REDUCED_REST_DAYS", usedMinutes: count, limitMinutes: limitCount,
      ratio,
      usedLabel:  count === 0 ? "None" : `${count} time${count !== 1 ? "s" : ""}`,
      limitLabel: "max 3×/week",
      detail: `Reduced rest occurrences: ${count}`, status,
    }
  })()

  // ── 5. WEEKLY_HOURS — total driving time this week ────────────────────────
  //  EC 561/2006 Art.6.3: max 56h/week. Warning at 50h.
  const weeklyStat: DriverRuleStat = (() => {
    const totalMs   = thisWeekTrips.reduce((s, t) => s + (t.endTime.getTime() - t.startTime.getTime()), 0)
    const totalMins = totalMs / 60000
    const limitMins = 56 * 60
    const ratio     = Math.min(1, totalMins / limitMins)
    const status    = totalMs > 56 * 3600000 ? "violation" : totalMs > 50 * 3600000 ? "warning" : "compliant"
    return {
      ruleId: "WEEKLY_HOURS", usedMinutes: totalMins, limitMinutes: limitMins,
      ratio, usedLabel: fmtMins(totalMins), limitLabel: "56h",
      detail: `Total: ${fmtMins(totalMins)}`, status,
    }
  })()

  // ── 6. BIWEEKLY_HOURS — total this week + prior week ─────────────────────
  //  EC 561/2006 Art.6.3: max 90h / 2 weeks. Warning at 80h.
  const biweeklyStat: DriverRuleStat = (() => {
    const allMs     = [...thisWeekTrips, ...priorWeekTrips].reduce(
      (s, t) => s + (t.endTime.getTime() - t.startTime.getTime()), 0
    )
    const totalMins = allMs / 60000
    const limitMins = 90 * 60
    const ratio     = Math.min(1, totalMins / limitMins)
    const status    = allMs > 90 * 3600000 ? "violation" : allMs > 80 * 3600000 ? "warning" : "compliant"
    return {
      ruleId: "BIWEEKLY_HOURS", usedMinutes: totalMins, limitMinutes: limitMins,
      ratio, usedLabel: fmtMins(totalMins), limitLabel: "90h",
      detail: `2-week total: ${fmtMins(totalMins)}`, status,
    }
  })()

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 2 — RESTING TIMES
  // ───────────────────────────────────────────────────────────────────────────

  // ── 7. BREAK_45 — count of continuous driving chains that exceeded 4h30 ──
  //  Each such chain means a 45-min break was not observed in the trip data.
  //  (We cannot see breaks within trips — only inter-trip gaps.)
  //  Count 0 = OK. Any count > 0 = violation (break was missed or not recorded).
  const break45Stat: DriverRuleStat = (() => {
    const BREAK_MS = 45 * 60 * 1000
    const LIMIT_MS = 4.5 * 60 * 60 * 1000
    let violations = 0
    if (weekSorted.length > 0) {
      let curChainMs = weekSorted[0].endTime.getTime() - weekSorted[0].startTime.getTime()
      for (let i = 0; i < weekSorted.length - 1; i++) {
        const gapMs  = weekSorted[i + 1].startTime.getTime() - weekSorted[i].endTime.getTime()
        const nextMs = weekSorted[i + 1].endTime.getTime()   - weekSorted[i + 1].startTime.getTime()
        if (gapMs > 0 && gapMs < BREAK_MS) {
          curChainMs += nextMs
        } else {
          if (curChainMs > LIMIT_MS) violations++
          curChainMs = nextMs
        }
      }
      if (curChainMs > LIMIT_MS) violations++
    }
    const status = violations > 0 ? "violation" : "compliant"
    return {
      ruleId: "BREAK_45", usedMinutes: violations, limitMinutes: 0,
      ratio: violations > 0 ? 1 : 0,
      usedLabel:  violations === 0 ? "OK" : `${violations} missed`,
      limitLabel: "0 missed",
      detail: violations === 0
        ? "Break taken in time each day"
        : `${violations} driving block${violations !== 1 ? "s" : ""} without adequate break`,
      status,
    }
  })()

  // ── 8. REST_GAP — worst (shortest) inter-trip gap across ALL trips ─────────
  //  EC 561/2006: 11h standard daily rest, min 9h reduced rest.
  //  Scans the full trip history so cross-week overnight pairs are caught.
  //  Inverted bar: more bar = LESS rest = worse.
  const restGapStat: DriverRuleStat = (() => {
    let worstMs = Infinity
    for (let i = 0; i < allSorted.length - 1; i++) {
      const gap = allSorted[i + 1].startTime.getTime() - allSorted[i].endTime.getTime()
      if (gap > 0 && gap < worstMs) worstMs = gap
    }
    const hasTrips  = allSorted.length >= 2
    const worstMins = hasTrips && isFinite(worstMs) ? worstMs / 60000 : 11 * 60
    const limitMins = 11 * 60
    const ratio     = hasTrips ? Math.min(1, Math.max(0, 1 - (worstMins / limitMins))) : 0
    const status    = hasTrips && worstMs < 9 * 3600000  ? "violation"
                    : hasTrips && worstMs < 11 * 3600000 ? "warning" : "compliant"
    const label     = hasTrips && isFinite(worstMs) ? fmtMins(worstMins) : "N/A"
    return {
      ruleId: "REST_GAP", usedMinutes: worstMins, limitMinutes: limitMins,
      ratio, usedLabel: label, limitLabel: "11h target",
      detail: `Worst gap: ${label}`, status,
    }
  })()

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 3 — COMPENSATED WEEKLY REST
  // ───────────────────────────────────────────────────────────────────────────

  // ── 9. WEEKLY_REST ──────────────────────────────────────────────────────────────────
  //  EC 561/2006 Art.8.6 + company policy: ≥46h unbroken rest per 7 days.
  //  Includes the gap BEFORE the first trip of the week (e.g. Sunday+Monday rest
  //  before a Tuesday shift) by using lastPriorTrip.endTime as the lower bound.
  //  Inverted bar: more bar = LESS rest = worse.
  const weeklyRestStat: DriverRuleStat = (() => {
    const limitMins = 46 * 60

    // No trips at all this week — full rest; trivially compliant
    if (weekSorted.length === 0) {
      return {
        ruleId: "WEEKLY_REST", usedMinutes: 168 * 60, limitMinutes: limitMins,
        ratio: 0, usedLabel: "Full week", limitLabel: "46h policy",
        detail: "No trips this week — assumed full rest", status: "compliant" as const,
      }
    }

    // Last prior-week trip end — use as the pre-week lower bound for the rest gap
    const priorSorted2 = [...priorWeekTrips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    const lastPriorEnd = priorSorted2.length > 0 ? priorSorted2[priorSorted2.length - 1].endTime : null

    const result = findWeeklyRestViolation(weekSorted, lastPriorEnd, weekDates[0])

    // null → compliant (≥46h rest found)
    if (!result) {
      // Report the actual best gap for the bar
      const candidateGaps: number[] = []
      for (let i = 0; i < weekSorted.length - 1; i++) {
        const g = weekSorted[i+1].startTime.getTime() - weekSorted[i].endTime.getTime()
        if (g > 0) candidateGaps.push(g)
      }
      if (lastPriorEnd) {
        const g = weekSorted[0].startTime.getTime() - lastPriorEnd.getTime()
        if (g > 0) candidateGaps.push(g)
      } else {
        const g = weekSorted[0].startTime.getTime() - new Date(weekDates[0] + "T00:00:00").getTime()
        if (g > 0) candidateGaps.push(g)
      }
      const bestMs   = candidateGaps.length > 0 ? Math.max(...candidateGaps) : 46 * 3600000
      const bestMins = bestMs / 60000
      return {
        ruleId: "WEEKLY_REST", usedMinutes: bestMins, limitMinutes: limitMins,
        ratio: 0, usedLabel: fmtMins(bestMins), limitLabel: "46h policy",
        detail: `Best rest this week: ${fmtMins(bestMins)}`, status: "compliant" as const,
      }
    }

    const maxMins = result.longestGapMinutes
    const maxMs   = maxMins * 60000
    const ratio   = Math.min(1, Math.max(0, 1 - (maxMins / limitMins)))
    const status  = maxMs < 24 * 3600000 ? "violation" : "warning"
    return {
      ruleId: "WEEKLY_REST", usedMinutes: maxMins, limitMinutes: limitMins,
      ratio, usedLabel: fmtMins(maxMins), limitLabel: "46h policy",
      detail: `Best rest this week: ${fmtMins(maxMins)}`, status,
    }
  })()

  // ── 10. WEEKLY_REST_PRIOR — longest gap in the PRIOR week (Week -1) ────────
  //  Uses priorWeekTrips — the same trips already fetched for biweekly hours.
  //  Inverted bar: more bar = LESS rest = worse.
  const priorRestStat: DriverRuleStat = (() => {
    const priorSorted = [...priorWeekTrips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    const hasTrips    = priorSorted.length >= 2
    const maxMs       = hasTrips ? longestGapMs(priorSorted) : null
    const maxMins     = maxMs !== null ? maxMs / 60000 : 46 * 60
    const limitMins   = 46 * 60
    const ratio       = hasTrips && maxMs !== null ? Math.min(1, Math.max(0, 1 - (maxMins / limitMins))) : 0
    const status      = hasTrips && maxMs !== null && maxMs < 24 * 3600000 ? "violation"
                      : hasTrips && maxMs !== null && maxMs < 46 * 3600000 ? "warning" : "compliant"
    const label       = hasTrips && maxMs !== null ? fmtMins(maxMins)
                      : priorWeekTrips.length === 0 ? "No data" : "N/A"
    return {
      ruleId: "WEEKLY_REST_PRIOR", usedMinutes: maxMins, limitMinutes: limitMins,
      ratio, usedLabel: label, limitLabel: "46h policy",
      detail: `Best rest week −1: ${label}`, status,
    }
  })()

  // ── 11. WEEKLY_REST_PRIOR2 — two weeks ago (Week -2) ─────────────────────
  //  The rota page only fetches the current + one prior week, so this will
  //  always show "No data" until a separate week -2 fetch is added.
  //  Shown as neutral (compliant) so it doesn't pollute the violation counts.
  const prior2RestStat: DriverRuleStat = {
    ruleId: "WEEKLY_REST_PRIOR2", usedMinutes: 0, limitMinutes: 46 * 60,
    ratio: 0, usedLabel: "No data", limitLabel: "46h policy",
    detail: "Week −2 data not loaded (requires additional API fetch)", status: "compliant",
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BONUS — OVERLAP integrity check
  // Not in EC 561/2006 — internal diagnostic: two trips at the same time.
  // ───────────────────────────────────────────────────────────────────────────

  // ── 12. OVERLAP — overlapping trip pairs within the current week ──────────
  const overlapStat: DriverRuleStat = (() => {
    const overlaps = findOverlaps(thisWeekTrips)
    const count    = overlaps.length
    const status   = count > 0 ? "violation" : "compliant"
    return {
      ruleId: "OVERLAP", usedMinutes: count, limitMinutes: 0,
      ratio: count > 0 ? 1 : 0,
      usedLabel:  count === 0 ? "None" : `${count} pair${count !== 1 ? "s" : ""}`,
      limitLabel: "0 allowed",
      detail: count === 0 ? "No overlaps" : `${count} overlap${count !== 1 ? "s" : ""} detected`,
      status,
    }
  })()

  return [
    // ── Driving Times ─────────────────────────────────────────────────────
    continuousStat,     // CONTINUOUS_4H30   — longest continuous driving block
    dailyStat,          // DAILY_HOURS        — peak single-day total
    amplitudeStat,      // DAILY_AMPLITUDE    — max day span (first→last activity)
    reducedRestStat,    // REDUCED_REST_DAYS  — count of 9–11h gaps this week
    weeklyStat,         // WEEKLY_HOURS       — total this week
    biweeklyStat,       // BIWEEKLY_HOURS     — total this + prior week
    // ── Resting Times ─────────────────────────────────────────────────────
    break45Stat,        // BREAK_45           — missed 45-min break instances
    restGapStat,        // REST_GAP           — worst (shortest) inter-trip gap
    // ── Compensated Weekly Rest ───────────────────────────────────────────
    weeklyRestStat,     // WEEKLY_REST        — best rest gap this week
    priorRestStat,      // WEEKLY_REST_PRIOR  — best rest gap week −1
    prior2RestStat,     // WEEKLY_REST_PRIOR2 — best rest gap week −2 (no data yet)
    // ── Integrity ─────────────────────────────────────────────────────────
    overlapStat,        // OVERLAP            — simultaneous trips (hard violation)
  ]
}
