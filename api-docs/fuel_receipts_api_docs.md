# Fuel Receipts API Documentation

> **Base URL:** `{{url}}/int/v1/fuel-expense-receipt-images`
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

> Fuel receipt records are stored in the `expense_receipt_images` table with `report_type = 'fuel'`.
> Records with `is_duplicate = 1` are automatically excluded from all list responses.

---

## 1. Fuel Receipts List

**`GET {{url}}/int/v1/fuel-expense-receipt-images`**

Returns a paginated list of fuel receipt image records for the authenticated company. Excludes duplicates automatically.

### Query Parameters

#### Pagination & Sorting

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `50` | Records per page (max `100`) |
| `page` | integer | `1` | Page number |
| `sort` | string | `-created_at` | Sort field. Prefix `-` for descending. Allowed: `created_at`, `updated_at`, `captured_at`, `status`, `driver_uuid` |

#### Filters

| Param | Type | Description |
|---|---|---|
| `driver_uuid` | UUID | Filter by driver UUID |
| `status` | string | Filter by status: `pending`, `processed`, `failed`, `duplicate` |
| `sync_status` | string | Filter by sync status |
| `start_date` | date | Filter by `captured_at` from date (YYYY-MM-DD) |
| `end_date` | date | Filter by `captured_at` to date (YYYY-MM-DD) |
| `deleted` | integer | `0` = active only (default), `1` = deleted only |

### Example Request

```
GET {{url}}/int/v1/fuel-expense-receipt-images?page=1&limit=50&sort=-created_at
```

### Response

```json
{
    "fuel_receipt_images": [
        {
            "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "company_uuid": "cmp_xxx...",
            "driver_uuid": "drv_xxx...",
            "driver_name": "John Smith",
            "reference_id": 490,
            "file_path": "uploads/fuel-receipts/receipt.jpg",
            "file_uuid": "file_xxx...",
            "is_duplicate": false,
            "geofence_status": null,
            "captured_at": "2026-03-28T08:30:00.000000Z",
            "status": "pending",
            "sync_status": null,
            "latitude": 51.5074,
            "longitude": -0.1278,
            "location_name": "London, UK",
            "extracted_data": {
                "supplier_name": "Humber Bridge",
                "date": "2026-03-28",
                "time": "08:30",
                "total_amount": "12.00",
                "currency": "GBP",
                "volume": "7.01",
                "volume_measurement": "L",
                "product_type": "gasoline (Aral Diesel)",
                "vr_id": "VR-001234",
                "match_status": 0
            },
            "product": "gasoline (Aral Diesel)",
            "amount": "GBP 12.00",
            "product_volume": "7.01 L",
            "created_at": "2026-03-28T09:00:00.000000Z",
            "updated_at": "2026-03-28T09:00:00.000000Z",
            "driver": {
                "uuid": "drv_xxx...",
                "name": "John Smith"
            },
            "file": {
                "uuid": "file_xxx...",
                "url": "https://s3.amazonaws.com/.../receipt.jpg"
            }
        }
    ],
    "meta": {
        "total": 47,
        "per_page": 50,
        "current_page": 1,
        "last_page": 1
    }
}
```

---

## 2. Search Fuel Receipts

**`GET {{url}}/int/v1/fuel-expense-receipt-images?query={search_term}`**

Full-text search across receipt fields.

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `query` | string | Search term — searches across driver name, supplier name, reference ID |

### Example Request

```
GET {{url}}/int/v1/fuel-expense-receipt-images?query=Humber+Bridge
```

### Response

