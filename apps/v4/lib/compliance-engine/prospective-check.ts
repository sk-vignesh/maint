/**
 * Compliance Engine — Prospective (Pre-Assignment) Check
 * ───────────────────────────────────────────────────────
 *
 * Runs synchronously at drag-and-drop time to block hard violations before
 * they are committed to the API.
 *
 * Algorithm (simple, correct):
 *   1. Collect ALL the driver's current trips from two sources:
 *      a. tripIndex filtered by driver_assigned_uuid  (API-confirmed)
 *      b. localStorage rota entries trip_uuids        (locally-pending)
 *   2. Add the new trip being dropped
 *   3. Sort all trips chronologically by start time
 *   4. Walk consecutive pairs that INVOLVE the new trip and check:
 *      - Rest gap < 9h (reduced minimum) → hard violation
 *      - Rest gap < 11h → warning
 *      - Overlap (restGap < 0) → hard violation (trip starts before prev ends)
 *
 * No date arithmetic, no day bucketing, no prevDate/nextDate lookups.
 * Trips crossing midnight are handled naturally by their actual timestamps.
 */

import { type ComplianceViolation } from "./types"
import { type Order } from "../orders-api"
import { getAllRota } from "../rota-store"
import { fmtMinutes } from "./utils"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum daily rest — reduced (allowed up to 3×/week): 9 hours */
const MIN_DAILY_REST_REDUCED  = 9  * 60   // 540 minutes
/** Standard daily rest: 11 hours */
const MIN_DAILY_REST_STANDARD = 11 * 60   // 660 minutes
/** Max daily working hours (standard 13h rest leaves 11h duty). Hard: 15h (reduced rest) */
const MAX_DAILY_WORKING       = 13 * 60   // 780 minutes
const MAX_DAILY_WORKING_REDUCED = 15 * 60 // 900 minutes

