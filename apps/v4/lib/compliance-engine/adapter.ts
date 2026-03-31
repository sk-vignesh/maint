/**
 * Compliance Engine — Data Adapter
 * ─────────────────────────────────
 *
 * Bridges between the existing Orders/Trips API data and the compliance
 * engine's DriverRecord format.
 *
 * Key responsibilities:
 *   1. Fetch historical trip data from the Orders API for a rolling window
 *   2. Convert Order objects into Activity[] and WorkingDay[] structures
 *   3. Merge rota-level day statuses (WD/RD/HOL) with actual trip data
 *   4. Fill rest days as full-day REST activities
 *
 * The adapter derives driving time from trip timestamps:
 *   - scheduled_at → estimated_end_date (if available)
 *   - Falls back to scheduled_at + `time` field (seconds)
 *   - Final fallback: assume 8h working day for WD entries without trips
 */

import {
  type DriverRecord,
  type WorkingDay,
  type Activity,
  type VehicleConfig,
  type Ruleset,
  ActivityType,
  VehicleType,
  DEFAULT_VEHICLE_CONFIG,
} from "./types"

import {
  sumDriving,
  sumDuty,
  sumBreaks,
  sumRest,
  spreadover,
  toDateStr,
} from "./utils"

import { type Order, listOrders } from "../orders-api"
import { type RotaEntry, getAllRota } from "../rota-store"
import { type Driver } from "../drivers-api"

// ─── Constants ───────────────────────────────────────────────────────────────

/** Rolling window: evaluation day + 28 preceding days */
const ROLLING_WINDOW_DAYS = 29

/** Default assumed working day length when no trip data is available (minutes) */
const DEFAULT_DUTY_MINUTES = 480  // 8 hours

// ─── Trip → Activity Conversion ──────────────────────────────────────────────

/**
 * Convert a single Order (trip) into a NON_DRIVING_DUTY (working hours) activity.
 *
 * IMPORTANT: For now, we treat all trip time as WORKING HOURS, not driving.
 * This means driving-specific limits (9h/10h daily driving, break after 4.5h)
 * will NOT trigger. The daily rest rules (11h between days) still apply
 * because those are based on when work ends/starts, regardless of type.
 *
 * We also assume intra-shift breaks are taken as per law.
 *
 * End-time resolution priority (same chain as prospective-check.ts → tripEnd):
 *   1. estimated_end_date  — most accurate, set by dispatcher
 *   2. time field (seconds) — derived from estimated distance/speed
 *   3. Fallback: 2 hours   — worst-case assumption; still flags short-rest violations
 *
 * The estimated_end_date is validated before use — an invalid date string (e.g.
 * "0000-00-00", empty, or API null-string) silently falls through to the next
 * option rather than propagating NaN into all time-arithmetic calculations.
 */
function orderToActivity(order: Order): Activity {
  const startStr = order.scheduled_at ?? order.started_at ?? order.created_at
  const start = new Date(startStr)

  let end: Date

  // Priority 1: estimated_end_date (validate — reject NaN dates)
  if (order.estimated_end_date) {
    const candidate = new Date(order.estimated_end_date)
    if (!isNaN(candidate.getTime())) {
      end = candidate
    } else {
      // Invalid date string — fall through to next option
      end = new Date(0)  // placeholder, overwritten below
    }
  } else {
    end = new Date(0)  // placeholder
  }

  // Priority 2: time field (seconds). Overwrite placeholder if end not yet set.
  if (end.getTime() === 0 || isNaN(end.getTime())) {
    if (order.time && order.time > 0) {
      end = new Date(start.getTime() + order.time * 1000)
    } else {
      // Priority 3: assume 2 hours (still correctly flags short-rest violations)
      end = new Date(start.getTime() + 2 * 60 * 60_000)
    }
  }

  return {
    activityType: ActivityType.NON_DRIVING_DUTY,
    startTime:    start,
    endTime:      end,
  }
}

// ─── Day Builder ─────────────────────────────────────────────────────────────

/**
 * Build a WorkingDay from a set of orders (trips) for a specific date.
 *
 * Since we treat trip time as working hours (not driving), and assume
 * intra-shift breaks are taken as per law, we only add the work
 * activity itself — no artificial pre/post buffers or forced breaks.
 */
function buildWorkingDayFromTrips(
  driverUuid: string,
  date: string,
  orders: Order[],
  config: VehicleConfig,
): WorkingDay {
  const activities: Activity[] = []

  for (const order of orders) {
    const workActivity = orderToActivity(order)
    activities.push(workActivity)
  }

  return computeWorkingDay(driverUuid, date, activities, config)
}

/**
 * Build a WorkingDay for a day marked as WD but with no trip data.
 * Uses conservative defaults (8h duty as working hours).
 * Breaks are assumed compliant.
 */
function buildDefaultWorkingDay(
  driverUuid: string,
  date: string,
  config: VehicleConfig,
): WorkingDay {
  const dayStart = new Date(date + "T07:00:00")
  const activities: Activity[] = [
    {
      activityType: ActivityType.NON_DRIVING_DUTY,
      startTime:    dayStart,
      endTime:      new Date(dayStart.getTime() + DEFAULT_DUTY_MINUTES * 60_000),
    },
  ]

  return computeWorkingDay(driverUuid, date, activities, config)
}

/**
 * Build a rest day — full 24h of REST activity.
 */
function buildRestDay(
  driverUuid: string,
  date: string,
  config: VehicleConfig,
): WorkingDay {
  const dayStart = new Date(date + "T00:00:00")
  const dayEnd   = new Date(date + "T23:59:59")

  return computeWorkingDay(driverUuid, date, [{
    activityType: ActivityType.REST,
    startTime:    dayStart,
    endTime:      dayEnd,
  }], config)
}

