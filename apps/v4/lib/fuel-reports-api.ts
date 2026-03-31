/**
 * Fuel Reports API — /int/v1/fuel-reports
 * Shared endpoint for Toll Expenses and Parking Reports.
 * Differentiated by `report_type` field: "Toll" | "Parking"
 */
import { ontrackFetch, buildQueryString, getToken } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FuelReportType = "Toll" | "Parking"

export interface TollReport {
  uuid: string
  public_id: string
  report_type: "Toll"
  vr_id?: string
  trip_id?: string
  crossing_date?: string
  direction?: string
  amount?: number
  amount_incl_tax?: number
  currency?: string
  match_status?: string
  seen_status_of_amazon?: "new" | "unseen" | "seen"
  status?: "pending" | "approved" | "rejected"
  payment_method?: string
  toll_json?: Record<string, unknown>
  vehicle?: { uuid: string; plate_number: string; name?: string }
  driver?: { uuid: string; name: string }
  reporter?: { uuid: string; name: string }
  vehicle_uuid?: string
  driver_uuid?: string
  created_at: string
  updated_at: string
}

export interface ParkingReport {
  uuid: string
  public_id: string
  report_type: "Parking"
  status: "pending" | "approved" | "rejected"
  amount: number
  currency: string
  payment_method?: string
  card_type?: string
  odometer?: string
  report?: string
  location?: { type: string; coordinates: [number, number] } | null
  driver?: { uuid: string; name: string }
  vehicle?: { uuid: string; plate_number: string }
  reporter?: { uuid: string; name: string }
  driver_uuid?: string
  vehicle_uuid?: string
  reported_by_uuid?: string
  files?: unknown[]
  created_at: string
  updated_at: string
}

export interface FuelReportMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface TollReportListResponse {
  toll_reports: TollReport[]
  meta: FuelReportMeta
}

export interface FuelReportListResponse {
  fuel_reports: ParkingReport[]
  meta: FuelReportMeta
}

export type CreateTollPayload = {
  vr_id?: string
  trip_id?: string
  crossing_date?: string
  direction?: string
  amount?: number
  amount_incl_tax?: number
  currency?: string
  vehicle_uuid?: string
  driver_uuid?: string
  status?: string
  toll_json?: Record<string, unknown>
}

export type CreateParkingPayload = {
  report_type: "Parking"
  driver_uuid: string
  vehicle_uuid: string
  reported_by_uuid: string
  status: "pending" | "approved" | "rejected"
  amount: number
  currency: string
  payment_method: "Card" | "Other"
  card_type?: string
  odometer?: string
  report?: string
  location?: { type: string; coordinates: [number, number] }
}

export interface TollImportResult {
  success: boolean
  partial_success?: boolean
  message: string
  inserted_count?: number
  updated_count?: number
  skipped_count?: number
  total_processed?: number
  created_toll_report?: number
  updated_toll_report?: number
  total_errors?: number
  errors?: [string, string, string][]
  error_log_url?: string
  status?: string
}

// ─── Toll Reports ─────────────────────────────────────────────────────────────

