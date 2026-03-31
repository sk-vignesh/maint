# Holidays (Leave Requests) API Documentation

> **Base URL:** `{{url}}/api/v1/leave-requests`
> **Auth:** All endpoints require a valid session cookie or authenticated user (`auth:sanctum`).

---

## 1. Holidays List

**`GET /list`**

Returns a paginated list of holidays (leave requests) for the authenticated company.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `500` | Items per page (set to 0 to return all without pagination) |
| `sort` | string | `-created_at` | Sort field (e.g., `-created_at` for descending) |
| `unavailability_type` | string | — | Filter by unavailability type (e.g., `vehicle`) |
| `include_vehicle_unavailability` | boolean | `false` | Include both user and vehicle unavailability records |
| `non_availability_type` | string | — | Normalized non-availability type (e.g. `leave`, `holiday`, `non_working_day`) |

### Response — paginated (default)

```json
{
  "success": true,
  "data": [
    {
      "uuid": "4f9d1b6e-...",
      "public_id": "LREQ-123",
      "user_uuid": "user-uuid...",
      "driver_uuid": "driver-uuid...",
      "vehicle_uuid": null,
      "leave_type": "Annual Leave",
      "reason": "Personal Time Off",
      "start_date": "2026-04-01",
      "end_date": "2026-04-05",
      "status": "Pending",
      "unavailability_type": null,
      "created_at": "2026-03-30T10:00:00.000000Z",
      "user": { ... },
      "processed_by": null,
      "vehicle": null
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 500,
    "total": 1,
    "last_page": 1,
    "from": 1,
    "to": 1
  }
}
```

---

## 2. Search Holidays

**`GET /list?query={search}`**

Searches holidays across multiple fields for quick retrieval.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `query` (or `q`, `search`) | string | — | Free-text search term |

*Note: The search term matches against `public_id`, `reason`, `start_date`, `end_date`, and related vehicle attributes (e.g., `plate_number`, `public_id`).*

---

## 3. Filter Holidays

**`GET /list`**

You can apply specific column filters to the `/list` endpoint.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `public_id` | string | — | Partial match for public identifier |
| `status` | string | — | Exact match for status (e.g., `Pending`, `Approved`, `Rejected`) |
| `leave_type` | string | — | Exact match for the type of leave (e.g., `Annual Leave`, `Sick Leave`) |
| `driver_uuid` | UUID | — | Exact match for driver UUID |
| `vehicle_uuid` | UUID | — | Exact match for vehicle UUID |
| `reason` | string | — | Exact match for reason |
| `start_date` | string | — | Exact match for start date (`Y-m-d`) |
| `end_date` | string | — | Exact match for end date (`Y-m-d`) |
| `created_at` | string | — | Match specifically for creation date (`Y-m-d`) |
| `user_uuid` | UUID | — | Exact match for user UUID |

---

## 4. Clear Filters

**`GET /list`**

To clear filters, simply call the `/list` endpoint without appending any search or filter query parameters.

---

## 5. Help

The Holidays API uses specific standard constraints to manage absences. Key states to be aware of:

- **Statuses:** `Pending`, `Approved`, `Rejected`. 
- **Leave Types:** Can typically be textual categories like `Annual Leave`, `Sick Leave`, or `Other`. If `unavailability_type` is passed as `vehicle`, `leave_type` defaults to `Other`.
- **Validation:** Dates must not be in the past (`< today`), and `end_date` must not be before `start_date`. Overlapping requests for the same User (or Vehicle) are categorically blocked by the system.

---

## 6. Create Holiday

**`POST /create`**

Creates a new holiday or leave request.

### Request Body

```json
{
  "user_uuid": "uuid-...", 
  "driver_uuid": "uuid-...",
  "start_date": "2026-08-01",
  "end_date": "2026-08-05",
  "leave_type": "Annual Leave",
  "reason": "Family vacation",
  "unavailability_type": null
}
```

*Note: If `unavailability_type` is `"vehicle"`, then `vehicle_uuid` becomes required.*

### Response (Success)

```json
{
  "success": true,
  "data": { ...created holiday object... }
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "success": false, "message": "The end date cannot be before the start date." }` |
| `400` | `{ "success": false, "message": "Leave request overlaps with an existing request." }` |

---

## 7. Edit Holiday

**`PUT /{id}`**

Updates details for a specific holiday.

### Request Body

