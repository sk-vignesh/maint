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
| `status` | string | Filter by status (e.g. `pending`, `in-progress`, `resolved`) |
| `priority` | string | Filter by priority (e.g. `low`, `medium`, `high`, `critical`) |
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

### Request Body

```json
{
  "issue": {
    "driver_uuid": "driver-uuid-here",
    "vehicle_uuid": "vehicle-uuid-here",
    "reported_by_uuid": "user-uuid-here",
    "assigned_to_uuid": "user-uuid-here",
    "category": "vehicle",
    "type": "mechanical",
    "report": "Vehicle tyre is flat",
    "priority": "high",
    "status": "pending",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.076]
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
| `driver_uuid` | string | UUID of the driver involved |
| `vehicle_uuid` | string | UUID of the vehicle involved |
| `reported_by_uuid` | string | UUID of the user reporting the issue |
| `assigned_to_uuid` | string | UUID of the user assigned to resolve the issue |
| `category` | string | Issue category (e.g. `vehicle`, `route`) |
| `type` | string | Issue type (e.g. `mechanical`, `safety`) |
| `priority` | string | Priority level: `low`, `medium`, `high`, `critical` |
| `status` | string | Issue status. Defaults to `pending` |
| `location` | Point | GPS coordinates of the issue |
| `meta` | object | Additional metadata |

### Response

```json
{
  "issue": { "...issue object..." }
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
| `location` | Point | GPS coordinates of the issue |

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
    "report": "Updated description",
    "priority": "critical",
    "category": "safety",
    "type": "brakes",
    "status": "in-progress"
  }
}
```

### Updatable Fields

| Field | Type | Description |
|---|---|---|
| `report` | string | Updated issue description |
| `priority` | string | Updated priority |
| `category` | string | Updated category |
| `type` | string | Updated type |
| `status` | string | Updated status |
| `assigned_to_uuid` | string | Reassign to a different user |
| `resolved_at` | date | Date the issue was resolved |
| `meta` | object | Updated metadata |

### Response

```json
{
  "issue": { "...updated issue object..." }
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

### Common Status Values

| Status | Description |
|---|---|
| `pending` | Default — issue has been reported but not yet actioned |
| `in-progress` | Issue is being worked on |
| `resolved` | Issue has been resolved |
| `closed` | Issue is closed |

> `resolved_at` is set automatically when status is changed to `resolved`.

---

## 11. Track Issues by Status

Use the filter endpoint to track issues by status:

```
GET /int/v1/issues?status=pending
GET /int/v1/issues?status=in-progress
GET /int/v1/issues?status=resolved
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

### Response

```json
{
  "deleted": 3
}
```

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
| `priority` | string\|null | Priority: `low`, `medium`, `high`, `critical` |
| `type` | string\|null | Issue type (e.g. `mechanical`, `safety`) |
| `category` | string\|null | Issue category (e.g. `vehicle`, `route`) |
| `status` | string | Current status. Default: `pending` |
| `location` | Point\|null | GPS coordinates (GeoJSON Point) |
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
