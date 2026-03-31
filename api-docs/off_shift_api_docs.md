# Off-shift (Recurring Leave Plans) API Documentation

> **Base URL:** `{{url}}/api/v1/driver-recurring-leave-plans`
> **Auth:** All endpoints require a valid session cookie or authenticated user (`auth:sanctum`).

The "Off-shift" module allows fleet managers to create repeating work/rest patterns for drivers (e.g., 5 days on, 2 days off) which automatically generate `LeaveRequest` records for the off-days throughout a specified calendar period.

---

## 1. Off-shift List

**`GET /list`**

Returns a paginated list of all active recurring leave plans (Off-shifts).

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `per_page` / `limit` | integer | `500` | Records per page |
| `sort` | string | `-created_at` | Sort field (prefix `-` for descending). E.g., `driver` (sorts by driver name), `public_id`, `work_days`, `off_days`, `first_leave_day`, `plan_calendar_upto` |

### Response

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "uuid": "plan-uuid-123",
            "public_id": "pln_abc123",
            "driver_uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "work_days": 5,
            "off_days": 2,
            "first_leave_day": "2026-11-07",
            "plan_calendar_upto": "2026-11-12",
            "record_status": 1,
            "driver": {
                "uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                "public_id": "DRV-123",
                "drivers_license_number": "D-123456",
                "status": "active"
            }
        }
    ],
    "pagination": {
        "current_page": 1,
        "per_page": 500,
        "total": 5
    }
}
```

---

## 2. Search Off-shift

**`GET /list`**

Uses the same list endpoint with a `query` (or `q`, `search`) parameter to find specific plans. It searches across:
- Plan ID (`public_id`)
- Work Days / Off Days (exact numerical match)
- First Leave Day / Plan Calendar Upto (formatted as `YYYY-MM-DD`)
- Driver details (License Number, User Name, Email, Phone)

### Example Request

```
GET {{url}}/api/v1/driver-recurring-leave-plans/list?query=Daniel+Smith
```

---

## 3. Filter Off-shift

**`GET /list`**

Apply targeted filters to narrow down the plan list.

### Filter Query Parameters

| Param | Type | Description |
|---|---|---|
| `driver` | string/UUID | Filter by Driver UUID or search string |
| `driver_uuid` | UUID | Strict exact match for Driver |
| `public_id` | string | Partial match on plan ID |
| `first_leave_day` | date | Filter by exact start date (or array with `start`/`end`) |
| `plan_calendar_upto` | date | Filter by exact end date (or array with `start`/`end`) |
| `record_status` | integer | Filter by specific record status |

---

## 4. Clear Filters

There is no dedicated clear-filters endpoint. The frontend clears all filters by re-issuing a `GET` request to the `/list` endpoint without any query parameters (or with them set to `null`).

### Example (cleared)

```
GET {{url}}/api/v1/driver-recurring-leave-plans/list
```

---

## 5. Help

Standard UI component. No dedicated backend API endpoint required as help contents are static or handled via an external Helpdesk integration.

---

## 6. Create Off-shift Plan & Generate Schedule

**`POST /generate-leaves`**

Creates a new recurring leave plan and **automatically generates the corresponding `LeaveRequest` records** for the driver's scheduled off-days.

### Request Body

```json
{
    "driver_uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "work_days": 5,
    "off_days": 2,
    "first_leave_day": "2026-03-30",
    "plan_calendar_upto": "2026-04-30"
}
```

### Validation Rules

- `driver_uuid`: Required, valid UUID.
- `work_days`: Required, integer between `1` and `5`.
- `off_days`: Required, integer between `1` and `5`.
- `first_leave_day`: Required, valid date.
- `plan_calendar_upto`: Required, valid date, must be after or equal to `first_leave_day`.
- **Duplicates**: Fails with `400` if the exact same plan (driver, dates, ratios) exists.
- **Overlaps**: Fails with `400` if the new plan's date range overlaps with an existing plan for the same driver.

### Response

```json
{
    "success": true,
    "message": "Recurring leave plan created successfully",
    "data": {
        "uuid": "plan-uuid-123",
        "work_days": 5,
        "off_days": 2,
        "...": "..."
    },
    "leave_generation": {
        "success": true,
        "created_count": 8,
        "skipped_count": 0,
        "created_leaves": [...],
        "skipped_leaves": []
    }
}
```

---

## 7. View Off-shift Plan

**`GET /{id}`**

Fetch details of a single recurring leave plan.

### URL Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | UUID of the recurring leave plan |

### Response

```json
{
    "success": true,
    "data": {
        "uuid": "plan-uuid-123",
        "work_days": 5,
        "off_days": 2,
        "first_leave_day": "2026-03-30",
        "plan_calendar_upto": "2026-04-30",
        "driver": {
             "name": "Daniel Smith"
        }
    }
}
```

---

## 8. Edit Off-shift Plan

**`PUT /{id}`**

Updates the recurring leave plan. 
**Important Integration Note:** If work/off days, driver, or date ranges are changed, the server automatically **deletes all pre-existing leaves** tied to this plan and **re-generates a fresh schedule** based on the new parameters.

### Request Body

Only include fields that are being changed.

```json
{
    "work_days": 4,
    "off_days": 3
}
```

### Response

```json
{
    "success": true,
    "message": "Recurring leave plan updated successfully",
    "data": { ... },
    "leave_generation": {
        "success": true,
        "created_count": 10,
        "skipped_count": 0
    }
}
```

---

## 9. Delete Off-shift Plan 

**`DELETE /{id}`**

Soft-deletes the off-shift plan and **cascades the deletion** to all automatically generated `LeaveRequest` records spawned by this plan.

### URL Parameters

| Param | Type | Description |
|---|---|---|
| `id` | integer/UUID | Database ID or UUID of the recurring leave plan |

### Response

```json
{
    "success": true,
    "message": "Recurring leave plan deleted successfully"
}
```

---

## 10. Generate Off-shift Schedule & Auto-created Holidays

The generation of the shift schedule / holidays does not require a manual trigger API. It is automatically executed internally by a private helper `generateRecurringLeavesForPlan()` whenever an Off-shift plan is **Created** or **Edited**.

### Auto-created Leaves (Holidays)
The generated leaves inserted into the `leave_requests` table will automatically carry:
- `status`: `"Approved"`
- `leave_type`: `"Other"`
- `reason`: `"Recurring leave plan - X work days, Y off days"`
- `driver_recurring_leave_setting_uuid`: Links back to the parent Plan.

### Working Days Handling (Conflict Resolution)
When auto-generating leaves, the system evaluates conflicts against manually created `LeaveRequests`:
1. If a pre-existing leave overlaps entirely, the system skips auto-generation for that specific collision block.
2. If partial overlap occurs, the auto-generator splices the schedule, inserting leave blocks only around the non-overlapping dates in the cycle.

---

## 11. Sync with Holidays & Holidays List Relationship

Because Off-shifts automatically spawn records into the `leave_requests` table, they sync directly with the **Holidays API** list UI. 
- You can filter the auto-generated off-shifts in the Holidays dashboard by selecting the `Non-working day / Off-shift` (or `non_working_day`) Non-availability Type dropdown filter.
- Editing an individual auto-spawned holiday from the Holidays page will alter that specific block without affecting the parent Off-shift continuous generation plan. Conversely, altering the parent Off-shift plan will wipe out and reset the blocks.

---

## 12. Holiday Impact

Off-shifts operate using the exact same constraints and core systems as standard standalone Holidays. They impact Driver allocation natively:
- **Allocation Blockers**: Approved leave days automatically flag the driver as "on leave" during dispatch or auto-scheduling matching processes.
- **Overrides**: Attempting to assign a trip/shift to the driver during an auto-generated off-shift window yields a validation warning / hard restriction exactly as if they were on a manual statutory holiday.

---

## 13. Dropdown Reference Values

The specific filters and form fields shown in the UI dropdowns fetch data or use static options as follows:

### A. Driver Dropdown
**`GET {{url}}/api/v1/drivers`** (or `GET {{url}}/int/v1/fleet-ops/drivers` for internal console)
Fetches the list of drivers to populate the "Driver" dropdown. 
*Query Parameters:* `query` (search term), `limit` (max results).

### B. Work Days Dropdown (Static)
A static numerical selection determining the number of consecutive days working before a rest period. Backend validation accepts any integer from 1 to 5.
Valid options to pass to the API:
- `1`
- `2`
- `3`
- `4`
- `5`

### C. Off Days Dropdown (Static)
A static numerical selection determining the number of consecutive rest days following the work period. Backend validation accepts any integer from 1 to 5.
Valid options to pass to the API:
- `1`
- `2`
- `3`
- `4`
- `5`

---

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| List Off-shifts | `GET` | `/api/v1/driver-recurring-leave-plans/list` |
| Create Off-shift | `POST` | `/api/v1/driver-recurring-leave-plans/generate-leaves` |
| View Off-shift | `GET` | `/api/v1/driver-recurring-leave-plans/{id}` |
| Edit Off-shift | `PUT` | `/api/v1/driver-recurring-leave-plans/{id}` |
| Delete Off-shift | `DELETE` | `/api/v1/driver-recurring-leave-plans/{id}` |
