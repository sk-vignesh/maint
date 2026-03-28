/**
 * Fleets API — /int/v1/fleets
 * Lightweight client for the fleet list — used for dropdowns/assignment.
 */

import { ontrackFetch, buildQueryString } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FleetStatus = "active" | "disabled" | "decommissioned"

export interface Fleet {
  uuid: string
  public_id: string
  name: string
  status: FleetStatus
  task?: string
  trip_length?: number
  drivers_count?: number
  drivers_online_count?: number
  parent_fleet_uuid?: string | null
}

export interface FleetListParams {
  page?: number
  limit?: number
  sort?: string
  query?: string
  status?: FleetStatus
}

export interface FleetListResponse {
  fleets: Fleet[]
  meta?: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function listFleets(
  params: FleetListParams = {}
): Promise<FleetListResponse> {
  const defaults: FleetListParams = { limit: 500, sort: "name" }
  const merged = { ...defaults, ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<FleetListResponse>(`/fleets${qs}`)
}

export async function getFleet(uuid: string): Promise<{ fleet: Fleet }> {
  return ontrackFetch<{ fleet: Fleet }>(`/fleets/${uuid}`)
}

export async function deleteFleet(uuid: string): Promise<void> {
  return ontrackFetch<void>(`/fleets/${uuid}`, { method: "DELETE" })
}

export async function bulkDeleteFleets(uuids: string[]): Promise<{ deleted: number; errors: string[] }> {
  const results = await Promise.allSettled(uuids.map(id => deleteFleet(id)))
  const errors = results
    .map((r, i) => r.status === "rejected" ? `${uuids[i]}: ${(r.reason as Error)?.message ?? "failed"}` : null)
    .filter(Boolean) as string[]
  return { deleted: results.filter(r => r.status === "fulfilled").length, errors }
}
