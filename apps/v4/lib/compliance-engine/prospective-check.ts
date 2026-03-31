/**
 * Prospective Compliance Check
 * ─────────────────────────────
 *
 * A fast, synchronous pre-allocation checker that evaluates whether
 * assigning a trip to a driver on a given date would violate any
 * hard compliance rules.
 *
 * Unlike the full compliance engine (which fetches API data and runs
 * all validators), this module works with in-memory data only:
 *   - The tripIndex (Map<uuid, Order>) already loaded in the rota page
 *   - The rota entries from localStorage
 *   - The proposed new trip being dropped
 *
 * It checks:
 *   1. Daily rest gap: Is there at least 11h (standard) or 9h (reduced)
 *      rest between the proposed trip and trips on adjacent days?
 *   2. Daily driving limit: Would adding this trip exceed 9h/10h driving?
 *   3. Cross-day trip awareness: If a trip spans midnight (e.g. 10PM-6AM),
 *      both days are impacted.
 *
 * Returns a list of violations that should BLOCK the allocation.
 */

import { type ComplianceViolation } from "./types"
import { type Order } from "../orders-api"
import { fmtMinutes } from "./utils"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum daily rest (standard): 11 hours = 660 minutes */
const MIN_DAILY_REST_STANDARD = 11 * 60
/** Minimum daily rest (reduced, max 3x/week): 9 hours = 540 minutes */
const MIN_DAILY_REST_REDUCED = 9 * 60
/** Maximum daily driving: 9 hours = 540 minutes */
const MAX_DAILY_DRIVING = 9 * 60
/** Maximum daily driving extended (2x/week): 10 hours = 600 minutes */
const MAX_DAILY_DRIVING_EXTENDED = 10 * 60

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse an ISO datetime string into a Date, or null if missing */
function parseTime(str: string | null | undefined): Date | null {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/** Get trip start time as Date */
function tripStart(order: Order): Date {
  return parseTime(order.scheduled_at) ?? parseTime(order.started_at) ?? new Date(order.created_at)
}

/** Get trip end time as Date (estimated) */
function tripEnd(order: Order): Date {
  const start = tripStart(order)
  if (order.estimated_end_date) {
    const end = parseTime(order.estimated_end_date)
    if (end) return end
  }
  if (order.time && order.time > 0) {
    return new Date(start.getTime() + order.time * 1000)
  }
  // Fallback: assume 2 hours
  return new Date(start.getTime() + 2 * 60 * 60_000)
}

/** Get trip driving duration in minutes */
function tripDrivingMinutes(order: Order): number {
  return Math.max(0, (tripEnd(order).getTime() - tripStart(order).getTime()) / 60_000)
}

/** Get YYYY-MM-DD for a date */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Get the date string for the previous day */
function prevDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() - 1)
  return toDateStr(d)
}

/** Get the date string for the next day */
function nextDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + 1)
  return toDateStr(d)
}

// ─── Main Prospective Check ──────────────────────────────────────────────────

export interface ProspectiveCheckResult {
  /** Hard violations that should BLOCK the allocation */
  violations: ComplianceViolation[]
  /** Soft warnings that should be shown but not block */
  warnings: ComplianceViolation[]
}

/**
 * Check whether assigning a trip to a driver on a date would violate rules.
 *
 * This is a FAST, SYNCHRONOUS check using in-memory data only.
 *
 * @param driverUuid     The driver being assigned
 * @param dropDate       The date the trip is being dropped onto (YYYY-MM-DD)
 * @param newTrip        The Order being dropped
 * @param tripIndex      Map of uuid → Order for all loaded trips
 * @param getRotaEntry   Function to look up a rota entry by driver+date
 */
