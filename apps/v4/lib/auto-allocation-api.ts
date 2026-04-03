/**
 * Auto-Allocation API
 *
 * Spans TWO base URLs:
 *   1. Ontrack Internal: https://ontrack-api.agilecyber.com/api/v1
 *   2. Allocation Engine: https://dev-resource-allocation.agilecyber.com
 *
 * Flow:
 *   1. GET  /api/v1/shift-assignments/data          ← fetch input data
 *   2. GET  /api/v1/auto-allocation-constraints     ← fetch active constraints
 *   3. POST /initiate-async-allocation              ← send to allocation engine
 *   4. POST /api/v1/shift-assignments/apply-allocations ← save results
 */

import { getToken } from "./ontrack-api"

// ─── Config ───────────────────────────────────────────────────────────────────

const ONTRACK_API_BASE  = "https://ontrack-api.agilecyber.com/api/v1"
const ALLOCATION_ENGINE = "https://dev-resource-allocation.agilecyber.com"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DatedShift {
  id:               string
  trip_hash_id:     string
  fleet_uuid:       string
  fleet_uuids:      string[]
  fleet_color?:     string
  start_time:       string   // "YYYY-MM-DD HH:mm:ss"
  end_time:         string
  duration_minutes: number
  date:             string | null
}

export interface FleetTripLength {
  fleet_uuid:   string
  trip_length:  number | null
}

export interface DriverPreferenceWindow {
  start?:                  string
  end?:                    string
  start_time?:             string
  start_time_flexibility?: number
}

export interface AllocationResource {
  id:                     string   // Driver UUID
  name:                   string
  fleet_uuids:            string[]
  fleet_trip_lengths:     FleetTripLength[]
  unavailable_dates:      string[]
  non_working_dates:      string[]
  maximum_trips_per_week: number
  priority:               number
  preferences:            Record<string, DriverPreferenceWindow[]> | []
  preferred_vehicles:     string[]
  preferred_rest_days:    string[]
  is_recurring_driver:    boolean
}

export interface VehicleData {
  id:                string   // Vehicle UUID
  fleet_uuids:       string[]
  plate_no:          string
  unavailable_dates: string[]
}

export interface AllocationConstraint {
  icon?:          string
  name?:          string
  type:           ConstraintType
  is_active:      boolean
  is_default:     number
  parameters?:    Record<string, number> | null
  description?:   string
  display_order?: number
}

export type ConstraintType =
  | "min_rest_hrs_between_shifts"
  | "min_weekly_continuous_rest_hrs"
  | "max_weekly_trips"
  | "shift_preference"
  | "preferred_rest_days"
  | "preferred_vehicle"
  | "vehicle_maintenance"
  | "driver_availability"

export interface PreviousAllocationData {
  resource_id:   string
  resource_name: string
  assignments:   Record<string, Record<string, unknown>>
}

export interface ShiftAssignmentData {
  problem_type:              "shift_assignment"
  dates:                     string[]
  dated_shifts:              DatedShift[]
  resources:                 AllocationResource[]
  vehicles_data:             VehicleData[]
  previous_allocation_data:  PreviousAllocationData[]
  pre_assigned_shifts:       unknown[]
  pre_assigned_vehicles:     unknown[]
  company_uuid:              string
  fleet_uuid:                string | null
  fleet_name:                string | null
  constraints:               AllocationConstraint[]
}

export interface AllocationAssignment {
  id?:                              string
  trip_hash_id?:                    string
  start_time?:                      string
  end_time?:                        string
  duration_minutes?:                number
  vehicle_id?:                      string
  plate_no?:                        string
  preference_violated?:             boolean
  pre_assigned?:                    boolean
  ongoing_trip?:                    boolean
  ongoing_trip_id?:                 string
  ongoing_trip_hash_id?:            string
  ongoing_trip_endtime?:            string
  ongoing_vehicle_id?:              string
  ongoing_vehicle_plate_no?:        string
  ongoing_trip_pre_assigned?:       boolean
  ongoing_trip_duration_minutes?:   number
  ongoing_trip_preference_violated?: boolean
}

export interface AllocatedResource {
  resource_id:         string
  resource_name:       string
  fleet_uuids:         string[]
  fleet_trip_lengths:  FleetTripLength[]
  assignments:         Record<string, AllocationAssignment | Record<string, never>>
}

export interface ApplyAllocationsPayload {
  company_uuid:        string
  allocated_resources: AllocatedResource[]
  uuid?:               string
  uncovered_shifts?:   Record<string, string[]>
  timezone?:           string
}

