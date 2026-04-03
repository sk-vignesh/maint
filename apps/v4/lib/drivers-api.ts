/**
 * Drivers API — /int/v1/drivers
 */

import { ontrackFetch, buildQueryString } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type DriverStatus = "active" | "inactive"

/** Shift preference format: either `all_days` key or day-wise keys (monday…sunday) */
export interface ShiftWindow {
  start?:                    string   // "HH:mm:ss"
  end?:                      string   // "HH:mm:ss"
  start_time?:               string   // "HH:mm:ss" (flexible format)
  start_time_flexibility?:   number   // hours of flexibility around start_time
}

export interface ShiftPreferences {
  /** When a single window applies to all days uniformly */
  all_days?:  ShiftWindow
  monday?:    ShiftWindow[]
  tuesday?:   ShiftWindow[]
  wednesday?: ShiftWindow[]
  thursday?:  ShiftWindow[]
  friday?:    ShiftWindow[]
  saturday?:  ShiftWindow[]
  sunday?:    ShiftWindow[]
}


export interface Driver {
  id?:                   string
  uuid:                  string
  user_uuid?:            string
  public_id:             string
  internal_id?:          string
  name:                  string
  email?:                string
  phone?:                string
  country?:              string
  city?:                 string
  drivers_license_number?: string
  vehicle_uuid?:         string
  fleet_uuid?:           string[]
  status:                DriverStatus
  priority?:             number
  shift_preferences?:    ShiftPreferences
  preferred_rest_days?:  string[]
  maximum_trips_per_week?: number
  number_of_consecutive_working_days?: number
  online?:               boolean
}

export interface DriverListParams {
  page?:     number
  limit?:    number
  sort?:     string
  query?:    string
  name?:     string
  status?:   DriverStatus
  fleet?:    string
  vehicle?:  string
  vendor?:   string
  country?:  string
  priority?: number
}

export interface DriverListResponse {
  drivers: Driver[]
  meta?: {
    total:        number
    per_page:     number
    current_page: number
    last_page:    number
  }
}

export interface DriverImportResult {
  imported:        number
  skipped:         number
  error_log_url?:  string
}

export interface DriverPreference {
  id:                 string
  uuid:               string
  name:               string
  shift_preferences:  ShiftPreferences
  preferred_rest_days: string[]
  maximum_trips_per_week: number
  number_of_consecutive_working_days: number
  status:             DriverStatus
  online:             boolean
}

export interface DriverPreferencesListResponse {
  data:         DriverPreference[]
  total:        number
  per_page:     number
  current_page: number
  last_page:    number
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Fetch paginated driver list */
export async function listDrivers(
  params: DriverListParams = {}
): Promise<DriverListResponse> {
  const defaults: DriverListParams = { limit: 500, sort: "name" }
  const merged = { ...defaults, ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<DriverListResponse>(`/drivers${qs}`)
}

/** Fetch a single driver by UUID */
export async function getDriver(uuid: string): Promise<Driver> {
  const res = await ontrackFetch<{ driver: Driver }>(`/drivers/${uuid}`)
  return res.driver
}

/** Create a new driver */
export async function createDriver(data: Partial<Driver>): Promise<Driver> {
  const res = await ontrackFetch<{ driver: Driver }>("/drivers", {
    method: "POST",
    body:   JSON.stringify(data),
  })
  return res.driver
}

/** Update an existing driver (partial patch) */
export async function updateDriver(uuid: string, patch: Partial<Driver>): Promise<Driver> {
  const res = await ontrackFetch<{ driver: Driver }>(`/drivers/${uuid}`, {
    method: "PUT",
    body:   JSON.stringify(patch),
  })
  return res.driver
}

/** Update a driver's status */
export async function updateDriverStatus(uuid: string, status: DriverStatus): Promise<Driver> {
  return updateDriver(uuid, { status })
}

/** Update a driver's shift preferences, max trips, and consecutive days */
export async function updateDriverShiftPreferences(
  uuid: string,
  prefs: {
    shift_preferences?:                  ShiftPreferences
    maximum_trips_per_week?:             number
    number_of_consecutive_working_days?: number
  }
): Promise<Driver> {
  return updateDriver(uuid, prefs)
}

/** Assign a fleet (or multiple) to a driver */
export async function assignDriverFleet(uuid: string, fleet_uuid: string[]): Promise<Driver> {
  return updateDriver(uuid, { fleet_uuid })
}

/** Assign a vehicle to a driver */
export async function assignDriverVehicle(uuid: string, vehicle_uuid: string): Promise<Driver> {
  return updateDriver(uuid, { vehicle_uuid })
}

/** Delete a single driver */
export async function deleteDriver(uuid: string): Promise<{ deleted: boolean }> {
  return ontrackFetch<{ deleted: boolean }>(`/drivers/${uuid}`, { method: "DELETE" })
}

/** Bulk update driver priorities after drag-reorder */
export async function bulkUpdateDriverPriority(
  drivers: { id: string; priority: number }[]
): Promise<{ status: string }> {
  return ontrackFetch<{ status: string }>("/drivers/bulk-priority", {
    method: "PUT",
    body:   JSON.stringify({ drivers }),
  })
}

/** Fetch available driver status values */
export async function getDriverStatuses(): Promise<string[]> {
  const res = await ontrackFetch<{ statuses: string[] } | string[]>("/drivers/statuses")
  return Array.isArray(res) ? res : (res as { statuses: string[] }).statuses ?? []
}

/** List shift preferences for all drivers */
export async function listDriverPreferences(params: {
  status?: DriverStatus
  limit?:  number
  page?:   number
} = {}): Promise<DriverPreferencesListResponse> {
  const qs = buildQueryString(params as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<DriverPreferencesListResponse>(`/drivers/preferences${qs}`)
}

/** Get shift preferences for a single driver */
export async function getDriverPreference(uuid: string): Promise<DriverPreference> {
  return ontrackFetch<DriverPreference>(`/drivers/${uuid}/preferences`)
}

/** Import drivers from uploaded file UUIDs */
export async function importDrivers(fileUuids: string[]): Promise<DriverImportResult> {
  return ontrackFetch<DriverImportResult>("/drivers/import", {
    method: "POST",
    body:   JSON.stringify({ files: fileUuids }),
  })
}

/** Export drivers to spreadsheet — returns a Blob (file download) */
export async function exportDrivers(selections: string[] = []): Promise<Blob> {
  const { getToken } = await import("./ontrack-api")
  const token = getToken()
  const qs = selections.length
    ? "?" + selections.map(id => `selections[]=${encodeURIComponent(id)}`).join("&")
    : ""
  const res = await fetch(
    `https://ontrack-api.agilecyber.com/int/v1/drivers/export${qs}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  )
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}
