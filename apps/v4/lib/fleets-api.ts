/**
 * Fleets API — /int/v1/fleets
 */

import { ontrackFetch, buildQueryString } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FleetStatus = "active" | "disabled" | "decommissioned"

export interface Fleet {
  uuid:                 string
  public_id:            string
  name:                 string
  status:               FleetStatus
  task?:                string
  trip_length?:         number
  drivers_count?:       number
  drivers_online_count?: number
  parent_fleet_uuid?:   string | null
  service_area_uuid?:   string | null
  zone_uuid?:           string | null
  vendor_uuid?:         string | null
  parent_fleet?:        Fleet | null
}

export interface FleetListParams {
  page?:             number
  limit?:            number
  sort?:             string
  query?:            string
  status?:           FleetStatus
  zone?:             string
  service_area?:     string
  parent_fleet_uuid?: string
  vendor?:           string
}

export interface FleetListResponse {
  fleets: Fleet[]
  meta?: {
    total:        number
    per_page:     number
    current_page: number
    last_page:    number
  }
}

export interface BulkDeleteResponse {
  status:  string
  message: string
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Fetch paginated fleet list */
export async function listFleets(
  params: FleetListParams = {}
): Promise<FleetListResponse> {
  const defaults: FleetListParams = { limit: 500, sort: "name" }
  const merged = { ...defaults, ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<FleetListResponse>(`/fleets${qs}`)
}

/** Fetch a single fleet by UUID */
export async function getFleet(uuid: string): Promise<Fleet> {
  const res = await ontrackFetch<{ fleet: Fleet }>(`/fleets/${uuid}`)
  return res.fleet
}

/** Create a new fleet */
export async function createFleet(data: {
  name:              string
  status?:           FleetStatus
  task?:             string
  trip_length?:      number
  parent_fleet_uuid?: string
}): Promise<Fleet> {
  const res = await ontrackFetch<{ fleet: Fleet }>("/fleets", {
    method: "POST",
    // Fleetbase FleetController reads $request->input('fleet')
    body:   JSON.stringify({ fleet: data }),
  })
  return res.fleet
}

/** Update an existing fleet */
export async function updateFleet(uuid: string, patch: Partial<Fleet>): Promise<Fleet> {
  const res = await ontrackFetch<{ fleet: Fleet }>(`/fleets/${uuid}`, {
    method: "PUT",
    // Fleetbase FleetController reads $request->input('fleet')
    body:   JSON.stringify({ fleet: patch }),
  })
  return res.fleet
}

/** Soft-delete a single fleet */
export async function deleteFleet(uuid: string): Promise<{ deleted: boolean }> {
  return ontrackFetch<{ deleted: boolean }>(`/fleets/${uuid}`, { method: "DELETE" })
}

/** Bulk soft-delete multiple fleets */
export async function bulkDeleteFleets(uuids: string[]): Promise<BulkDeleteResponse> {
  return ontrackFetch<BulkDeleteResponse>("/fleets/bulk-delete", {
    method: "DELETE",
    body:   JSON.stringify({ ids: uuids }),
  })
}

/** Assign a driver to a fleet */
export async function assignDriverToFleet(
  driverUuid: string,
  fleetUuid:  string
): Promise<void> {
  return ontrackFetch<void>("/fleets/assign-driver", {
    method: "POST",
    body:   JSON.stringify({ driver: driverUuid, fleet: fleetUuid }),
  })
}

/** Remove a driver from a fleet */
export async function removeDriverFromFleet(
  driverUuid: string,
  fleetUuid:  string
): Promise<void> {
  return ontrackFetch<void>("/fleets/remove-driver", {
    method: "POST",
    body:   JSON.stringify({ driver: driverUuid, fleet: fleetUuid }),
  })
}

/** Assign a vehicle to a fleet */
export async function assignVehicleToFleet(
  vehicleUuid: string,
  fleetUuid:   string
): Promise<void> {
  return ontrackFetch<void>("/fleets/assign-vehicle", {
    method: "POST",
    body:   JSON.stringify({ vehicle: vehicleUuid, fleet: fleetUuid }),
  })
}

/** Remove a vehicle from a fleet */
export async function removeVehicleFromFleet(
  vehicleUuid: string,
  fleetUuid:   string
): Promise<void> {
  return ontrackFetch<void>("/fleets/remove-vehicle", {
    method: "POST",
    body:   JSON.stringify({ vehicle: vehicleUuid, fleet: fleetUuid }),
  })
}