export interface ApplyAllocationsResult {
  success:              boolean
  message:              string
  data: {
    allocation_uuid:      string
    updated_orders:       number
    updated_order_ids:    string[]
    unassigned_orders:    number
    unassigned_order_ids: string[]
    skipped_assignments:  number
    errors:               unknown[]
  }
}

export interface AvailableDriver {
  id:     string
  name:   string
  status: string
  online: boolean
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function ontrackApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${ONTRACK_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `Auto-alloc API ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function engineFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ALLOCATION_ENGINE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `Allocation engine ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch shift assignment input data — Mode A: date range.
 * Returns everything needed to run the allocation engine.
 */
export async function getShiftAssignmentData(params: {
  start_date:    string   // "DD-MM-YYYY" or "YYYY-MM-DD"
  end_date:      string
  company_uuid?: string
  fleet_uuid?:   string
  time_zone?:    string
}): Promise<ShiftAssignmentData> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&")
  return ontrackApiFetch<ShiftAssignmentData>(`/shift-assignments/data?${qs}`)
}

/**
 * Fetch shift assignment data for selected orders — Mode B.
 */
export async function getShiftAssignmentDataByOrders(params: {
  selected_orders: string[]   // array of order IDs
  company_uuid:    string
  fleet_uuid?:     string
  time_zone?:      string
}): Promise<ShiftAssignmentData> {
  const { selected_orders, ...rest } = params
  const ordersParam = `[${selected_orders.join(",")}]`
  const qs = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&")
  return ontrackApiFetch<ShiftAssignmentData>(
    `/shift-assignments/data?selected_orders=${encodeURIComponent(ordersParam)}&${qs}`
  )
}

/** Fetch shift data for the current calendar week */
export async function getCurrentWeekShiftData(params: {
  company_uuid?: string
  fleet_uuid?:   string
  time_zone?:    string
} = {}): Promise<ShiftAssignmentData> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&")
  return ontrackApiFetch<ShiftAssignmentData>(`/shift-assignments/current-week${qs ? `?${qs}` : ""}`)
}

/** Fetch shift data for next calendar week */
export async function getNextWeekShiftData(params: {
  company_uuid?: string
  fleet_uuid?:   string
  time_zone?:    string
} = {}): Promise<ShiftAssignmentData> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&")
  return ontrackApiFetch<ShiftAssignmentData>(`/shift-assignments/next-week${qs ? `?${qs}` : ""}`)
}

/** Get drivers available (not on approved leave) for a specific date */
export async function getAvailableDrivers(params: {
  date:          string   // "YYYY-MM-DD"
  company_uuid?: string
  fleet_uuid?:   string
}): Promise<{ date: string; available_drivers: AvailableDriver[]; total_available: number }> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&")
  const res = await ontrackApiFetch<{
    success: boolean
    data: { date: string; available_drivers: AvailableDriver[]; total_available: number }
  }>(`/shift-assignments/available-drivers?${qs}`)
  return res.data
}

/**
 * Send the allocation problem to the external allocation engine.
 * The payload is the ShiftAssignmentData with problem_type added.
 * Returns an ApplyAllocationsPayload ready to pass to applyAllocations().
 */
export async function initiateAsyncAllocation(
  payload: ShiftAssignmentData
): Promise<ApplyAllocationsPayload> {
  return engineFetch<ApplyAllocationsPayload>("/initiate-async-allocation", {
    method: "POST",
    body:   JSON.stringify(payload),
  })
}

/**
 * Save allocation results back to Ontrack — assigns drivers and vehicles to orders.
 */
export async function applyAllocations(
  payload: ApplyAllocationsPayload
): Promise<ApplyAllocationsResult> {
  return ontrackApiFetch<ApplyAllocationsResult>("/shift-assignments/apply-allocations", {
    method: "POST",
    body:   JSON.stringify(payload),
  })
}

/** Fetch active allocation constraints for the company */
export async function getConstraints(params: {
  from_date?:   string
  to_date?:     string
  only_active?: boolean
} = {}): Promise<{ success: boolean; data: AllocationConstraint[] }> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&")
  return ontrackApiFetch<{ success: boolean; data: AllocationConstraint[] }>(
    `/auto-allocation-constraints${qs ? `?${qs}` : ""}`
  )
}

/** Save or update allocation constraints */
export async function updateConstraints(
  constraints: Pick<AllocationConstraint, "type" | "is_active" | "parameters">[],
  dateRange?: { from_date: string; to_date: string }
): Promise<{ success: boolean; message: string; data: unknown }> {
  return ontrackApiFetch<{ success: boolean; message: string; data: unknown }>(
    "/auto-allocation-constraints",
    {
      method: "POST",
      body:   JSON.stringify({ constraints, ...dateRange }),
    }
  )
}