export async function listTollReports(params: {
  page?: number
  limit?: number
  sort?: string
  query?: string
  vehicle?: string
  driver?: string
  start_date?: string
  end_date?: string
  seen_status_of_amazon?: string
  vr_id?: string
} = {}): Promise<TollReportListResponse> {
  const merged = { page: 1, limit: 15, sort: "-created_at", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<TollReportListResponse>(`/fuel-reports${qs}`)
}

export async function getTollReport(id: string): Promise<{ toll_report: TollReport }> {
  return ontrackFetch<{ toll_report: TollReport }>(`/fuel-reports/${id}`)
}

export async function createTollReport(payload: CreateTollPayload): Promise<{ toll_report: TollReport }> {
  return ontrackFetch<{ toll_report: TollReport }>("/fuel-reports", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateTollReport(id: string, payload: Partial<CreateTollPayload>): Promise<{ toll_report: TollReport }> {
  return ontrackFetch<{ toll_report: TollReport }>(`/fuel-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteTollReport(id: string): Promise<unknown> {
  return ontrackFetch<unknown>(`/fuel-reports/${id}`, { method: "DELETE" })
}

// ─── Parking Reports ──────────────────────────────────────────────────────────

export async function listParkingReports(params: {
  page?: number
  limit?: number
  sort?: string
  query?: string
  vehicle?: string
  driver?: string
  status?: string
  start_date?: string
  end_date?: string
} = {}): Promise<FuelReportListResponse> {
  const merged = { page: 1, limit: 15, sort: "-created_at", report_type: "parking", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<FuelReportListResponse>(`/fuel-reports${qs}`)
}

export async function getParkingReport(id: string): Promise<{ fuel_report: ParkingReport }> {
  return ontrackFetch<{ fuel_report: ParkingReport }>(`/fuel-reports/${id}`)
}

export async function createParkingReport(payload: CreateParkingPayload): Promise<{ fuel_report: ParkingReport }> {
  return ontrackFetch<{ fuel_report: ParkingReport }>("/fuel-reports", {
    method: "POST",
    body: JSON.stringify({ fuel_report: payload }),
  })
}

export async function updateParkingReport(id: string, payload: Partial<CreateParkingPayload>): Promise<{ fuel_report: ParkingReport }> {
  return ontrackFetch<{ fuel_report: ParkingReport }>(`/fuel-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify({ fuel_report: payload }),
  })
}

export async function deleteParkingReport(id: string): Promise<unknown> {
  return ontrackFetch<unknown>(`/fuel-reports/${id}`, { method: "DELETE" })
}

// ─── Bulk Delete (shared) ─────────────────────────────────────────────────────

export async function bulkDeleteFuelReports(ids: string[]): Promise<{ status: string; message: string }> {
  return ontrackFetch<{ status: string; message: string }>("/fuel-reports/bulk-delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  })
}

// ─── Import Toll ──────────────────────────────────────────────────────────────

export async function uploadReportFile(file: File, type = "fuel_report_import"): Promise<{ uuid: string; original_filename: string }> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("type", type)
  const token = getToken()
  const res = await fetch("https://ontrack-api.agilecyber.com/int/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  if (!res.ok) throw new Error("File upload failed")
  return res.json()
}

export async function importTollReports(fileUuids: string[]): Promise<TollImportResult> {
  return ontrackFetch<TollImportResult>("/fuel-reports/import", {
    method: "POST",
    body: JSON.stringify({ files: fileUuids }),
  })
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportFuelReports(params: {
  report_type: "toll" | "parking"
  format?: "xlsx" | "csv"
  selections?: string[]
  from_date?: string
  to_date?: string
  filter_by?: string
} ): Promise<void> {
  const { report_type, format = "xlsx", from_date, to_date, filter_by } = params
  const qs = buildQueryString({
    format,
    report_type,
    from_date: from_date ?? null,
    to_date: to_date ?? null,
    filter_by: filter_by ?? null,
  } as Record<string, string | number | boolean | undefined | null>)
  const token = getToken()
  const res = await fetch(
    `https://ontrack-api.agilecyber.com/int/v1/fuel-reports/export${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)
  const blob = await res.blob()
  const ext = format === "csv" ? "csv" : "xlsx"
  const prefix = report_type === "toll" ? "Toll" : "Parking"
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `${prefix}_Usage_Tracker_${Date.now()}.${ext}`
  a.click()
}

// ─── Send to Amazon ───────────────────────────────────────────────────────────

export async function sendToAmazon(params: {
  from_date?: string
  to_date?: string
  filter_param?: "ready_to_sent" | "unseen" | "all"
}): Promise<{ status: string; message: string; download_url?: string }> {
  const token = getToken()
  const res = await fetch("https://ontrack-api.agilecyber.com/api/v1/report-email/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ report_type: "toll-report", ...params }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body?.error ?? body?.message ?? "Send to Amazon failed")
  }
  return res.json()
}

// ─── Static Dropdown Values ───────────────────────────────────────────────────

export const TOLL_DIRECTIONS = [
  { value: "North Bound", label: "North Bound" },
  { value: "South Bound", label: "South Bound" },
  { value: "East Bound",  label: "East Bound"  },
  { value: "West Bound",  label: "West Bound"  },
]

export const REPORT_STATUSES = [
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export const AMAZON_STATUSES = [
  { value: "new",    label: "Awaiting Send" },
  { value: "unseen", label: "Unread"         },
  { value: "seen",   label: "Sent"           },
]

export const PARKING_PAYMENT_METHODS = [
  { value: "Card",  label: "Card"  },
  { value: "Other", label: "Other" },
]
