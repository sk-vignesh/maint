/**
 * OnTrack API — Base Client
 *
 * Base URL: https://ontrack-api.agilecyber.acom/int/v1
 * Auth: POST /auth/login → Bearer token
 *
 * Token is stored on `window.__fleetyes_token` to reuse the
 * same pattern as the existing compliance-api.ts client.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const ONTRACK_BASE = "https://ontrack-api.agilecyber.acom/int/v1"

// ─── Token helper ────────────────────────────────────────────────────────────

function getToken(): string {
  if (typeof window === "undefined") return ""
  return (window as Window & { __fleetyes_token?: string }).__fleetyes_token ?? ""
}

function setToken(token: string) {
  if (typeof window !== "undefined") {
    ;(window as Window & { __fleetyes_token?: string }).__fleetyes_token = token
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
  return data
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
