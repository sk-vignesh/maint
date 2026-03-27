/**
 * Vehicles API — /int/v1/vehicles
 */
import { ontrackFetch, buildQueryString } from "./ontrack-api"

export interface Vehicle {
  uuid: string
  public_id: string
  plate_number: string
  make?: string
  model?: string
  year?: string
  status?: string
}

export interface VehicleListResponse {
  vehicles: Vehicle[]
}

export async function listVehicles(params: {
  query?: string
  sort?: string
  limit?: number
} = {}): Promise<VehicleListResponse> {
  const merged = { limit: -1, sort: "created_at", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<VehicleListResponse>(`/vehicles${qs}`)
}
