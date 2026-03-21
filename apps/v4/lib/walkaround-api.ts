/**
 * OnTrack Walkaround API — Typed Client + UI ↔ API Transformers
 *
 * Templates: /int/v1/walkaround-templates
 * Checks:    /int/v1/walkaround-checks
 *
 * This module owns:
 *  1. API response/request types (matching the OnTrack schema exactly)
 *  2. Typed endpoint functions for all 13 walkaround endpoints
 *  3. Transformer functions that map between API shapes and the richer UI shapes
 *     used in walkaround-templates-tab.tsx and the compliance page
 */

import { ontrackFetch, buildQueryString, type PaginationMeta } from "./ontrack-api"
import type {
  WalkaroundTemplate as UITemplate,
  CheckSection as UISection,
  CheckItem as UIItem,
  QuestionType,
  PhotoRequirement,
  DefectSeverity,
} from "../app/(dashboard)/compliance/walkaround-templates-tab"

// ═══════════════════════════════════════════════════════════════════════════════
// API TYPES — exact shape from the OnTrack backend
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Templates ──────────────────────────────────────────────────────────────

export interface ApiVehicle {
  uuid: string
  id: string
  name: string
  plate_number: string
}

export interface ApiCategory {
  id: string
  uuid: string
  name: string
  photo_required_on_fail: boolean
  anticheat_eligible: boolean
  sort_order: number
}

export interface ApiTemplateItem {
  id: string
  uuid: string
  item_name: string
  sort_order: number
  categories: ApiCategory[]
}

export interface ApiTemplate {
  id: string
  uuid: string
  name: string
  description: string | null
  declaration: string | null
  is_default: boolean
  is_master: boolean
  sections: number
  questions: number
  vehicles: ApiVehicle[]
  items: ApiTemplateItem[]
  created_at: string
  updated_at: string
}

export interface ApiTemplateListResponse {
  walkaroundTemplates: ApiTemplate[]
  meta: PaginationMeta
}

export interface ApiTemplateDetailResponse {
  walkaroundTemplate: ApiTemplate
}

export interface ApiTemplateCreateResponse {
  success: boolean
  message: string
  walkaroundTemplate: ApiTemplate
}

export interface ApiTemplateUpdateResponse {
  success: boolean
  message: string
  walkaroundTemplate: ApiTemplate
}

export interface ApiTemplateDeleteResponse {
  success: boolean
  message: string
}

// ─── Template Create/Update request ─────────────────────────────────────────

export interface ApiCreateTemplateRequest {
  name: string
  description?: string
  declaration?: string
  is_default?: boolean
  vehicle_ids?: string[]
  items: {
    name: string
    categories: {
      name: string
      photo_required_on_fail?: boolean
      anticheat_eligible?: boolean
    }[]
  }[]
}

export interface ApiUpdateTemplateRequest {
  name?: string
  description?: string
  declaration?: string
  is_default?: boolean
  vehicle_ids?: string[]
  items?: {
    uuid?: string
    name: string
    sort_order?: number
    categories: {
      uuid?: string
      name: string
      sort_order?: number
      photo_required_on_fail?: boolean
      anticheat_eligible?: boolean
    }[]
  }[]
}

// ─── Assign Vehicles ────────────────────────────────────────────────────────

export interface ApiAssignVehiclesResponse {
  success: boolean
  assigned: { vehicle: string; assigned_to: string; message: string }[]
  reassigned: { vehicle: string; unassigned_from: string; assigned_to: string; message: string }[]
  walkaroundTemplate: ApiTemplate
}

// ─── Anti-cheat ─────────────────────────────────────────────────────────────

export interface ApiAnticheatResponse {
  anticheat_category: {
    uuid: string
    id: string
    name: string
    date: string
  } | null
}

// ─── Checks ─────────────────────────────────────────────────────────────────

export interface ApiCheckVehicle {
  uuid: string
  plate_number: string
  name: string
}

export interface ApiCheckDriver {
  uuid: string
  name: string
}

export interface ApiDefect {
  item_name: string
  category: string
  defect_type: "Advisory" | "Dangerous"
  notes: string
  photo_uuid: string | null
  photo_url: string | null
}

export interface ApiCheckCategoryResponse {
  id: string
  uuid: string
  name: string
  photo_required_on_fail: boolean
  anticheat_eligible: boolean
  is_anticheat_category: boolean
  response: "OK" | "Advisory" | "Fail"
  defect_type: "Advisory" | "Dangerous" | null
  notes: string | null
  photo_uuid: string | null
  photo_url: string | null
  record_status: number
}

