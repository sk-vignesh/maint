/**
 * Fuel Expenses API — /int/v1/fuel-expenses
 */
import { ontrackFetch, buildQueryString } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FuelExpense {
  uuid: string
  public_id: string
  report_type: string
  status: "pending" | "approved" | "rejected"
  report?: string
  odometer?: string
  amount: number
  amount_incl_tax?: number
  converted_amount?: number | null
  converted_currency?: string | null
  currency: string
  volume?: string
  metric_unit?: string
  payment_method: "Card" | "Other"
  card_type?: string
  vr_id?: string
  trip_id?: string
  crossing_date?: string
  direction?: string | null
  location?: { type: string; coordinates: [number, number] } | null
  reporter_name?: string
  driver_name?: string
  vehicle_name?: string
  reporter?: { uuid: string; name: string }
  driver?: { uuid: string; name: string }
  vehicle?: { uuid: string; plate_number: string }
  driver_uuid?: string
  vehicle_uuid?: string
  reported_by_uuid?: string
  seen_status_of_amazon?: "new" | "unseen" | "seen"
  receipt_id?: number | null
  files?: unknown[]
  fuel_json?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface FuelExpenseMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface FuelExpenseListResponse {
  fuel_expenses: FuelExpense[]
  meta: FuelExpenseMeta
}

export interface FuelExpenseSingleResponse {
  fuel_expense: FuelExpense
}

export type CreateFuelExpensePayload = {
  report_type?: string
  driver_uuid: string
  vehicle_uuid: string
  reported_by_uuid: string
  status: "pending" | "approved" | "rejected"
  amount: number
  currency: string
  payment_method: "Card" | "Other"
  card_type?: string
  amount_incl_tax?: number
  converted_amount?: number
  converted_currency?: string
  volume?: string
  metric_unit?: string
  odometer?: string
  report?: string
  vr_id?: string
  trip_id?: string
  crossing_date?: string
  location?: { type: string; coordinates: [number, number] }
}

export type UpdateFuelExpensePayload = Partial<CreateFuelExpensePayload>

export interface ImportResult {
  success: boolean
  partial_success?: boolean
  message: string
  inserted_count?: number
  updated_count?: number
  skipped_count?: number
  total_processed?: number
  created_fuel_expense?: number
  updated_fuel_expense?: number
  total_errors?: number
  errors?: [string, string, string][]
  error_log_url?: string
  status?: string
}

export interface ImportLog {
  file_uuid: string
  original_filename: string
  file_url?: string
  file_uploaded_at: string
  uploader_name?: string
  import_log_uuid: string
  status: "COMPLETED" | "PARTIALLY_COMPLETED" | "ERROR"
  error_log_url?: string | null
  imported_at: string
  total_records: number
  success_records: number
  failed_records: number
  skipped_records: number
}

export interface ImportLogsResponse {
  status: string
  data: ImportLog[]
  pagination: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from: number
    to: number
  }
}

// ─── List / Search / Filter ───────────────────────────────────────────────────

export async function listFuelExpenses(params: {
  page?: number
  limit?: number
  sort?: string
  query?: string
  vehicle?: string
  driver?: string
  status?: string
  payment_method?: string
  from_date?: string
  to_date?: string
  crossing_date?: string
  public_id?: string
  vr_id?: string
} = {}): Promise<FuelExpenseListResponse> {
  const merged = { page: 1, limit: 15, sort: "-created_at", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<FuelExpenseListResponse>(`/fuel-expenses${qs}`)
}

// ─── Single Record ────────────────────────────────────────────────────────────

export async function getFuelExpense(id: string): Promise<FuelExpenseSingleResponse> {
  return ontrackFetch<FuelExpenseSingleResponse>(`/fuel-expenses/${id}`)
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createFuelExpense(payload: CreateFuelExpensePayload): Promise<FuelExpenseSingleResponse> {
  return ontrackFetch<FuelExpenseSingleResponse>("/fuel-expenses", {
    method: "POST",
    body: JSON.stringify({ fuel_expense: { report_type: "Fuel", ...payload } }),
  })
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateFuelExpense(id: string, payload: UpdateFuelExpensePayload): Promise<FuelExpenseSingleResponse> {
  return ontrackFetch<FuelExpenseSingleResponse>(`/fuel-expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify({ fuel_expense: payload }),
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFuelExpense(id: string): Promise<unknown> {
  return ontrackFetch<unknown>(`/fuel-expenses/${id}`, { method: "DELETE" })
}

export async function bulkDeleteFuelExpenses(ids: string[]): Promise<{ status: string; message: string }> {
  return ontrackFetch<{ status: string; message: string }>("/fuel-expenses/bulk-delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  })
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportFuelExpenses(params: {
  format?: "xlsx" | "csv"
  selections?: string[]
  from_date?: string
  to_date?: string
} = {}): Promise<void> {
  const { format = "xlsx", selections = [], from_date, to_date } = params
  const qs = buildQueryString({
    format,
    from_date: from_date ?? null,
    to_date: to_date ?? null,
  } as Record<string, string | number | boolean | undefined | null>)
  const url = `https://ontrack-api.agilecyber.com/int/v1/fuel-expenses/export${qs}`
  const token = (await import("./ontrack-api")).getToken()
  const res = await fetch(url, {
    method: selections.length > 0 ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(selections.length > 0 ? { "Content-Type": "application/json" } : {}),
    },
    ...(selections.length > 0 ? { body: JSON.stringify({ selections, format, from_date, to_date }) } : {}),
  })
  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`)
  const blob = await res.blob()
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `Fuel_Usage_Tracker_${Date.now()}.${format}`
  a.click()
}

// ─── Upload File ──────────────────────────────────────────────────────────────

export async function uploadFuelFile(file: File): Promise<{ uuid: string; original_filename: string; url: string }> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("type", "fuel-import")
  const token = (await import("./ontrack-api")).getToken()
  const res = await fetch("https://ontrack-api.agilecyber.com/int/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  if (!res.ok) throw new Error("File upload failed")
  return res.json()
}

// ─── Import Excel/CSV ─────────────────────────────────────────────────────────

export async function importFuelExcel(fileUuids: string[]): Promise<ImportResult> {
  return ontrackFetch<ImportResult>("/fuel-excel-import/import", {
    method: "POST",
    body: JSON.stringify({ files: fileUuids }),
  })
}

// ─── Import Logs ──────────────────────────────────────────────────────────────

export async function getFuelImportLogs(perPage = 15): Promise<ImportLogsResponse> {
  // Note: different base path — uses /api/v1 not /int/v1
  const token = (await import("./ontrack-api")).getToken()
  const res = await fetch(
    `https://ontrack-api.agilecyber.com/api/v1/expense-reports/fuel-import-logs?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error("Failed to fetch import logs")
  return res.json()
}

// ─── Static Dropdown Values ───────────────────────────────────────────────────

export const FUEL_PAYMENT_METHODS = [
  { value: "Card", label: "Card" },
  { value: "Other", label: "Other" },
]

export const FUEL_STATUSES = [
  { value: "pending",  label: "Pending"  },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export const FUEL_METRIC_UNITS = [
  { value: "L",   label: "Liter (L)"        },
  { value: "gal", label: "Gallon (gal)"      },
  { value: "mL",  label: "Milliliter (mL)"   },
  { value: "cL",  label: "Centiliter (cL)"   },
  { value: "dL",  label: "Deciliter (dL)"    },
  { value: "kg",  label: "Kilogram (kg)"     },
  { value: "pt",  label: "Pint (pt)"         },
  { value: "qt",  label: "Quart (qt)"        },
]
