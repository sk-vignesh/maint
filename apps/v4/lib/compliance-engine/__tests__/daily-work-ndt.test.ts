/**
 * Daily Working Hours Limit — Non-Driving Duty (NDT) Tests
 * ──────────────────────────────────────────────────────────
 * Tests for the EU_DAILY_WORK_LIMIT rule on NON_DRIVING_DUTY working days.
 *
 * This rule was previously silently skipped due to the D-10 bug:
 *   `if (!day.hasDriving) continue`
 * After the Phase 999.3 fix: non-driving working days now get the 13h/15h check.
 *
 * Thresholds:
 *   ≤ 13h (780 min): compliant — no issue
 *   > 13h–15h (780–900 min): warning (approaching/at extended limit)
 *   > 15h (900 min): violation (absolute maximum exceeded)
 */
import { describe, it, expect } from "vitest"
import { validateAssimilated } from "../assimilated"
import { ActivityType } from "../types"
import { makeActivity, makeWorkingDay, makeDriverRecord } from "./helpers"

describe("validateAssimilated — Daily Working Hours Limit (NON_DRIVING_DUTY)", () => {

  it("no issue for 12h NON_DRIVING_DUTY (below 13h threshold)", () => {
    // 06:00–18:00 = 720 min = 12h → under the 780 min warn threshold
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "18:00", ActivityType.NON_DRIVING_DUTY),
    ])
    const record = makeDriverRecord([day])
    const issues = validateAssimilated(record)
    const dutyIssues = issues.filter((i) => i.ruleId === "EU_DAILY_WORK_LIMIT")
    expect(dutyIssues).toHaveLength(0)
  })

  it("warning for 14h NON_DRIVING_DUTY (13h < duty ≤ 15h)", () => {
    // 06:00–20:00 = 840 min = 14h → above 780 warn, below 900 violation
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "20:00", ActivityType.NON_DRIVING_DUTY),
    ])
    // Need 2+ working days for per-trip rules to apply
    const day2 = makeWorkingDay("2026-04-02", [makeActivity("2026-04-02", "08:00", "16:00", ActivityType.NON_DRIVING_DUTY)])
    const record = makeDriverRecord([day, day2])
    const issues = validateAssimilated(record)
    const dutyWarnings = issues.filter(
      (i) => i.ruleId === "EU_DAILY_WORK_LIMIT" && i.severity === "warning",
    )
    expect(dutyWarnings.length).toBeGreaterThanOrEqual(1)
  })

  it("violation for 16h NON_DRIVING_DUTY (exceeds 15h absolute maximum)", () => {
    // 06:00–22:00 = 960 min = 16h → above the 900 min violation threshold
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "22:00", ActivityType.NON_DRIVING_DUTY),
    ])
    // Need 2+ working days for per-trip rules to apply
    const day2 = makeWorkingDay("2026-04-02", [makeActivity("2026-04-02", "08:00", "16:00", ActivityType.NON_DRIVING_DUTY)])
    const record = makeDriverRecord([day, day2])
    const issues = validateAssimilated(record)
    const dutyViolations = issues.filter(
      (i) => i.ruleId === "EU_DAILY_WORK_LIMIT" && i.severity === "violation",
    )
    expect(dutyViolations.length).toBeGreaterThanOrEqual(1)
  })

  it("no EU_DAILY_WORK_LIMIT issue for a DRIVING day (existing driving limits apply instead)", () => {
    // Driving days are handled separately — EU_DAILY_DRIVE_LIMIT fires, not EU_DAILY_WORK_LIMIT
    // A compliant 8h driving day should produce no EU_DAILY_WORK_LIMIT issues
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "14:00", ActivityType.DRIVING),
    ])
    const record = makeDriverRecord([day])
    const issues = validateAssimilated(record)
    const workLimitIssues = issues.filter((i) => i.ruleId === "EU_DAILY_WORK_LIMIT")
    expect(workLimitIssues).toHaveLength(0)
  })

})