export interface ApiCheckItem {
  id: string
  uuid: string
  item_name: string
  sort_order: number
  categories: ApiCheckCategoryResponse[]
}

export interface ApiCheck {
  id: string
  uuid: string
  vehicle: ApiCheckVehicle
  driver: ApiCheckDriver
  template_name: string
  template_declaration: string | null
  checked_at: string
  location: string | null
  duration_in_seconds: number
  signature: string
  status: "pass" | "advisory" | "fail"
  anticheat_category_uuid: string | null
  anticheat_photo_uuid: string | null
  anticheat_photo_url: string | null
  total_responses: number
  ok_count: number
  advisory_count: number
  fail_count: number
  defects: ApiDefect[]
  items: ApiCheckItem[]
  report_pdf_path: string | null
  report_pdf_url: string | null
  created_at: string
  updated_at: string
}

export interface ApiCheckSummary {
  checks_completed_today: number
  vehicles_pending_today: number
  defects_reported_today: number
  advisory_reported_today: number
  avg_check_time_seconds: number
  avg_check_time_formatted: string
}

export interface ApiCheckListResponse {
  walkaroundChecks: ApiCheck[]
  meta: PaginationMeta
  summary: ApiCheckSummary
}

export interface ApiCheckDetailResponse {
  walkaroundCheck: ApiCheck
}

// ─── Submit Check request ───────────────────────────────────────────────────

export interface ApiSubmitCheckRequest {
  template_id: string
  vehicle_id: string
  driver_id: string
  checked_at?: string
  location?: string
  duration_in_seconds: number
  signature: string
  anticheat_photo_uuid?: string | null
  responses: {
    category_id: string
    response: "OK" | "Advisory" | "Fail"
    notes?: string | null
    photo_uuid: string
    defect_type?: "Advisory" | "Dangerous" | null
  }[]
}

export interface ApiCheckDeleteResponse {
  success: boolean
  message: string
}

// ─── Vehicle Map ────────────────────────────────────────────────────────────

export interface ApiVehicleMapEntry {
  vehicle: ApiVehicle
  template: {
    uuid: string
    name: string
    questions: number
  } | null
  questions: number
  is_default_template: boolean
}

