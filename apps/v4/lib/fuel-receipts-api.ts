/**
 * Fuel Receipt Images API — /int/v1/fuel-expense-receipt-images
 */
import { ontrackFetch, buildQueryString, getToken } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FuelReceiptExtractedData {
  supplier_name?: string
  date?: string
  time?: string
  total_amount?: string
  currency?: string
  volume?: string
  volume_measurement?: string
  product_type?: string
  network_name?: string
  vehicle_vrn?: string
  vr_id?: string
  match_status?: number
}

export interface FuelReceiptImage {
  uuid: string
  company_uuid?: string
  driver_uuid?: string
  driver_name?: string
  reference_id?: number
  file_path?: string
  file_uuid?: string
  is_duplicate?: boolean
  geofence_status?: string | null
  captured_at?: string
  status: "pending" | "processed" | "failed" | "duplicate"
  sync_status?: string | null
  latitude?: number | string
  longitude?: number | string
  location_name?: string
  extracted_data?: FuelReceiptExtractedData
  product?: string
  amount?: string
  product_volume?: string
  driver?: { uuid: string; name: string }
  file?: { uuid: string; url: string }
  created_at: string
  updated_at: string
}

export interface FuelReceiptListResponse {
  fuel_receipt_images: FuelReceiptImage[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface ZipImportResult {
  success: boolean
  partial_success?: boolean
  already_imported?: boolean
  message?: string
  inserted_count?: number
  total_processed?: number
  errors?: [string, string, string][]
  processed_files?: { filename: string; processed: number; created: number }[]
  status?: string
}

export interface ProcessReceiptsResult {
  status: string
  message: string
  data?: {
    processed: number
    created: number
    skipped: number
    total_errors?: number
    errors?: [string, string][]
  }
}

// ─── List / Filter ────────────────────────────────────────────────────────────

export async function listFuelReceipts(params: {
  page?: number
  limit?: number
  sort?: string
  query?: string
  driver_uuid?: string
  status?: string
  sync_status?: string
  start_date?: string
  end_date?: string
  deleted?: 0 | 1
} = {}): Promise<FuelReceiptListResponse> {
  const merged = { page: 1, limit: 50, sort: "-created_at", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<FuelReceiptListResponse>(`/fuel-expense-receipt-images${qs}`)
}

// ─── Single Record ────────────────────────────────────────────────────────────

export async function getFuelReceipt(id: string): Promise<{ fuel_receipt_image: FuelReceiptImage }> {
  return ontrackFetch<{ fuel_receipt_image: FuelReceiptImage }>(`/fuel-expense-receipt-images/${id}`)
}

// ─── Upload ZIP ───────────────────────────────────────────────────────────────

export async function uploadFuelReceiptZip(file: File): Promise<{ uuid: string; original_filename: string }> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("type", "fuel_report_import")
  const token = getToken()
  const res = await fetch("https://ontrack-api.agilecyber.com/int/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })
  if (!res.ok) throw new Error("File upload failed")
  return res.json()
}

// ─── Import ZIP ───────────────────────────────────────────────────────────────

export async function importFuelReceiptZip(
  fileUuids: string[],
  parentUuid?: string
): Promise<ZipImportResult> {
  return ontrackFetch<ZipImportResult>("/fuel-zip-import/import", {
    method: "POST",
    body: JSON.stringify({
      files: fileUuids,
      ...(parentUuid ? { uuid: parentUuid } : {}),
    }),
  })
}

// ─── Process Receipts ─────────────────────────────────────────────────────────

export async function processFuelReceipts(params: {
  driver_uuid?: string
  date_from?: string
  date_to?: string
  limit?: number
} = {}): Promise<ProcessReceiptsResult> {
  const token = getToken()
  const res = await fetch(
    "https://ontrack-api.agilecyber.com/api/v1/expense-reports/process-fuel-receipt-images",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(body?.message ?? "Process failed")
  }
  return res.json()
}

// ─── Static Values ────────────────────────────────────────────────────────────

export const RECEIPT_STATUSES = [
  { value: "pending",   label: "Pending"   },
  { value: "processed", label: "Processed" },
  { value: "failed",    label: "Failed"    },
  { value: "duplicate", label: "Duplicate" },
]