export function prospectiveComplianceCheck(
  driverUuid: string,
  dropDate: string,
  newTrip: Order,
  tripIndex: Map<string, Order>,
  getRotaEntry: (driverUuid: string, date: string) => { trip_uuids?: string[] } | undefined,
): ProspectiveCheckResult {
  const violations: ComplianceViolation[] = []
  const warnings: ComplianceViolation[] = []

  const newStart = tripStart(newTrip)
  const newEnd = tripEnd(newTrip)
  const newDrivingMins = tripDrivingMinutes(newTrip)

  // ── 1. Collect existing trips on the drop date ────────────────────────
  const dropEntry = getRotaEntry(driverUuid, dropDate)
  const existingTripsOnDate: Order[] = []
  if (dropEntry?.trip_uuids) {
    for (const uuid of dropEntry.trip_uuids) {
      const t = tripIndex.get(uuid)
      if (t) existingTripsOnDate.push(t)
    }
  }

  // ── 2. Daily Driving Limit ────────────────────────────────────────────
  const existingDrivingOnDate = existingTripsOnDate.reduce(
    (sum, t) => sum + tripDrivingMinutes(t), 0
  )
  const totalDrivingAfterDrop = existingDrivingOnDate + newDrivingMins

  if (totalDrivingAfterDrop > MAX_DAILY_DRIVING_EXTENDED) {
    violations.push({
      ruleId: "EU_DAILY_DRIVE_LIMIT",
      severity: "violation",
      date: dropDate,
      driverUuid,
      message: `Would exceed daily driving limit of 10 hours`,
      calculation: `Existing: ${fmtMinutes(existingDrivingOnDate)} + New trip: ${fmtMinutes(newDrivingMins)} = ${fmtMinutes(totalDrivingAfterDrop)} (max ${fmtMinutes(MAX_DAILY_DRIVING_EXTENDED)})`,
      ruleset: "ASSIMILATED",
    })
  } else if (totalDrivingAfterDrop > MAX_DAILY_DRIVING) {
    warnings.push({
      ruleId: "EU_DAILY_DRIVE_LIMIT",
      severity: "warning",
      date: dropDate,
      driverUuid,
      message: `Would use an extended driving day (${fmtMinutes(totalDrivingAfterDrop)} of max 10h). Only 2 per week allowed.`,
      calculation: `Existing: ${fmtMinutes(existingDrivingOnDate)} + New trip: ${fmtMinutes(newDrivingMins)} = ${fmtMinutes(totalDrivingAfterDrop)}`,
      ruleset: "ASSIMILATED",
    })
  }

  // ── 3. Daily Rest — Check gap with PREVIOUS day's trips ───────────────
  const prevDateStr = prevDate(dropDate)
  const prevEntry = getRotaEntry(driverUuid, prevDateStr)
  if (prevEntry?.trip_uuids && prevEntry.trip_uuids.length > 0) {
    // Find the latest-ending trip on the previous day
    let latestEnd = 0
    for (const uuid of prevEntry.trip_uuids) {
      const t = tripIndex.get(uuid)
      if (t) {
        const end = tripEnd(t).getTime()
        // Add 15 min post-trip buffer (non-driving duty)
        latestEnd = Math.max(latestEnd, end + 15 * 60_000)
      }
    }

    if (latestEnd > 0) {
      // Rest gap = start of new trip (minus 15min pre-trip buffer) - end of previous trip
      const effectiveStart = newStart.getTime() - 15 * 60_000
      const restGap = Math.max(0, (effectiveStart - latestEnd) / 60_000)

      if (restGap < MIN_DAILY_REST_REDUCED) {
        violations.push({
          ruleId: "EU_DAILY_REST",
          severity: "violation",
          date: dropDate,
          driverUuid,
          message: `Insufficient rest after previous day's trip — only ${fmtMinutes(restGap)} rest (minimum 9h required)`,
          calculation: `Previous day's last trip ends with buffer → ${new Date(latestEnd).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. New trip starts at ${newStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)} vs 9h minimum.`,
          ruleset: "ASSIMILATED",
        })
      } else if (restGap < MIN_DAILY_REST_STANDARD) {
        warnings.push({
          ruleId: "EU_DAILY_REST",
          severity: "warning",
          date: dropDate,
          driverUuid,
          message: `Reduced daily rest — ${fmtMinutes(restGap)} between trips (standard is 11h). Uses 1 of 3 allowed reduced rests per week.`,
          calculation: `Previous trip ends ${new Date(latestEnd).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, new starts ${newStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)}.`,
          ruleset: "ASSIMILATED",
        })
      }
    }
  }

  // ── 4. Daily Rest — Check gap with NEXT day's trips ───────────────────
  const nextDateStr = nextDate(dropDate)
  const nextEntry = getRotaEntry(driverUuid, nextDateStr)
  if (nextEntry?.trip_uuids && nextEntry.trip_uuids.length > 0) {
    // Find the earliest-starting trip on the next day
    let earliestStart = Infinity
    for (const uuid of nextEntry.trip_uuids) {
      const t = tripIndex.get(uuid)
      if (t) {
        const start = tripStart(t).getTime()
        // Subtract 15 min pre-trip buffer
        earliestStart = Math.min(earliestStart, start - 15 * 60_000)
      }
    }

    if (earliestStart < Infinity) {
      // Rest gap = start of next day's trip - end of new trip (plus post-trip buffer)
      const effectiveEnd = newEnd.getTime() + 15 * 60_000
      const restGap = Math.max(0, (earliestStart - effectiveEnd) / 60_000)

      if (restGap < MIN_DAILY_REST_REDUCED) {
        violations.push({
          ruleId: "EU_DAILY_REST",
          severity: "violation",
          date: dropDate,
          driverUuid,
          message: `Insufficient rest before next day's trip — only ${fmtMinutes(restGap)} rest (minimum 9h required)`,
          calculation: `New trip ends with buffer → ${new Date(effectiveEnd).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Next day's trip starts at ${new Date(earliestStart + 15 * 60_000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)} vs 9h minimum.`,
          ruleset: "ASSIMILATED",
        })
      } else if (restGap < MIN_DAILY_REST_STANDARD) {
        warnings.push({
          ruleId: "EU_DAILY_REST",
          severity: "warning",
          date: dropDate,
          driverUuid,
          message: `Reduced daily rest before next day — ${fmtMinutes(restGap)} between trips (standard is 11h). Uses 1 of 3 allowed reduced rests.`,
          calculation: `New trip ends ${new Date(effectiveEnd).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, next day starts ${new Date(earliestStart + 15 * 60_000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)}.`,
          ruleset: "ASSIMILATED",
        })
      }
    }
  }

  // ── 5. Check gap between existing trips on the SAME day ───────────────
  // If the driver already has a trip on this date, check the gap
  for (const existing of existingTripsOnDate) {
    const existStart = tripStart(existing)
    const existEnd = tripEnd(existing)

    // Check gap: new trip ends before existing starts
    if (newEnd.getTime() < existStart.getTime()) {
      const gap = (existStart.getTime() - newEnd.getTime()) / 60_000
      // Within the same day, no rest requirement between trips — but warn if less than 45min break
      if (gap < 45) {
        warnings.push({
          ruleId: "EU_BREAK_REQUIREMENT",
          severity: "warning",
          date: dropDate,
          driverUuid,
          message: `Only ${fmtMinutes(gap)} gap between trips on same day (45 min break required after 4.5h driving)`,
          calculation: `New trip ends ${newEnd.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, existing starts ${existStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
          ruleset: "ASSIMILATED",
        })
      }
    }

    // Check gap: existing trip ends before new starts
    if (existEnd.getTime() < newStart.getTime()) {
      const gap = (newStart.getTime() - existEnd.getTime()) / 60_000
      if (gap < 45) {
        warnings.push({
          ruleId: "EU_BREAK_REQUIREMENT",
          severity: "warning",
          date: dropDate,
          driverUuid,
          message: `Only ${fmtMinutes(gap)} gap between trips on same day (45 min break required after 4.5h driving)`,
          calculation: `Existing trip ends ${existEnd.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, new starts ${newStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
          ruleset: "ASSIMILATED",
        })
      }
    }

    // Check overlap
    if (newStart.getTime() < existEnd.getTime() && newEnd.getTime() > existStart.getTime()) {
      violations.push({
        ruleId: "TRIP_OVERLAP",
        severity: "violation",
        date: dropDate,
        driverUuid,
        message: `Trip overlaps with existing trip (${existStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - ${existEnd.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})`,
        calculation: `New: ${newStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - ${newEnd.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} overlaps with existing trip`,
        ruleset: "ASSIMILATED",
      })
    }
  }

  return { violations, warnings }
}
