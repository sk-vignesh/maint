/**
 * Driver's Hours Rota Compliance Engine — Type Definitions
 * ──────────────────────────────────────────────────────────
 *
 * Pure TypeScript types representing the domain model for UK driving
 * hours compliance (GB Domestic + Assimilated/EU rules).
 *
 * These types are consumed by all three validation modules and the
 * orchestrator.  They carry NO runtime behaviour — just shape.
 */

// ─── Vehicle Classification ──────────────────────────────────────────────────

/** Whether the vehicle carries goods or passengers */
export enum VehicleType {
  GOODS     = "GOODS",
  PASSENGER = "PASSENGER",
}

/** Special-use classification that can trigger exemptions */
export enum UsageType {
  /** Normal commercial operation — no exemptions */
  STANDARD            = "STANDARD",
  /** Agriculture, quarrying, forestry, building work, civil engineering */
  AGRICULTURE         = "AGRICULTURE",
  /** Doctor, vet, midwife — exempts daily duty limit if < 3.5t */
  DOCTOR_VET          = "DOCTOR_VET",
  /** Armed forces, police, fire brigade — fully exempt */
  ARMED_FORCES_POLICE = "ARMED_FORCES_POLICE",
  /** Emergency response — fully exempt */
  EMERGENCY           = "EMERGENCY",
}

// ─── Activity Types ──────────────────────────────────────────────────────────

export enum ActivityType {
  /** Behind the wheel, vehicle in motion */
  DRIVING          = "DRIVING",
  /** On duty but not driving (loading, paperwork, walk-around checks) */
  NON_DRIVING_DUTY = "NON_DRIVING_DUTY",
  /** Off duty — daily or weekly rest period */
  REST             = "REST",
  /** Short interruption during duty — counts toward break requirements */
  BREAK            = "BREAK",
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface Activity {
  activityType: ActivityType
  startTime:    Date
  endTime:      Date
  /**
   * UUID of the source Order (trip) that produced this activity.
   * Set by the adapter when converting Orders → Activities.
   * Used to enrich violation objects with trip context.
   */
  orderId?:         string
  /** Off-road driving — only counted toward daily limit for certain UsageTypes */
  isOffRoad?:       boolean
  /** Driving to/from/through an EU country — triggers Assimilated rules */
  isInternational?: boolean
}

// ─── Working Day ─────────────────────────────────────────────────────────────

/**
 * A working day is the collection of activities between two daily rest
 * periods.  All computed properties are derived from the `activities` array.
 */
export interface WorkingDay {
  /** ISO date string "YYYY-MM-DD" */
  date:       string
  driverUuid: string
  activities: Activity[]

  // ── Vehicle context (needed for ruleset selection + exemptions) ──
  vehicleType:          VehicleType
  usageType:            UsageType
  vehicleWeightTonnes:  number

  // ── Computed summaries (calculated by the adapter / builder) ──
  /** Total minutes spent driving */
  totalDrivingMinutes:      number
  /** Total minutes on duty (driving + non-driving duty) */
  totalDutyMinutes:         number
  /** Total minutes of rest (off-duty rest, not short breaks) */
  totalRestMinutes:         number
  /** Total minutes of breaks taken during duty */
  totalBreakMinutes:        number
  /**
   * Spreadover = time from first activity start to last activity end.
   * Relevant for GB Domestic Passenger rules (max 16h).
   */
  spreadoverMinutes:        number
  /** Whether the driver drove AT ALL on this day */
  hasDriving:               boolean
  /** Whether this is a full rest day (no driving, no duty) */
  isRestDay:                boolean
  /** Convenience: whether any activity is flagged international */
  hasInternationalDriving:  boolean
}

// ─── Driver Record ───────────────────────────────────────────────────────────

/** Which regulatory framework applies to this driver */
export type Ruleset =
  | "GB_DOMESTIC_GOODS"
  | "GB_DOMESTIC_PASSENGER"
  | "ASSIMILATED"

export interface DriverRecord {
  driverUuid: string
  driverName: string
  /** Chronologically ordered working days (past historical + future planned) */
  workingDays: WorkingDay[]
  /** The primary ruleset to validate against */
  applicableRuleset: Ruleset
  /**
   * Number of distinct source orders (API trips) in this record.
   * Used by validators to skip inter-trip checks when only 1 real trip exists.
   * Fake WD placeholder days (no trip data) do NOT count toward this.
   */
  tripCount: number
}

// ─── Compliance Output ───────────────────────────────────────────────────────

/** Severity levels for compliance issues */
export type ComplianceSeverity = "violation" | "warning"

/**
 * A single compliance issue — either a hard violation or a soft warning.
 *
 * Examples:
 *   violation: "Assimilated Fortnightly Limit Exceeded: 92h scheduled vs 90h max"
 *   warning:   "Driver has used 2/2 extended 10h drive days this week"
 */
export interface ComplianceViolation {
  /** Machine-readable rule identifier, e.g. "GB_GOODS_DAILY_DRIVE_LIMIT" */
  ruleId:      string
  /** Whether this is a hard violation or an approaching-limit warning */
  severity:    ComplianceSeverity
  /** The date (YYYY-MM-DD) this issue occurs on */
  date:        string
  /** Driver UUID */
  driverUuid:  string
  /** Human-readable explanation */
  message:     string
  /**
   * The exact calculation that triggered this issue.
   * e.g. "10h 32m driving vs 10h limit"
   */
  calculation: string
  /** Which ruleset this rule belongs to */
  ruleset:     Ruleset
  /**
   * Optional trip context — set when a single trip can be identified as the cause.
   * Absent for aggregate-window rules (weekly totals, fortnightly totals) that span
   * multiple trips. Always set by the prospective check (the new trip IS the cause).
   */
  tripId?:        string   // UUID of the triggering Order/trip
  tripStartTime?: string   // ISO datetime of trip start
  tripEndTime?:   string   // ISO datetime of trip end (or best estimate)
}

/**
 * The complete compliance report returned by the engine after evaluating
 * a proposed schedule.
 */
export interface RotaComplianceReport {
  /** true if the proposed rota breaks zero rules */
  isCompliant:         boolean
  /** Hard violations — the rota MUST be changed */
  violations:          ComplianceViolation[]
  /** Soft warnings — limit is being approached */
  warnings:            ComplianceViolation[]
  /** How many days were evaluated */
  evaluatedDays:       number
  /** How many of the required 29 days have complete records */
  recordCoverageDays:  number
}

// ─── Vehicle Configuration ───────────────────────────────────────────────────
// Used by the adapter to enrich rota entries with vehicle context

export interface VehicleConfig {
  vehicleType:         VehicleType
  usageType:           UsageType
  vehicleWeightTonnes: number
  /** Whether this driver primarily operates internationally */
  isInternational?:    boolean
  /**
   * When true (default), breaks within working windows are assumed compliant.
   * The EU break requirement check (45min per 4.5h driving) only fires for
   * DRIVING-type activities. NON_DRIVING_DUTY drivers self-manage breaks.
   * Set to false (future mode) to enforce break timing from actual timestamps.
   */
  breaksAssumedCompliant?: boolean
}

/**
 * Default vehicle configuration — used when no per-driver or per-vehicle
 * override is provided.  Defaults to GB Domestic Goods > 3.5t.
 */
export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  vehicleType:             VehicleType.GOODS,
  usageType:               UsageType.STANDARD,
  vehicleWeightTonnes:     7.5,       // typical rigid goods vehicle
  isInternational:         false,
  breaksAssumedCompliant:  true,      // breaks assumed self-managed within duty window
}
