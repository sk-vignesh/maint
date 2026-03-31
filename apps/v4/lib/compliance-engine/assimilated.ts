/**
 * Assimilated Rules (formerly EU Rules) Validator
 * ────────────────────────────────────────────────
 *
 * Applies to vehicles > 3.5 tonnes driven in the UK, or to/from/through
 * an EU country.  This is the primary ruleset for HGV operations.
 *
 * Daily limits:
 *   • Driving          ≤ 9 hours (extend to 10h up to 2× per week)
 *   • Breaks           ≥ 45 minutes after max 4.5h driving
 *                      (can split: 15min + 30min)
 *   • Daily rest       ≥ 11 hours (reduce to 9h up to 3× between weekly rests)
 *
 * Weekly / fortnightly limits:
 *   • Weekly driving   ≤ 56 hours
 *   • Fortnightly      ≤ 90 hours in any 2 consecutive weeks
 *   • Weekly rest      ≥ 45 hours unbroken (reduce to 24h every other week)
 *   • Max 6 consecutive 24h working periods before weekly rest
 *
 * Special edge cases (flagged):
 *   • International coach trips: weekly rest after 12 consecutive days
 *   • International goods: 2 consecutive reduced weekly rests abroad
 *     (if over 4 weeks ≥ 2 weekly rests are ≥ 45h)
 *
 * Reference: UK DVSA — using a tachograph / retained EU rules
 */

import {
  type DriverRecord,
  type ComplianceViolation,
  type WorkingDay,
} from "./types"

import {
  hoursToMinutes,
  fmtMinutes,
  restBetweenDays,
  isoWeekMonday,
  toDateStr,
  daysInRange,
  checkAssimilatedBreaks,
  longestContinuousRest,
} from "./utils"

// ─── Rule Constants ───────────────────────────────────────────────────────────

const DAILY_DRIVE_LIMIT       = hoursToMinutes(9)     // 540 min
const DAILY_DRIVE_EXTENDED    = hoursToMinutes(10)    // 600 min
const MAX_EXTENDED_PER_WEEK   = 2
const DAILY_REST_STANDARD     = hoursToMinutes(11)    // 660 min
const DAILY_REST_REDUCED      = hoursToMinutes(9)     // 540 min
const MAX_REDUCED_REST_BETWEEN_WEEKLY = 3
const WEEKLY_DRIVE_LIMIT      = hoursToMinutes(56)    // 3360 min
const FORTNIGHTLY_DRIVE_LIMIT = hoursToMinutes(90)    // 5400 min
const WEEKLY_REST_STANDARD    = hoursToMinutes(45)    // 2700 min
const WEEKLY_REST_REDUCED     = hoursToMinutes(24)    // 1440 min
const MAX_CONSECUTIVE_WORKING = 6                     // days

// Warning thresholds
const DAILY_DRIVE_WARN        = hoursToMinutes(8)     // warn at 8h
const WEEKLY_DRIVE_WARN       = hoursToMinutes(50)    // warn at 50h
const FORTNIGHT_DRIVE_WARN    = hoursToMinutes(82)    // warn at 82h

/**
 * Tramper threshold: trips ≥ 36 hours (2160 min).
 * On days containing a tramper trip the driver rests in-cab, so the
 * standard daily rest requirement between adjacent working days does NOT
 * apply (DVSA tramper / cab-sleeper exemption). Weekly rest and
 * consecutive-days rules still apply.
 *
 * Trips 10h–12h are treated as a full working day (NON_DRIVING_DUTY) by
 * the adapter, so they naturally consume working-hours budget without
 * needing special-casing here.
 */
const TRAMPER_THRESHOLD_MINS = 36 * 60   // 2160 minutes

/** True if the day contains at least one activity spanning ≥ 36 hours */
function isTramperDay(day: WorkingDay): boolean {
  return day.activities.some(
    a => (a.endTime.getTime() - a.startTime.getTime()) / 60_000 >= TRAMPER_THRESHOLD_MINS
  )
}

// ─── Main Validator ──────────────────────────────────────────────────────────

