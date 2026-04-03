/**
 * Leave Requests API — /api/v1/leave-requests/...
 *
 * NOTE: Uses /api/v1/ base (not /int/v1/) but the same Bearer token.
 * Covers driver leave/holidays AND vehicle unavailability records.
 */

import { getToken } from "./ontrack-api"

// ─── Config ───────────────────────────────────────────────────────────────────

const LEAVE_BASE = "https://ontrack-api.agilecyber.com/api/v1"

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaveStatus = "Approved" | "Submitted" | "Rejected" | "Pending"
export type LeaveType   = "Annual Leave" | "Sick Leave" | "Vacation" | "Sick" | "Other"
/** Union of all known values — covers both old ("Holiday"/"Off-shift") and new API doc values */
export type NonAvailabilityType = "leave" | "non_working_day" | "vehicle" | "Holiday" | "Off-shift"

export interface LeaveRequestUser {
  uuid:   string
  name:   string
  email?: string
  phone?: string
}

export interface LeaveRequestVehicle {
  uuid:          string
  plate_number:  string | null
  make?:         string | null
  model?:        string | null
  display_name?: string | null
}

export interface LeaveRequest {
  id:                    number
  uuid:                  string
  public_id:             string
  user_uuid:             string | null
  driver_uuid:           string | null
  vehicle_uuid:          string | null
  start_date:            string   // "YYYY-MM-DD" or ISO datetime
  end_date:              string
  total_days?:           number
  reason:                string | null
  status:                LeaveStatus
  leave_type:            LeaveType
  non_availability_type: NonAvailabilityType | null
  unavailability_type:   string | null   // "vehicle" | null
  vehicle_name:          string | null
  processed_by_name?:    string | null
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
  unavailability_type?: "vehicle"
  status?:              LeaveStatus
  driver_uuid?:         string
  vehicle_uuid?:        string
  non_availability_type?: NonAvailabilityType
}

// ─── Fetch helper (uses same token, different base) ───────────────────────────

async function leaveFetch<T>(
  path: string,
  options: RequestInit = {},
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const token = getToken()
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&")
  const url = `${LEAVE_BASE}${path}${qs ? `?${qs}` : ""}`
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      accept:         "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.message ?? body?.error ?? `Leave API ${res.status}`
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** List driver leave requests */
export async function listDriverLeave(params: LeaveRequestParams = {}): Promise<LeaveRequestsResponse> {
  return leaveFetch<LeaveRequestsResponse>("/leave-requests/list", {}, {
    page:     params.page     ?? 1,
    per_page: params.per_page ?? 200,
    sort:     params.sort     ?? "-created_at",
    ...(params.status        ? { status:        params.status        } : {}),
    ...(params.driver_uuid   ? { driver_uuid:   params.driver_uuid   } : {}),
    ...(params.non_availability_type ? { non_availability_type: params.non_availability_type } : {}),
  })
}

/** List vehicle unavailability records */
export async function listVehicleUnavailability(params: LeaveRequestParams = {}): Promise<LeaveRequestsResponse> {
  return leaveFetch<LeaveRequestsResponse>("/leave-requests/list", {}, {
    page:                1,
    per_page:            params.per_page ?? 200,
    sort:                params.sort ?? "-created_at",
    status:              "Approved",
    unavailability_type: "vehicle",
  })
}

/** Fetch a single leave request by UUID */
export async function getLeaveRequest(uuid: string): Promise<LeaveRequest> {
  const res = await leaveFetch<{ success: boolean; data: LeaveRequest }>(
    `/leave-requests/show/${uuid}`
  )
  return res.data
}

/** Create a new leave / holiday request */
export async function createLeaveRequest(data: {
  driver_uuid?:        string
  user_uuid?:          string
  vehicle_uuid?:       string
  start_date:          string     // "YYYY-MM-DD"
  end_date:            string     // "YYYY-MM-DD"
  leave_type?:         LeaveType
  reason?:             string
  unavailability_type?: "vehicle"
}): Promise<LeaveRequest> {
  const res = await leaveFetch<{ success: boolean; data: LeaveRequest }>(
    "/leave-requests/create",
    { method: "POST", body: JSON.stringify(data) }
  )
  return res.data
}

/** Update a leave request */
export async function updateLeaveRequest(
  uuid: string,
  patch: {
    start_date?:  string
    end_date?:    string
    leave_type?:  LeaveType
    reason?:      string
  }
): Promise<LeaveRequest> {
  const res = await leaveFetch<{ success: boolean; data: LeaveRequest }>(
    `/leave-requests/${uuid}`,
    { method: "PUT", body: JSON.stringify(patch) }
  )
  return res.data
}

/** Approve a leave request */
export async function approveLeaveRequest(uuid: string): Promise<LeaveRequest> {
  const res = await leaveFetch<{ success: boolean; data: LeaveRequest }>(
    `/leave-requests/${uuid}`,
    { method: "PUT", body: JSON.stringify({ action: "approve" }) }
  )
  return res.data
}

/** Reject a leave request */
export async function rejectLeaveRequest(uuid: string): Promise<LeaveRequest> {
  const res = await leaveFetch<{ success: boolean; data: LeaveRequest }>(
    `/leave-requests/${uuid}`,
    { method: "PUT", body: JSON.stringify({ action: "reject" }) }
  )
  return res.data
}

/** Soft-delete a leave request */
export async function deleteLeaveRequest(uuid: string): Promise<{ success: boolean; message: string }> {
  return leaveFetch<{ success: boolean; message: string }>(
    `/leave-requests/${uuid}`,
    { method: "DELETE" }
  )
}
