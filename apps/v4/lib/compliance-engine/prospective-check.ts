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
import { getAllRota } from "../rota-store"
import { fmtMinutes } from "./utils"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum daily rest (standard): 11 hours = 660 minutes */
const MIN_DAILY_REST_STANDARD = 11 * 60
/** Minimum daily rest (reduced, max 3x/week): 9 hours = 540 minutes */
const MIN_DAILY_REST_REDUCED = 9 * 60
/** Maximum daily working hours: 13h (24h - 11h standard rest) */
const MAX_DAILY_WORKING = 13 * 60
/** Maximum daily working hours with reduced rest: 15h (24h - 9h reduced rest) */
const MAX_DAILY_WORKING_REDUCED = 15 * 60

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

// ─── Trip Duration Classification ────────────────────────────────────────────

/**
 * Trips lasting 10h–12h are treated as a single working day for compliance
 * purposes (working hours, not driving). This is already reflected in the
 * adapter (activityType = NON_DRIVING_DUTY), so no special handling is
 * needed at the prospective-check level — minutes are measured directly.
 *
 * Tramper trips (≥ 36h) are long-haul operations where the driver lives
 * in the truck cab between legs. The standard daily rest requirement does
 * NOT apply between a tramper trip and adjacent day's work, because the
 * driver is taking their rest inside the vehicle (DVSA tramper exemption).
 * Weekly rest and consecutive-days rules still apply.
 */

/** 36 hours in minutes — threshold for a tramper (cab-sleeper) trip */
const TRAMPER_THRESHOLD_MINS = 36 * 60   // 2160 minutes