export function validateAssimilated(
  record: DriverRecord,
): ComplianceViolation[] {
  const issues: ComplianceViolation[] = []
  const days = [...record.workingDays].sort(
    (a, b) => a.date.localeCompare(b.date)
  )

  if (days.length === 0) return issues

  // ═══════════════════════════════════════════════════════════════
  // PER-DAY RULES
  // ═══════════════════════════════════════════════════════════════

  // Track extended driving days per ISO week for the 2×/week cap
  const extendedDaysPerWeek = new Map<string, number>()

  for (const day of days) {
    if (day.isRestDay) continue
    if (!day.hasDriving) continue

    const weekMon = toDateStr(isoWeekMonday(day.date))
    const driving = day.totalDrivingMinutes

    // ── Rule 1: Daily Driving Limit (9h, extendable to 10h × 2/week) ──
    if (driving > DAILY_DRIVE_EXTENDED) {
      // Over 10h — hard violation regardless
      issues.push({
        ruleId:      "EU_DAILY_DRIVE_LIMIT",
        severity:    "violation",
        date:        day.date,
        driverUuid:  record.driverUuid,
        message:     `Daily driving exceeded even the extended 10-hour limit`,
        calculation: `${fmtMinutes(driving)} driving vs ${fmtMinutes(DAILY_DRIVE_EXTENDED)} max extended limit`,
        ruleset:     "ASSIMILATED",
      })
    } else if (driving > DAILY_DRIVE_LIMIT) {
      // Between 9h and 10h — counts as an extended day
      const used = (extendedDaysPerWeek.get(weekMon) ?? 0) + 1
      extendedDaysPerWeek.set(weekMon, used)

      if (used > MAX_EXTENDED_PER_WEEK) {
        issues.push({
          ruleId:      "EU_EXTENDED_DRIVE_EXCEEDED",
          severity:    "violation",
          date:        day.date,
          driverUuid:  record.driverUuid,
          message:     `Too many extended driving days this week (max ${MAX_EXTENDED_PER_WEEK})`,
          calculation: `${used} extended days in week of ${weekMon} (limit: ${MAX_EXTENDED_PER_WEEK}). Drove ${fmtMinutes(driving)}.`,
          ruleset:     "ASSIMILATED",
        })
      } else if (used === MAX_EXTENDED_PER_WEEK) {
        issues.push({
          ruleId:      "EU_EXTENDED_DRIVE_EXCEEDED",
          severity:    "warning",
          date:        day.date,
          driverUuid:  record.driverUuid,
          message:     `All ${MAX_EXTENDED_PER_WEEK} extended driving days used this week — remaining days capped at 9h`,
          calculation: `${used}/${MAX_EXTENDED_PER_WEEK} extended days used. Drove ${fmtMinutes(driving)}.`,
          ruleset:     "ASSIMILATED",
        })
      }
    } else if (driving > DAILY_DRIVE_WARN) {
      issues.push({
        ruleId:      "EU_DAILY_DRIVE_LIMIT",
        severity:    "warning",
        date:        day.date,
        driverUuid:  record.driverUuid,
        message:     `Approaching daily driving limit (${fmtMinutes(DAILY_DRIVE_LIMIT - driving)} remaining before standard 9h cap)`,
        calculation: `${fmtMinutes(driving)} driving vs ${fmtMinutes(DAILY_DRIVE_LIMIT)} standard limit`,
        ruleset:     "ASSIMILATED",
      })
    }

    // ── Rule 2: Breaks — 45min after 4.5h driving ──────────────
    const breakResult = checkAssimilatedBreaks(day)
    if (!breakResult.isSatisfied) {
      issues.push({
        ruleId:      "EU_BREAK_REQUIREMENT",
        severity:    "violation",
        date:        day.date,
        driverUuid:  record.driverUuid,
        message:     breakResult.description ?? "Break requirement not met after 4.5 hours of driving",
        calculation: `Breaks taken: ${fmtMinutes(day.totalBreakMinutes)} during ${fmtMinutes(driving)} driving`,
        ruleset:     "ASSIMILATED",
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DAILY REST (between consecutive working days)
  // ═══════════════════════════════════════════════════════════════

  let reducedRestCount = 0  // resets at each weekly rest

  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1]
    const curr = days[i]

    // Only check rest between working days (isRestDay already filters full rest days)
    if (prev.isRestDay || curr.isRestDay) continue
    // NOTE: we do NOT skip based on hasDriving — all our trips are NON_DRIVING_DUTY
    // and hasDriving would always be false, silently bypassing every rest check.
    // Tramper exemption: driver rests in-cab — daily rest rule does not apply
    if (isTramperDay(prev) || isTramperDay(curr)) continue

    const rest = restBetweenDays(prev, curr)

    if (rest < DAILY_REST_REDUCED) {
      // Below even reduced minimum
      issues.push({
        ruleId:      "EU_DAILY_REST",
        severity:    "violation",
        date:        curr.date,
        driverUuid:  record.driverUuid,
        message:     `Daily rest period too short (minimum 9h even with reduction)`,
        calculation: `${fmtMinutes(rest)} rest between ${prev.date} and ${curr.date} vs ${fmtMinutes(DAILY_REST_REDUCED)} reduced minimum`,
        ruleset:     "ASSIMILATED",
      })
    } else if (rest < DAILY_REST_STANDARD) {
      // Reduced rest (9h–11h)
      reducedRestCount++

      if (reducedRestCount > MAX_REDUCED_REST_BETWEEN_WEEKLY) {
        issues.push({
          ruleId:      "EU_REDUCED_REST_LIMIT",
          severity:    "violation",
          date:        curr.date,
          driverUuid:  record.driverUuid,
          message:     `Too many reduced daily rests between weekly rests (max ${MAX_REDUCED_REST_BETWEEN_WEEKLY})`,
          calculation: `${reducedRestCount} reduced rests used (limit: ${MAX_REDUCED_REST_BETWEEN_WEEKLY}). Rest was ${fmtMinutes(rest)}.`,
          ruleset:     "ASSIMILATED",
        })
      } else if (reducedRestCount === MAX_REDUCED_REST_BETWEEN_WEEKLY) {
        issues.push({
          ruleId:      "EU_REDUCED_REST_LIMIT",
          severity:    "warning",
          date:        curr.date,
          driverUuid:  record.driverUuid,
          message:     `All ${MAX_REDUCED_REST_BETWEEN_WEEKLY} reduced daily rests used — remaining rests must be ≥ 11h until next weekly rest`,
          calculation: `${reducedRestCount}/${MAX_REDUCED_REST_BETWEEN_WEEKLY} reduced rests. Rest was ${fmtMinutes(rest)}.`,
          ruleset:     "ASSIMILATED",
        })
      }
    }

    // Reset reduced rest counter if we detect a weekly rest period
    if (rest >= WEEKLY_REST_REDUCED) {
      reducedRestCount = 0
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WEEKLY DRIVING LIMIT (56h)
  // ═══════════════════════════════════════════════════════════════

  const firstDate = days[0].date
  const lastDate  = days[days.length - 1].date
  let weekCursor  = isoWeekMonday(firstDate)

  while (toDateStr(weekCursor) <= lastDate) {
    const ws = toDateStr(weekCursor)
    const we = toDateStr(new Date(
      weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 6
    ))

    const weekDays = daysInRange(days, ws, we)
    const weekDriving = weekDays.reduce((sum, d) => sum + d.totalDrivingMinutes, 0)

    if (weekDriving > WEEKLY_DRIVE_LIMIT) {
      issues.push({
        ruleId:      "EU_WEEKLY_DRIVE_LIMIT",
        severity:    "violation",
        date:        ws,
        driverUuid:  record.driverUuid,
        message:     `Weekly driving limit exceeded (max 56 hours)`,
        calculation: `${fmtMinutes(weekDriving)} driving in week of ${ws} vs ${fmtMinutes(WEEKLY_DRIVE_LIMIT)} limit`,
        ruleset:     "ASSIMILATED",
      })
    } else if (weekDriving > WEEKLY_DRIVE_WARN) {
      issues.push({
        ruleId:      "EU_WEEKLY_DRIVE_LIMIT",
        severity:    "warning",
        date:        ws,
        driverUuid:  record.driverUuid,
        message:     `Approaching weekly driving limit (${fmtMinutes(WEEKLY_DRIVE_LIMIT - weekDriving)} remaining)`,
        calculation: `${fmtMinutes(weekDriving)} driving vs ${fmtMinutes(WEEKLY_DRIVE_LIMIT)} limit`,
        ruleset:     "ASSIMILATED",
      })
    }

    weekCursor = new Date(
      weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 7
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // FORTNIGHTLY DRIVING LIMIT (90h in any 2 consecutive weeks)
  // ═══════════════════════════════════════════════════════════════

  weekCursor = isoWeekMonday(firstDate)

  while (toDateStr(weekCursor) <= lastDate) {
    const ws = toDateStr(weekCursor)
    const we = toDateStr(new Date(
      weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 13
    ))

    const fortDays = daysInRange(days, ws, we)
    const fortDriving = fortDays.reduce((sum, d) => sum + d.totalDrivingMinutes, 0)

    if (fortDriving > FORTNIGHTLY_DRIVE_LIMIT) {
      issues.push({
        ruleId:      "EU_FORTNIGHTLY_DRIVE_LIMIT",
        severity:    "violation",
        date:        ws,
        driverUuid:  record.driverUuid,
        message:     `Fortnightly driving limit exceeded (max 90 hours in any 2 consecutive weeks)`,
        calculation: `${fmtMinutes(fortDriving)} driving in ${ws} to ${we} vs ${fmtMinutes(FORTNIGHTLY_DRIVE_LIMIT)} limit`,
        ruleset:     "ASSIMILATED",
      })
    } else if (fortDriving > FORTNIGHT_DRIVE_WARN) {
      issues.push({
        ruleId:      "EU_FORTNIGHTLY_DRIVE_LIMIT",
        severity:    "warning",
        date:        ws,
        driverUuid:  record.driverUuid,
        message:     `Approaching fortnightly driving limit (${fmtMinutes(FORTNIGHTLY_DRIVE_LIMIT - fortDriving)} remaining)`,
        calculation: `${fmtMinutes(fortDriving)} driving vs ${fmtMinutes(FORTNIGHTLY_DRIVE_LIMIT)} limit`,
        ruleset:     "ASSIMILATED",
      })
    }

    weekCursor = new Date(
      weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 7
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // WEEKLY REST (45h, reducible to 24h every other week)
  // ═══════════════════════════════════════════════════════════════

  weekCursor = isoWeekMonday(firstDate)
  let lastWeeklyRestWasReduced = false

  while (toDateStr(weekCursor) <= lastDate) {
    const ws = toDateStr(weekCursor)
    const we = toDateStr(new Date(
      weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 6
    ))

    const weekDays = daysInRange(days, ws, we)
    if (weekDays.length > 0) {
      const longestRest = longestContinuousRest(weekDays)

      if (longestRest < WEEKLY_REST_REDUCED) {
        issues.push({
          ruleId:      "EU_WEEKLY_REST",
          severity:    "violation",
          date:        ws,
          driverUuid:  record.driverUuid,
          message:     `Weekly rest period too short (minimum 24h even with reduction)`,
          calculation: `Longest rest in week of ${ws}: ${fmtMinutes(longestRest)} vs ${fmtMinutes(WEEKLY_REST_REDUCED)} reduced minimum`,
          ruleset:     "ASSIMILATED",
        })
      } else if (longestRest < WEEKLY_REST_STANDARD) {
        // Reduced weekly rest (24h–45h)
        if (lastWeeklyRestWasReduced) {
          issues.push({
            ruleId:      "EU_CONSECUTIVE_REDUCED_WEEKLY_REST",
            severity:    "violation",
            date:        ws,
            driverUuid:  record.driverUuid,
            message:     `Cannot take reduced weekly rest in consecutive weeks`,
            calculation: `Longest rest in week of ${ws}: ${fmtMinutes(longestRest)}. Previous week was also reduced.`,
            ruleset:     "ASSIMILATED",
          })
        }
        lastWeeklyRestWasReduced = true
      } else {
        lastWeeklyRestWasReduced = false
      }
    }

    weekCursor = new Date(
      weekCursor.getFullYear(), weekCursor.getMonth(), weekCursor.getDate() + 7
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // MAX 6 CONSECUTIVE WORKING DAYS
  // ═══════════════════════════════════════════════════════════════

  let consecutiveWorking = 0
  let streakStartDate = ""

  for (const day of days) {
    if (day.isRestDay) {
      consecutiveWorking = 0
      streakStartDate = ""
    } else {
      if (consecutiveWorking === 0) streakStartDate = day.date
      consecutiveWorking++

      if (consecutiveWorking > MAX_CONSECUTIVE_WORKING) {
        issues.push({
          ruleId:      "EU_CONSECUTIVE_WORKING_DAYS",
          severity:    "violation",
          date:        day.date,
          driverUuid:  record.driverUuid,
          message:     `Exceeded ${MAX_CONSECUTIVE_WORKING} consecutive working days — weekly rest required`,
          calculation: `${consecutiveWorking} consecutive working days since ${streakStartDate}`,
          ruleset:     "ASSIMILATED",
        })
      } else if (consecutiveWorking === MAX_CONSECUTIVE_WORKING) {
        issues.push({
          ruleId:      "EU_CONSECUTIVE_WORKING_DAYS",
          severity:    "warning",
          date:        day.date,
          driverUuid:  record.driverUuid,
          message:     `${MAX_CONSECUTIVE_WORKING} consecutive working days reached — weekly rest must be taken`,
          calculation: `${consecutiveWorking} consecutive working days since ${streakStartDate}`,
          ruleset:     "ASSIMILATED",
        })
      }
    }
  }

  return issues
}