export interface ApiVehicleMapResponse {
  vehicleTemplateMap: ApiVehicleMapEntry[]
  meta: PaginationMeta
  summary: {
    checks_completed_today: number
    vehicles_pending_today: number
    defects_reported_today: number
    advisory_reported_today: number
    avg_check_time_seconds: number
    avg_check_time_minutes: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Templates ──────────────────────────────────────────────────────────────

export function listTemplates(params?: {
  limit?: number
  is_default?: boolean
  vehicle_uuid?: string
  driver_uuid?: string
  trip_id?: string
}) {
  const qs = buildQueryString(params ?? {})
  return ontrackFetch<ApiTemplateListResponse>(`/walkaround-templates${qs}`)
}

export function getTemplate(id: string) {
  return ontrackFetch<ApiTemplateDetailResponse>(`/walkaround-templates/${id}`)
}

export function createTemplate(data: ApiCreateTemplateRequest) {
  return ontrackFetch<ApiTemplateCreateResponse>("/walkaround-templates", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateTemplate(id: string, data: ApiUpdateTemplateRequest) {
  return ontrackFetch<ApiTemplateUpdateResponse>(`/walkaround-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export function deleteTemplate(id: string) {
  return ontrackFetch<ApiTemplateDeleteResponse>(`/walkaround-templates/${id}`, {
    method: "DELETE",
  })
}

export function assignVehicles(id: string, vehicleIds: string[]) {
  return ontrackFetch<ApiAssignVehiclesResponse>(
    `/walkaround-templates/${id}/assign-vehicles`,
    { method: "POST", body: JSON.stringify({ vehicle_ids: vehicleIds }) }
  )
}

export function getAnticheatCategory(id: string) {
  return ontrackFetch<ApiAnticheatResponse>(
    `/walkaround-templates/${id}/anticheat-category`
  )
}

export function deleteTemplateItem(templateId: string, itemId: string) {
  return ontrackFetch<{ success: boolean; message: string }>(
    `/walkaround-templates/${templateId}/items/${itemId}`,
    { method: "DELETE" }
  )
}

export function getVehicleMap(params?: { limit?: number; page?: number }) {
  const qs = buildQueryString(params ?? {})
  return ontrackFetch<ApiVehicleMapResponse>(
    `/walkaround-templates/vehicle-map${qs}`
  )
}

// ─── Checks ─────────────────────────────────────────────────────────────────

export function listChecks(params?: {
  limit?: number
  page?: number
  status?: "pass" | "advisory" | "fail"
  driver_uuid?: string
  vehicle_uuid?: string
  user_uuid?: string
  date?: string
}) {
  const qs = buildQueryString(params ?? {})
  return ontrackFetch<ApiCheckListResponse>(`/walkaround-checks${qs}`)
}

export function getCheck(id: string) {
  return ontrackFetch<ApiCheckDetailResponse>(`/walkaround-checks/${id}`)
}

export function submitCheck(data: ApiSubmitCheckRequest) {
  return ontrackFetch<{ walkaroundCheck: ApiCheck }>("/walkaround-checks", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function deleteCheck(id: string) {
  return ontrackFetch<ApiCheckDeleteResponse>(`/walkaround-checks/${id}`, {
    method: "DELETE",
  })
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export interface ApiDriver {
  id: number
  uuid: string
  name: string
  email: string
  phone: string | null
  photo_url: string | null
  avatar_url: string | null
  status: string
  internal_id: string | null
  vehicle_name: string | null
  company_uuid: string | null
}

export interface ApiDriverListResponse {
  drivers: ApiDriver[]
  meta?: PaginationMeta
}

/** List all drivers — NOTE: this API returns drivers across all companies.
 *  Callers must filter by company_uuid after fetching. Use getCompanyUuid() from ontrack-api. */
export function listDrivers(params?: { limit?: number; page?: number }) {
  const qs = buildQueryString(params ?? {})
  return ontrackFetch<ApiDriverListResponse>(`/drivers${qs}`)
}

/** Get a single driver by UUID — includes company_uuid for filtering */
export function getDriver(uuid: string) {
  return ontrackFetch<{ driver: ApiDriver }>(`/drivers/${uuid}`)
}

// ─── Vehicles (company-scoped via vehicle-map) ────────────────────────────────
//
// /vehicles returns ALL vehicles across all companies — not scoped.
// /walkaround-templates/vehicle-map IS company-scoped so we use that instead.

export interface ApiFleetVehicle {
  id: number
  uuid: string
  name: string
  plate_number: string
  make: string
  model: string
  year: string | null
  status: string
  photo_url: string | null
}

export interface ApiFleetVehicleListResponse {
  vehicles: ApiFleetVehicle[]
  meta?: PaginationMeta
}

/** Fetch company-scoped vehicles via the walkaround vehicle-map endpoint */
export function listVehicles(params?: { limit?: number; page?: number }) {
  const qs = buildQueryString(params ?? {})
  return ontrackFetch<{ vehicles: ApiFleetVehicle[]; meta?: PaginationMeta }>(
    `/walkaround-templates/vehicle-map${qs}`
  ).then(res => ({
    vehicles: (res.vehicles ?? []).map(v => ({
      id: (v as { id?: number }).id ?? 0,
      uuid: v.uuid,
      name: v.name ?? v.plate_number ?? "",
      plate_number: v.plate_number ?? v.name ?? "",
      make: v.make ?? "",
      model: v.model ?? "",
      year: v.year ?? null,
      status: v.status ?? "",
      photo_url: v.photo_url ?? null,
    } as ApiFleetVehicle)),
    meta: res.meta,
  }))
}



// ═══════════════════════════════════════════════════════════════════════════════
// TRANSFORMERS — API ↔ UI shape mapping
// ═══════════════════════════════════════════════════════════════════════════════

let _idCounter = 0
function mkId(): string {
  return `local_${Date.now()}_${++_idCounter}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Convert an API template (items → categories) to the rich UI format
 * (sections → items with question types, hints, conditional logic).
 *
 * Since the API doesn't store question type, hints, conditional logic etc.,
 * we default them to the standard OK/Advisory/Fail type.
 */
export function apiTemplateToUI(api: ApiTemplate): UITemplate {
  const sections: UISection[] = (api.items ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.uuid || item.id,
      name: item.item_name,
      items: (item.categories ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cat): UIItem => ({
          id: cat.uuid || cat.id,
          text: cat.name,
          hint: "",
          type: "ok_advisory_fail" as QuestionType,
          required: true,
          photoRequirement: cat.photo_required_on_fail
            ? ("required_on_fail" as PhotoRequirement)
            : ("none" as PhotoRequirement),
          failValues: ["fail"],
          defectSeverity: "advisory" as DefectSeverity,
        })),
    }))

  return {
    id: api.uuid || api.id,
    name: api.name,
    description: api.description ?? "",
    sections,
    assignedVehicles: (api.vehicles ?? []).map((v) => v.plate_number),
    isDefault: api.is_default,
    createdAt: api.created_at?.slice(0, 10) ?? "",
    updatedAt: api.updated_at?.slice(0, 10) ?? "",
  }
}

/**
 * Convert a UI template to the API create request format.
 * Rich fields not supported by the API (hint, type, conditional, etc.)
 * are silently dropped.
 */
export function uiTemplateToCreateRequest(
  ui: UITemplate,
  vehicleIds?: string[]
): ApiCreateTemplateRequest {
  return {
    name: ui.name,
    description: ui.description || undefined,
    is_default: ui.isDefault || undefined,
    vehicle_ids: vehicleIds,
    items: ui.sections.map((sec) => ({
      name: sec.name,
      categories: sec.items.map((item) => ({
        name: item.text,
        photo_required_on_fail:
          item.photoRequirement === "required_on_fail" ||
          item.photoRequirement === "required",
        anticheat_eligible: false,
      })),
    })),
  }
}

/**
 * Convert a UI template to the API update request format.
 * Includes UUIDs for existing items/categories so the backend
 * can upsert correctly.
 */
export function uiTemplateToUpdateRequest(
  ui: UITemplate,
  vehicleIds?: string[]
): ApiUpdateTemplateRequest {
  return {
    name: ui.name,
    description: ui.description || undefined,
    is_default: ui.isDefault || undefined,
    vehicle_ids: vehicleIds,
    items: ui.sections.map((sec, secIdx) => ({
      uuid: sec.id.startsWith("local_") ? undefined : sec.id,
      name: sec.name,
      sort_order: secIdx,
      categories: sec.items.map((item, itemIdx) => ({
        uuid: item.id.startsWith("local_") ? undefined : item.id,
        name: item.text,
        sort_order: itemIdx,
        photo_required_on_fail:
          item.photoRequirement === "required_on_fail" ||
          item.photoRequirement === "required",
        anticheat_eligible: false,
      })),
    })),
  }
}

// ─── Check transformers ─────────────────────────────────────────────────────

export interface UICheckSummary {
  id: string
  uuid: string
  reg: string
  vehicleName: string
  driverId: string
  driverName: string
  date: string
  time: string
  elapsedSeconds: number
  elapsed: string
  defects: number
  status: "clear" | "defect"
  templateName: string
  okCount: number
  advisoryCount: number
  failCount: number
  totalResponses: number
  reportPdfUrl: string | null
}

export interface UICheckDetail extends UICheckSummary {
  location: string
  signature: string
  declaration: string | null
  anticheatPhotoUrl: string | null
  anticheatCategoryUuid: string | null
  apiDefects: ApiDefect[]
  sections: {
    section: string
    items: {
      name: string
      result: "ok" | "advisory" | "fail"
      note?: string
      photoUrl?: string | null
      defectType?: string | null
    }[]
  }[]
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

export function apiCheckToUISummary(api: ApiCheck): UICheckSummary {
  const checkedAt = new Date(api.checked_at)
  return {
    id: api.id,
    uuid: api.uuid,
    reg: api.vehicle.plate_number,
    vehicleName: api.vehicle.name,
    driverId: api.driver.uuid,
    driverName: api.driver.name,
    date: checkedAt.toISOString().slice(0, 10),
    time: checkedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    elapsedSeconds: api.duration_in_seconds,
    elapsed: formatDuration(api.duration_in_seconds),
    defects: api.fail_count,
    status: api.status === "pass" ? "clear" : "defect",
    templateName: api.template_name,
    okCount: api.ok_count,
    advisoryCount: api.advisory_count,
    failCount: api.fail_count,
    totalResponses: api.total_responses,
    reportPdfUrl: api.report_pdf_url,
  }
}

export function apiCheckToUIDetail(api: ApiCheck): UICheckDetail {
  const summary = apiCheckToUISummary(api)
  const sections = (api.items ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      section: item.item_name,
      items: (item.categories ?? []).map((cat) => ({
        name: cat.name,
        result: (cat.response === "OK" ? "ok" : cat.response === "Advisory" ? "advisory" : "fail") as "ok" | "advisory" | "fail",
        note: cat.notes ?? undefined,
        photoUrl: cat.photo_url,
        defectType: cat.defect_type,
      })),
    }))

  return {
    ...summary,
    location: api.location ?? "",
    signature: api.signature,
    declaration: api.template_declaration,
    anticheatPhotoUrl: api.anticheat_photo_url,
    anticheatCategoryUuid: api.anticheat_category_uuid,
    apiDefects: api.defects,
    sections,
  }
}
