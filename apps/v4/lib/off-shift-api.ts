/**
 * Off-Shift (Recurring Leave Plans) API — /api/v1/driver-recurring-leave-plans
 *
 * NOTE: Uses /api/v1/ base (not /int/v1/) but the same Bearer token.
 *
 * Creating or editing a plan automatically generates / regenerates leave records
 * for the driver's off-days. Deleting a plan cascades to all spawned leave records.
 */

import { getToken } from "./ontrack-api"

// ─── Config ───────────────────────────────────────────────────────────────────

const OFF_SHIFT_BASE = "https://ontrack-api.agilecyber.com/api/v1/driver-recurring-leave-plans"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OffShiftDriver {
  uuid:                    string
  public_id:               string
  drivers_license_number?: string
  status:                  string
}

export interface OffShiftPlan {
  id?:                  number
  uuid:                 string
  public_id:            string
  driver_uuid:          string
  /** Number of consecutive working days (1–5) */
  work_days:            number
  /** Number of consecutive rest/off days (1–5) */
  off_days:             number
  /** First date of the first off-period */
  first_leave_day:      string   // "YYYY-MM-DD"
  /** Plan end date — leaves are generated up to this date */
  plan_calendar_upto:   string   // "YYYY-MM-DD"
  record_status?:       number
  driver?:              OffShiftDriver
}

export interface OffShiftLeaveGeneration {
  success:        boolean
  created_count:  number
  skipped_count:  number
  created_leaves?: unknown[]
  skipped_leaves?: unknown[]
}

export interface OffShiftCreateResponse {
  success:         boolean
  message:         string
  data:            OffShiftPlan
  leave_generation: OffShiftLeaveGeneration
}

export interface OffShiftListResponse {
  success:    boolean
  data:       OffShiftPlan[]
  pagination: {
    current_page: number
    per_page:     number
    total:        number
  }
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function offShiftFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${OFF_SHIFT_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? body?.error ?? `Off-Shift API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** List all recurring leave plans */
export async function listOffShifts(params: {
  page?:     number
  per_page?: number
  sort?:     string
  query?:    string
  driver?:   string
} = {}): Promise<OffShiftListResponse> {
  const qs = Object.entries({ per_page: 500, sort: "-created_at", ...params })
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&")
  return offShiftFetch<OffShiftListResponse>(`/list${qs ? `?${qs}` : ""}`)
}

/**
 * Create a new recurring leave plan and auto-generate leave records.
 * The response includes `leave_generation` with created/skipped counts.
 */
export async function createOffShift(data: {
  driver_uuid:         string
  work_days:           number   // 1–5
  off_days:            number   // 1–5
  first_leave_day:     string   // "YYYY-MM-DD"
  plan_calendar_upto:  string   // "YYYY-MM-DD"
}): Promise<OffShiftCreateResponse> {
  return offShiftFetch<OffShiftCreateResponse>("/generate-leaves", {
    method: "POST",
    body:   JSON.stringify(data),
  })
}

/** Fetch a single recurring leave plan */
export async function getOffShift(id: string): Promise<OffShiftPlan> {
  const res = await offShiftFetch<{ success: boolean; data: OffShiftPlan }>(`/${id}`)
  return res.data
}

/**
 * Update a recurring leave plan.
 * If work/off days, driver, or date range changes — the server automatically
 * deletes all pre-existing leaves and regenerates the schedule.
 */
export async function updateOffShift(
  id: string,
  patch: Partial<{
    driver_uuid:         string
    work_days:           number
    off_days:            number
    first_leave_day:     string
    plan_calendar_upto:  string
  }>
): Promise<OffShiftCreateResponse> {
  return offShiftFetch<OffShiftCreateResponse>(`/${id}`, {
    method: "PUT",
    body:   JSON.stringify(patch),
  })
}

/**
 * Delete a recurring leave plan.
 * Cascades: all auto-generated leave records spawned by this plan are also deleted.
 */
export async function deleteOffShift(id: string): Promise<{ success: boolean; message: string }> {
  return offShiftFetch<{ success: boolean; message: string }>(`/${id}`, {
    method: "DELETE",
  })
}
