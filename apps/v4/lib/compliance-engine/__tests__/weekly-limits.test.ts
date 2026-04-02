import { describe, it, expect } from "vitest"
import { validateAssimilated } from "../assimilated"
import { ActivityType } from "../types"
import {
  makeActivity,
  makeWorkingDay,
  makeRestDay,
  makeDriverRecord,
} from "./helpers"

describe("validateAssimilated — Weekly Driving Limit", () => {
  it("no violation when weekly driving <56h", () => {
    // 5 days × 10h driving = 50h, under 56h limit
    const days = Array.from({ length: 5 }, (_, i) => {
      const date = `2026-04-0${i + 1}`
      return makeWorkingDay(date, [
        makeActivity(date, "06:00", "16:00", ActivityType.DRIVING),
      ])
    })
    // Add rest days to complete the week
    days.push(makeRestDay("2026-04-06"))
    days.push(makeRestDay("2026-04-07"))

    const record = makeDriverRecord(days)
    const issues = validateAssimilated(record)
    const weeklyIssues = issues.filter(i => i.ruleId === "EU_WEEKLY_DRIVE_LIMIT")
    // Should not have a violation (may have a warning since 50h > 50h threshold)
    const violations = weeklyIssues.filter(i => i.severity === "violation")
    expect(violations).toHaveLength(0)
  })
})

describe("validateAssimilated — Consecutive Working Days", () => {
  it("warns at 6 consecutive working days", () => {
    const days = Array.from({ length: 6 }, (_, i) => {
      const date = `2026-04-0${i + 1}`
      return makeWorkingDay(date, [
        makeActivity(date, "08:00", "16:00"),
      ])
    })
    const record = makeDriverRecord(days)
    const issues = validateAssimilated(record)
    const consecIssues = issues.filter(i => i.ruleId === "EU_CONSECUTIVE_WORKING_DAYS")
    // 6 consecutive: should have at least a warning
    expect(consecIssues.length).toBeGreaterThanOrEqual(1)
  })

  it("violation at 7+ consecutive working days", () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = i + 1
      const date = `2026-04-${String(d).padStart(2, "0")}`
      return makeWorkingDay(date, [
        makeActivity(date, "08:00", "16:00"),
      ])
    })
    const record = makeDriverRecord(days)
    const issues = validateAssimilated(record)
    const consecViolations = issues.filter(i =>
      i.ruleId === "EU_CONSECUTIVE_WORKING_DAYS" && i.severity === "violation"
    )
    expect(consecViolations.length).toBeGreaterThanOrEqual(1)
  })

  it("rest day resets consecutive count", () => {
    // 5 working days, 1 rest day, 5 working days
    const days = []
    for (let i = 1; i <= 5; i++) {
      const date = `2026-04-${String(i).padStart(2, "0")}`
      days.push(makeWorkingDay(date, [
        makeActivity(date, "08:00", "16:00"),
      ]))
    }
    days.push(makeRestDay("2026-04-06"))
    for (let i = 7; i <= 11; i++) {
      const date = `2026-04-${String(i).padStart(2, "0")}`
      days.push(makeWorkingDay(date, [
        makeActivity(date, "08:00", "16:00"),
      ]))
    }
    const record = makeDriverRecord(days)
    const issues = validateAssimilated(record)
    const consecViolations = issues.filter(i =>
      i.ruleId === "EU_CONSECUTIVE_WORKING_DAYS" && i.severity === "violation"
    )
    // Never reaches 7 consecutive — should have no violation
    expect(consecViolations).toHaveLength(0)
  })
})

describe("validateAssimilated — Weekly Driving Limit date attribution", () => {
  it("violation date is the last driving day (not the Monday of the week) when 56h exceeded", () => {
    // Build a week: Mon 2026-04-06 to Fri 2026-04-10
    // Each day: 12h driving (ActivityType.DRIVING) → 5 × 12h = 60h > 56h
    // The last day with driving is Friday 2026-04-10.
    // After the date attribution fix, violation date must be "2026-04-10", NOT "2026-04-06" (Monday).
    const days = Array.from({ length: 5 }, (_, i) => {
      const date = new Date("2026-04-06")
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().slice(0, 10)
      return makeWorkingDay(dateStr, [
        makeActivity(dateStr, "06:00", "18:00", ActivityType.DRIVING),
      ])
    })
    days.push(makeRestDay("2026-04-11"))
    days.push(makeRestDay("2026-04-12"))

    const record = makeDriverRecord(days)
    const issues = validateAssimilated(record)
    const violation = issues.find(
      (i) => i.ruleId === "EU_WEEKLY_DRIVE_LIMIT" && i.severity === "violation"
    )

    expect(violation).toBeDefined()
    // Must NOT be the Monday (week start)
    expect(violation!.date).not.toBe("2026-04-06")
    // Must be the last day with driving data (Friday in this 5-day run)
    expect(violation!.date).toBe("2026-04-10")
  })
})
