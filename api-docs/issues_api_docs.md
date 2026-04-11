# Issues API Documentation

> **Internal Base URL:** `{{url}}/int/v1/issues`
> **Public Base URL:** `{{url}}/v1/issues`
> **Auth:** Internal endpoints require a valid session. Public endpoints require an API credential.

---

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/int/v1/issues` | List Issues |
| `GET` | `/int/v1/issues?query=` | Search Issues |
| `GET` | `/int/v1/issues?status=&priority=...` | Filter Issues |
| `POST` | `/int/v1/issues` | Create Issue (Web) |
| `POST` | `/v1/issues` | Create Issue (Mobile) |
| `GET` | `/int/v1/issues/{id}` | View Issue |
| `PUT` | `/int/v1/issues/{id}` | Edit Issue |
| `DELETE` | `/int/v1/issues/{id}` | Delete Issue |
| `PUT` | `/int/v1/issues/{id}` | Assign Issue / Update Status |
| `GET/POST` | `/int/v1/issues/export` | Export Issues |
| `DELETE` | `/int/v1/issues/bulk-delete` | Bulk Delete Issues |
| `GET` | `/int/v1/users?limit=500` | Users Dropdown (Reported By / Assigned To) |
| — | Static values | Issue Type & Category Dropdown Values |

---

## 1. List Issues

**`GET /int/v1/issues`**

Returns a paginated list of issues for the authenticated company.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `30` | Number of records per page |
| `page` | integer | `1` | Page number |
| `sort` | string | `created_at:desc` | Sort column and direction. Allowed: `created_at`, `updated_at`, `priority`, `status`, `type`, `category` |
| `with[]` | string | — | Eager-load relations. e.g. `with[]=driver&with[]=vehicle&with[]=reporter&with[]=assignee` |

### Response

```json
{
  "issues": [
    {
      "id": 101,
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "public_id": "issue_abc123",
      "issue_id": "ISS-001",
      "driver_uuid": "driver-uuid-here",
      "vehicle_uuid": "vehicle-uuid-here",
      "assigned_to_uuid": "user-uuid-here",
      "reported_by_uuid": "user-uuid-here",
      "driver_name": "John Doe",
      "vehicle_name": "2022 Toyota Hilux ABC123",
      "assignee_name": "Jane Smith",
      "reporter_name": "Mike Johnson",
      "report": "Vehicle tyre is flat",
      "priority": "high",
      "type": "mechanical",
      "category": "vehicle",
      "status": "pending",
      "location": {
        "type": "Point",
        "coordinates": [72.8777, 19.076]
      },
      "meta": {},
      "resolved_at": null,
      "updated_at": "2026-04-01 10:00:00",
      "created_at": "2026-04-01 09:00:00",
      "driver": null,
      "vehicle": null,
      "reporter": null,
      "assignee": null
    }
  ]
}
```

---

## 2. Search Issues

**`GET /int/v1/issues?query={term}`**

Full-text search across issue fields.

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `query` | string | Search term — matches against `report`, `issue_id`, `type`, `category`, driver name, vehicle name |

### Example

```
GET /int/v1/issues?query=flat+tyre
```

---

## 3. Filter Issues

**`GET /int/v1/issues?{filters}`**

Filter issues by one or more criteria. All filters can be combined.

### Filter Parameters

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `pending`, `in-progress`, `backlogged`, `requires-update`, `in-review`, `resolved`, `closed` |
| `priority` | string | Filter by priority: `low`, `medium`, `high`, `critical`, `scheduled-maintenance` |
| `type` | string | Filter by issue type |
| `category` | string | Filter by category |
| `driver_uuid` | string | Filter by assigned driver UUID |
| `vehicle_uuid` | string | Filter by associated vehicle UUID |
| `assigned_to_uuid` | string | Filter by assignee UUID |
| `reported_by_uuid` | string | Filter by reporter UUID |
| `assignee` | string | Filter by assignee name / public_id |
| `reporter` | string | Filter by reporter name / public_id |
| `created_at` | date | Filter by exact created date (`Y-m-d`) |
| `updated_at` | date | Filter by exact updated date (`Y-m-d`) |

### Clear Filters

Remove all filter parameters from the request to return the unfiltered list.

### Example

```
GET /int/v1/issues?status=pending&priority=high
```

---

## 4. Create Issue (Web)

**`POST /int/v1/issues`**

Creates a new issue from the web console.


### Request Body (Wrapped)

```json
{
    "issue": {
        "report": "Vehicle tyre is flat",
        "driver_uuid": "5bf6a8dd-e4ea-46f0-a21f-80cf9368507c",
        "vehicle_uuid": "0cdfd0b6-4823-4306-96af-8478b063ef31",
        "priority": "low",
        "status": "in-progress",
        "category": "vehicle",
        "type": "mechanical",
        "assigned_to_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "reported_by_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "location": {
            "type": "Point",
            "coordinates": [0, 0],
            "bbox": [0, 0, 0, 0]
        },
        "meta": {}
    }
}
```

### Required Fields

| Field | Type | Description |
|---|---|---|
| `report` | string | Description of the issue |

### Optional Fields

| Field | Type | Description |
|---|---|---|
| `driver_uuid` | UUID | UUID of the driver involved |
| `vehicle_uuid` | UUID | UUID of the vehicle involved |
| `reported_by_uuid` | UUID | UUID of the user reporting the issue |
| `assigned_to_uuid` | UUID | UUID of the user assigned to resolve the issue |
| `category` | string | Issue category (e.g. `vehicle`, `route`). See Section 15 for full list |
| `type` | string | Issue type (e.g. `mechanical`, `operational`). See Section 15 for full list |
| `priority` | string | Priority level: `low`, `medium`, `high`, `critical`, `scheduled-maintenance` |
| `status` | string | Issue status. Defaults to `pending` |
| `location` | object | GeoJSON Point — `{ type: "Point", coordinates: [lng, lat], bbox: [...] }`. Can be set via map picker on the form. |
| `meta` | object | Additional metadata |

### Location Field

```json
{
    "type": "Point",
    "coordinates": [longitude, latitude],
    "bbox": [minLng, minLat, maxLng, maxLat]
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Always `"Point"` |
| `coordinates` | array | `[longitude, latitude]` — GeoJSON standard (longitude first) |
| `bbox` | array | Optional bounding box: `[minLng, minLat, maxLng, maxLat]` |

> **Tip:** On the Create / Edit Issue form, click any point on the map to auto-fill the coordinates instead of entering them manually.

### Response

```json
{
    "issue": {
        "public_id": "issue_9L5gh2b",
        "issue_id": null,
        "company_uuid": null,
        "reported_by_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "assigned_to_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "driver_uuid": "21c9dd04-0647-40b6-9e9f-70c36cc6bd4c",
        "vehicle_uuid": "199bbbda-69f4-4d40-b21d-c4c2fe5add84",
        "driver_name": "Young",
        "vehicle_name": "swift sss FF45678",
        "assignee_name": "Wilson",
        "reporter_name": "Wilson",
        "type": "operational",
        "category": "Resource Allocation",
        "report": "Vehicle tyre is flat",
        "priority": "low",
        "status": "pending",
        "location": {
            "type": "Point",
            "coordinates": [0, 0],
            "bbox": [0, 0, 0, 0]
        },
        "meta": [],
        
    }
}
```

---

## 5. Create Issue (Mobile)

**`POST /v1/issues`**

Creates a new issue from the mobile app. Requires API credential auth.

### Request Body

```json
{
  "driver": "driver_public_id_or_uuid",
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.076]
  },
  "category": "vehicle",
  "type": "mechanical",
  "report": "Vehicle tyre is flat",
  "priority": "high",
  "status": "pending"
}
```

### Required Fields

| Field | Type | Description |
|---|---|---|
| `driver` | string | Driver `public_id` or `uuid` |
| `location` | Point | GPS coordinates — `{ type: "Point", coordinates: [lng, lat] }` |

### Optional Fields

| Field | Type | Description |
|---|---|---|
| `category` | string | Issue category |
| `type` | string | Issue type |
| `report` | string | Description of the issue |
| `priority` | string | Priority level |
| `status` | string | Defaults to `pending` |

### Notes

- `driver_uuid` is resolved automatically from the `driver` identifier
- `reported_by_uuid` is set to the authenticated driver's user
- `vehicle_uuid` is set from the driver's currently assigned vehicle

### Response

```json
{
  "issue": {
    "id": "issue_abc123",
    "driver_name": "John Doe",
    "vehicle_name": "2022 Toyota Hilux ABC123",
    "report": "Vehicle tyre is flat",
    "priority": "high",
    "type": "mechanical",
    "category": "vehicle",
    "status": "pending",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.076]
    },
    "meta": {},
    "resolved_at": null,
    "updated_at": "2026-04-02 09:00:00",
    "created_at": "2026-04-02 09:00:00"
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Driver not found." }` |

---

## 6. View Issue

**`GET /int/v1/issues/{id}`**

Returns a single issue by `uuid` or `public_id`.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Issue `uuid` or `public_id` |

### Response

```json
{
  "issue": {
    "id": 101,
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "public_id": "issue_abc123",
    "issue_id": "ISS-001",
    "driver_uuid": "driver-uuid-here",
    "vehicle_uuid": "vehicle-uuid-here",
    "assigned_to_uuid": "user-uuid-here",
    "reported_by_uuid": "user-uuid-here",
    "driver_name": "John Doe",
    "vehicle_name": "2022 Toyota Hilux ABC123",
    "assignee_name": "Jane Smith",
    "reporter_name": "Mike Johnson",
    "report": "Vehicle tyre is flat",
    "priority": "high",
    "type": "mechanical",
    "category": "vehicle",
    "status": "pending",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.076]
    },
    "meta": {},
    "resolved_at": null,
    "updated_at": "2026-04-01 10:00:00",
    "created_at": "2026-04-01 09:00:00",
    "driver": { "...driver object..." },
    "vehicle": { "...vehicle object..." },
    "reporter": { "...user object..." },
    "assignee": { "...user object..." }
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Issue not found." }` |

---

## 7. Edit Issue

**`PUT /int/v1/issues/{id}`**

Updates an existing issue.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Issue `uuid` or `public_id` |

### Request Body

```json
{
    "issue": {
        "public_id": "issue_9L5gh2b",
        "reported_by_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "assigned_to_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "driver_uuid": "21c9dd04-0647-40b6-9e9f-70c36cc6bd4c",
        "vehicle_uuid": "199bbbda-69f4-4d40-b21d-c4c2fe5add84",
        "driver_name": "Young",
        "vehicle_name": "swift sss FF45678",
        "assignee_name": "Wilson",
        "reporter_name": "Wilson",
        "type": "operational",
        "category": "Resource Allocation",
        "report": "Updated description",
        "priority": "low",
        "status": "in-progress",
        "location": {
            "type": "Point",
            "coordinates": [0, 0],
            "bbox": [0, 0, 0, 0]
        },
        "meta": []
    }
}
```

> Only include fields you want to update — all fields are optional in an edit request.

### Updatable Fields

| Field | Type | Description |
|---|---|---|
| `report` | string | Updated issue description |
| `priority` | string | Updated priority: `low`, `medium`, `high`, `critical`, `scheduled-maintenance` |
| `category` | string | Updated category. See Section 15 for full list |
| `type` | string | Updated type. See Section 15 for full list |
| `status` | string | Updated status: `pending`, `in-progress`, `backlogged`, `requires-update`, `in-review`, `resolved`, `closed` |
| `driver_uuid` | UUID | Update driver linked to the issue |
| `vehicle_uuid` | UUID | Update vehicle linked to the issue |
| `assigned_to_uuid` | UUID | Reassign to a different user |
| `reported_by_uuid` | UUID | Update the reporter |
| `driver_name` | string | Denormalized driver name (auto-computed if driver_uuid given) |
| `vehicle_name` | string | Denormalized vehicle name (auto-computed if vehicle_uuid given) |
| `assignee_name` | string | Denormalized assignee name (auto-computed if assigned_to_uuid given) |
| `reporter_name` | string | Denormalized reporter name (auto-computed if reported_by_uuid given) |
| `location` | object | Updated GeoJSON Point — `{ type: "Point", coordinates: [lng, lat], bbox: [...] }`. Can be set via map picker. |
| `resolved_at` | date | Date the issue was resolved (set automatically when status → `resolved`) |
| `meta` | object | Additional metadata |

### Response

```json
{
    "issue": {
        "public_id": "issue_9L5gh2b",
        "issue_id": null,
        "reported_by_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "assigned_to_uuid": "098a8cfe-aaad-4e7e-891d-dd5a644c4889",
        "driver_uuid": "21c9dd04-0647-40b6-9e9f-70c36cc6bd4c",
        "vehicle_uuid": "199bbbda-69f4-4d40-b21d-c4c2fe5add84",
        "driver_name": "Young",
        "vehicle_name": "swift sss FF45678",
        "assignee_name": "Wilson",
        "reporter_name": "Wilson",
        "type": "operational",
        "category": "Resource Allocation",
        "report": "Updated description",
        "priority": "low",
        "status": "in-progress",
        "location": {
            "type": "Point",
            "coordinates": [0, 0],
            "bbox": [0, 0, 0, 0]
        },
        "meta": [],
        "resolved_at": null,
        "deleted_at": null,
        "created_at": "2026-04-08T13:00:27.000Z",
        "updated_at": "2026-04-08T13:05:00.000Z",
        "reporter": { "uuid": "098a8cfe-...", "name": "Wilson", "email": "andrew.wilson@test.com" },
        "assignee": { "uuid": "098a8cfe-...", "name": "Wilson", "email": "andrew.wilson@test.com" },
        "vehicle": { "uuid": "199bbbda-...", "display_name": "swift sss FF45678", "plate_number": "FF45678" },
        "driver": { "uuid": "21c9dd04-...", "name": "Young", "internal_id": "FL835447" }
    }
}
```

---

## 8. Delete Issue

**`DELETE /int/v1/issues/{id}`**

Soft-deletes an issue.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Issue `uuid` or `public_id` |

### Response

```json
{
  "issue": { "...deleted issue object..." }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Issue not found." }` |

---

## 9. Assign Issue

**`PUT /int/v1/issues/{id}`**

Assigns an issue to a user by updating `assigned_to_uuid`.

### Request Body

```json
{
  "issue": {
    "assigned_to_uuid": "user-uuid-here"
  }
}
```

---

## 10. Update Issue Status

**`PUT /int/v1/issues/{id}`**

Updates the status of an issue. Status values are automatically dasherized.

### Request Body

```json
{
  "issue": {
    "status": "in-progress"
  }
}
```

### Priority Values

| Priority | UI Label | Description |
|---|---|---|
| `low` | Low | Minor issue, no immediate action needed |
| `medium` | Medium | Moderate impact, action required soon |
| `high` | High | Significant impact, action needed urgently |
| `critical` | Critical | Severe impact, immediate action required |
| `scheduled-maintenance` | Scheduled Maintenance | Planned maintenance activity |

---

### Common Status Values

| Status | UI Label | Description |
|---|---|---|
| `pending` | Pending | Default — issue has been reported but not yet actioned |
| `in-progress` | In progress | Issue is actively being worked on |
| `backlogged` | Backlogged | Issue is acknowledged but deferred |
| `requires-update` | Requires Update | Issue needs more information or an update |
| `in-review` | In Review | Issue is under review before resolution |
| `resolved` | Resolved | Issue has been resolved |
| `closed` | Closed | Issue is closed with no further action needed |

> `resolved_at` is set automatically when status is changed to `resolved`.

---

## 11. Track Issues by Status

Use the filter endpoint to track issues by status:

```
GET /int/v1/issues?status=pending
GET /int/v1/issues?status=in-progress
GET /int/v1/issues?status=backlogged
GET /int/v1/issues?status=requires-update
GET /int/v1/issues?status=in-review
GET /int/v1/issues?status=resolved
GET /int/v1/issues?status=closed
```

Combine with other filters:

```
GET /int/v1/issues?status=pending&priority=high
GET /int/v1/issues?status=in-progress&assigned_to_uuid={uuid}
```

---

## 12. Export Issues

**`GET /int/v1/issues/export`** or **`POST /int/v1/issues/export`**

Exports issues to Excel or CSV.

### Query / Body Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `xlsx` | Export format: `xlsx` or `csv` |
| `selections` | array | all | Array of issue UUIDs to export. If empty, exports all |

### Exported Columns

| Column | Description |
|---|---|
| ID | `public_id` |
| Priority | Priority level |
| Type | Issue type |
| Category | Issue category |
| Reporter | Reporter name |
| Assignee | Assignee name |
| Driver | Driver name |
| Vehicle | Vehicle name |
| Status | Current status |
| Date Created | `created_at` (formatted as `DD/MM/YYYY`) |

### Response

Returns a file download (`issue-{Y-m-d-H:i}.xlsx` or `.csv`).

---

## 13. Bulk Delete Issues

**`DELETE /int/v1/issues/bulk-delete`**

Deletes multiple issues at once.

### Request Body

```json
{
  "ids": [
    "issue-uuid-1",
    "issue-uuid-2",
    "issue-uuid-3"
  ]
}
```
Confirm bulk delete
#### Request Body

```json

{
    "ids": [
        "iss_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "iss_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```

### Response

```json
{
  "deleted": 3
}
```

---

## 14. Users Dropdown (Reported By / Assigned To)

**`GET {{url}}/int/v1/users?limit=500`**

Returns the list of users for the **Reported By** and **Assigned To** dropdown fields on the Create / Edit Issue form. Pass the selected user's `uuid` as `reported_by_uuid` or `assigned_to_uuid` in the issue payload.

### Example Request

```
GET {{url}}/int/v1/users?limit=500
```

### Response

```json
{
    "users": [
        {
            "uuid": "usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "public_id": "USR-0001",
            "name": "John Smith",
            "email": "john.smith@example.com",
            "phone": "+447911123456",
            "status": "active",
            "created_at": "2026-01-10T08:00:00.000000Z",
            "updated_at": "2026-03-28T09:00:00.000000Z"
        }
    ],
    "meta": {
        "total": 12,
        "per_page": 500,
        "current_page": 1,
        "last_page": 1
    }
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `uuid` | UUID | User UUID — pass as `reported_by_uuid` or `assigned_to_uuid` |
| `public_id` | string | Human-readable ID (e.g. `USR-0001`) |
| `name` | string | User display name shown in dropdown |
| `email` | string | User email address |
| `phone` | string | User phone number |
| `status` | string | User account status |

---

## 15. Issue Type & Category Dropdown Values

Static values — no API call needed. These are fixed option sets used by the **Issue Type** and **Issue Category** dropdowns on the Create / Edit Issue form.

### Issue Types

Pass as the `type` field in the issue payload.

| Value | UI Label |
|---|---|
| `vehicle` | Vehicle |
| `driver` | Driver |
| `route` | Route |
| `payload-cargo` | Payload Cargo |
| `software-technical` | Software Technical |
| `operational` | Operational |
| `customer` | Customer |
| `security` | Security |
| `environmental-sustainability` | Environmental Sustainability |

---

### Issue Categories (All — Filter Dropdown)

The **Category** filter dropdown on the Issues list shows all categories combined across all types. Use any of these values in the `category` filter param.

| Category Value |
|---|
| `Mechanical Problems` |
| `Cosmetic Damages` |
| `Tire Issues` |
| `Electronics and Instruments` |
| `Maintenance Alerts` |
| `Fuel Efficiency Issues` |
| `Behavior Concerns` |
| `Documentation` |
| `Time Management` |
| `Communication` |
| `Training Needs` |
| `Health and Safety Violations` |
| `Inefficient Routes` |
| `Safety Concerns` |
| `Blocked Routes` |
| `Environmental Considerations` |
| `Unfavorable Weather Conditions` |
| `Damaged Goods` |
| `Misplaced Goods` |
| `Documentation Issues` |
| `Temperature-Sensitive Goods` |
| `Incorrect Cargo Loading` |
| `Bugs` |
| `UI/UX Concerns` |
| `Integration Failures` |
| `Performance` |
| `Feature Requests` |
| `Security Vulnerabilities` |
| `Compliance` |
| `Resource Allocation` |
| `Cost Overruns` |
| `Vendor Management Issues` |
| `Service Quality` |
| `Billing Discrepancies` |
| `Communication Breakdown` |
| `Feedback and Suggestions` |
| `Order Errors` |
| `Unauthorized Access` |
| `Data Concerns` |
| `Physical Security` |
| `Data Integrity Issues` |
| `Fuel Consumption` |
| `Carbon Footprint` |
| `Waste Management` |
| `Green Initiatives Opportunities` |

---

### Issue Categories (by Type)

On the **Create / Edit Issue** form the category dropdown is filtered by the selected **Issue Type**. Pass as the `category` field in the issue payload.

| Issue Type | Available Categories |
|---|---|
| `vehicle` | `Mechanical Problems`, `Cosmetic Damages`, `Tire Issues`, `Electronics and Instruments`, `Maintenance Alerts`, `Fuel Efficiency Issues` |
| `driver` | `Behavior Concerns`, `Documentation`, `Time Management`, `Communication`, `Training Needs`, `Health and Safety Violations` |
| `route` | `Inefficient Routes`, `Safety Concerns`, `Blocked Routes`, `Environmental Considerations`, `Unfavorable Weather Conditions` |
| `payload-cargo` | `Damaged Goods`, `Misplaced Goods`, `Documentation Issues`, `Temperature-Sensitive Goods`, `Incorrect Cargo Loading` |
| `software-technical` | `Bugs`, `UI/UX Concerns`, `Integration Failures`, `Performance`, `Feature Requests`, `Security Vulnerabilities` |
| `operational` | `Compliance`, `Resource Allocation`, `Cost Overruns`, `Communication`, `Vendor Management Issues` |
| `customer` | `Service Quality`, `Billing Discrepancies`, `Communication Breakdown`, `Feedback and Suggestions`, `Order Errors` |
| `security` | `Unauthorized Access`, `Data Concerns`, `Physical Security`, `Data Integrity Issues` |
| `environmental-sustainability` | `Fuel Consumption`, `Carbon Footprint`, `Waste Management`, `Green Initiatives Opportunities` |

---

## Field Reference

### Issue Fields

| Field | Type | Description |
|---|---|---|
| `id` | integer | Internal issue ID |
| `uuid` | string | Unique issue identifier |
| `public_id` | string | Public-facing issue ID (e.g. `issue_abc123`) |
| `issue_id` | string\|null | Human-readable issue reference (e.g. `ISS-001`) |
| `driver_uuid` | string\|null | UUID of the associated driver |
| `vehicle_uuid` | string\|null | UUID of the associated vehicle |
| `assigned_to_uuid` | string\|null | UUID of the user assigned to resolve the issue |
| `reported_by_uuid` | string\|null | UUID of the user who reported the issue |
| `driver_name` | string\|null | Computed from driver relationship |
| `vehicle_name` | string\|null | Computed from vehicle relationship |
| `assignee_name` | string\|null | Computed from assignee relationship |
| `reporter_name` | string\|null | Computed from reporter relationship |
| `report` | string\|null | Issue description |
| `priority` | string\|null | Priority: `low`, `medium`, `high`, `critical`, `scheduled-maintenance` |
| `type` | string\|null | Issue type (e.g. `mechanical`, `safety`) |
| `category` | string\|null | Issue category (e.g. `vehicle`, `route`) |
| `status` | string | Current status. Default: `pending` |
| `location` | Point\|null | GPS coordinates — `{ type: "Point", coordinates: [lng, lat], bbox: [...] }`. Selectable via map picker on the form. |
| `meta` | object | Additional metadata |
| `resolved_at` | date\|null | Date the issue was resolved |
| `photo_file_uuids` | array | Array of photo file UUIDs |
| `updated_at` | string | Record last updated datetime |
| `created_at` | string | Record creation datetime |

### Relation Fields

| Field | Type | Description |
|---|---|---|
| `driver` | object\|null | Driver object (loaded when `with[]=driver`) |
| `vehicle` | object\|null | Vehicle object (loaded when `with[]=vehicle`) |
| `reporter` | object\|null | User object of reporter (loaded when `with[]=reporter`) |
| `assignee` | object\|null | User object of assignee (loaded when `with[]=assignee`) |

---

## Differences: Internal vs Public API

| Feature | Internal (`/int/v1/issues`) | Public (`/v1/issues`) |
|---|---|---|
| Auth | Session cookie | API credential |
| `uuid`, `public_id` | Both included | `public_id` only as `id` |
| `driver_uuid`, `vehicle_uuid` etc. | Included | Not included |
| Relations | Loaded on demand via `with[]` | Included when loaded |
| Export / Bulk Delete | Available | Not available |
| Typical consumer | Web console | Mobile app / Driver app |
