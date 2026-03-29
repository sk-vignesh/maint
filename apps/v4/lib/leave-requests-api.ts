/**
 * Leave Requests API — /api/v1/leave-requests/list
 *
 * NOTE: This uses the /api/v1/ base (not /int/v1/) but the same Bearer token.
 * Covers both driver leave/off-shift AND vehicle unavailability records.
 */

import { getToken } from "./ontrack-api"

// ─── Config ───────────────────────────────────────────────────────────────────

const LEAVE_BASE = "https://ontrack-api.agilecyber.com/api/v1"

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaveStatus = "Approved" | "Submitted" | "Rejected"
export type LeaveType   = "Vacation" | "Sick" | "Other"
export type NonAvailabilityType = "Holiday" | "Off-shift" | "vehicle"

export interface LeaveRequestUser {
  uuid:   string
  name:   string
  email?: string
  phone?: string
}

export interface LeaveRequestVehicle {
  uuid:         string
  plate_number: string | null
  make?:        string | null
  model?:       string | null
  display_name?: string | null
}

export interface LeaveRequest {
  id:                    number
  uuid:                  string
  public_id:             string
  user_uuid:             string | null
  driver_uuid:           string | null
  vehicle_uuid:          string | null
  start_date:            string   // "YYYY-MM-DDT00:00:00.000000Z"
  end_date:              string   // "YYYY-MM-DDT00:00:00.000000Z"
  total_days:            number
  reason:                string | null
  status:                LeaveStatus
  leave_type:            LeaveType
  non_availability_type: NonAvailabilityType | null
  unavailability_type:   string | null   // "vehicle" | null
  vehicle_name:          string | null   // e.g. "KL22MK - T5"
  processed_by_name:     string | null
  created_at:            string
  updated_at:            string
  user:                  LeaveRequestUser | null
  vehicle:               LeaveRequestVehicle | null
}

export interface LeaveRequestsResponse {
  success:    boolean
  data:       LeaveRequest[]
  pagination: {
    current_page: number
    per_page:     number
    total:        number
    last_page:    number
    from:         number | null
    to:           number | null
  }
}

export interface LeaveRequestParams {
  page?:                number
  per_page?:            number
  sort?:                string
  unavailability_page?: number
  unavailability_type?: "vehicle"   // omit for driver leave
}

// ─── Fetch helper (uses same token, different base) ───────────────────────────

async function leaveFetch<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const token = getToken()
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&")
  const url = `${LEAVE_BASE}${path}${qs ? `?${qs}` : ""}`
  const res = await fetch(url, {
    headers: {
      "Content-Type":  "application/json",
      "accept":        "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`Leave API ${res.status}: ${res.statusText}`)
  return res.json() as Promise<T>
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Fetch driver leave requests (holidays, sick, off-shift) */
export async function listDriverLeave(params: LeaveRequestParams = {}): Promise<LeaveRequestsResponse> {
  return leaveFetch<LeaveRequestsResponse>("/leave-requests/list", {
    page:     params.page ?? 1,
    per_page: params.per_page ?? 200,
    sort:     params.sort ?? "-created_at",
  })
}

/** Fetch vehicle unavailability records */
export async function listVehicleUnavailability(params: LeaveRequestParams = {}): Promise<LeaveRequestsResponse> {
  return leaveFetch<LeaveRequestsResponse>("/leave-requests/list", {
    page:                params.page ?? 1,
    per_page:            params.per_page ?? 200,
    sort:                params.sort ?? "-created_at",
    unavailability_page: 1,
    unavailability_type: "vehicle",
  })
}
