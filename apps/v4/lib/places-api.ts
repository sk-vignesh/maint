/**
 * Places API — /int/v1/places
 */
import { ontrackFetch, buildQueryString } from "./ontrack-api"

export interface Place {
  uuid: string
  public_id: string
  name: string
  code?: string
  address?: string
  city?: string
  country?: string
  postal_code?: string
  /** GeoJSON point returned by the API, e.g. { type: 'Point', coordinates: [lng, lat] } */
  location?: {
    type: string
    coordinates: [number, number]  // [longitude, latitude]
  } | null
  /** Sometimes returned as top-level fields */
  latitude?: number | null
  longitude?: number | null
}

export interface PlaceListResponse {
  places: Place[]
  meta?: { total: number; per_page: number; current_page: number; last_page: number }
}

export async function listPlaces(params: {
  query?: string
  limit?: number
  sort?: string
} = {}): Promise<PlaceListResponse> {
  const merged = { limit: 500, sort: "name", ...params }
  const qs = buildQueryString(merged as Record<string, string | number | boolean | undefined | null>)
  return ontrackFetch<PlaceListResponse>(`/places${qs}`)
}
