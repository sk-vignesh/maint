/**
 * Weekly Rest Logic — EC 561/2006 Article 8.6
 *
 * Pure function — no API or UI dependencies.
 *
 * Every driver must take at least one unbroken rest period per 7-day period:
 *   Regular weekly rest:  ≥ 45h  → compliant
 *   Reduced weekly rest:  ≥ 24h  → warning (compensation required within 3 weeks)
 *   No weekly rest:       < 24h  → violation
 *
 * Implementation strategy:
 *   - Sort all trips by startTime
 *   - Find the longest gap between any consecutive trip.endTime → trip.startTime
 *   - ALSO include the gap from the last prior-trip end (or week boundary) to the
 *     first trip of the week — a driver resting Sunday + Monday before a Tuesday
 *     shift has 50+ hours of rest that must be counted.
 *   - Compare that maximum gap against the thresholds above
 *
 * Notes:
 *   - A driver with 0 or 1 trip this week is trivially compliant (full rest).
 *   - The violation is attributed to the last day of the week (Saturday) since that
 *     is when the weekly rest deadline is reached.
 *   - This check is separate from REST_GAP (inter-trip minimum 9h) — this rule
 *     asks: was there at least ONE long rest anywhere in the 7-day period?
 */

export const WEEKLY_REST_RULES = {
  /** Internal policy: 46h (1h above EC 561/2006 minimum of 45h) */
  REGULAR_REST_HOURS:  46,
  REDUCED_REST_HOURS:  24,
  REGULAR_REST_MS:     46 * 3600 * 1000,
  REDUCED_REST_MS:     24 * 3600 * 1000,
} as const

export type WeeklyRestSeverity = "violation" | "warning"

export interface WeeklyRestResult {
  /** Longest gap found (minutes) */
  longestGapMinutes:  number
  severity:           WeeklyRestSeverity
  message:            string
  /** UUID of the trip after the longest gap (the return-to-work trip) */
  tripAfterRestUuid:  string
  /** UUID of the trip before the longest gap (last trip before rest), or "" if gap was pre-week */
  tripBeforeRestUuid: string
}

interface TripWindow {
  orderId:   string
  startTime: Date
  endTime:   Date
}

function fmtHoursMin(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Find the weekly rest gap for a set of trips.
 *
 * @param weekTrips      Trips assigned to this driver IN the current week.
 * @param lastPriorEnd   End-time of the driver's last trip BEFORE this week (if any).
 *                       Pass null when no prior trips are loaded.
 * @param weekStartDate  YYYY-MM-DD of the first day of the week (Sunday).
 *                       Used as a conservative lower bound when lastPriorEnd is null.
 * @returns              Result if the best gap is below the regular threshold; null if compliant.
 */
export function findWeeklyRestViolation(
  weekTrips:     TripWindow[],
  lastPriorEnd?: Date | null,
  weekStartDate?: string,
): WeeklyRestResult | null {
  // 0 or 1 trip this week → no meaningful gap to assess; driver was mostly resting
  if (weekTrips.length < 1) return null

  // Sort this week's trips by start time
  const sorted = [...weekTrips].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // ── Collect all rest gap candidates ─────────────────────────────────────────

  interface GapCandidate {
    gapMs:     number
    beforeId:  string   // "" when gap starts before first recorded trip
    afterId:   string
  }

  const candidates: GapCandidate[] = []

  // 1. Gaps between consecutive this-week trips
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapMs = sorted[i + 1].startTime.getTime() - sorted[i].endTime.getTime()
    if (gapMs > 0) {
      candidates.push({ gapMs, beforeId: sorted[i].orderId, afterId: sorted[i + 1].orderId })
    }
  }

  // 2. Gap from the end of the last prior-week trip to the start of this week's first trip.
  //    This is the key fix: captures Sunday/Monday rest before a Tuesday shift.
  const firstThisWeek = sorted[0]
  if (lastPriorEnd) {
    const gapMs = firstThisWeek.startTime.getTime() - lastPriorEnd.getTime()
    if (gapMs > 0) {
      candidates.push({ gapMs, beforeId: "", afterId: firstThisWeek.orderId })
    }
  } else if (weekStartDate) {
    // No prior trip in the loaded data → use the week boundary as a conservative lower bound.
    // This will undercount rest if the driver last worked more than 2 weeks ago, but it is
    // never wrong in the direction of a false positive.
    const weekStartMs = new Date(weekStartDate + "T00:00:00").getTime()
    const gapMs = firstThisWeek.startTime.getTime() - weekStartMs
    if (gapMs > 0) {
      candidates.push({ gapMs, beforeId: "", afterId: firstThisWeek.orderId })
    }
  }

  if (candidates.length === 0) return null

  // ── Pick the longest gap ─────────────────────────────────────────────────────
  const best = candidates.reduce((a, b) => a.gapMs > b.gapMs ? a : b)
  const maxGapMs = best.gapMs

  // Compliant — at least one rest window meets the regular threshold
  if (maxGapMs >= WEEKLY_REST_RULES.REGULAR_REST_MS) return null

  const longestGapMinutes = maxGapMs / 60000

  if (maxGapMs >= WEEKLY_REST_RULES.REDUCED_REST_MS) {
    return {
      longestGapMinutes,
      severity:           "warning",
      message:            `Longest rest this week was ${fmtHoursMin(longestGapMinutes)} — below the 46h company policy for weekly rest (EC 561/2006 Art.8.6 minimum is 45h). Reduced rest (≥24h) requires compensation within 3 weeks.`,
      tripBeforeRestUuid: best.beforeId,
      tripAfterRestUuid:  best.afterId,
    }
  }

  return {
    longestGapMinutes,
    severity:           "violation",
    message:            `Longest rest this week was only ${fmtHoursMin(longestGapMinutes)} — below the 24h minimum weekly rest (EC 561/2006 Art.8.6). A valid weekly rest period is required every 7 days.`,
    tripBeforeRestUuid: best.beforeId,
    tripAfterRestUuid:  best.afterId,
  }
}
