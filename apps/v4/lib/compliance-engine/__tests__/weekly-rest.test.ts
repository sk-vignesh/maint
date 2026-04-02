/**
 * Weekly Rest Period Tests
 * ─────────────────────────
 * Tests for EU_WEEKLY_REST and EU_CONSECUTIVE_REDUCED_WEEKLY_REST rules.
 *
 * The engine computes `longestContinuousRest` PER ISO WEEK (Mon–Sun).
 * A week must contain ≥ 45h of unbroken rest (standard) or ≥ 24h (reduced).
 * "Insufficient weekly rest" means the longest rest span within the week < 24h.
 *
 * To construct a compliant week: ensure the week contains multiple rest days
 * so `longestContinuousRest` measures the full gap including cross-day periods.
 */
import { describe, it, expect } from "vitest"
import { validateAssimilated } from "../assimilated"
import { makeActivity, makeWorkingDay, makeRestDay, makeDriverRecord } from "./helpers"

describe("validateAssimilated — Weekly Rest Period", () => {

  it("no EU_WEEKLY_REST in a week with Mon–Thu work + Fri/Sat/Sun rest (48h+ rest within week)", () => {
    // ISO week: Mon–Sun. Mon–Thu work, Fri–Sun rest.
    // longestContinuousRest: Fri 00:00 → Sun 23:59 ≥ 45h → compliant
    const mon = makeWorkingDay("2026-04-06", [makeActivity("2026-04-06", "07:00", "17:00")])
    const tue = makeWorkingDay("2026-04-07", [makeActivity("2026-04-07", "07:00", "17:00")])
    const wed = makeWorkingDay("2026-04-08", [makeActivity("2026-04-08", "07:00", "17:00")])
    const thu = makeWorkingDay("2026-04-09", [makeActivity("2026-04-09", "07:00", "17:00")])
    const fri = makeRestDay("2026-04-10")
    const sat = makeRestDay("2026-04-11")
    const sun = makeRestDay("2026-04-12")
    const record = makeDriverRecord([mon, tue, wed, thu, fri, sat, sun])
    const issues = validateAssimilated(record)
    const weeklyRestViolations = issues.filter(
      (i) => i.ruleId === "EU_WEEKLY_REST" && i.severity === "violation",
    )
    expect(weeklyRestViolations).toHaveLength(0)
  })

  it("no EU_WEEKLY_REST violation for reduced weekly rest (Sat–Sun rest = ~48h within week)", () => {
    // Mon–Fri work, Sat–Sun rest — 48h rest at weekend → well above 24h reduced minimum
    const mon = makeWorkingDay("2026-04-06", [makeActivity("2026-04-06", "07:00", "17:00")])
    const tue = makeWorkingDay("2026-04-07", [makeActivity("2026-04-07", "07:00", "17:00")])
    const wed = makeWorkingDay("2026-04-08", [makeActivity("2026-04-08", "07:00", "17:00")])
    const thu = makeWorkingDay("2026-04-09", [makeActivity("2026-04-09", "07:00", "17:00")])
    const fri = makeWorkingDay("2026-04-10", [makeActivity("2026-04-10", "07:00", "17:00")])
    const sat = makeRestDay("2026-04-11")
    const sun = makeRestDay("2026-04-12")
    const record = makeDriverRecord([mon, tue, wed, thu, fri, sat, sun])
    const issues = validateAssimilated(record)
    const violations = issues.filter(
      (i) => i.ruleId === "EU_WEEKLY_REST" && i.severity === "violation",
    )
    expect(violations).toHaveLength(0)
  })

  it("EU_WEEKLY_REST violation when no rest day in the week (7 consecutive working days)", () => {
    // Mon–Sun all working, no rest day at all → longestContinuousRest < 24h within week
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date("2026-04-06")
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().slice(0, 10)
      return makeWorkingDay(dateStr, [makeActivity(dateStr, "07:00", "17:00")])
    })
    const record = makeDriverRecord(days)
    const issues = validateAssimilated(record)
    // With all 7 days working and no rest, the weekly rest check fires
    const weeklyRestViolations = issues.filter((i) => i.ruleId === "EU_WEEKLY_REST")
    expect(weeklyRestViolations.length).toBeGreaterThanOrEqual(1)
  })

  it("EU_CONSECUTIVE_REDUCED_WEEKLY_REST violation when two consecutive weeks each have only one rest day", () => {
    // Week 1 (Apr 6–12): Mon–Sat work, Sun rest only → reduced rest (24h in week)
    // Week 2 (Apr 13–19): Mon–Sat work, Sun rest only → reduced rest again → consecutive violation
    const week1 = [...Array.from({ length: 6 }, (_, i) => {
      const date = new Date("2026-04-06")
      date.setDate(date.getDate() + i)
      const ds = date.toISOString().slice(0, 10)
      return makeWorkingDay(ds, [makeActivity(ds, "07:00", "17:00")])
    }), makeRestDay("2026-04-12")]

    const week2 = [...Array.from({ length: 6 }, (_, i) => {
      const date = new Date("2026-04-13")
      date.setDate(date.getDate() + i)
      const ds = date.toISOString().slice(0, 10)
      return makeWorkingDay(ds, [makeActivity(ds, "07:00", "17:00")])
    }), makeRestDay("2026-04-19")]

    const record = makeDriverRecord([...week1, ...week2])
    const issues = validateAssimilated(record)
    const consecutiveViolations = issues.filter(
      (i) => i.ruleId === "EU_CONSECUTIVE_REDUCED_WEEKLY_REST",
    )
    expect(consecutiveViolations.length).toBeGreaterThanOrEqual(1)
  })

})

describe("validateAssimilated — Weekly Rest date attribution", () => {
  it("EU_WEEKLY_REST violation date is the first working day of the deficient week (not Monday)", () => {
    // Week: Tue 2026-04-07 to Sun 2026-04-12 only (no Monday data).
    // All 6 days are working — no rest day at all → EU_WEEKLY_REST fires.
    // The ISO week Monday is 2026-04-06, but it has NO data in the record.
    // The first working day in the week WITH data is Tuesday 2026-04-07.
    // After the date attribution fix, violation date must be "2026-04-07", NOT "2026-04-06".
    const days = Array.from({ length: 6 }, (_, i) => {
      const date = new Date("2026-04-07")  // starts on Tuesday
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().slice(0, 10)
      return makeWorkingDay(dateStr, [makeActivity(dateStr, "07:00", "17:00")])
    })

    const record = makeDriverRecord(days)
    const issues = validateAssimilated(record)
    const violation = issues.find(
      (i) => i.ruleId === "EU_WEEKLY_REST" && i.severity === "violation"
    )

    expect(violation).toBeDefined()
    // Must NOT be the ISO Monday (which has no data in this record)
    expect(violation!.date).not.toBe("2026-04-06")
    // Must be the first working day in the week — Tuesday
    expect(violation!.date).toBe("2026-04-07")
  })
})
