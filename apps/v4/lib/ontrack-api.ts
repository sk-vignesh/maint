/**
 * OnTrack API — Base Client
 *
 * Base URL: https://ontrack-api.agilecyber.com/int/v1
 * Auth: POST /auth/login → Bearer token
 * Token is stored on `window.__fleetyes_token` to reuse the
 * same pattern as the existing compliance-api.ts client.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const ONTRACK_BASE = "https://ontrack-api.agilecyber.com/int/v1"

// ─── Token helper (persisted in localStorage) ───────────────────────────────

const TOKEN_KEY       = "fleetyes_ontrack_token"
const COMPANY_UUID_KEY = "fleetyes_company_uuid"
const USER_KEY         = "fleetyes_current_user"

export interface CurrentUser {
  name:  string
  email: string
  role:  string
}

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as CurrentUser } catch { return null }
}

export function setCurrentUser(user: CurrentUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function getToken(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(TOKEN_KEY) ?? ""
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(COMPANY_UUID_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

/** The company UUID for the authenticated user's company — used to filter cross-company API results */
export function getCompanyUuid(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(COMPANY_UUID_KEY) ?? ""
}

export function setCompanyUuid(uuid: string) {
  if (typeof window !== "undefined" && uuid) {
    localStorage.setItem(COMPANY_UUID_KEY, uuid)
  }
}

// ─── Generic fetch helper ────────────────────────────────────────────────────

export async function ontrackFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  }

  const res = await fetch(`${ONTRACK_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    const message =
      body?.error ??
      body?.message ??
      (body?.errors ? Object.values(body.errors).flat().join("; ") : null) ??
      `HTTP ${res.status}`
    throw new OnTrackApiError(message, res.status, body)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class OnTrackApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = "OnTrackApiError"
    this.status = status
    this.body = body
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

export interface LoginRequest {
  identity: string
  password: string
  remember?: boolean
}

export interface LoginResponse {
  token: string
  type: string
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${ONTRACK_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new OnTrackApiError(
      body?.error ?? body?.message ?? `Login failed (${res.status})`,
      res.status,
      body
    )
  }

  const data: LoginResponse = await res.json()
  setToken(data.token)

  // Fetch the authenticated user profile via the dedicated /users/me endpoint.
  // This is cleaner than the old email-based /users?email=... lookup.
  try {
    const meRes = await fetch(`${ONTRACK_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    })
    if (meRes.ok) {
      const meData = await meRes.json()
      const u = meData?.user
      if (u?.company_uuid) setCompanyUuid(u.company_uuid)
      if (u) {
        setCurrentUser({
          name:  u.name       ?? credentials.identity,
          email: u.email      ?? credentials.identity,
          role:  u.role_name  ?? u.type ?? "User",
        })
      }
    }
  } catch {
    // Non-fatal — profile lookup failed; top bar will show fallback "User"
    console.warn("[OnTrack] Could not resolve user profile from /users/me")
  }

  return data
}

/** Re-fetch the authenticated user profile on demand (e.g. from the Settings page). */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const meData = await ontrackFetch<{ user: Record<string, string> }>("/users/me")
    const u = meData?.user
    if (!u) return null
    const profile: CurrentUser = {
      name:  u.name      ?? "",
      email: u.email     ?? "",
      role:  u.role_name ?? u.type ?? "User",
    }
    if (u.company_uuid) setCompanyUuid(u.company_uuid)
    setCurrentUser(profile)
    return profile
  } catch {
    return null
  }
}



// ─── Pagination helper ──────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number
  to: number
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  )
  if (entries.length === 0) return ""
  return "?" + new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)])
  ).toString()
}