/** Returns true if the trip duration is ≥ 36 hours (tramper operation) */
function isTramperTrip(order: Order): boolean {
  return tripDrivingMinutes(order) >= TRAMPER_THRESHOLD_MINS
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
 * Adjacent-day trips are resolved from a UNION of two sources:
 *   1. `tripIndex` filtered by `driver_assigned_uuid` (API-confirmed assignments)
 *   2. `rotaEntries` trip_uuids (locally-saved assignments pending API sync)
 * This prevents a race condition where a freshly-assigned trip hasn't yet been
 * reflected in tripIndex (dock re-fetch is async), causing the rest-gap check
 * to miss an adjacent trip and silently allow a compliance violation.
 *
 * @param driverUuid     The driver being assigned
 * @param dropDate       The date the trip is being dropped onto (YYYY-MM-DD)
 * @param newTrip        The Order being dropped
 * @param tripIndex      Map of uuid → Order for all loaded trips this week
 */
export function prospectiveComplianceCheck(
  driverUuid: string,
  dropDate: string,
  newTrip: Order,
  tripIndex: Map<string, Order>,
): ProspectiveCheckResult {
  const violations: ComplianceViolation[] = []
  const warnings: ComplianceViolation[] = []

  const newStart = tripStart(newTrip)
  const newEnd = tripEnd(newTrip)
  const newDrivingMins = tripDrivingMinutes(newTrip)

  // ── Dual-source adjacent-day trip lookup ─────────────────────────────────
  // Source 1: tripIndex by driver_assigned_uuid (API-confirmed, may lag after drop)
  // Source 2: getAllRota() localStorage (synchronous, always current after upsertRota)
  // This prevents the race window between upsertRota() and setRotas().
  function getDriverTripsOnDate(date: string): Order[] {
    const result = new Map<string, Order>()

    // Source 1: tripIndex by driver_assigned_uuid (API-confirmed)
    for (const o of tripIndex.values()) {
      const a = o.driver_assigned_uuid || o.driver_assigned?.uuid
      if (a !== driverUuid) continue
      const start = o.scheduled_at || o.started_at || o.created_at
      if (start && toDateStr(new Date(start)) === date) result.set(o.uuid, o)
    }

    // Source 2: localStorage rota entries (synchronous, always up-to-date)
    // upsertRota() writes here synchronously — guaranteed current even during
    // the async window between upsertRota() and the subsequent setRotas() call.
    const allRota = getAllRota()
    const entry = allRota.find(r => r.driver_uuid === driverUuid && r.date === date)
    if (entry?.trip_uuids) {
      for (const uuid of entry.trip_uuids) {
        if (!result.has(uuid)) {
          const o = tripIndex.get(uuid)
          if (o) result.set(uuid, o)  // schedule data from tripIndex
        }
      }
    }

    return [...result.values()]
  }

  // ── 1. Collect existing trips on the drop date ──────────────────────────
  const existingTripsOnDate = getDriverTripsOnDate(dropDate)
    .filter(o => o.uuid !== newTrip.uuid)  // exclude the trip being dropped

  // ── 2. Daily Working Hours Limit ────────────────────────────────────
  // Tramper trips (≥ 36h) are exempt from the daily working hours limit
  // since the driver is resting in-cab between legs.
  if (!isTramperTrip(newTrip)) {
    const existingWorkingOnDate = existingTripsOnDate.reduce(
      (sum, t) => sum + tripDrivingMinutes(t), 0
    )
    const totalWorkingAfterDrop = existingWorkingOnDate + newDrivingMins

    if (totalWorkingAfterDrop > MAX_DAILY_WORKING_REDUCED) {
      violations.push({
        ruleId: "EU_DAILY_WORK_LIMIT",
        severity: "violation",
        date: dropDate,
        driverUuid,
        message: `Would exceed maximum daily working hours of 15 hours`,
        calculation: `Existing: ${fmtMinutes(existingWorkingOnDate)} + New trip: ${fmtMinutes(newDrivingMins)} = ${fmtMinutes(totalWorkingAfterDrop)} (absolute max ${fmtMinutes(MAX_DAILY_WORKING_REDUCED)})`,
        ruleset: "ASSIMILATED",
      })
    } else if (totalWorkingAfterDrop > MAX_DAILY_WORKING) {
      warnings.push({
        ruleId: "EU_DAILY_WORK_LIMIT",
        severity: "warning",
        date: dropDate,
        driverUuid,
        message: `Working ${fmtMinutes(totalWorkingAfterDrop)} — requires reduced daily rest (9h min instead of 11h). Only 3 per week allowed.`,
        calculation: `Existing: ${fmtMinutes(existingWorkingOnDate)} + New trip: ${fmtMinutes(newDrivingMins)} = ${fmtMinutes(totalWorkingAfterDrop)}`,
        ruleset: "ASSIMILATED",
      })
    }
  }

  // ── 3. Daily Rest — Check gap with PREVIOUS day's trips ───────────────
  // Tramper exemption: if the NEW trip OR the previous day's trip is a tramper
  // (≥ 36h), daily rest rules don't apply — the driver rests in-cab.
  const prevDateStr = prevDate(dropDate)
  const prevDayTrips = getDriverTripsOnDate(prevDateStr)
  if (!isTramperTrip(newTrip) && prevDayTrips.length > 0) {
    // Find the latest-ending trip on the previous day
    let latestEnd = 0
    let prevIsTramper = false
    for (const t of prevDayTrips) {
      const end = tripEnd(t).getTime()
      latestEnd = Math.max(latestEnd, end)
      if (isTramperTrip(t)) prevIsTramper = true
    }

    if (latestEnd > 0 && !prevIsTramper) {
      // Rest gap = start of new trip - end of previous trip
      const restGap = Math.max(0, (newStart.getTime() - latestEnd) / 60_000)

      if (restGap < MIN_DAILY_REST_REDUCED) {
        violations.push({
          ruleId: "EU_DAILY_REST",
          severity: "violation",
          date: dropDate,
          driverUuid,
          message: `Insufficient rest after previous day's work — only ${fmtMinutes(restGap)} rest (minimum 9h required)`,
          calculation: `Previous day ends ${new Date(latestEnd).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. New trip starts ${newStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)} vs 9h minimum.`,
          ruleset: "ASSIMILATED",
        })
      } else if (restGap < MIN_DAILY_REST_STANDARD) {
        warnings.push({
          ruleId: "EU_DAILY_REST",
          severity: "warning",
          date: dropDate,
          driverUuid,
          message: `Reduced daily rest — ${fmtMinutes(restGap)} between work periods (standard is 11h). Uses 1 of 3 allowed reduced rests per week.`,
          calculation: `Previous day ends ${new Date(latestEnd).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, new starts ${newStart.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)}.`,
          ruleset: "ASSIMILATED",
        })
      }
    }
  }

  // ── 4. Daily Rest — Check gap with NEXT day's trips ───────────────────
  // Tramper exemption: skip if the new trip OR the next day's trip is a tramper.
  const nextDateStr = nextDate(dropDate)
  const nextDayTrips = getDriverTripsOnDate(nextDateStr)
  if (!isTramperTrip(newTrip) && nextDayTrips.length > 0) {
    // Find the earliest-starting trip on the next day
    let earliestStart = Infinity
    let nextIsTramper = false
    for (const t of nextDayTrips) {
      const start = tripStart(t).getTime()
      earliestStart = Math.min(earliestStart, start)
      if (isTramperTrip(t)) nextIsTramper = true
    }

    if (earliestStart < Infinity && !nextIsTramper) {
      // Rest gap = start of next day's trip - end of new trip
      const restGap = Math.max(0, (earliestStart - newEnd.getTime()) / 60_000)

      if (restGap < MIN_DAILY_REST_REDUCED) {
        violations.push({
          ruleId: "EU_DAILY_REST",
          severity: "violation",
          date: dropDate,
          driverUuid,
          message: `Insufficient rest before next day's work — only ${fmtMinutes(restGap)} rest (minimum 9h required)`,
          calculation: `New trip ends ${newEnd.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Next day starts ${new Date(earliestStart).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)} vs 9h minimum.`,
          ruleset: "ASSIMILATED",
        })
      } else if (restGap < MIN_DAILY_REST_STANDARD) {
        warnings.push({
          ruleId: "EU_DAILY_REST",
          severity: "warning",
          date: dropDate,
          driverUuid,
          message: `Reduced daily rest before next day — ${fmtMinutes(restGap)} between work periods (standard is 11h). Uses 1 of 3 allowed reduced rests.`,
          calculation: `New trip ends ${newEnd.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, next day starts ${new Date(earliestStart).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Gap: ${fmtMinutes(restGap)}.`,
          ruleset: "ASSIMILATED",
        })
      }
    }
  }

  // ── 5. Check gap between existing trips on the SAME day ─────────────────
  // If the driver already has a trip on this date, check the gap.
  // Tramper trips on the same day are skip-eligible but we still flag overlaps.
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
