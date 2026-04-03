/**
 * Places API — /int/v1/places
 */
import { ontrackFetch, buildQueryString, getToken } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  type:        "Point"
  coordinates: [number, number]  // [longitude, latitude]
}

export interface Place {
  uuid:         string
  public_id:    string
  name:         string
  code?:        string
  address?:     string
  city?:        string
  state?:       string
  country?:     string
  postal_code?: string
  neighborhood?: string
  phone?:       string
  location?:    GeoPoint | null
  latitude?:    number | null
  longitude?:   number | null
}

export interface PlaceListParams {
  query?:       string
  limit?:       number
  sort?:        string
  page?:        number
  name?:        string
  city?:        string
  country?:     string
  postal_code?: string
}

export interface PlaceListResponse {
  places: Place[]
  meta?:  { total: number; per_page: number; current_page: number; last_page: number }
}

/** Response when bulk delete requires confirmation or has blocked items */
export interface BulkDeletePlacesCheck {
  hasActiveOrders?:      boolean
  requiresConfirmation?: boolean | PlaceRef[]
  cannotDelete?:         PlaceRef[]
  cannotDeleteCount?:    number
  deletablePlaces?:      PlaceRef[]
  deletableCount?:       number
  message:               string
}

/** Response when bulk delete completes (after force: true) */
export interface BulkDeletePlacesDone {
  status:          string
  message:         string
  count:           number
  deletedPlaces:   PlaceRef[]
  skippedPlaces?:  PlaceRef[]
  skippedCount?:   number
}

export interface PlaceRef {
  uuid:      string
  public_id: string
  name:      string
  code?:     string
}

export interface ReverseGeocodeResult {
  name?:        string
  address?:     string
  city?:        string
  state?:       string
  country?:     string
  postal_code?: string
  location?:    GeoPoint
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function listPlaces(params: PlaceListParams = {}): Promise<PlaceListResponse> {
  const merged = { limit: 500, sort: "name", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<PlaceListResponse>(`/places${qs}`)
}

export async function getPlace(uuid: string): Promise<Place> {
  const res = await ontrackFetch<{ place: Place }>(`/places/${uuid}`)
  return res.place
}

export async function createPlace(data: {
  name:          string
  location:      GeoPoint
  code?:         string
  address?:      string
  city?:         string
  state?:        string
  country?:      string
  postal_code?:  string
  neighborhood?: string
  phone?:        string
}): Promise<Place> {
  const res = await ontrackFetch<{ place: Place }>("/places", {
    method: "POST",
    body:   JSON.stringify(data),
  })
  return res.place
}

export async function updatePlace(uuid: string, patch: Partial<Place>): Promise<Place> {
  const res = await ontrackFetch<{ place: Place }>(`/places/${uuid}`, {
    method: "PUT",
    body:   JSON.stringify(patch),
  })
  return res.place
}

export async function deletePlace(uuid: string): Promise<{ deleted: boolean }> {
  return ontrackFetch<{ deleted: boolean }>(`/places/${uuid}`, { method: "DELETE" })
}

/**
 * Bulk delete places — two-step confirmation flow.
 *
 * Step 1: call without `force` → get back `requiresConfirmation` or `hasActiveOrders`
 * Step 2: call with `force: true` → executes deletion of safe places
 */
export async function bulkDeletePlaces(
  uuids: string[],
  force = false
): Promise<BulkDeletePlacesCheck | BulkDeletePlacesDone> {
  return ontrackFetch<BulkDeletePlacesCheck | BulkDeletePlacesDone>("/places/bulk-delete", {
    method: "DELETE",
    body:   JSON.stringify({ ids: uuids, ...(force ? { force: true } : {}) }),
  })
}

export async function importPlaces(fileUuids: string[]): Promise<{
  imported: number
  skipped:  number
  error_log_url?: string
}> {
  return ontrackFetch("/places/import", {
    method: "POST",
    body:   JSON.stringify({ files: fileUuids }),
  })
}

/** Export places — returns a file Blob for download */
export async function exportPlaces(selections: string[] = []): Promise<Blob> {
  const token = getToken()
  const qs = selections.length
    ? "?" + selections.map(id => `selections[]=${encodeURIComponent(id)}`).join("&")
    : ""
  const res = await fetch(
    `https://ontrack-api.agilecyber.com/int/v1/places/export${qs}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  )
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}

/**
 * Reverse geocode map coordinates to an address.
 * Coordinates: { lat, lng } → returns address fields for auto-fill.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  return ontrackFetch<ReverseGeocodeResult>(
    `/geocoder/reverse?coordinates=${lat},${lng}&single=true`
  )
}
