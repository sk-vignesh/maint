/**
 * Weekly Rest Check — EC 561/2006 Article 8.6
 *
 * Self-contained module. Imports only pure logic from weekly-rest.ts.
 * Called by index.ts — do not import index.ts from here.
 *
 * The violation is attributed to the week's last day (Saturday) since the
 * 7-day window has closed without a valid weekly rest period.
 *
 * The lastPriorEnd / weekStartDate params allow us to include the gap
 * BEFORE the first trip of the week (e.g. Sunday+Monday rest before a
 * Tuesday shift) in the "longest rest" calculation. Without them, a driver
 * resting all of Sunday and Monday before their first Tuesday trip would
 * incorrectly appear to have only inter-trip rest.
 */

import { findWeeklyRestViolation } from "./weekly-rest"
import type { ComplianceViolation, DriverTrip } from "./types"

export interface WeeklyRestCheckResult {
  violations: ComplianceViolation[]
  warnings:   ComplianceViolation[]
}

/**
 * Check weekly rest compliance for a single driver.
 *
 * @param weekTrips     Trips IN the current week only (pre-filtered)
 * @param weekEndDate   YYYY-MM-DD of the last day of the current week (Saturday)
 * @param lastPriorEnd  End-time of the driver's last trip BEFORE this week (if any)
 * @param weekStartDate YYYY-MM-DD of the first day of the week (Sunday)
 */
export function checkWeeklyRest(
  weekTrips:     DriverTrip[],
  weekEndDate:   string,
  lastPriorEnd?: Date | null,
  weekStartDate?: string,
): WeeklyRestCheckResult {
  if (weekTrips.length < 1) return { violations: [], warnings: [] }

  const violations: ComplianceViolation[] = []
  const warnings:   ComplianceViolation[] = []

  const result = findWeeklyRestViolation(weekTrips, lastPriorEnd, weekStartDate)
  if (!result) return { violations: [], warnings: [] }

  const item: ComplianceViolation = {
    date:            weekEndDate,
    ruleId:          "WEEKLY_REST",
    severity:        result.severity,
    message:         result.message,
    tripAUuid:       result.tripBeforeRestUuid,
    tripBUuid:       result.tripAfterRestUuid,
    durationMinutes: result.longestGapMinutes,
  }

  if (result.severity === "violation") violations.push(item)
  else                                 warnings.push(item)

  return { violations, warnings }
}
