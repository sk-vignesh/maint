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

// Re-export types so the UI only needs to import from one place
export type { ComplianceViolation, RotaComplianceReport } from "./types"

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
