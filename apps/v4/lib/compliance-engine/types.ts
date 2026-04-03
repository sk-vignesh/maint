/**
 * Compliance Engine — Shared Types
 *
 * All types used across check modules live here.
 * Each rule module imports from this file only — never from each other.
 */

// ─── Core trip type (used by pure logic modules) ───────────────────────────

/** A single trip assigned to a driver, used internally by overlap/rest-gap logic */
export interface Trip {
  orderId:    string
  driverUuid: string
  startTime:  Date
  endTime:    Date
}

/** Alias exported for check modules — same shape as Trip */
export type DriverTrip = Trip

// ─── Overlap result (used by overlap.ts) ──────────────────────────────────

export interface OverlapResult {
  tripA:          Trip
  tripB:          Trip
  overlapMinutes: number
  overlapType:    "partial" | "containment" | "exact"
}

// ─── Public compliance violation type (used by check modules + index.ts) ──

export type RuleId = "OVERLAP" | "REST_GAP" | "DAILY_HOURS" | "WEEKLY_HOURS" | "BIWEEKLY_HOURS" | "WEEKLY_REST"

export interface ComplianceViolation {
  /** YYYY-MM-DD of the cell to highlight (date tripB starts for REST_GAP) */
  date:            string
  ruleId:          RuleId
  severity:        "violation" | "warning"
  message:         string
  tripAUuid:       string
  tripBUuid:       string
  /** Minutes of overlap (OVERLAP) or actual gap in minutes (REST_GAP) */
  durationMinutes: number

  // ── Optional display-layer fields (populated by the UI, not the engine) ──
  /** Human-readable calculation string, e.g. "10h 30m rest (min 11h)" */
  calculation?:   string
  /** ISO datetime string for the start of the offending trip */
  tripStartTime?: string
  /** ISO datetime string for the end of the offending trip */
  tripEndTime?:   string
}

// ── Compliance Rule Definition — used by the Rules Reference tab ─────────────

export type RuleSeverity = "hard" | "soft"
export type RuleCategory = "Daily Limits" | "Rest Periods" | "Weekly Limits" | "Record Keeping"

export interface ComplianceRuleDefinition {
  id:          string
  title:       string
  description: string
  severity:    RuleSeverity
  category:    RuleCategory
  limit?:      string
}

// ─── Per-driver compliance report (returned by runComplianceCheck) ─────────────

export interface RotaComplianceReport {
  violations: ComplianceViolation[]
  warnings:   ComplianceViolation[]
}