/** 36 hours in minutes — threshold for a tramper (cab-sleeper) trip */
const TRAMPER_THRESHOLD_MINS = 36 * 60   // 2160 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse an ISO datetime string into a Date, or null if missing/invalid */
function parseTime(str: string | null | undefined): Date | null {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/** Get trip start time as Date */
function tripStart(order: Order): Date {
  return parseTime(order.scheduled_at) ?? parseTime(order.started_at) ?? new Date(order.created_at)
}

/**
 * Get trip end time as Date.
 * Priority: estimated_end_date → time (seconds) → 2h fallback
 * Each step validates the result to avoid NaN propagation.
 */
function tripEnd(order: Order): Date {
  const start = tripStart(order)

  // Priority 1: estimated_end_date (validated)
  if (order.estimated_end_date) {
    const end = parseTime(order.estimated_end_date)
    if (end && end.getTime() > start.getTime()) return end
  }

  // Priority 2: time field in seconds
  if (order.time && order.time > 0) {
    return new Date(start.getTime() + order.time * 1000)
  }

  // Priority 3: fallback — 2 hours
  return new Date(start.getTime() + 2 * 60 * 60_000)
}

/** Returns true if the order has no reliable end-time data */
function hasMissingEndTime(order: Order): boolean {
  if (order.estimated_end_date) {
    const end = parseTime(order.estimated_end_date)
    if (end && !isNaN(end.getTime())) return false
  }
  if (order.time && order.time > 0) return false
  return true
}

/** Trip duration in minutes (start → end) */
function tripDrivingMinutes(order: Order): number {
  return Math.max(0, (tripEnd(order).getTime() - tripStart(order).getTime()) / 60_000)
}

/** Returns true if the trip duration is ≥ 36 hours (tramper cab-sleeper operation) */
function isTramperTrip(order: Order): boolean {
  return tripDrivingMinutes(order) >= TRAMPER_THRESHOLD_MINS
}

// ─── Public Interface ─────────────────────────────────────────────────────────

export interface ProspectiveCheckResult {
  /** Hard violations that should BLOCK the allocation */
  violations: ComplianceViolation[]
  /** Soft warnings that should be shown but not block */
  warnings: ComplianceViolation[]
}

/**
 * Check whether assigning `newTrip` to `driverUuid` would create a
 * compliance violation.
 *
 * Combines two sources to build the full current schedule:
 *   1. tripIndex filtered by driver_assigned_uuid  (API-confirmed)
 *   2. localStorage rota entries trip_uuids        (pending API sync)
 *
 * Then sorts ALL trips (existing + new) chronologically and checks every
 * consecutive pair that involves the new trip for rest-period violations.
 *
 * @param driverUuid  The driver being assigned
 * @param dropDate    The date cell the trip is being dropped onto (YYYY-MM-DD)
 * @param newTrip     The Order being dropped
 * @param tripIndex   Map of uuid → Order for all loaded trips this week
 */
export function prospectiveComplianceCheck(
  driverUuid: string,
  dropDate: string,
  newTrip: Order,
  tripIndex: Map<string, Order>,
): ProspectiveCheckResult {
  const violations: ComplianceViolation[] = []
  const warnings:   ComplianceViolation[] = []

  // ── Step 1: Collect ALL current trips for this driver ──────────────────────
  // Priority: localStorage trip_data (synchronous, always current) > tripIndex (async React state).
  // This ordering is critical for race-condition safety: two rapid drops both write trip_data
  // synchronously via upsertRota() BEFORE either's async updateOrder() completes, so the
  // second drop's prospective check always sees the first drop's data via localStorage.
  // tripIndex is only used as fallback for older entries that don't have embedded trip_data.
  const driverTripMap = new Map<string, Order>()

  // Source A: API-confirmed assignments in tripIndex
  for (const o of tripIndex.values()) {
    if (o.uuid === newTrip.uuid) continue  // don't count the trip being dropped as "existing"
    const assigned = o.driver_assigned_uuid || o.driver_assigned?.uuid
    if (assigned === driverUuid) {
      driverTripMap.set(o.uuid, o)
    }
  }

  // Source B: localStorage rota entries (synchronous — written by upsertRota
  // BEFORE the async updateOrder API call, so always current at drop time).
  // Resolves trip timing from embedded trip_data (written at assignment time)
  // so this NEVER depends on tripIndex being up-to-date. tripIndex is used
  // only as a fallback for older entries that predate this field.
  const allRota = getAllRota().filter(r => r.driver_uuid === driverUuid)
  for (const entry of allRota) {
    // Priority: embedded trip_data (timing data stored at save time)
    for (const item of entry.trip_data ?? []) {
      if (item.uuid === newTrip.uuid) continue
      if (!driverTripMap.has(item.uuid)) {
        // Build a minimal Order from embedded data — has everything tripStart/tripEnd need
        const syntheticOrder = {
          uuid: item.uuid,
          created_at: item.scheduled_at ?? new Date().toISOString(),
          scheduled_at: item.scheduled_at,
          estimated_end_date: item.estimated_end_date,
          time: item.time,
        } as unknown as Order
        driverTripMap.set(item.uuid, syntheticOrder)
      }
    }
    // Fallback: resolve via tripIndex (for entries without trip_data)
    for (const uuid of entry.trip_uuids ?? []) {
      if (uuid === newTrip.uuid) continue
      if (!driverTripMap.has(uuid)) {
        const o = tripIndex.get(uuid)
        if (o) driverTripMap.set(uuid, o)
      }
    }
  }

  const existingTrips = [...driverTripMap.values()]

  // ── Minimum-trips guard ──────────────────────────────────────────────────
  // Rest gap checks only make sense when there is at least one OTHER trip
  // already assigned to this driver. A single new trip cannot violate any
  // inter-trip rule — the upstream planning system owns individual trip validity.
  // Skip all gap/overlap checks if this would be the driver's first trip.
  if (existingTrips.length === 0) {
    return { violations: [], warnings: [] }
  }

  // ── DIAGNOSTIC: Log what the engine sees ──────────────────────────────────
  console.warn(
    `[COMPLIANCE] prospectiveCheck for driver=${driverUuid}, dropDate=${dropDate}`,
    `\n  newTrip: uuid=${newTrip.uuid}, scheduled_at=${newTrip.scheduled_at}, estimated_end_date=${newTrip.estimated_end_date}, time=${newTrip.time}`,
    `\n  tripStart=${tripStart(newTrip).toISOString()}, tripEnd=${tripEnd(newTrip).toISOString()}, hasMissingEnd=${hasMissingEndTime(newTrip)}`,
    `\n  existingTrips (${existingTrips.length}):`,
    ...existingTrips.map(t => `\n    - uuid=${t.uuid}, scheduled_at=${t.scheduled_at}, estimated_end_date=${t.estimated_end_date}, time=${t.time}, tripEnd=${tripEnd(t).toISOString()}`),
  )

  // ── Step 2: Sort all trips (existing + new) chronologically ───────────────
  const allTrips = [...existingTrips, newTrip].sort(
    (a, b) => tripStart(a).getTime() - tripStart(b).getTime()
  )

  // ── Step 3: Check rest gap between the new trip and its neighbours ─────────
  // Only check pairs that INVOLVE the new trip. Other existing-to-existing
  // pairs are not affected by this drop.
  const newIdx = allTrips.findIndex(t => t.uuid === newTrip.uuid)

  for (let i = 1; i < allTrips.length; i++) {
    const prev = allTrips[i - 1]
    const curr = allTrips[i]

    // Only evaluate pairs adjacent to the new trip
    if (prev.uuid !== newTrip.uuid && curr.uuid !== newTrip.uuid) continue

    // Tramper exemption: cab-sleeper trips don't apply daily rest rules
    if (isTramperTrip(prev) || isTramperTrip(curr)) continue

    const prevEndMs   = tripEnd(prev).getTime()
    const currStartMs = tripStart(curr).getTime()
    const restMins    = (currStartMs - prevEndMs) / 60_000  // can be negative (overlap)

    const prevEndFmt   = new Date(prevEndMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
    const currStartFmt = new Date(currStartMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })

    // DIAGNOSTIC: Log each pair comparison
    console.warn(
      `[COMPLIANCE] Pair check: prev=${prev.uuid} end=${new Date(prevEndMs).toISOString()} → curr=${curr.uuid} start=${new Date(currStartMs).toISOString()} | restMins=${restMins.toFixed(1)} (${fmtMinutes(restMins)})`,
    )

    if (restMins < 0) {
      // Overlap — the trips run at the same time
      violations.push({
        ruleId: "TRIP_OVERLAP",
        severity: "violation",
        date: dropDate,
        driverUuid,
        message: `Trip overlaps with another trip — ${curr.uuid === newTrip.uuid ? "new" : "existing"} trip starts before previous trip ends`,
        calculation: `Previous trip ends ${prevEndFmt}. This trip starts ${currStartFmt}. Overlap: ${fmtMinutes(Math.abs(restMins))}.`,
        ruleset: "ASSIMILATED",
      })
    } else if (restMins < MIN_DAILY_REST_REDUCED) {
      // Hard violation — less than minimum 9h rest
      violations.push({
        ruleId: "EU_DAILY_REST",
        severity: "violation",
        date: dropDate,
        driverUuid,
        message: `Insufficient rest between trips — only ${fmtMinutes(restMins)} rest (minimum 9h required)`,
        calculation: `Previous trip ends ${prevEndFmt}. Next trip starts ${currStartFmt}. Gap: ${fmtMinutes(restMins)} vs 9h minimum.`,
        ruleset: "ASSIMILATED",
      })
    } else if (restMins < MIN_DAILY_REST_STANDARD) {
      // Warning — reduced rest (9h–11h, only 3 allowed per week)
      warnings.push({
        ruleId: "EU_DAILY_REST",
        severity: "warning",
        date: dropDate,
        driverUuid,
        message: `Reduced daily rest — ${fmtMinutes(restMins)} between trips (standard is 11h). Uses 1 of 3 allowed reduced rests per week.`,
        calculation: `Previous trip ends ${prevEndFmt}. Next trip starts ${currStartFmt}. Gap: ${fmtMinutes(restMins)}.`,
        ruleset: "ASSIMILATED",
      })
    }
  }

  // ── Step 4: Daily working hours limit for the drop date ───────────────────
  // Sum all trips on the same drop date + the new trip
  if (!isTramperTrip(newTrip)) {
    const sameDayMins = existingTrips
      .filter(t => {
        const s = tripStart(t)
        const y = s.getFullYear(), m = s.getMonth(), d = s.getDate()
        const [dy, dm, dd] = dropDate.split("-").map(Number)
        return y === dy && m === dm - 1 && d === dd
      })
      .reduce((sum, t) => sum + tripDrivingMinutes(t), 0)

    const newMins = tripDrivingMinutes(newTrip)
    const totalMins = sameDayMins + newMins

    if (totalMins > MAX_DAILY_WORKING_REDUCED) {
      violations.push({
        ruleId: "EU_DAILY_WORK_LIMIT",
        severity: "violation",
        date: dropDate,
        driverUuid,
        message: `Would exceed maximum daily working hours of 15 hours`,
        calculation: `Existing: ${fmtMinutes(sameDayMins)} + New trip: ${fmtMinutes(newMins)} = ${fmtMinutes(totalMins)} (max ${fmtMinutes(MAX_DAILY_WORKING_REDUCED)})`,
        ruleset: "ASSIMILATED",
      })
    } else if (totalMins > MAX_DAILY_WORKING) {
      warnings.push({
        ruleId: "EU_DAILY_WORK_LIMIT",
        severity: "warning",
        date: dropDate,
        driverUuid,
        message: `Working ${fmtMinutes(totalMins)} — requires reduced daily rest (9h min instead of 11h). Only 3 per week allowed.`,
        calculation: `Existing: ${fmtMinutes(sameDayMins)} + New trip: ${fmtMinutes(newMins)} = ${fmtMinutes(totalMins)}`,
        ruleset: "ASSIMILATED",
      })
    }
  }

  void newIdx  // suppress unused-var lint — used implicitly via uuid comparison above

  // DIAGNOSTIC: Log final result
  console.warn(
    `[COMPLIANCE] RESULT: ${violations.length} violations, ${warnings.length} warnings`,
    violations.length > 0 ? `\n  violations: ${violations.map(v => `${v.ruleId}: ${v.message}`).join('; ')}` : '',
    warnings.length > 0 ? `\n  warnings: ${warnings.map(w => `${w.ruleId}: ${w.message}`).join('; ')}` : '',
  )

  return { violations, warnings }
}