```json
{
  "start_date": "2026-08-02",
  "end_date": "2026-08-06",
  "leave_type": "Annual Leave",
  "reason": "Family vacation dates adjusted"
}
```

### Response

```json
{
  "success": true,
  "message": "Leave request updated successfully.",
  "data": { ...updated holiday object... }
}
```

---

## 8. View Holiday

**`GET /show/{uuid}`** 

Retrieve details for a single holiday by its UUID.

*(Note: The `show` method operates in the controller via `GET /{uuid}` implicitly or fetched from the paginated `/list` results.)*

### Response

```json
{
  "success": true,
  "data": { ...holiday object... }
}
```

---

## 9. Delete Holiday, bulk delete

**`DELETE /{id}`**

Deletes (archives/soft deletes) a holiday request by ID.

### Response

```json
{
  "success": true,
  "message": "Leave request deleted successfully."
}
```

*(Note for **bulk delete**: The API currently accepts a single ID. To perform a bulk deletion, the interface must iterate and issue `DELETE /{id}` for each selected identifier.)*

---

## 10. Approve Holiday

**`PUT /{id}`**

Approves a specific holiday request.

### Request Body

```json
{
  "action": "approve"
}
```

### Response

```json
{
  "success": true,
  "message": "Leave request approved successfully.",
  "data": { ...updated holiday object... }
}
```

---

## 11. Reject Holiday

**`PUT /{id}`**

Rejects a specific holiday request.

### Request Body

```json
{
  "action": "reject"
}
```

### Response

```json
{
  "success": true,
  "message": "Leave request rejected successfully.",
  "data": { ...updated holiday object... }
}
```

---

## 12. Holiday Impact on Allocation

When a holiday (Leave Request) is marked as **Approved**, it represents an unavailability block:

1. **Shift Assignments:** Drivers or vehicles cannot be assigned shifts during overlapping periods.
2. **Leave Balance:** Historically, approved holidays optionally reduced driver `leave_balance` totals depending on organizational configurations.
3. **Vehicle Maintenance:** If the `unavailability_type` is set to `vehicle`, the API treats the request identically as a holiday block, ensuring the vehicle cannot be assigned to driver tasks. 
4. **Validation Strictness:** During creation and modification, the system strictly checks for overlaps natively. Attempting to schedule contiguous holidays over the exact same date-frame returns an overlapping error constraint.

---

## 13. Dropdowns & Filter Options

The specific filters shown in the UI dropdowns fetch data or use static options as follows:

### A. Driver List Dropdown
**`GET {{url}}/api/v1/drivers`** (or `GET {{url}}/int/v1/fleet-ops/drivers` for internal console)
Fetches the list of drivers to populate the "Driver Name" dropdown. 
*Query Parameters:* `query` (search term), `limit` (max results).

### B. Status Dropdown (Static)
This is a static list of predefined statuses used across holiday/leave requests.
Valid options to pass to the API:
- `Pending` (or `submitted`)
- `Approved` 
- `Rejected`

### C. Holiday Type / Leave Type Dropdown (Static)
The textual categorization of the leave.
Valid common options:
- `Annual Leave`
- `Sick Leave`
- `Other` *(Default when assigned as vehicle unavailability)*

### D. Non-availability Type Dropdown (Static)
Distinguishes between a standard user holiday and a non-working day block.
Valid mapping options to pass to the API:
- **Holiday**: `leave`
- **Non-working day / Off-shift**: `non_working_day`
*(Note: Passing `leave` or `holiday` to the filter will return only `null` unavailability records without recurring schedules, whilst passing `non_working_day` filters records tied to recurring setups.)*

---

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| List Holidays | `GET` | `/api/v1/leave-requests/list` |
| Search Holidays | `GET` | `/api/v1/leave-requests/list?query={search}` |
| Filter Holidays | `GET` | `/api/v1/leave-requests/list` |
| Clear Filters | `GET` | `/api/v1/leave-requests/list` |
| Create Holiday | `POST` | `/api/v1/leave-requests/create` |
| Edit Holiday | `PUT` | `/api/v1/leave-requests/{id}` |
| View Holiday | `GET` | `/api/v1/leave-requests/show/{uuid}` |
| Delete Holiday | `DELETE` | `/api/v1/leave-requests/{id}` |
| Approve Holiday | `PUT` | `/api/v1/leave-requests/{id}` |
| Reject Holiday | `PUT` | `/api/v1/leave-requests/{id}` |
