/**
 * Driver's Hours Rota Compliance Engine — Orchestrator
 * ─────────────────────────────────────────────────────
 *
 * Entry point for running compliance validation.
 *
 * This orchestrator:
 *   1. Determines the applicable ruleset (GB Domestic Goods or Assimilated)
 *   2. Runs the correct validator(s)
 *   3. Runs record-keeping validation
 *   4. Merges violations + warnings
 *   5. Returns a RotaComplianceReport
 *
 * For HGV operations:
 *   - Vehicles > 3.5 tonnes → Assimilated (ex-EU) rules
 *   - Vehicles ≤ 3.5 tonnes → GB Domestic Goods rules
 *   - International operations → Always Assimilated
 *
 * Usage:
 *   import { evaluateCompliance } from "@/lib/compliance-engine"
 *   const report = evaluateCompliance(driverRecord)
 *
 * Or for the full async flow (fetches data from API):
 *   import { runComplianceCheck } from "@/lib/compliance-engine"
 *   const report = await runComplianceCheck(driver, "2025-07-15")
 */

import {
  type DriverRecord,
  type RotaComplianceReport,
  type ComplianceViolation,
  type VehicleConfig,
  DEFAULT_VEHICLE_CONFIG,
} from "./types"

import { validateGBDomesticGoods } from "./gb-domestic-goods"
import { validateAssimilated } from "./assimilated"
import { validateRecordKeeping, getRecordCoverage } from "./record-keeping"
import { buildDriverRecord } from "./adapter"
import { toDateStr } from "./utils"

import type { Driver } from "../drivers-api"

// ─── Re-exports for convenience ──────────────────────────────────────────────

export type {
  DriverRecord,
  RotaComplianceReport,
  ComplianceViolation,
  VehicleConfig,
  WorkingDay,
  Activity,
  Ruleset,
  ComplianceSeverity,
} from "./types"

export {
  VehicleType,
  UsageType,
  ActivityType,
  DEFAULT_VEHICLE_CONFIG,
} from "./types"

export { buildDriverRecord, determineRuleset } from "./adapter"

export {
  prospectiveComplianceCheck,
  type ProspectiveCheckResult,
} from "./prospective-check"

// ─── Rules Reference (for UI display) ────────────────────────────────────────

export const COMPLIANCE_RULES = [
  {
    id: "EU_DAILY_DRIVE_LIMIT",
    category: "Daily Limits",
    title: "Daily Driving Limit",
    description: "Maximum 9 hours driving per day. Can extend to 10 hours up to twice per week.",
    limit: "9h (10h extended, 2×/week)",
    severity: "hard" as const,
  },
  {
    id: "EU_BREAK_REQUIREMENT",
    category: "Daily Limits",
    title: "Break After 4.5h Driving",
    description: "After 4 hours 30 minutes of driving, must take at least 45 minutes break. Break can be split into 15min + 30min (in that order).",
    limit: "45min break per 4.5h",
    severity: "hard" as const,
  },
  {
    id: "EU_DAILY_REST",
    category: "Rest Periods",
    title: "Daily Rest Period",
    description: "Minimum 11 hours continuous rest between working days. Can be reduced to 9 hours up to 3 times between weekly rests.",
    limit: "11h (9h reduced, 3×/week)",
    severity: "hard" as const,
  },
  {
    id: "EU_WEEKLY_REST",
    category: "Rest Periods",
    title: "Weekly Rest Period",
    description: "At least 45 hours continuous rest per week. Can be reduced to 24 hours every other week (compensation due within 3 weeks).",
    limit: "45h (24h reduced)",
    severity: "hard" as const,
  },
  {
    id: "EU_WEEKLY_DRIVE_LIMIT",
    category: "Weekly Limits",
    title: "Weekly Driving Limit",
    description: "Maximum 56 hours driving in any single week (Monday to Sunday).",
    limit: "56h per week",
    severity: "hard" as const,
  },
  {
    id: "EU_FORTNIGHTLY_DRIVE_LIMIT",
    category: "Weekly Limits",
    title: "Fortnightly Driving Limit",
    description: "Maximum 90 hours driving in any two consecutive weeks.",
    limit: "90h per fortnight",
    severity: "hard" as const,
  },
  {
    id: "EU_CONSECUTIVE_WORKING_DAYS",
    category: "Weekly Limits",
    title: "Consecutive Working Days",
    description: "Maximum 6 consecutive 24-hour working periods before a weekly rest is required.",
    limit: "6 days max",
    severity: "hard" as const,
  },
  {
    id: "RECORD_KEEPING",
    category: "Record Keeping",
    title: "29-Day Record Window",
    description: "Drivers must carry records for the current day plus the previous 28 calendar days (29-day rolling window).",
    limit: "29 days coverage",
    severity: "soft" as const,
  },
]

