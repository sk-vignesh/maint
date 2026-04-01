import { describe, it, expect } from "vitest"
import { validateAssimilated } from "../assimilated"
import { validateGBDomesticGoods } from "../gb-domestic-goods"
import { ActivityType } from "../types"
import {
  makeActivity,
  makeWorkingDay,
  makeDriverRecord,
} from "./helpers"

describe("validateAssimilated — Daily Driving Limit", () => {
  it("no violation for <9h driving", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "14:00", ActivityType.DRIVING),
    ])
    const record = makeDriverRecord([day])
    const issues = validateAssimilated(record)
    const driveIssues = issues.filter(i => i.ruleId === "EU_DAILY_DRIVE_LIMIT")
    expect(driveIssues).toHaveLength(0)
  })

  it("warns when approaching 9h limit (at 8h+)", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "14:30", ActivityType.DRIVING),
    ])
    // Need 2+ working days for per-trip rules to apply
    const day2 = makeWorkingDay("2026-04-02", [makeActivity("2026-04-02", "06:00", "14:00", ActivityType.DRIVING)])
    const record = makeDriverRecord([day, day2])
    const issues = validateAssimilated(record)
    const driveIssues = issues.filter(i =>
      i.ruleId === "EU_DAILY_DRIVE_LIMIT" && i.severity === "warning"
    )
    expect(driveIssues.length).toBeGreaterThanOrEqual(1)
  })

  it("violation when driving >10h (extended limit)", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "16:30", ActivityType.DRIVING),
    ])
    // Need 2+ working days for per-trip rules to apply
    const day2 = makeWorkingDay("2026-04-02", [makeActivity("2026-04-02", "06:00", "14:00", ActivityType.DRIVING)])
    const record = makeDriverRecord([day, day2])
    const issues = validateAssimilated(record)
    const driveViolations = issues.filter(i =>
      i.ruleId === "EU_DAILY_DRIVE_LIMIT" && i.severity === "violation"
    )
    expect(driveViolations.length).toBeGreaterThanOrEqual(1)
  })
})

describe("validateGBDomesticGoods — Daily Driving Limit", () => {
  it("no violation for <10h driving", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "15:00", ActivityType.DRIVING),
    ])
    const record = makeDriverRecord([day], undefined, "GB_DOMESTIC_GOODS")
    const issues = validateGBDomesticGoods(record)
    const driveIssues = issues.filter(i => i.ruleId === "GB_GOODS_DAILY_DRIVE_LIMIT")
    expect(driveIssues).toHaveLength(0)
  })

  it("violation when driving >10h", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "16:30", ActivityType.DRIVING),
    ])
    const record = makeDriverRecord([day], undefined, "GB_DOMESTIC_GOODS")
    const issues = validateGBDomesticGoods(record)
    const driveViolations = issues.filter(i =>
      i.ruleId === "GB_GOODS_DAILY_DRIVE_LIMIT" && i.severity === "violation"
    )
    expect(driveViolations.length).toBeGreaterThanOrEqual(1)
  })
})

describe("validateGBDomesticGoods — Daily Duty Limit", () => {
  it("no violation for <11h duty on driving day", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "06:00", "10:00", ActivityType.DRIVING),
      makeActivity("2026-04-01", "10:00", "16:00"),
    ])
    const record = makeDriverRecord([day], undefined, "GB_DOMESTIC_GOODS")
    const issues = validateGBDomesticGoods(record)
    const dutyIssues = issues.filter(i => i.ruleId === "GB_GOODS_DAILY_DUTY_LIMIT")
    expect(dutyIssues).toHaveLength(0)
  })

  it("violation when duty >11h on driving day", () => {
    const day = makeWorkingDay("2026-04-01", [
      makeActivity("2026-04-01", "05:00", "09:00", ActivityType.DRIVING),
      makeActivity("2026-04-01", "09:00", "17:00"),
    ])
    const record = makeDriverRecord([day], undefined, "GB_DOMESTIC_GOODS")
    const issues = validateGBDomesticGoods(record)
    const dutyViolations = issues.filter(i =>
      i.ruleId === "GB_GOODS_DAILY_DUTY_LIMIT" && i.severity === "violation"
    )
    expect(dutyViolations.length).toBeGreaterThanOrEqual(1)
  })
})
