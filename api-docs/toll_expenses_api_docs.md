# Toll Expenses API Documentation

> **Base URL:** `{{url}}/int/v1/fuel-reports`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## Login API

**`POST {{url}}/int/v1/auth/login`**

### Request

```json
{
    "identity": "[EMAIL_ADDRESS]",
    "password": "[PASSWORD]",
    "remember": false
}
```

### Response

```json
{
    "token": "{{token}}",
    "type": "user"
}
```

---

## 1. Toll Expenses List

**`GET /`**

Returns a paginated list of toll expense records for the authenticated company. Only records with `report_type = 'Toll'` are returned.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `15` | Records per page |
| `sort` | string | `-created_at` | Sort field (prefix `-` for descending) |
| `start_date` | date | — | Filter by crossing date from (YYYY-MM-DD) |
| `end_date` | date | — | Filter by crossing date to (YYYY-MM-DD) |

### Response

```json
{
    "toll_reports": [
        {
            "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "public_id": "toll_abc123",
            "vr_id": "VRID-001234",
            "trip_id": "TRIP-5678",
            "crossing_date": "2026-03-28T08:30:00.000000Z",
            "direction": "NB",
            "amount": 5.50,
            "amount_incl_tax": 6.60,
            "currency": "GBP",
            "match_status": "0",
            "seen_status_of_amazon": "new",
            "report_type": "Toll",
            "status": "pending",
            "vehicle": {
                "uuid": "v1v1v1v1-...",
                "plate_number": "AB12 CDE",
                "name": "Truck 01"
            },
            "driver": {
                "uuid": "d1d1d1d1-...",
                "name": "John Smith"
            },
            "created_at": "2026-03-28T09:00:00.000000Z",
            "updated_at": "2026-03-28T09:00:00.000000Z"
        }
    ],
    "meta": {
        "total": 150,
        "per_page": 15,
        "current_page": 1,
        "last_page": 10
    }
}
```

---

## 2. Search Toll Expenses

**`GET /`**

Uses the same list endpoint with a `query` parameter to search across multiple fields.

### Searchable Fields

- Driver name
- Vehicle plate number
- Vehicle model
- VRID / Trip No (`vr_id`)
- Trip ID (`trip_id`)
- Amazon status (`seen_status_of_amazon`)

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `query` | string | Full-text search term across all searchable fields |

### Example Request

```
GET {{url}}/int/v1/fuel-reports?query=AB12+CDE
```

### Response

