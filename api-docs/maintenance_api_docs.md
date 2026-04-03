# Maintenance API Documentation

> **Base URL:** `{{url}}/api/v1/leave-requests`
> **Auth:** All endpoints require `auth:sanctum` (Bearer token).
>
> The Maintenance feature tracks vehicle unavailability periods (e.g. scheduled servicing, repairs).
> It is backed by the `leave_requests` table with `unavailability_type = 'vehicle'`.

---

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/leave-requests/list` | List Maintenance Records |
| `GET` | `/api/v1/leave-requests/list?query=` | Search Maintenance |
| `GET` | `/api/v1/leave-requests/list?{filters}` | Filter Maintenance |
| `POST` | `/api/v1/leave-requests/create` | Create Maintenance |
| `GET` | `/api/v1/leave-requests/list/{uuid}` | View Maintenance |
| `PUT` | `/api/v1/leave-requests/{id}` | Edit Maintenance |
| `DELETE` | `/api/v1/leave-requests/{id}` | Delete Maintenance |

> **Important:** Always pass `unavailability_page=1&unavailability_type=vehicle` on list/filter calls to scope results to maintenance records only.

---

## 1. List Maintenance

**`GET /api/v1/leave-requests/list`**

Returns a paginated list of vehicle maintenance records for the authenticated company.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `unavailability_type` | string | — | Must be `vehicle` to return maintenance records |
| `unavailability_page` | integer | — | Pass `1` to scope to the maintenance page |
| `per_page` | integer | `500` | Records per page |
| `page` | integer | `1` | Page number |
| `sort` | string | `created_at:desc` | Sort column and direction. Allowed: `id`, `public_id`, `status`, `start_date`, `end_date`, `reason`, `created_at`, `vehicle`, `vehicle_name`, `total_days` |

### Example

```
GET /api/v1/leave-requests/list?unavailability_type=vehicle&unavailability_page=1&per_page=25&page=1
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "public_id": "aBcDeF",
      "company_uuid": "company-uuid-here",
      "vehicle_uuid": "vehicle-uuid-here",
      "user_uuid": null,
      "driver_uuid": null,
      "start_date": "2026-04-10",
      "end_date": "2026-04-12",
      "reason": "Annual service",
      "status": "Approved",
      "leave_type": "Other",
      "unavailability_type": "vehicle",
      "vehicle_name": "ABC123 - Hilux",
      "non_availability_type": "vehicle",
      "processed_by_name": null,
      "meta": null,
      "created_at": "2026-04-02T09:00:00.000000Z",
      "updated_at": "2026-04-02T09:00:00.000000Z",
      "vehicle": {
        "uuid": "vehicle-uuid-here",
        "plate_number": "ABC123",
        "make": "Toyota",
        "model": "Hilux",
        "year": "2022"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 25,
    "total": 48,
    "last_page": 2,
    "from": 1,
    "to": 25
  }
}
```

---

## 2. Search Maintenance

**`GET /api/v1/leave-requests/list?query={term}`**

Free-text search across maintenance records.

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `query` | string | Search term — matches `public_id`, `reason`, `start_date`, `end_date`, vehicle `plate_number`, vehicle `public_id` |
| `q` | string | Alias for `query` |
| `search` | string | Alias for `query` |

### Example

```
GET /api/v1/leave-requests/list?unavailability_type=vehicle&unavailability_page=1&query=ABC123
```

---

## 3. Filter Maintenance

**`GET /api/v1/leave-requests/list?{filters}`**

Filter maintenance records by one or more criteria. All filters can be combined.

### Filter Parameters

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `Approved`, `Pending`, `Rejected` |
| `vehicle_uuid` | string | Filter by vehicle UUID |
| `start_date` | date | Filter by exact start date (`Y-m-d`) |
| `end_date` | date | Filter by exact end date (`Y-m-d`) |
| `public_id` | string | LIKE search on `public_id` |
| `reason` | string | Exact match on reason/notes |
| `created_at` | date | Filter by exact created date (`Y-m-d`) |

### Sort Options

| Sort Value | Description |
|---|---|
| `start_date:asc` / `start_date:desc` | Sort by start date |
| `end_date:asc` / `end_date:desc` | Sort by end date |
| `status:asc` / `status:desc` | Sort by status |
| `vehicle:asc` / `vehicle:desc` | Sort by vehicle name |
| `total_days:asc` / `total_days:desc` | Sort by number of days (computed: `end_date - start_date + 1`) |
| `created_at:asc` / `created_at:desc` | Sort by creation date (default) |

### Clear Filters

Remove all filter parameters and pass only `unavailability_type=vehicle&unavailability_page=1` to return the unfiltered list.

### Example

```
GET /api/v1/leave-requests/list?unavailability_type=vehicle&unavailability_page=1&status=Approved&sort=start_date:asc
```

---

## 4. Create Maintenance

**`POST /api/v1/leave-requests/create`**

Creates a new vehicle maintenance/unavailability record.

### Request Body

```json
{
  "vehicle_uuid": "vehicle-uuid-here",
  "start_date": "2026-04-10",
  "end_date": "2026-04-12",
  "reason": "Annual service",
  "unavailability_type": "vehicle"
}
```

### Required Fields

| Field | Type | Description |
|---|---|---|
| `vehicle_uuid` | string | UUID of the vehicle being scheduled for maintenance |
| `start_date` | date | Start date (`Y-m-d`) — must not be in the past |
| `unavailability_type` | string | Must be `vehicle` |

### Optional Fields

| Field | Type | Description |
|---|---|---|
| `end_date` | date | End date (`Y-m-d`). Defaults to `start_date` if not provided |
| `reason` | string | Notes / reason for maintenance |

### Validation Rules

| Rule | Description |
|---|---|
| `end_date >= start_date` | End date cannot be before start date |
| `start_date >= today` | Past dates are not allowed |
| `end_date >= today` | Past dates are not allowed |
| No date overlap | A vehicle cannot have two overlapping maintenance periods |

> `leave_type` is auto-set to `Other` and `status` is auto-set to `Approved` for maintenance records.

### Response — Success

```json
{
  "success": true,
  "data": {
    "id": 101,
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "public_id": "aBcDeF",
    "vehicle_uuid": "vehicle-uuid-here",
    "start_date": "2026-04-10",
    "end_date": "2026-04-12",
    "reason": "Annual service",
    "status": "Approved",
    "leave_type": "Other",
    "unavailability_type": "vehicle",
    "created_at": "2026-04-02T09:00:00.000000Z",
    "updated_at": "2026-04-02T09:00:00.000000Z"
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "success": false, "message": "Vehicle is required." }` |
| `400` | `{ "success": false, "message": "End date cannot be before start date." }` |
| `400` | `{ "success": false, "message": "Dates cannot be in the past." }` |
| `400` | `{ "success": false, "message": "This vehicle already has a maintenance schedule overlapping with the selected dates." }` |

---

## 5. View Maintenance

**`GET /api/v1/leave-requests/list?unavailability_type=vehicle&unavailability_page=1`**

To view a single record, use the list endpoint and match by `uuid` or `public_id`, or directly query:

**`GET /api/v1/leave-requests/list/{uuid}`**

> Note: The `show` route matches by `uuid` only.

### Response

```json
{
  "success": true,
  "data": {
    "id": 101,
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "public_id": "aBcDeF",
    "company_uuid": "company-uuid-here",
    "vehicle_uuid": "vehicle-uuid-here",
    "user_uuid": null,
    "driver_uuid": null,
    "start_date": "2026-04-10",
    "end_date": "2026-04-12",
    "reason": "Annual service",
    "status": "Approved",
    "leave_type": "Other",
    "unavailability_type": "vehicle",
    "vehicle_name": "ABC123 - Hilux",
    "non_availability_type": "vehicle",
    "processed_by_name": null,
    "meta": null,
    "created_at": "2026-04-02T09:00:00.000000Z",
    "updated_at": "2026-04-02T09:00:00.000000Z"
  }
}
```

---

## 6. Edit Maintenance

**`PUT /api/v1/leave-requests/{id}`**

Updates an existing maintenance record. Uses the record's integer `id`.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | integer | Internal `id` of the leave request record |

### Request Body

```json
{
  "vehicle_uuid": "vehicle-uuid-here",
  "start_date": "2026-04-15",
  "end_date": "2026-04-17",
  "reason": "Brake pad replacement",
  "unavailability_type": "vehicle"
}
```

### Updatable Fields

| Field | Type | Description |
|---|---|---|
| `vehicle_uuid` | string | Reassign to a different vehicle |
| `start_date` | date | Updated start date — must not be in the past |
| `end_date` | date | Updated end date |
| `reason` | string | Updated notes |

### Validation Rules

Same as create: no past dates, end date must be ≥ start date, no overlapping periods for the same vehicle (excluding the current record).

### Response — Success

```json
{
  "success": true,
  "message": "Vehicle unavailability updated successfully.",
  "data": { "...updated record..." }
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "success": false, "message": "Request not found." }` |
| `400` | `{ "success": false, "message": "End date cannot be before start date." }` |
| `400` | `{ "success": false, "message": "This vehicle already has a maintenance schedule overlapping with the selected dates." }` |

---

## 7. Delete Maintenance

**`DELETE /api/v1/leave-requests/{id}`**

Soft-deletes a maintenance record. Uses the record's integer `id`.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | integer | Internal `id` of the leave request record |

### Response — Success

```json
{
  "success": true,
  "message": "Request deleted successfully."
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "success": false, "message": "Request not found." }` |

---

## 8. Maintenance Impact on Allocation

When a vehicle is scheduled for maintenance (a record with `unavailability_type = 'vehicle'` exists), it is automatically excluded from auto-allocation and shift assignment for the overlapping date range.

The `ShiftAssignmentService` checks `leave_requests` before assigning a vehicle to an order:

- Any vehicle with an `Approved` maintenance record covering the order's scheduled date will **not** be allocated.
- This applies to both manual and automated allocation flows.

To check if a vehicle is available for a given date, query:

```
GET /api/v1/leave-requests/list?unavailability_type=vehicle&vehicle_uuid={uuid}&start_date={Y-m-d}
```

If `data` is non-empty with `status=Approved`, the vehicle is unavailable on that date.

---

## Field Reference

### Maintenance Record Fields

| Field | Type | Description |
|---|---|---|
| `id` | integer | Internal auto-increment ID (used for update/delete) |
| `uuid` | string | Unique record identifier |
| `public_id` | string | Short public-facing ID (e.g. `aBcDeF`) |
| `company_uuid` | string | UUID of the owning company |
| `vehicle_uuid` | string\|null | UUID of the vehicle under maintenance |
| `user_uuid` | string\|null | Not used for maintenance records (null) |
| `driver_uuid` | string\|null | Not used for maintenance records (null) |
| `start_date` | date | Maintenance start date (`Y-m-d`) |
| `end_date` | date | Maintenance end date (`Y-m-d`) |
| `reason` | string\|null | Notes / reason for maintenance |
| `status` | string | Always `Approved` for maintenance records |
| `leave_type` | string | Always `Other` for maintenance records |
| `unavailability_type` | string | Always `vehicle` for maintenance records |
| `vehicle_name` | string\|null | Computed: `plate_number - model` from the related vehicle |
| `non_availability_type` | string | Computed: always `vehicle` for maintenance records |
| `processed_by_name` | string\|null | Name of the user who processed the record |
| `meta` | object\|null | Additional metadata |
| `created_at` | string | Record creation datetime (ISO 8601) |
| `updated_at` | string | Record last updated datetime (ISO 8601) |

### Relation Fields

| Field | Type | Description |
|---|---|---|
| `vehicle` | object\|null | Vehicle object — includes `uuid`, `plate_number`, `make`, `model`, `year` |
| `user` | object\|null | Not populated for maintenance records |
| `processedBy` | object\|null | User who approved/processed the record |

---

## Notes

- Maintenance records are a subset of `leave_requests` filtered by `unavailability_type = 'vehicle'`.
- Always include `unavailability_type=vehicle` and `unavailability_page=1` in list/filter/search requests to avoid mixing driver leave records with maintenance records.
- The `id` field (integer) is required for `PUT` and `DELETE` operations — not `uuid`.
- Dates must be today or in the future; past-dated maintenance cannot be created or edited.
- Duplicate/overlapping maintenance periods for the same vehicle are rejected automatically.
