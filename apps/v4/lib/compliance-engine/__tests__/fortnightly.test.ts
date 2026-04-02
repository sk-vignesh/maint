/**
 * Fortnightly Driving Limit Tests (EU/Assimilated)
 * ──────────────────────────────────────────────────
 * Tests for the EU_FORTNIGHTLY_DRIVE_LIMIT rule.
 * EU rule: max 90h driving in any 2 consecutive ISO weeks.
 * Warning threshold: 82h (FORTNIGHT_DRIVE_WARN constant).
 */
import { describe, it, expect } from "vitest"
import { validateAssimilated } from "../assimilated"
import { ActivityType } from "../types"
import { makeActivity, makeWorkingDay, makeRestDay, makeDriverRecord } from "./helpers"

/**
 * Build N working days starting at startDate, each with the given driving hours.
 * Uses DRIVING type so totalDrivingMinutes is accumulated correctly.
 */
function buildDrivingDays(startDate: string, count: number, drivingHoursPerDay: number) {
  const days = []
  const base = new Date(startDate)
  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    // e.g. 8.5h → start 06:00, end 14:30
    const totalMins = Math.round(drivingHoursPerDay * 60)
    const startMins = 6 * 60 // 06:00
    const endMins   = startMins + totalMins
    const endH = Math.floor(endMins / 60)
    const endM = endMins % 60
    const endStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`
    days.push(
      makeWorkingDay(dateStr, [makeActivity(dateStr, "06:00", endStr, ActivityType.DRIVING)]),
    )
  }
  return days
}

describe("validateAssimilated — Fortnightly Driving Limit (90h cap)", () => {

  it("no violation when fortnightly driving is under 90h (85h total)", () => {
    // Week 1 (Mon–Fri): 5 days × 8.5h = 42.5h
    // Weekend rest: Sat + Sun
    // Week 2 (Mon–Fri): 5 days × 8.5h = 42.5h  →  total = 85h < 90h
    const week1     = buildDrivingDays("2026-04-06", 5, 8.5)  // Mon–Fri
    const weekend   = [makeRestDay("2026-04-11"), makeRestDay("2026-04-12")]  // Sat–Sun
    const week2     = buildDrivingDays("2026-04-13", 5, 8.5)  // Mon–Fri
    const record    = makeDriverRecord([...week1, ...weekend, ...week2])
    const issues    = validateAssimilated(record)
    const violations = issues.filter(
      (i) => i.ruleId === "EU_FORTNIGHTLY_DRIVE_LIMIT" && i.severity === "violation",
    )
    expect(violations).toHaveLength(0)
  })

  it("produces a fortnightly-drive violation when total exceeds 90h (96h)", () => {
    // Week 1: Mon–Sat: 6 days × 8h = 48h
    // Week 2: Mon–Sat: 6 days × 8h = 48h  →  total = 96h > 90h MAX
    const week1   = buildDrivingDays("2026-04-06", 6, 8)   // Mon–Sat
    const day13   = makeRestDay("2026-04-12")               // Sun rest
    const week2   = buildDrivingDays("2026-04-13", 6, 8)   // Mon–Sat
    const record  = makeDriverRecord([...week1, day13, ...week2])
    const issues  = validateAssimilated(record)
    const fortnightIssues = issues.filter(
      (i) => i.ruleId === "EU_FORTNIGHTLY_DRIVE_LIMIT",
    )
    expect(fortnightIssues.length).toBeGreaterThanOrEqual(1)
  })

  it("no hard violation at 83h (near warning threshold, under 90h cap)", () => {
    // Week 1: 5 days × 8.3h = 41.5h, Week 2: 5 days × 8.3h = 41.5h → 83h
    // 83h > 82h warn but < 90h cap → may produce a warning but not a hard violation
    const week1   = buildDrivingDays("2026-04-06", 5, 8.3)
    const weekend = [makeRestDay("2026-04-11"), makeRestDay("2026-04-12")]
    const week2   = buildDrivingDays("2026-04-13", 5, 8.3)
    const record  = makeDriverRecord([...week1, ...weekend, ...week2])
    const issues  = validateAssimilated(record)
    const hardViolations = issues.filter(
      (i) => i.ruleId === "EU_FORTNIGHTLY_DRIVE_LIMIT" && i.severity === "violation",
    )
    expect(hardViolations).toHaveLength(0)
  })

})

describe("validateAssimilated — Fortnightly Driving Limit date attribution", () => {
  it("EU_FORTNIGHTLY_DRIVE_LIMIT violation date is the last driving day (not start Monday)", () => {
    // Build 2 weeks of driving that exceed 90h:
    // Week 1 (Mon 2026-04-06 – Sat 2026-04-11): 6 days × 8h = 48h
    // Week 2 (Mon 2026-04-13 – Sat 2026-04-18): 6 days × 8h = 48h → total 96h > 90h
    // Cumulative week2: Mon=56, Tue=64, Wed=72, Thu=80, Fri=88, Sat=96 → crosses at Sat 2026-04-18.
    // After the date attribution fix, violation date must be "2026-04-18", NOT "2026-04-06".
    const week1 = buildDrivingDays("2026-04-06", 6, 8)   // Mon–Sat
    const sun1  = makeRestDay("2026-04-12")
    const week2 = buildDrivingDays("2026-04-13", 6, 8)   // Mon–Sat
    const sun2  = makeRestDay("2026-04-19")

    const record = makeDriverRecord([...week1, sun1, ...week2, sun2])
    const issues = validateAssimilated(record)
    const violation = issues.find(
      (i) => i.ruleId === "EU_FORTNIGHTLY_DRIVE_LIMIT" && i.severity === "violation"
    )

    expect(violation).toBeDefined()
    // Must NOT be the start Monday of the fortnight
    expect(violation!.date).not.toBe("2026-04-06")
    // Must be the last day that pushed the cumulative over 90h (Saturday week 2)
    expect(violation!.date).toBe("2026-04-18")
  })
})
