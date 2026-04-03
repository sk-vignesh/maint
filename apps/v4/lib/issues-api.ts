/**
 * Issues API — /int/v1/issues
 */

import { ontrackFetch, buildQueryString, getToken } from "./ontrack-api"

// ─── Types ────────────────────────────────────────────────────────────────────

export type IssuePriority = "low" | "medium" | "high" | "critical"
export type IssueStatus   = "pending" | "in-progress" | "resolved" | "closed"

export interface IssueLocation {
  type:        "Point"
  coordinates: [number, number]  // [longitude, latitude]
}

export interface Issue {
  id?:               number
  uuid:              string
  public_id:         string
  issue_id?:         string   // e.g. "ISS-001"
  driver_uuid?:      string | null
  vehicle_uuid?:     string | null
  assigned_to_uuid?: string | null
  reported_by_uuid?: string | null
  driver_name?:      string | null
  vehicle_name?:     string | null
  assignee_name?:    string | null
  reporter_name?:    string | null
  report?:           string | null
  priority?:         IssuePriority | null
  type?:             string | null
  category?:         string | null
  status:            IssueStatus
  location?:         IssueLocation | null
  meta?:             Record<string, unknown>
  resolved_at?:      string | null
  photo_file_uuids?: string[]
  updated_at:        string
  created_at:        string
  // eager-loaded relations (via with[]= params)
  driver?:           Record<string, unknown> | null
  vehicle?:          Record<string, unknown> | null
  reporter?:         Record<string, unknown> | null
  assignee?:         Record<string, unknown> | null
}

export interface IssueListParams {
  limit?:             number
  page?:              number
  sort?:              string
  query?:             string
  status?:            IssueStatus
  priority?:          IssuePriority
  type?:              string
  category?:          string
  driver_uuid?:       string
  vehicle_uuid?:      string
  assigned_to_uuid?:  string
  reported_by_uuid?:  string
  /** Eager-load relations e.g. ["driver", "vehicle", "reporter", "assignee"] */
  with?:              string[]
}

export interface IssueListResponse {
  issues: Issue[]
  meta?: {
    total:        number
    per_page:     number
    current_page: number
    last_page:    number
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** List issues with optional filters */
export async function listIssues(params: IssueListParams = {}): Promise<IssueListResponse> {
  const { with: withRelations, ...rest } = params
  const qs = buildQueryString(rest as Record<string, string | number | boolean | undefined | null>)
  const withQs = (withRelations ?? [])
    .map(r => `with[]=${encodeURIComponent(r)}`)
    .join("&")
  const sep = qs ? "&" : "?"
  const fullQs = qs + (withQs ? `${sep}${withQs}` : "")
  return ontrackFetch<IssueListResponse>(`/issues${fullQs}`)
}

/** Fetch a single issue by UUID or public_id */
export async function getIssue(id: string): Promise<Issue> {
  const res = await ontrackFetch<{ issue: Issue }>(`/issues/${id}`)
  return res.issue
}

/** Create a new issue */
export async function createIssue(data: {
  report:              string
  driver_uuid?:        string
  vehicle_uuid?:       string
  reported_by_uuid?:   string
  assigned_to_uuid?:   string
  category?:           string
  type?:               string
  priority?:           IssuePriority
  status?:             IssueStatus
  location?:           IssueLocation
  meta?:               Record<string, unknown>
}): Promise<Issue> {
  const res = await ontrackFetch<{ issue: Issue }>("/issues", {
    method: "POST",
    body:   JSON.stringify({ issue: data }),
  })
  return res.issue
}

/** Update an existing issue */
export async function updateIssue(id: string, patch: {
  report?:           string
  priority?:         IssuePriority
  category?:         string
  type?:             string
  status?:           IssueStatus
  assigned_to_uuid?: string
  resolved_at?:      string
  meta?:             Record<string, unknown>
}): Promise<Issue> {
  const res = await ontrackFetch<{ issue: Issue }>(`/issues/${id}`, {
    method: "PUT",
    body:   JSON.stringify({ issue: patch }),
  })
  return res.issue
}

/** Assign an issue to a user */
export async function assignIssue(id: string, userUuid: string): Promise<Issue> {
  return updateIssue(id, { assigned_to_uuid: userUuid })
}

/** Update the status of an issue */
export async function updateIssueStatus(id: string, status: IssueStatus): Promise<Issue> {
  return updateIssue(id, { status })
}

/** Soft-delete a single issue */
export async function deleteIssue(id: string): Promise<Issue> {
  const res = await ontrackFetch<{ issue: Issue }>(`/issues/${id}`, { method: "DELETE" })
  return res.issue
}

/** Bulk soft-delete issues by UUID array */
export async function bulkDeleteIssues(uuids: string[]): Promise<{ deleted: number }> {
  return ontrackFetch<{ deleted: number }>("/issues/bulk-delete", {
    method: "DELETE",
    body:   JSON.stringify({ ids: uuids }),
  })
}

/** Export issues to a spreadsheet — returns a file Blob */
export async function exportIssues(selections: string[] = []): Promise<Blob> {
  const token = getToken()
  const qs = selections.length
    ? "?" + selections.map(id => `selections[]=${encodeURIComponent(id)}`).join("&")
    : ""
  const res = await fetch(
    `https://ontrack-api.agilecyber.com/int/v1/issues/export${qs}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  )
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}