Same structure as [Toll Expenses List](#1-toll-expenses-list).

---

## 3. Filter Toll Expenses

**`GET /`**

Apply targeted filters to narrow down the toll expense list.

### Filter Query Parameters

| Param | Type | Description |
|---|---|---|
| `vehicle` | UUID | Filter by vehicle UUID |
| `driver` | UUID | Filter by driver UUID |
| `crossing_date` | date | Filter by exact crossing date (YYYY-MM-DD) |
| `crossing_date_time` | datetime | Filter by exact crossing datetime (YYYY-MM-DD HH:MM:SS) — used for duplicate checks |
| `vr_id` | string | Filter by VRID / Trip No |
| `seen_status_of_amazon` | string | Filter by Amazon status: `new`, `unseen`, `seen` |
| `start_date` | date | Crossing date range start (YYYY-MM-DD) |
| `end_date` | date | Crossing date range end (YYYY-MM-DD) |

### Example Request

```
GET {{url}}/int/v1/fuel-reports?vehicle=v1v1v1v1-...&start_date=2026-03-01&end_date=2026-03-31&seen_status_of_amazon=new
```

### Response

Same structure as [Toll Expenses List](#1-toll-expenses-list).

---

## 4. Clear Filters

There is no dedicated clear-filters endpoint. The frontend resets filter params by sending a request to the list endpoint with no filter query parameters.

### Example (cleared)

```
GET {{url}}/int/v1/fuel-reports?report_type=toll&page=1&limit=15
```

---

## 5. Dropdown Reference Values

Static option sets used by the **Payment Status**, **Payment Method**, and **Direction** dropdowns in the Create / Edit form. No API call needed — these are fixed values.

---

### Vehicle Dropdown

**`GET {{url}}/int/v1/vehicles?limit=999&sort=-created_at`**

Returns all vehicles for the authenticated company. Pass the selected `uuid` as the `vehicle` filter param or `vehicle_uuid` in the request body.

```json
{
    "vehicles": [
        {
            "uuid": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "public_id": "VEH-0001",
            "name": "Truck 01 - AB12 CDE",
            "plate_number": "AB12 CDE"
        }
    ]
}
```

---

### Payment Status (Approval Status)

Sent as the `status` field. Only `pending` is active.

| Value | Label |
|---|---|
| `pending` | Pending |

---

### Payment Method

Sent as the `payment_method` field.

| Value | Label |
|---|---|
| `Card` | Card |
| `Other` | Other |

---

### Direction

Sent as the `direction` field (free-text input in current UI).

| Value | Description |
|---|---|
| `North Bound` | Northbound |
| `South Bound` | Southbound |
| `East Bound` | Eastbound |
| `West Bound` | Westbound |

---

### Status Filter (List Page)

Used as the `seen_status_of_amazon` filter param. Shown as **Status** column in the list view.

| Value | UI Label | Description |
|---|---|---|
| `new` | Awaiting Send | New record, not yet sent to Amazon |
| `unseen` | Unread | Record sent but not yet viewed |
| `seen` | Sent | Record has been sent and viewed |

---

## 6. Import Toll Reports

**`POST /import`**

Imports toll records from Excel, CSV, image files (JPG, PNG, PDF, etc.), or zip archives.

<!-- > Zip file imports use a separate endpoint: `POST {{url}}/int/v1/toll-zip-import/import` -->

### Supported File Types

| Type | Extensions |
|---|---|
| Spreadsheet | `.csv`, `.tsv`, `.xls`, `.xlsx` |
<!-- | Image / Receipt | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`, `.svg` | -->
<!-- | Document | `.pdf` |
| Archive | `.zip` (via zip-import endpoint) | -->

> **Note:** Files that were previously exported from toll reports (`TOLL_USAGE_TRACKER_*`) cannot be re-imported.

### Request Body

```json
{
    "files": [
        "file-uuid-1",
        "file-uuid-2"
    ]
}
```

| Field | Type | Description |
|---|---|---|
| `files` | array of UUIDs | UUIDs of previously uploaded `File` records |

### Response — Success

```json
{
    "success": true,
    "message": "Toll import completed successfully",
    "inserted_count": 42,
    "updated_count": 5,
    "skipped_count": 3,
    "total_processed": 50,
    "created_toll_report": 42,
    "updated_toll_report": 5,
    "status": "ok"
}
```

### Response — Partial Success (with errors)

```json
{
    "success": false,
    "partial_success": true,
    "successful_imports": 30,
    "created_toll_report": 30,
    "updated_toll_report": 0,
    "total_errors": 5,
    "message": "Partial import completed. 30 toll reports created, 0 toll reports updated, 5 errors found.",
    "error_log_url": "https://example.com/storage/error-logs/toll-import-errors.xlsx"
}
```

### Response — Already Processed File

```json
{
    "success": true,
    "already_processed": true,
    "message": "File 'toll_data.xlsx' was already imported successfully.",
    "summary": {
        "total_processed": 0,
        "created": 0,
        "updated": 0,
        "skipped": 0
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `422` | `{ "errors": ["File was exported from toll reports and cannot be re-uploaded."] }` |
| `422` | `{ "errors": ["Import failed: Maximum of 5000 rows allowed. Your file contains 6000 rows."] }` |
| `400` | `{ "error": "No files provided for import." }` |

---


---

## 7. Import Result

The import result is included directly in the response of `POST /import`. See [Import Toll Reports](#5-import-toll-reports) for the full response structure including:

- `inserted_count` / `created_toll_report` — number of new records created
- `updated_count` / `updated_toll_report` — number of existing records updated
- `skipped_count` — number of rows skipped (e.g. duplicates)
- `total_processed` — total rows processed
- `error_log_url` — downloadable error log (when errors exist)

---

## 8. Add Toll Record

**`POST /`**

Creates a single new toll expense record.

### Request Body

```json
{
    "vr_id": "VRID-001234",
    "trip_id": "TRIP-5678",
    "crossing_date": "2026-03-28T08:30:00.000Z",
    "direction": "NB",
    "amount": 5.50,
    "amount_incl_tax": 6.60,
    "currency": "GBP",
    "vehicle_uuid": "v1v1v1v1-e5f6-7890-abcd-ef1234567890",
    "driver_uuid": "d1d1d1d1-e5f6-7890-abcd-ef1234567890",
    "status": "pending",
    "toll_json": {}
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `vr_id` | string | recommended | VRID / Trip No (used for duplicate detection with `crossing_date`) |
| `crossing_date` | ISO 8601 datetime | recommended | Toll crossing date and time |
| `trip_id` | string | no | Trip identifier |
| `direction` | string | no | Direction of travel (e.g. `NB`, `SB`) |
| `amount` | decimal | no | Cost excluding VAT |
| `amount_incl_tax` | decimal | no | Cost including VAT |
| `currency` | string | no | ISO currency code (e.g. `GBP`) |
| `vehicle_uuid` | UUID | no | UUID of the vehicle |
| `driver_uuid` | UUID | no | UUID of the driver |
| `status` | string | no | Record status (default: `pending`) |
| `toll_json` | object | no | Additional toll metadata (JSON) |

> Duplicate detection: If a record with the same `vr_id` **and** `crossing_date` (exact datetime) already exists, the request is rejected.

### Response — Success

```json
{
    "toll_report": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "public_id": "toll_abc123",
        "vr_id": "VRID-001234",
        "trip_id": "TRIP-5678",
        "crossing_date": "2026-03-28T08:30:00.000000Z",
        "direction": "NB",
        "amount": 5.50,
        "amount_incl_tax": 6.60,
        "currency": "GBP",
        "report_type": "Toll",
        "status": "pending",
        "created_at": "2026-03-30T10:00:00.000000Z"
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "A toll report with the same VRID and crossing date/time already exists." }` |

---

## 9. Edit Toll Record

**`PUT /{id}`**

Updates an existing toll expense record by its UUID.

### URL Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | UUID of the toll report to update |

### Request Body

Same fields as [Add Toll Record](#7-add-toll-record). Only include fields you wish to update.

```json
{
    "vr_id": "VRID-001234",
    "crossing_date": "2026-03-28T08:30:00.000Z",
    "amount": 6.00,
    "amount_incl_tax": 7.20,
    "direction": "SB"
}
```

> `report_type` is always enforced as `"Toll"` regardless of what is passed.
> Duplicate detection excludes the current record from the check.

### Response — Success

```json
{
    "toll_report": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "vr_id": "VRID-001234",
        "crossing_date": "2026-03-28T08:30:00.000000Z",
        "amount": 6.00,
        "amount_incl_tax": 7.20,
        "direction": "SB",
        "updated_at": "2026-03-30T11:00:00.000000Z"
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Toll report not found" }` |
| `400` | `{ "error": "A toll report with the same VRID and crossing date/time already exists." }` |

---

## 10. View Toll Details

**`GET /{id}`**

Returns the full details of a single toll expense record.

### URL Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | UUID of the toll report |

### Response

```json
{
    "toll_report": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "public_id": "toll_abc123",
        "vr_id": "VRID-001234",
        "trip_id": "TRIP-5678",
        "crossing_date": "2026-03-28T08:30:00.000000Z",
        "direction": "NB",
        "amount": 5.50,
        "amount_incl_tax": 6.60,
        "currency": "GBP",
        "match_status": "0",
        "seen_status_of_amazon": "new",
        "report_type": "Toll",
        "status": "pending",
        "toll_json": {},
        "vehicle": {
            "uuid": "v1v1v1v1-...",
            "plate_number": "AB12 CDE",
            "name": "Truck 01"
        },
        "driver": {
            "uuid": "d1d1d1d1-...",
            "name": "John Smith"
        },
        "reporter": {
            "uuid": "r1r1r1r1-...",
            "name": "Admin User"
        },
        "created_at": "2026-03-28T09:00:00.000000Z",
        "updated_at": "2026-03-28T09:00:00.000000Z"
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Toll report not found" }` |

---

## 11. Export Toll Data

**`GET /export`** or **`POST /export`**

Exports toll expense records to an Excel (`.xlsx`) or CSV file.

### Query / Body Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `xlsx` | Export format: `xlsx` or `csv` |
| `selections` | array of UUIDs | `[]` | Export specific records by UUID; omit to export all |
| `from_date` | date | — | Start of crossing date range (YYYY-MM-DD) |
| `to_date` | date | — | End of crossing date range (YYYY-MM-DD) |
| `start_date` | date | — | Alias for `from_date` |
| `end_date` | date | — | Alias for `to_date` |
| `filter_by` | string | — | Status filter: `ready_to_sent` (new), `all` (unseen+seen), `unseen` |

### Exported Columns

| Column | Description |
|---|---|
| VRID / Trip No | `vr_id` |
| Date | `crossing_date` |
| Vehicle Registration | `vehicle.plate_number` |
| Direction | `direction` |
| Cost | `amount` (excl. VAT) |
| Cost Incl VAT | `amount_incl_tax` |
| Toll Location | Derived from `toll_json` |
| Match Status | `match_status` |

### Example Request

```
GET {{url}}/int/v1/fuel-reports/export?format=xlsx&from_date=2026-03-01&to_date=2026-03-31&filter_by=ready_to_sent
```

### Response

Returns a binary file download (`.xlsx` or `.csv`).

- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx) or `text/csv`
- **Content-Disposition:** `attachment; filename="Toll_Usage_Tracker_YYYYMMDDHHMMSS.xlsx"`

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "No toll data available for the selected date range." }` |

---

## 12. Delete Toll Record

**`DELETE /{id}`**

Soft-deletes a single toll expense record.

### URL Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | UUID of the toll report to delete |

### Response — Success

```json
{
    "status": "ok",
    "message": "Toll report deleted successfully."
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Toll report not found" }` |

---

## 13. Bulk Delete Toll Records

**`DELETE /bulk-delete`**

Deletes multiple toll expense records in a single request.

### Request Body

```json
{
    "ids": [
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "b2c3d4e5-f6a7-8901-bcde-f12345678901"
    ]
}
```

### Response — Success

```json
{
    "status": "ok",
    "deleted": 2
}
```

---

## 14. Send to Amazon (Export)

**`POST {{url}}/api/v1/report-email/send`**

Generates the toll report file and sends it to the configured Amazon recipient email. Triggered by the **Send to Amazon** button in the Export modal.

After a successful send, all `new` / `unseen` toll records in the selected date range are updated to `seen_status_of_amazon = 'seen'`.

### Request Body

```json
{
    "report_type": "toll-report",
    "from_date": "2025-12-01",
    "to_date": "2025-12-31",
    "filter_param": "ready_to_sent"
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `report_type` | string | **Yes** | Must be `"toll-report"` |
| `from_date` | date | No | Start of date range (YYYY-MM-DD). Alias: `start_date` |
| `to_date` | date | No | End of date range (YYYY-MM-DD). Alias: `end_date` |
| `filter_param` | string | No | `ready_to_sent` (new records only), `unseen`, `all` |

### Response — Success

```json
{
    "status": "ok",
    "message": "Report sent successfully",
    "email_log": { ... },
    "download_url": "https://...",
    "s3_file_url": "https://..."
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "There are no newly created reports available." }` |
| `400` | `{ "error": "There are no unseen records available to generate the report." }` |
| `400` | `{ "error": "There are no records available to generate the report." }` |
| `422` | `{ "error": "Validation error message" }` |

---

## 15. Download Export File

**`GET {{url}}/int/v1/fuel-reports/export`** or **`POST {{url}}/int/v1/fuel-reports/export`**

Downloads the toll report as an `.xlsx` or `.csv` file directly (without sending by email).

### Query / Body Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `xlsx` | Export format: `xlsx` or `csv` |
| `report_type` | string | — | Pass `toll` to scope to toll records |
| `selections` | array of UUIDs | `[]` | Export specific records by UUID; omit to export all |
| `from_date` / `start_date` | date | — | Start of crossing date range (YYYY-MM-DD) |
| `to_date` / `end_date` | date | — | End of crossing date range (YYYY-MM-DD) |
| `filter_by` | string | — | `ready_to_sent` (new), `all` (unseen + seen), `unseen` |

### Example Request

```
GET {{url}}/int/v1/fuel-reports/export?format=csv&from_date=2025-12-01&to_date=2025-12-31
```

### Response

Returns a binary file download.

- **Content-Disposition:** `attachment; filename="Toll_Usage_Tracker_YYYYMMDDHHMMSS.xlsx"`

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "No toll data available for the selected date range." }` |

---

## 16. Report a Bug

**`POST {{url}}/int/v1/bug-reports/submit`**

Submits a bug report from within the application.

### Request Body

```json
{
    "title": "Toll record not saving direction",
    "description": "When I create a toll record and select South Bound, the direction field is blank after saving.",
    "severity": "medium",
    "category": "Toll Expenses",
    "current_url": "https://app.example.com/fleet-ops/toll-reports",
    "current_route": "management.toll-reports",
    "screenshot_base64": "data:image/png;base64,..."
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **Yes** | Short bug title (max 255 chars) |
| `description` | string | **Yes** | Detailed description (max 5000 chars) |
| `severity` | string | No | `low`, `medium` (default), `high`, `critical` |
| `category` | string | No | Module or feature area (max 100 chars) |
| `current_url` | string | No | Page URL where the bug occurred |
| `current_route` | string | No | Application route name |
| `user_agent` | string | No | Browser user agent string |
| `browser_info` | object | No | Browser details |
| `device_info` | object | No | Device details |
| `screen_info` | object | No | Screen resolution / dimensions |
| `screenshot` | file | No | Screenshot file (jpg, png, gif, bmp, webp — max 10 MB) |
| `screenshot_base64` | string | No | Screenshot as base64 string |
| `screenshot_urls` | array | No | Array of screenshot URLs |
| `additional_data` | array | No | Any extra context data |

### Response

```json
{
    "success": true,
    "message": "Bug report submitted successfully. Our support team will review it shortly.",
    "data": {
        "bug_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "status": "open",
        "severity": "medium",
        "jira_ticket_key": null
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `422` | `{ "errors": { "title": ["The title field is required."] } }` |

---

## Field Reference — Toll Report Object

| Field | Type | Description |
|---|---|---|
| `uuid` | UUID | Unique identifier |
| `public_id` | string | Public-facing ID (e.g. `toll_abc123`) |
| `vr_id` | string | VRID / Trip No from the toll provider |
| `trip_id` | string | Trip identifier |
| `crossing_date` | ISO 8601 datetime | Date and time of toll crossing |
| `direction` | string | Travel direction (e.g. `NB` = Northbound, `SB` = Southbound) |
| `amount` | decimal | Toll cost excluding VAT |
| `amount_incl_tax` | decimal | Toll cost including VAT |
| `currency` | string | ISO currency code (e.g. `GBP`) |
| `match_status` | string | `0` = matched, `1` = no match |
| `seen_status_of_amazon` | string | Amazon reporting status: `new`, `unseen`, `seen` |
| `report_type` | string | Always `"Toll"` for toll expense records |
| `status` | string | Record status (e.g. `pending`) |
| `toll_json` | object | Raw toll metadata JSON from import |
| `receipt_id` | integer | Linked `expense_receipt_images` ID (set during receipt image processing) |
| `vehicle_uuid` | UUID | Associated vehicle |
| `driver_uuid` | UUID | Associated driver |
| `import_file_hash` | string | Hash of the source import file (for duplicate detection) |
| `import_filename` | string | Original filename of the import source |
| `created_at` | ISO 8601 | Record creation timestamp |
| `updated_at` | ISO 8601 | Record last updated timestamp |

---

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| List Toll Expenses | `GET` | `/int/v1/fuel-reports?report_type=toll` |
| Search Toll Expenses | `GET` | `/int/v1/fuel-reports?query=...` |
| Filter Toll Expenses | `GET` | `/int/v1/fuel-reports?vehicle=...&start_date=...` |
| Vehicle Dropdown | `GET` | `/int/v1/vehicles?limit=999` |
| View Toll Details | `GET` | `/int/v1/fuel-reports/{uuid}` |
| Add Toll Record | `POST` | `/int/v1/fuel-reports` |
| Edit Toll Record | `PUT` | `/int/v1/fuel-reports/{uuid}` |
| Delete Toll Record | `DELETE` | `/int/v1/fuel-reports/{uuid}` |
| Bulk Delete | `DELETE` | `/int/v1/fuel-reports/bulk-delete` |
| Download Export | `GET/POST` | `/int/v1/fuel-reports/export` |
| Send to Amazon | `POST` | `/api/v1/report-email/send` |
| Import Toll Reports | `POST` | `/int/v1/fuel-reports/import` |
| Submit Bug Report | `POST` | `/int/v1/bug-reports/submit` |

