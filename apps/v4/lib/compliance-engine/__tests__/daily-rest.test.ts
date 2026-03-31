import { describe, it, expect } from "vitest"
import { validateAssimilated } from "../assimilated"
import { ActivityType } from "../types"
import {
  makeActivity,
  makeOvernightActivity,
  makeWorkingDay,
  makeRestDay,
  makeDriverRecord,
} from "./helpers"

describe("validateAssimilated — Daily Rest", () => {
  it("allows standard 11h rest between working days", () => {
    // Day 1: 06:00-17:00 (11h duty), Day 2: 06:00-17:00 (11h duty)
    // Rest between: 17:00 → 06:00 = 13h (>= 11h standard)
    const day1 = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "17:00"),
    ])
    const day2 = makeWorkingDay("2026-04-02", [
      makeActivity("2026-04-02", "06:00", "17:00"),
    ])
    const record = makeDriverRecord([day1, day2])
    const issues = validateAssimilated(record)
    const restIssues = issues.filter(i => i.ruleId === "EU_DAILY_REST")
    expect(restIssues).toHaveLength(0)
  })

  it("flags violation when rest is below 9h (below reduced)", () => {
    // Day 1: 06:00-20:00 (14h duty), Day 2: 03:00-17:00
    // Rest between: 20:00 → 03:00 = 7h (< 9h reduced minimum)
    const day1 = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "20:00"),
    ])
    const day2 = makeWorkingDay("2026-04-02", [
      makeActivity("2026-04-02", "03:00", "17:00"),
    ])
    const record = makeDriverRecord([day1, day2])
    const issues = validateAssimilated(record)
    const restIssues = issues.filter(i =>
      i.ruleId === "EU_DAILY_REST" && i.severity === "violation"
    )
    expect(restIssues.length).toBeGreaterThanOrEqual(1)
  })

  it("uses reduced rest count for 9h-11h gap (no warning on 1st usage)", () => {
    // Day 1: 06:00-18:00 (12h duty), Day 2: 04:00-16:00
    // Rest between: 18:00 → 04:00 = 10h (9h <= rest < 11h = reduced rest)
    // The validator does NOT warn on the 1st reduced rest — only at count=3.
    // But it DOES count it internally. This test verifies no false positive.
    const day1 = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "18:00"),
    ])
    const day2 = makeWorkingDay("2026-04-02", [
      makeActivity("2026-04-02", "04:00", "16:00"),
    ])
    const record = makeDriverRecord([day1, day2])
    const issues = validateAssimilated(record)
    // EU_REDUCED_REST_LIMIT only fires at count >= 3
    const reducedLimitIssues = issues.filter(i =>
      i.ruleId === "EU_REDUCED_REST_LIMIT"
    )
    expect(reducedLimitIssues).toHaveLength(0)
    // EU_DAILY_REST violation should also be absent (10h > 9h)
    const restViolations = issues.filter(i =>
      i.ruleId === "EU_DAILY_REST" && i.severity === "violation"
    )
    expect(restViolations).toHaveLength(0)
  })

  it("flags overnight trip with only 2h rest before next trip (user scenario)", () => {
    // Trip A: 18:00 Day 1 → 05:29 Day 2 (overnight, assigned to Day 1)
    // Trip B: 07:31 Day 2 → ~15:00 Day 2 (starts 2h 2m after Trip A ends)
    // Rest gap: 05:29 → 07:31 = 2h 2m (minimum 9h required)
    const day1 = makeWorkingDay("2026-04-01", [
      makeOvernightActivity("2026-04-01", "18:00", "2026-04-02", "05:29"),
    ])
    const day2 = makeWorkingDay("2026-04-02", [
      makeActivity("2026-04-02", "07:31", "15:00"),
    ])
    const record = makeDriverRecord([day1, day2])
    const issues = validateAssimilated(record)
    const restViolations = issues.filter(i =>
      i.ruleId === "EU_DAILY_REST" && i.severity === "violation"
    )
    expect(restViolations.length).toBeGreaterThanOrEqual(1)
    expect(restViolations[0].calculation).toContain("2h")
  })
})

describe("validateAssimilated — Breaks", () => {
  it("allows 45min break after 4.5h driving", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "10:30", ActivityType.DRIVING),
      makeActivity("2026-04-01", "10:30", "11:15", ActivityType.BREAK),
      makeActivity("2026-04-01", "11:15", "14:00", ActivityType.DRIVING),
    ])
    const record = makeDriverRecord([day])
    const issues = validateAssimilated(record)
    const breakIssues = issues.filter(i => i.ruleId === "EU_BREAK_AFTER_4_5H")
    expect(breakIssues).toHaveLength(0)
  })

  it("flags driving >4.5h without a 45min break", () => {
    // 5h continuous driving with no break
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "11:00", ActivityType.DRIVING),
    ])
    const record = makeDriverRecord([day])
    const issues = validateAssimilated(record)
    const breakIssues = issues.filter(i => i.ruleId === "EU_BREAK_REQUIREMENT")
    expect(breakIssues.length).toBeGreaterThanOrEqual(1)
  })
})