/**
 * Compute all derived fields for a WorkingDay.
 */
function computeWorkingDay(
  driverUuid: string,
  date: string,
  activities: Activity[],
  config: VehicleConfig,
): WorkingDay {
  const day: WorkingDay = {
    date,
    driverUuid,
    activities,
    vehicleType:         config.vehicleType,
    usageType:           config.usageType,
    vehicleWeightTonnes: config.vehicleWeightTonnes,
    totalDrivingMinutes:     0,
    totalDutyMinutes:        0,
    totalRestMinutes:        0,
    totalBreakMinutes:       0,
    spreadoverMinutes:       0,
    hasDriving:              false,
    isRestDay:               false,
    hasInternationalDriving: false,
  }

  day.totalDrivingMinutes     = sumDriving(day)
  day.totalDutyMinutes        = sumDuty(day)
  day.totalRestMinutes        = sumRest(day)
  day.totalBreakMinutes       = sumBreaks(day)
  day.spreadoverMinutes       = spreadover(day)
  day.hasDriving              = day.totalDrivingMinutes > 0
  day.isRestDay               = !day.hasDriving && day.totalDutyMinutes === 0
  day.hasInternationalDriving = activities.some(
    a => a.activityType === ActivityType.DRIVING && a.isInternational === true
  )

  return day
}

// ─── Ruleset Selection ───────────────────────────────────────────────────────

/**
 * Determine which ruleset applies based on vehicle configuration.
 *
 * For HGV:
 *   - If > 3.5 tonnes → Assimilated rules apply
 *   - If ≤ 3.5 tonnes → GB Domestic Goods rules
 *   - If any international driving → Assimilated rules
 */
export function determineRuleset(config: VehicleConfig): Ruleset {
  if (config.isInternational) return "ASSIMILATED"
  if (config.vehicleWeightTonnes > 3.5) return "ASSIMILATED"
  return "GB_DOMESTIC_GOODS"
}

// ─── Main Adapter ────────────────────────────────────────────────────────────

/**
 * Fetch historical trip data and build a DriverRecord for compliance evaluation.
 *
 * @param driver          The driver to evaluate
 * @param evaluationDate  The date to evaluate from (typically today)
 * @param vehicleConfig   Vehicle classification (weight, type, usage)
 * @returns               A complete DriverRecord ready for the compliance engine
 */
export async function buildDriverRecord(
  driver: Driver,
  evaluationDate: string,
  vehicleConfig: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
): Promise<DriverRecord> {
  // Calculate the 29-day window
  const evalDate = new Date(evaluationDate + "T12:00:00")
  const windowStart = new Date(
    evalDate.getFullYear(),
    evalDate.getMonth(),
    evalDate.getDate() - (ROLLING_WINDOW_DAYS - 1),
  )
  const startStr = toDateStr(windowStart)

  // Fetch all orders for this driver in the window
  let orders: Order[] = []
  try {
    const res = await listOrders({
      driver:       driver.uuid,
      scheduled_at: startStr,
      end_date:     evaluationDate,
      per_page:     500,
      sort:         "scheduled_at",
    })
    orders = res.orders ?? []
  } catch {
    // If API fails, proceed with empty orders — record-keeping will flag gaps
    orders = []
  }

  // Get rota entries for context (WD/RD/HOL assignments)
  const allRota = getAllRota().filter(r => r.driver_uuid === driver.uuid)
  const rotaMap = new Map<string, RotaEntry>()
  for (const r of allRota) {
    rotaMap.set(r.date, r)
  }

  // Index orders by local date
  const ordersByDate = new Map<string, Order[]>()
  for (const o of orders) {
    const dateStr = o.scheduled_at
      ? toLocalDateStr(new Date(o.scheduled_at))
      : o.created_at
      ? toLocalDateStr(new Date(o.created_at))
      : null
    if (!dateStr) continue
    const existing = ordersByDate.get(dateStr) ?? []
    existing.push(o)
    ordersByDate.set(dateStr, existing)
  }

  // Build working days for every date in the window
  const workingDays: WorkingDay[] = []

  for (let i = 0; i < ROLLING_WINDOW_DAYS; i++) {
    const d = new Date(
      windowStart.getFullYear(),
      windowStart.getMonth(),
      windowStart.getDate() + i,
    )
    const dateStr = toDateStr(d)
    const dayOrders = ordersByDate.get(dateStr) ?? []
    const rota = rotaMap.get(dateStr)

    if (dayOrders.length > 0) {
      // We have actual trip data — build from orders
      workingDays.push(buildWorkingDayFromTrips(
        driver.uuid, dateStr, dayOrders, vehicleConfig,
      ))
    } else if (rota?.status === "WD") {
      // Rota says working day but no trips — use defaults
      workingDays.push(buildDefaultWorkingDay(
        driver.uuid, dateStr, vehicleConfig,
      ))
    } else if (rota?.status === "RD" || rota?.status === "HOL_REQ" || rota?.status === "OFF") {
      // Explicitly marked as rest/holiday/off
      workingDays.push(buildRestDay(driver.uuid, dateStr, vehicleConfig))
    } else {
      // No rota entry and no trips — assume rest day
      // (record-keeping validator will flag gaps if needed)
      workingDays.push(buildRestDay(driver.uuid, dateStr, vehicleConfig))
    }
  }

  // Sort chronologically
  workingDays.sort((a, b) => a.date.localeCompare(b.date))

  return {
    driverUuid:       driver.uuid,
    driverName:       driver.name,
    workingDays,
    applicableRuleset: determineRuleset(vehicleConfig),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
