# Documentation Changes Summary

This file summarises all documentation updates made in this session (excludes `issues_api_docs.md`, `fuel_singe_image_pdf_import_api_docs.md`, and `toll_single_image_pdf_import_api_docs.md`).

---

## 1. `fleet_api_docs.md`

### 1.1 Fleet Status Values — Added UI Label Column

| Value | UI Label | Description |
|---|---|---|
| `active` | Active | Fleet is operational |
| `disabled` | Disabled | Fleet is temporarily inactive |
| `decommissioned` | Decommissioned | Fleet is permanently retired |

---

### 1.2 Create Fleet — `POST /int/v1/fleets`

#### Request Body

```json
{
    "fleet": {
        "name": "Tramper7",
        "status": "active",
        "task": "delivery",
        "trip_length": 5,
        "parent_fleet_uuid": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Fleet name |
| `status` | string | Yes | `active`, `disabled`, `decommissioned`. Defaults to `active` |
| `task` | string | No | Fleet task or role description |
| `trip_length` | integer | No | Expected trip length |
| `parent_fleet_uuid` | UUID | No | UUID of parent fleet (for sub-fleets) |

#### Response

Returns the created fleet object with `public_id`, `uuid`, and all fields.

---

### 1.3 Edit Fleet — `PUT /int/v1/fleets/{id}`

#### Request Body

```json
{
    "fleet": {
        "name": "Tramper7 Updated",
        "status": "active",
        "task": "delivery",
        "trip_length": 6
    }
}
```

---

### 1.4 Bulk Delete Fleets — `DELETE /int/v1/fleets/bulk-delete`

#### Step 1 — Initial Request

```json
{
    "ids": [
        "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "flt_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ]
}
```

#### Step 2 — Confirm Bulk Delete

```json
{
    "ids": [
        "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "flt_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```

#### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 fleets successfully.",
    "count": 2
}
```

| HTTP Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |

---

## 2. `places_api_docs.md`

### 2.1 Create Place — `POST /int/v1/places`

#### Request Body

```json
{
    "place": {
        "name": "newd",
        "phone": "+44565756767",
        "address": "2222+22 KIZAK, TYUMEN OBLAST - KIZAK, 627222, RUSSIA",
        "street1": "2222+22 Kizak, Tyumen Oblast",
        "city": "Kizak",
        "province": "tn",
        "postal_code": "627222",
        "country": "RU",
        "country_name": "Russia",
        "location": {
            "type": "Point",
            "coordinates": [67, 56],
            "bbox": [67, 56, 67, 56]
        },
        "code": "newd"
    }
}
```

#### Location Format

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

> **Tip:** Instead of entering coordinates manually, use the **map picker** on the Create / Edit Place form — click any point on the map to auto-fill coordinates and reverse-geocode the address.

---

### 2.2 Edit Place (Update Map Location) — `PUT /int/v1/places/{id}`

```json
{
    "place": {
        "public_id": "place_jFpR2aD",
        "name": "PLA h",
        "phone": "+445657567",
        "address": "PLA - TEST, TN, 565467, AFGHANISTAN",
        "street1": "TEST",
        "province": "TN",
        "postal_code": "565467",
        "country": "AF",
        "country_name": "Afghanistan",
        "location": {
            "type": "Point",
            "coordinates": [56, 55],
            "bbox": [56, 55, 56, 55]
        },
        "code": "pla",
        "created_at": "2026-04-08T12:44:42.000Z",
        "updated_at": "2026-04-08T12:44:42.000Z"
    }
}
```

> `location.coordinates` must be `[longitude, latitude]`. A `[0, 0]` coordinate is treated as invalid/missing.

---

### 2.3 Import Places

#### Step 1 — Upload File — `POST /int/v1/files/upload`

`Content-Type: multipart/form-data`

| Field | Value |
|---|---|
| `path` | `{AWS_FILE_PATH}/place-imports/{company_uuid}` |
| `disk` | Configured AWS disk |
| `bucket` | Configured AWS bucket |
| `type` | `place_import` |

Accepted file types: `.xls`, `.xlsx`, `.csv`

#### Step 2 — Process Import — `POST /int/v1/places/import`

```json
{
    "files": [
        "uploaded_file_uuid_1",
        "uploaded_file_uuid_2"
    ]
}
```

#### Response — Success

```json
{
    "imported": 20,
    "skipped": 3
}
```

#### Response — Partial Error

```json
{
    "error_log_url": "https://s3.amazonaws.com/.../place-import-errors.csv"
}
```

> If `error_log_url` is present, some rows failed. The page refreshes to show successfully imported places and the error log CSV can be downloaded via `GET {error_log_url}`.

---

### 2.4 Export Places — `GET /int/v1/places/export`

```
GET {{url}}/int/v1/places/export?selections[]=plc_abc123&selections[]=plc_xyz456
```

| Param | Type | Description |
|---|---|---|
| `selections[]` | UUID[] | Place UUIDs to export. If empty, exports all visible places |

Returns a file download (`.xlsx` or `.csv`).



### 2.5 Place Dropdown Values



#### Place Avatar / Icon Picker — `GET /int/v1/fleet-ops/settings/place-avatars`

Returns built-in icons and any custom uploaded avatars.

#### Response

```json
{
    "basic-building": "https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/place-icons/basic-building.png",
    "Custom: depot-logo.png": "file-uuid-here"
}
```

| Field | Description |
|---|---|
| `avatar_url` | Full URL of selected icon — pass when creating/updating a place |
| `avatar_value` | Key/identifier of selected icon |

> Default: `basic-building` — `https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/place-icons/basic-building.png`

---

#### Country Dropdown — `GET /int/v1/country/list?columns=id,name,code,alpha_code2`

Returns the list of countries for the **Country** field on the place form. Pass `alpha_code2` as the `country` value.

#### Example Request

```
GET {{url}}/int/v1/country/list?columns=id%2Cname%2Ccode%2Calpha_code2
```

#### Response

```json
[
    { "id": 15,  "name": "Austria",                "code": "AUT", "alpha_code2": "AT" },
    { "id": 21,  "name": "Belarus",                "code": "BLR", "alpha_code2": "BY" },
    { "id": 22,  "name": "Belgium",                "code": "BEL", "alpha_code2": "BE" },
    { "id": 28,  "name": "Bosnia and Herzegovina", "code": "BIH", "alpha_code2": "BA" },
    { "id": 35,  "name": "Bulgaria",               "code": "BGR", "alpha_code2": "BG" },
    { "id": 55,  "name": "Croatia",                "code": "HRV", "alpha_code2": "HR" },
    { "id": 58,  "name": "Czech Republic",         "code": "CZE", "alpha_code2": "CZ" },
    { "id": 60,  "name": "Denmark",                "code": "DNK", "alpha_code2": "DK" },
    { "id": 74,  "name": "Finland",                "code": "FIN", "alpha_code2": "FI" },
    { "id": 75,  "name": "France",                 "code": "FRA", "alpha_code2": "FR" },
    { "id": 82,  "name": "Germany",                "code": "DEU", "alpha_code2": "DE" },
    { "id": 85,  "name": "Greece",                 "code": "GRC", "alpha_code2": "GR" },
    { "id": 99,  "name": "Hungary",                "code": "HUN", "alpha_code2": "HU" },
    { "id": 105, "name": "Ireland",                "code": "IRL", "alpha_code2": "IE" },
    { "id": 108, "name": "Italy",                  "code": "ITA", "alpha_code2": "IT" },
    { "id": 142, "name": "Moldova",                "code": "MDA", "alpha_code2": "MD" },
    { "id": 153, "name": "Netherlands",            "code": "NLD", "alpha_code2": "NL" },
    { "id": 164, "name": "Norway",                 "code": "NOR", "alpha_code2": "NO" },
    { "id": 175, "name": "Poland",                 "code": "POL", "alpha_code2": "PL" },
    { "id": 176, "name": "Portugal",               "code": "PRT", "alpha_code2": "PT" },
    { "id": 180, "name": "Romania",                "code": "ROU", "alpha_code2": "RO" },
    { "id": 181, "name": "Russian Federation",     "code": "RUS", "alpha_code2": "RU" },
    { "id": 195, "name": "Serbia",                 "code": "SRB", "alpha_code2": "RS" },
    { "id": 199, "name": "Slovakia",               "code": "SVK", "alpha_code2": "SK" },
    { "id": 207, "name": "Spain",                  "code": "ESP", "alpha_code2": "ES" },
    { "id": 213, "name": "Sweden",                 "code": "SWE", "alpha_code2": "SE" },
    { "id": 214, "name": "Switzerland",            "code": "CHE", "alpha_code2": "CH" },
    { "id": 231, "name": "Ukraine",                "code": "UKR", "alpha_code2": "UA" },
    { "id": 233, "name": "United Kingdom",         "code": "GBR", "alpha_code2": "GB" }
]
```

#### Field Reference

| Field | Type | Description |
|---|---|---|
| `id` | integer | Internal country ID |
| `name` | string | Country display name |
| `code` | string | ISO 3166-1 alpha-3 code |
| `alpha_code2` | string | ISO 3166-1 alpha-2 code — use this as the `country` field value |

---

#### Dropdown Summary

| Field | Source | Endpoint / Values |
|---|---|---|
| `type` | Static | `place`, `customer` |
| `avatar_url` / `avatar_value` | API | `GET /int/v1/fleet-ops/settings/place-avatars` |
| `country` | API | `GET /int/v1/country/list?columns=id,name,code,alpha_code2` |

---

## 4. `vehicle_api_docs.md`

> **Base URL:** `{{url}}/int/v1/vehicles`
> **Auth:** Session cookie / authenticated user

---

### 4.1 Inline Create Vehicle — `POST /int/v1/vehicles`

#### Request Body

```json
{
    "vehicle": {
        "plate_number": "AB12 CDE",
        "make": "Ford",
        "model": "Transit",
        "year": "2022",
        "trim": null,
        "type": null,
        "vin": null,
        "status": "Active",
        "fleet_uuid": null,
        "vendor_uuid": null,
        "photo_uuid": null,
        "online": false,
        "last_pmi_date": null,
        "next_pmi_date": null,
        "pmi_interval": null,
        "pmi_interval_unit": null,
        "tachograph_cal_date": null,
        "avatar_url": "https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/vehicle-icons/mini_bus.svg",
        "avatar_value": null,
        "location": {
            "type": "Point",
            "coordinates": [0, 0],
            "bbox": [0, 0, 0, 0]
        }
    }
}
```

#### Required Fields

| Field | Type | Description |
|---|---|---|
| `plate_number` | string | Registration number — auto-converted to uppercase |
| `make` | string | Vehicle manufacturer (e.g. `Ford`, `Mercedes`) |
| `status` | string | Defaults to `Active` if blank |

#### Optional Fields

| Field | Type | Description |
|---|---|---|
| `model` | string | Vehicle model (e.g. `Transit`) |
| `year` | string | Manufacturing year (4-digit) |
| `trim` | string | Vehicle trim level |
| `type` | string | Vehicle type |
| `vin` | string | Vehicle Identification Number |
| `fleet_uuid` | UUID | Fleet assignment (optional) |
| `vendor_uuid` | UUID | Associated vendor UUID |
| `photo_uuid` | UUID | UUID of vehicle photo file |
| `online` | boolean | Whether vehicle is online. Default: `false` |
| `last_pmi_date` | date | Last PMI date (`YYYY-MM-DD`) |
| `next_pmi_date` | date | Next PMI date (`YYYY-MM-DD`) |
| `pmi_interval` | integer | PMI interval value |
| `pmi_interval_unit` | string | PMI interval unit (e.g. `days`, `months`) |
| `tachograph_cal_date` | date | Last tachograph calibration date (`YYYY-MM-DD`) |
| `avatar_value` | string | Avatar icon identifier |

---

### 4.2 Inline Edit Vehicle — `PUT /int/v1/vehicles/{id}`

#### Request Body

```json
{
    "vehicle": {
        "plate_number": "AB12 CDE",
        "make": "Ford",
        "model": "Transit",
        "year": "2022",
        "status": "active",
        "fleet_uuid": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "last_pmi_date": "2026-01-15",
        "tachograph_cal_date": "2025-11-01"
    }
}
```

> Save is triggered immediately on cell change. Bulk paste operations (>50 rows) are saved in batches.

---

### 4.3 Assign Fleet — `PUT /int/v1/vehicles/{id}`

```json
{
    "vehicle": {
        "fleet_uuid": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
}
```

Fleet options loaded from: `GET /int/v1/fleets?limit=500`

---

### 4.4 Update Status — `PUT /int/v1/vehicles/{id}`

```json
{
    "vehicle": {
        "status": "inactive"
    }
}
```

#### Status Values

| Value | Description |
|---|---|
| `active` | Vehicle is operational |
| `inactive` | Vehicle is not in use |

---

### 4.5 Delete Vehicle — `DELETE /int/v1/vehicles/{id}`

```
DELETE {{url}}/int/v1/vehicles/veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Soft-deletes the vehicle after a confirmation prompt.

---

### 4.6 Bulk Delete Vehicles — `DELETE /int/v1/vehicles/bulk-delete`

#### Step 1 — Initial Request

```json
{
    "ids": [
        "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "veh_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ]
}
```

#### Step 2 — Confirm Bulk Delete

```json
{
    "ids": [
        "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "veh_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```

#### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 vehicles successfully.",
    "count": 2
}
```

| HTTP Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |

---

### 4.7 Import Vehicles — `POST /int/v1/vehicles/import`

#### Step 1 — Upload File (`POST /int/v1/files/upload`)

| Field | Value |
|---|---|
| `path` | `{AWS_FILE_PATH}/vehicle-imports/{company_uuid}` |
| `disk` | Configured AWS disk |
| `bucket` | Configured AWS bucket |
| `type` | `vehicle_import` |

Accepted: `.xls`, `.xlsx`, `.csv`

#### Step 2 — Process Import

```json
{
    "files": [
        "uploaded_file_uuid_1",
        "uploaded_file_uuid_2"
    ]
}
```

#### Response — Success

```json
{
    "imported": 15,
    "skipped": 2
}
```

#### Response — Partial Error

```json
{
    "error_log_url": "https://s3.amazonaws.com/.../vehicle-import-errors.csv"
}
```

---

### 4.8 Export Vehicles — `GET /int/v1/vehicles/export`

```
GET {{url}}/int/v1/vehicles/export
```

Exports all visible vehicles. Does not support `selections[]` — always exports all.

---

## 5. `issues_api_docs.md`

> **Base URL:** `{{url}}/int/v1/issues`
> **Auth:** Session cookie / authenticated user

---

### 5.1 Create Issue (Web) — `POST /int/v1/issues`

#### Request Body (Wrapped)

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


#### Response

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
        "report": "Vehicle tyre is flat",
        "priority": "low",
        "status": "pending",
        "location": {
            "type": "Point",
            "coordinates": [0, 0],
            "bbox": [0, 0, 0, 0]
        },
        "meta": [],
        "created_at": "2026-04-08T13:00:27.000Z",
        "updated_at": "2026-04-08T13:00:27.000Z",
        "reporter": { "uuid": "098a8cfe-...", "name": "Wilson", "email": "andrew.wilson@test.com" },
        "assignee": { "uuid": "098a8cfe-...", "name": "Wilson", "email": "andrew.wilson@test.com" },
        "vehicle": { "uuid": "199bbbda-...", "display_name": "swift sss FF45678", "plate_number": "FF45678" },
        "driver": { "uuid": "21c9dd04-...", "name": "Young", "internal_id": "FL835447" }
    }
}
```

---

### 5.2 Edit Issue — `PUT /int/v1/issues/{id}`

#### Request Body

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

> All fields are optional in an edit request — only include what you want to update.

#### Response

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
        "meta": [],
        "resolved_at": null,
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

### 5.3 Bulk Delete Issues — `DELETE /int/v1/issues/bulk-delete`

#### Step 1 — Initial Request

```json
{
    "ids": [
        "iss_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "iss_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ]
}
```

#### Step 2 — Confirm Bulk Delete

```json
{
    "ids": [
        "iss_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "iss_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```

#### Response

```json
{
    "deleted": 3
}
```

---

### 5.4 Location Field (Create / Edit)

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

> **Tip:** On the Create / Edit Issue form, click any point on the map to auto-fill coordinates instead of entering them manually.

---

### 5.5 Priority Dropdown Values

| Value | UI Label | Description |
|---|---|---|
| `low` | Low | Minor issue, no immediate action needed |
| `medium` | Medium | Moderate impact, action required soon |
| `high` | High | Significant impact, action needed urgently |
| `critical` | Critical | Severe impact, immediate action required |
| `scheduled-maintenance` | Scheduled Maintenance | Planned maintenance activity |

---

### 5.6 Status Dropdown Values

| Value | UI Label | Description |
|---|---|---|
| `pending` | Pending | Default — issue reported but not yet actioned |
| `in-progress` | In progress | Issue is actively being worked on |
| `backlogged` | Backlogged | Issue acknowledged but deferred |
| `requires-update` | Requires Update | Needs more information or an update |
| `in-review` | In Review | Under review before resolution |
| `resolved` | Resolved | Issue has been resolved |
| `closed` | Closed | Closed with no further action needed |

> `resolved_at` is set automatically when status changes to `resolved`.

---

### 5.7 Users Dropdown (Reported By / Assigned To) — `GET /int/v1/users?limit=500`

```
GET {{url}}/int/v1/users?limit=500
```

#### Response

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

Pass `uuid` as `reported_by_uuid` or `assigned_to_uuid` in the issue payload.

---

### 5.8 Issue Type Dropdown — Static Values

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

### 5.9 Issue Category Dropdown (by Type)

Category options are filtered by selected Issue Type on the Create / Edit form.

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

The **Category filter** on the Issues list shows all categories combined (flat list across all types).

---

### 5.10 Import Issues 

#### Step 1 — Upload File — `POST /int/v1/files/upload`

`Content-Type: multipart/form-data`

| Field | Value |
|---|---|
| `path` | `{AWS_FILE_PATH}/issue-imports/{company_uuid}` |
| `disk` | Configured AWS disk |
| `bucket` | Configured AWS bucket |
| `type` | `issue_import` |

Accepted file types: `.xls`, `.xlsx`, `.csv`

#### Step 2 — Process Import — `POST /int/v1/issues/import`

```json
{
    "files": [
        "uploaded_file_uuid_1",
        "uploaded_file_uuid_2"
    ]
}
```

#### Response — Success

```json
{
    "status": "ok",
    "message": "Import completed"
}
```

#### Response — Error

```json
{
    "error": "Invalid file, unable to process."
}
```

---

### 5.11 Export Issues — `GET /int/v1/issues/export` or `POST /int/v1/issues/export`

#### Query / Body Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `xlsx` | Export format: `xlsx` or `csv` |
| `selections` | array | all | Array of issue UUIDs to export. If empty, exports all |

#### Example Request

```
GET {{url}}/int/v1/issues/export?format=xlsx
```

#### Exported Columns

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

Returns a file download (`issue-{Y-m-d-H:i}.xlsx` or `.csv`).

---

## Summary Table

| File | What Changed |
|---|---|
| `fleet_api_docs.md` | Added UI Label column to Fleet Status Values; wrapped request bodies under `"fleet"` key; added bulk delete confirm body |
| `places_api_docs.md` | Expanded location format with `bbox` + map picker tip; added Type, Avatar, Country dropdown sections; import/export |
| `vehicle_api_docs.md` | Full API documentation: inline create/edit, assign fleet, update status, delete, bulk delete, import, export |
| `maintenance_api_docs.md` | Full API documentation: list, search, filter, create, view, edit, delete with request/response examples and validation rules |
| `issues_api_docs.md` | Updated create/edit with real request/response bodies; priority (5 values) and status (7 values) dropdowns with UI labels; location map picker tip; users dropdown API; type and category dropdowns; bulk delete confirm body |

