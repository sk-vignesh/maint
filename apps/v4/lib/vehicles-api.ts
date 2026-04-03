/**
 * Vehicles API — /int/v1/vehicles
 */
import { ontrackFetch, buildQueryString, getToken } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type VehicleStatus = "active" | "inactive"

export interface FleetVehicle {
  fleet_uuid: string
  fleet_name: string
}

export interface Vehicle {
  uuid:                 string
  public_id:            string
  plate_number:         string
  make?:                string
  model?:               string
  year?:                string | number
  status?:              VehicleStatus
  colour?:              string
  color?:               string
  vin?:                 string
  driver_name?:         string
  driver_uuid?:         string
  photo_url?:           string
  fleet_uuid?:          string | null
  /** PMI = Planned Maintenance Inspection */
  last_pmi_date?:       string | null   // "YYYY-MM-DD"
  tachograph_cal_date?: string | null   // "YYYY-MM-DD"
  fleet_vehicles?:      FleetVehicle[]
}

export interface VehicleListResponse {
  vehicles: Vehicle[]
  meta?: { total: number; per_page: number; current_page: number; last_page: number }
}

export interface BulkDeleteResponse {
  status:  string
  message: string
}

export interface VehicleImportResult {
  imported:       number
  skipped:        number
  error_log_url?: string
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function listVehicles(params: {
  query?:  string
  sort?:   string
  limit?:  number
  status?: VehicleStatus
  fleet?:  string
} = {}): Promise<VehicleListResponse> {
  const merged = { limit: 500, sort: "created_at", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<VehicleListResponse>(`/vehicles${qs}`)
}

export async function getVehicle(uuid: string): Promise<Vehicle> {
  const res = await ontrackFetch<{ vehicle: Vehicle }>(`/vehicles/${uuid}`)
  return res.vehicle
}

export async function createVehicle(data: {
  plate_number:         string
  make:                 string
  status?:              VehicleStatus
  model?:               string
  year?:                string
  fleet_uuid?:          string
  last_pmi_date?:       string
  tachograph_cal_date?: string
}): Promise<Vehicle> {
  const res = await ontrackFetch<{ vehicle: Vehicle }>("/vehicles", {
    method: "POST",
    body:   JSON.stringify(data),
  })
  return res.vehicle
}

export async function updateVehicle(uuid: string, patch: Partial<Vehicle>): Promise<Vehicle> {
  const res = await ontrackFetch<{ vehicle: Vehicle }>(`/vehicles/${uuid}`, {
    method: "PUT",
    body:   JSON.stringify(patch),
  })
  return res.vehicle
}

export async function deleteVehicle(uuid: string): Promise<{ deleted: boolean }> {
  return ontrackFetch<{ deleted: boolean }>(`/vehicles/${uuid}`, { method: "DELETE" })
}

export async function bulkDeleteVehicles(uuids: string[]): Promise<BulkDeleteResponse> {
  return ontrackFetch<BulkDeleteResponse>("/vehicles/bulk-delete", {
    method: "DELETE",
    body:   JSON.stringify({ ids: uuids }),
  })
}

export async function importVehicles(fileUuids: string[]): Promise<VehicleImportResult> {
  return ontrackFetch<VehicleImportResult>("/vehicles/import", {
    method: "POST",
    body:   JSON.stringify({ files: fileUuids }),
  })
}

/** Export all vehicles — returns a file Blob for download */
export async function exportVehicles(): Promise<Blob> {
  const token = getToken()
  const res = await fetch(
    "https://ontrack-api.agilecyber.com/int/v1/vehicles/export",
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  )
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}