// ─── Core Evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluate a pre-built DriverRecord against the applicable ruleset.
 *
 * This is the pure, synchronous evaluation function — no API calls.
 * Use `runComplianceCheck()` for the full async flow that fetches data.
 *
 * @param record           The driver's historical + planned schedule
 * @param evaluationDate   The date to evaluate from (for record-keeping window)
 * @returns                Complete compliance report
 */
export function evaluateCompliance(
  record: DriverRecord,
  evaluationDate?: string,
): RotaComplianceReport {
  const evalDate = evaluationDate ?? toDateStr(new Date())

  // ── Step 1: Run the appropriate ruleset validator ──────────────
  let rulesetIssues: ComplianceViolation[] = []

  switch (record.applicableRuleset) {
    case "GB_DOMESTIC_GOODS":
      rulesetIssues = validateGBDomesticGoods(record)
      break

    case "ASSIMILATED":
      rulesetIssues = validateAssimilated(record)
      break

    case "GB_DOMESTIC_PASSENGER":
      // Not applicable for HGV — included for completeness
      // Would call validateGBDomesticPassenger(record) if needed
      break
  }

  // ── Step 2: Run record-keeping validation ─────────────────────
  const recordIssues = validateRecordKeeping(record, evalDate)

  // ── Step 3: Merge all issues ──────────────────────────────────
  const allIssues = [...rulesetIssues, ...recordIssues]

  // Separate violations from warnings
  const violations = allIssues.filter(i => i.severity === "violation")
  const warnings   = allIssues.filter(i => i.severity === "warning")

  // ── Step 4: Calculate coverage ────────────────────────────────
  const coverage = getRecordCoverage(record, evalDate)
  const evaluatedDays = record.workingDays.length

  return {
    isCompliant:        violations.length === 0,
    violations,
    warnings,
    evaluatedDays,
    recordCoverageDays: coverage,
  }
}

// ─── Full Async Flow ─────────────────────────────────────────────────────────

/**
 * Run a complete compliance check for a driver.
 *
 * This is the high-level async function that:
 *   1. Fetches 29 days of trip history from the Orders API
 *   2. Merges with rota data from localStorage
 *   3. Builds a DriverRecord
 *   4. Evaluates compliance
 *   5. Returns the report
 *
 * @param driver          The driver to evaluate
 * @param evaluationDate  The date to evaluate from (default: today)
 * @param vehicleConfig   Vehicle configuration overrides
 * @returns               Complete compliance report
 */
export async function runComplianceCheck(
  driver: Driver,
  evaluationDate?: string,
  vehicleConfig?: VehicleConfig,
): Promise<RotaComplianceReport> {
  const evalDate = evaluationDate ?? toDateStr(new Date())
  const config   = vehicleConfig ?? DEFAULT_VEHICLE_CONFIG

  // Build the driver record from API data
  const record = await buildDriverRecord(driver, evalDate, config)

  // Evaluate compliance
  return evaluateCompliance(record, evalDate)
}

/**
 * Run compliance checks for multiple drivers in parallel.
 *
 * @param drivers         Array of drivers to evaluate
 * @param evaluationDate  The date to evaluate from (default: today)
 * @param vehicleConfig   Vehicle configuration (applied to all drivers)
 * @returns               Map of driverUuid → RotaComplianceReport
 */
export async function runBulkComplianceCheck(
  drivers: Driver[],
  evaluationDate?: string,
  vehicleConfig?: VehicleConfig,
): Promise<Map<string, RotaComplianceReport>> {
  const evalDate = evaluationDate ?? toDateStr(new Date())
  const config   = vehicleConfig ?? DEFAULT_VEHICLE_CONFIG
  const results  = new Map<string, RotaComplianceReport>()

  // Run all checks in parallel (each driver independently)
  const entries = await Promise.allSettled(
    drivers.map(async (driver) => {
      const report = await runComplianceCheck(driver, evalDate, config)
      return { uuid: driver.uuid, report }
    })
  )

  for (const entry of entries) {
    if (entry.status === "fulfilled") {
      results.set(entry.value.uuid, entry.value.report)
    }
  }

  return results
}