Same structure as [Fuel Receipts List](#1-fuel-receipts-list).

---

## 3. Filter Fuel Receipts

**`GET {{url}}/int/v1/fuel-expense-receipt-images`** with filter query params.

### Filter Parameters

| Param | Type | Description |
|---|---|---|
| `driver_uuid` | UUID | Filter by driver UUID |
| `status` | string | Filter by status — see [Status Dropdown Values](#5-status-dropdown-values) |
| `sync_status` | string | Filter by sync status |
| `start_date` | date | Captured date from (YYYY-MM-DD) |
| `end_date` | date | Captured date to (YYYY-MM-DD) |

### Example Request

```
GET {{url}}/int/v1/fuel-expense-receipt-images?status=pending&start_date=2026-03-01&end_date=2026-03-31
```

### Response

Same structure as [Fuel Receipts List](#1-fuel-receipts-list).

---

## 4. Clear Filters

No dedicated endpoint. Re-issue the list request without filter parameters.

```
GET {{url}}/int/v1/fuel-expense-receipt-images?page=1&limit=50&sort=-created_at
```

---

## 5. Status Dropdown Values

Static values used by the **Status** filter dropdown. No API call needed — these are fixed values.

| Value | Label | Description |
|---|---|---|
| `pending` | Pending | Uploaded, awaiting processing |
| `processed` | Processed | OCR processed, fuel record created |
| `failed` | Failed | Processing failed |
| `duplicate` | Duplicate | Detected as a duplicate of an existing receipt |

---

## 6. View Fuel Receipt

**`GET {{url}}/int/v1/fuel-expense-receipt-images/{id}`**

Returns full details of a single fuel receipt image record including driver and file objects.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Fuel receipt image UUID |

### Example Request

```
GET {{url}}/int/v1/fuel-expense-receipt-images/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response

```json
{
    "fuel_receipt_image": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "company_uuid": "cmp_xxx...",
        "driver_uuid": "drv_xxx...",
        "driver_name": "John Smith",
        "reference_id": 490,
        "file_path": "uploads/fuel-receipts/receipt.jpg",
        "file_uuid": "file_xxx...",
        "is_duplicate": false,
        "geofence_status": null,
        "captured_at": "2026-03-28T08:30:00.000000Z",
        "status": "pending",
        "sync_status": null,
        "latitude": 51.5074,
        "longitude": -0.1278,
        "location_name": "London, UK",
        "extracted_data": {
            "supplier_name": "Humber Bridge",
            "date": "2026-03-28",
            "time": "08:30",
            "total_amount": "12.00",
            "currency": "GBP",
            "volume": "7.01",
            "volume_measurement": "L",
            "product_type": "gasoline (Aral Diesel)",
            "vr_id": "VR-001234",
            "match_status": 0
        },
        "product": "gasoline (Aral Diesel)",
        "amount": "GBP 12.00",
        "product_volume": "7.01 L",
        "created_at": "2026-03-28T09:00:00.000000Z",
        "updated_at": "2026-03-28T09:00:00.000000Z",
        "driver": {
            "uuid": "drv_xxx...",
            "name": "John Smith"
        },
        "file": {
            "uuid": "file_xxx...",
            "url": "https://s3.amazonaws.com/.../receipt.jpg"
        }
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Fuel receipt image resource not found." }` |

---

## 7. Import Fuel Receipts (ZIP)

Upload a ZIP file containing receipt images or PDFs, then trigger import processing.

### Step 1 — Upload ZIP File

**`POST {{url}}/int/v1/files/upload`**

`Content-Type: multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | ZIP archive containing receipt images/PDFs |
| `type` | string | Set to `fuel_report_import` |

**Response:**

```json
{
    "uuid": "file-uuid-here",
    "original_filename": "receipts.zip",
    "content_type": "application/zip",
    "file_size": 204800,
    "url": "https://..."
}
```

### Step 2 — Process ZIP Import

**`POST {{url}}/int/v1/fuel-zip-import/import`**

| Field | Type | Description |
|---|---|---|
| `files` | array of UUIDs | UUID(s) of the uploaded ZIP file(s) from Step 1 |
| `uuid` | UUID | Optional parent UUID for import log tracking |

**Example Request Body:**

```json
{
    "files": ["file-uuid-here"],
    "uuid": "optional-parent-uuid"
}
```

### Supported File Types Inside ZIP

| Type | Extensions |
|---|---|
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`, `.svg` |
| Documents | `.pdf` |

> Spreadsheets (`.xlsx`, `.csv`) inside a ZIP are not processed — upload spreadsheets separately via `/fuel-excel-import/import`.

---

## 8. ZIP Import Result

### Success

```json
{
    "success": true,
    "message": "Import completed successfully. 5 receipt image(s) saved.",
    "inserted_count": 5,
    "xlsx_inserted": 0,
    "xlsx_updated": 0,
    "total_processed": 5,
    "processed_files": [
        {
            "filename": "receipt_001.jpg",
            "processed": 1,
            "created": 1,
            "xlsx_inserted": 0,
            "xlsx_updated": 0
        }
    ],
    "status": "ok"
}
```

### Partial Success

```json
{
    "success": false,
    "partial_success": true,
    "message": "Partial import completed. 3 receipt image(s) saved. 2 error(s) found.",
    "inserted_count": 3,
    "xlsx_inserted": 0,
    "xlsx_updated": 0,
    "total_processed": 5,
    "errors": [
        ["N/A", "Failed to extract data from receipt_bad.jpg", "N/A"]
    ],
    "processed_files": [...],
    "status": "partial"
}
```

### Failure

```json
{
    "success": false,
    "message": "Import failed. No records were saved due to errors.",
    "inserted_count": 0,
    "xlsx_inserted": 0,
    "xlsx_updated": 0,
    "total_processed": 0,
    "errors": [
        ["N/A", "Invalid or empty ZIP file.", "N/A"]
    ],
    "processed_files": [],
    "status": "error"
}
```

### Already Imported

```json
{
    "success": false,
    "already_imported": true,
    "message": "This file has already been imported.",
    "import_log_uuid": "imp_xxx..."
}
```

---

## 9. Process Receipts

**`POST {{url}}/api/v1/expense-reports/process-fuel-receipt-images`**

Processes all pending fuel receipt images for the authenticated company — runs OCR extraction and creates fuel expense records from each receipt.

Triggered by the **Process Receipts** button in the UI.

### Request Body (all optional)

```json
{
    "driver_uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "date_from": "2026-03-01",
    "date_to": "2026-03-31",
    "limit": 200
}
```

| Field | Type | Description |
|---|---|---|
| `driver_uuid` | UUID | Process only receipts for this driver |
| `date_from` | date | Process receipts captured from this date (YYYY-MM-DD) |
| `date_to` | date | Process receipts captured to this date (YYYY-MM-DD) |
| `limit` | integer | Max receipts to process in one call (default `200`) |

### Response — Records Processed

```json
{
    "status": "success",
    "message": "5 fuel record(s) created successfully",
    "data": {
        "processed": 5,
        "created": 5,
        "skipped": 0,
        "total_errors": 0,
        "errors": []
    }
}
```

### Response — Nothing to Process

```json
{
    "status": "success",
    "message": "No pending fuel receipt images found to process",
    "data": {
        "processed": 0,
        "created": 0,
        "skipped": 0,
        "errors": []
    }
}
```

### Response — Partial Success

```json
{
    "status": "success",
    "message": "3 fuel record(s) created successfully",
    "data": {
        "processed": 5,
        "created": 3,
        "skipped": 1,
        "total_errors": 1,
        "errors": [
            ["receipt-uuid", "Vehicle not found for matched VR ID"]
        ]
    }
}
```

---

## 10. Report a Bug

**`POST {{url}}/int/v1/bug-reports/submit`**

Submits a bug report from within the application.

### Request Body

```json
{
    "title": "Receipt image not displaying correctly",
    "description": "When I open a fuel receipt with status Processed, the image fails to load.",
    "severity": "medium",
    "category": "Fuel Receipts",
    "current_url": "https://app.fleetyes.co.uk/fleet-ops/fuel-receipts",
    "current_route": "management.fuel-receipts",
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



## Extracted Data — Field Reference

The `extracted_data` object contains fields extracted from the receipt image via Mindee OCR:

| Field | Type | Description |
|---|---|---|
| `supplier_name` | string | Fuel station / supplier name (shown as **Station** in UI) |
| `date` | string | Transaction date (YYYY-MM-DD) |
| `time` | string | Transaction time (HH:MM) |
| `total_amount` | string | Total cost paid |
| `currency` | string | ISO currency code (e.g. `GBP`, `EUR`) |
| `volume` | string | Fuel volume purchased |
| `volume_measurement` | string | Volume unit (e.g. `L`, `gal`) |
| `product_type` | string | Fuel product type (shown as **Product** in UI) |
| `network_name` | string | Fuel network name |
| `vehicle_vrn` | string | Vehicle registration extracted from receipt |
| `vr_id` | string | Matched vehicle route segment ID |
| `match_status` | integer | `0` = matched, `1` = no match found |

---

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| List Fuel Receipts | `GET` | `/int/v1/fuel-expense-receipt-images` |
| View Fuel Receipt | `GET` | `/int/v1/fuel-expense-receipt-images/{uuid}` |
| Upload ZIP | `POST` | `/int/v1/files/upload` |
| Import ZIP | `POST` | `/int/v1/fuel-zip-import/import` |
| Process Receipts | `POST` | `/api/v1/expense-reports/process-fuel-receipt-images` |
| Submit Bug Report | `POST` | `/int/v1/bug-reports/submit` |

