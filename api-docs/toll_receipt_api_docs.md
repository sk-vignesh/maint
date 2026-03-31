# Toll Receipt API Documentation

> **Base URL:** `{{url}}/int/v1`
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

## 1. Toll Receipts List

**`GET /expense-receipt-images`**

Returns a paginated list of toll receipt images for the authenticated company.
Only records with `report_type = 'toll'` or `report_type = null` are returned. Duplicate receipts (`is_duplicate = 1`) are excluded.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `50` | Records per page (max 100) |
| `sort` | string | `-created_at` | Sort field. Prefix `-` for descending. Allowed: `created_at`, `updated_at`, `captured_at`, `status`, `driver_uuid` |

### Response

```json
{
    "expense_receipt_images": [
        {
            "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "company_uuid": "ac5006be-238e-4928-b622-7454871b98bb",
            "driver_uuid": "d1d1d1d1-e5f6-7890-abcd-ef1234567890",
            "driver_name": "John Smith",
            "reference_id": 1001,
            "file_path": "uploads/receipts/abc123.jpg",
            "file_uuid": "f1f1f1f1-e5f6-7890-abcd-ef1234567890",
            "is_duplicate": false,
            "geofence_status": "inside",
            "captured_at": "2026-03-28T08:30:00+00:00",
            "status": "pending",
            "sync_status": "online",
            "latitude": "51.5074",
            "longitude": "-0.1278",
            "location_name": "M25 Junction 10",
            "extracted_data": {
                "total_amount": "5.50",
                "currency": "GBP",
                "transaction_date": "28/03/2026",
                "transaction_time": "08:30",
                "parsed_vehicle_vrn": "AB12CDE"
            },
            "product": "-",
            "amount": "GBP 5.50",
            "product_volume": "-",
            "created_at": "2026-03-28T09:00:00+00:00",
            "updated_at": "2026-03-28T09:00:00+00:00",
            "driver": { "uuid": "d1d1d1d1-...", "name": "John Smith" },
            "file": { "uuid": "f1f1f1f1-...", "path": "uploads/receipts/abc123.jpg" }
        }
    ],
    "meta": {
        "total": 120,
        "per_page": 50,
        "current_page": 1,
        "last_page": 3
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `403` | `{ "error": "Company context required" }` |

---

## 2. Search Receipts

**`GET /expense-receipt-images`**

There is no dedicated search parameter. Use the filter parameters below to narrow results. The list endpoint returns all non-duplicate toll receipts for the company — combine `driver_uuid`, `status`, date filters, etc. to search effectively.

### Example

```
GET {{url}}/int/v1/expense-receipt-images?driver_uuid=d1d1d1d1-...&status=pending
```

---

## 3. Filter Receipts

**`GET /expense-receipt-images`**

Apply one or more filters to the receipt list.

### Filter Query Parameters

| Param | Type | Description |
|---|---|---|
| `driver_uuid` | UUID | Filter by driver UUID |
| `status` | string | Filter by processing status: `pending`, `processed` |
| `sync_status` | string | Filter by sync status: `online`, `offline_synced` |
| `start_date` | date | Filter `captured_at` from date (YYYY-MM-DD) |
| `end_date` | date | Filter `captured_at` to date (YYYY-MM-DD) |
| `deleted` | integer | `0` = active (default), `1` = deleted only |

### Example Request

```
GET {{url}}/int/v1/expense-receipt-images?status=pending&start_date=2026-03-01&end_date=2026-03-31
```

### Response

Same structure as [Toll Receipts List](#1-toll-receipts-list).

---

## 4. Clear Filters

No dedicated endpoint. Re-issue the list request without any filter parameters.

### Example (cleared)

```
GET {{url}}/int/v1/expense-receipt-images?limit=50
```

---

## 5. View Receipt

**`GET /expense-receipt-images/{id}`**

Returns full details of a single toll receipt image. Accepts either a UUID or internal integer ID.

### URL Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID or integer | Receipt UUID or internal `id` |

### Response

```json
{
    "expense_receipt_image": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "company_uuid": "ac5006be-238e-4928-b622-7454871b98bb",
        "driver_uuid": "d1d1d1d1-e5f6-7890-abcd-ef1234567890",
        "driver_name": "John Smith",
        "reference_id": 1001,
        "file_path": "uploads/receipts/abc123.jpg",
        "file_uuid": "f1f1f1f1-e5f6-7890-abcd-ef1234567890",
        "is_duplicate": false,
        "geofence_status": "inside",
        "captured_at": "2026-03-28T08:30:00+00:00",
        "status": "pending",
        "sync_status": "online",
        "latitude": "51.5074",
        "longitude": "-0.1278",
        "location_name": "M25 Junction 10",
        "extracted_data": {
            "total_amount": "5.50",
            "currency": "GBP",
            "transaction_date": "28/03/2026",
            "transaction_time": "08:30",
            "parsed_vehicle_vrn": "AB12CDE",
            "entry_point": "Junction 10",
            "exit_point": "Junction 12",
            "vehicle_class": "Class 2",
            "raw_text": "..."
        },
        "product": "-",
        "amount": "GBP 5.50",
        "product_volume": "-",
        "created_at": "2026-03-28T09:00:00+00:00",
        "updated_at": "2026-03-28T09:00:00+00:00",
        "driver": { "uuid": "d1d1d1d1-...", "name": "John Smith" },
        "file": { "uuid": "f1f1f1f1-...", "path": "uploads/receipts/abc123.jpg" }
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `403` | `{ "error": "Company context required" }` |
| `404` | `{ "error": "Expense receipt image not found" }` |

---

## 6. Upload Receipt (Mobile / Single Image or PDF)

**`POST /fuel-reports/import`** (routed to `TollReportController@import`)

Uploads a single toll receipt image or PDF. The file is processed via the Mindee OCR API to extract toll data and save it to `expense_receipt_images`.

> **Note:** Images and PDFs uploaded here are OCR-processed directly. Spreadsheet files (CSV/XLSX) are imported as toll reports instead.

### Prerequisites

Upload the file first using the Fleetbase file upload endpoint, then pass the returned file UUID to this endpoint.

### Request Body

```json
{
    "files": ["file-uuid-here"]
}
```

| Field | Type | Description |
|---|---|---|
| `files` | array of UUIDs | UUIDs of previously uploaded `File` records |

### Supported Image/PDF Types

| Type | Extensions |
|---|---|
| Image | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`, `.svg` |
| Document | `.pdf` |

### Processing Flow

1. File MIME type / extension is validated as an image or PDF
2. Mindee OCR API extracts toll data from the image
3. Extracted fields are parsed: date, time, amount, currency, vehicle VRN, entry/exit points
4. Duplicate detection runs (by image hash and by extracted data)
5. Record is saved to `expense_receipt_images` with `status = 'pending'`

### Response — Success

```json
{
    "success": true,
    "message": "Toll import completed successfully",
    "inserted_count": 1,
    "updated_count": 0,
    "skipped_count": 0,
    "total_processed": 1,
    "created_toll_report": 1,
    "updated_toll_report": 0,
    "status": "ok"
}
```

### Response — Processing Error

```json
{
    "success": false,
    "message": "Import failed. No toll reports were imported due to errors.",
    "error_log_url": "https://example.com/storage/error-logs/toll-errors.xlsx",
    "total_errors": 1,
    "errors": [
        ["N/A", "Mindee API key is not configured. Please contact administrator.", "N/A"]
    ],
    "status": "error"
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "No files provided for import." }` |
| `422` | `{ "errors": ["File 'name.jpg' is not a valid image file."] }` |
| `422` | `{ "errors": ["Mindee API key is not configured."] }` |

---

## 7. Bulk Upload (ZIP)

**`POST /toll-zip-import/import`**

Uploads a ZIP archive containing multiple toll receipt images and/or PDFs. Each file inside the archive is extracted and processed via Mindee OCR individually.

### Request Body

```json
{
    "files": ["zip-file-uuid"],
    "uuid": "optional-parent-uuid"
}
```

| Field | Type | Description |
|---|---|---|
| `files` | array of UUIDs | UUID of the uploaded `.zip` File record |
| `uuid` | UUID (optional) | Parent UUID for import log tracking; defaults to zip file UUID |

### Supported ZIP Contents

| Type | Extensions |
|---|---|
| Image | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`, `.svg` |
| Document | `.pdf` |

> Non-image/PDF files inside the ZIP are silently skipped. Subdirectories inside the ZIP are processed recursively.

### Processing Flow

1. ZIP is validated and extracted to a temporary directory
2. Duplicate import check via `ImportLog` (same file not re-imported)
3. Each image/PDF is processed individually:
   - Mindee OCR extracts toll data
   - Vehicle matched by plate number (`parsed_vehicle_vrn`)
   - Saved to `expense_receipt_images` with `report_type = 'toll'`
4. Temp directory is cleaned up
5. Aggregated result returned

### Response — Success

```json
{
    "success": true,
    "message": "File imported successfully. Receipt images have been saved.",
    "inserted_count": 12,
    "total_processed": 12,
    "processed_files": [
        {
            "filename": "receipts.zip",
            "processed": 12,
            "created": 12
        }
    ],
    "status": "ok"
}
```

### Response — Partial Success

```json
{
    "success": false,
    "partial_success": true,
    "message": "Partial import completed. 8 receipt images saved to expense_receipt_images, 4 errors found.",
    "inserted_count": 8,
    "total_processed": 12,
    "errors": [
        ["N/A", "Error extracting data from 'receipt_003.jpg': Mindee API parsing failed.", "N/A"]
    ],
    "processed_files": [
        { "filename": "receipts.zip", "processed": 12, "created": 8 }
    ],
    "status": "partial"
}
```

### Response — Already Imported

```json
{
    "processed_files": [
        {
            "filename": "receipts.zip",
            "processed": 0,
            "created": 0,
            "status": "already_imported",
            "message": "File 'receipts.zip' was already imported successfully."
        }
    ],
    "success": true,
    "status": "ok"
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "No files provided for import." }` |
| `422` | `{ "success": false, "message": "Import failed...", "errors": [...], "status": "error" }` |
| `422` | `{ "errors": [["N/A", "File 'name.csv' is not a zip file.", "N/A"]] }` |
| `422` | `{ "errors": [["N/A", "File 'receipts.zip' was previously imported with errors (Status: ERROR). Please check the previous error log.", "N/A"]] }` |

---

## 8. Process Receipts

Receipts are processed automatically as part of upload (see [Upload Receipt](#6-upload-receipt-mobile--single-image-or-pdf) and [Bulk Upload ZIP](#7-bulk-upload-zip)). There is no separate "process" endpoint — the OCR processing pipeline runs inline during import.

### Processing Pipeline (Mindee OCR)

| Step | Description |
|---|---|
| 1 | Validate file type (image or PDF) |
| 2 | Check Mindee API key is configured |
| 3 | Download file to temp path (for S3/GCS storage) |
| 4 | Call Mindee API V2 to parse receipt |
| 5 | Convert Mindee response to extracted data fields |
| 6 | Detect multiple stacked receipts in a single image |
| 7 | Parse raw text for entry/exit points, vehicle class |
| 8 | Run duplicate detection (image hash + data match) |
| 9 | Save to `expense_receipt_images` (`status = 'pending'`) |
| 10 | Log result to `receipt_process_logs` or `expense_receipt_image_logs` on failure |

### Extracted Data Fields (stored in `extracted_data`)

| Field | Description |
|---|---|
| `total_amount` | Toll charge amount (excl. VAT) |
| `currency` | ISO currency code (e.g. `GBP`) |
| `transaction_date` | Raw date string from receipt |
| `transaction_time` | Time of crossing |
| `parsed_date` | Normalised date (DD/MM/YYYY) |
| `parsed_time` | Normalised time (HH:MM) |
| `parsed_vehicle_vrn` | Vehicle registration number |
| `vehicle_number` | Alternative VRN field |
| `entry_point` | Toll entry location |
| `exit_point` | Toll exit location |
| `vehicle_class` | Vehicle class (e.g. `Class 2`) |
| `raw_text` | Full OCR text from Mindee |

---

## 9. Processing Result

The processing result is returned inline within the import response (sections 6 and 7). Key result fields:

| Field | Type | Description |
|---|---|---|
| `success` | boolean | `true` = all records saved successfully |
| `partial_success` | boolean | `true` = some records saved, some failed |
| `inserted_count` | integer | Number of new receipt records created |
| `total_processed` | integer | Total files/images processed |
| `errors` | array | Error entries: `[id, message, context]` |
| `error_log_url` | string | URL to downloadable Excel error log |
| `processed_files` | array | Per-file stats for ZIP imports |
| `status` | string | `ok`, `partial`, or `error` |

---

## 10. Error Details View

Errors encountered during import are returned in the `errors` array within the import response. Each error entry is an array with three elements:

```json
[
    "N/A",
    "Error extracting data from 'receipt_003.jpg': Mindee API parsing failed.",
    "N/A"
]
```

| Index | Description |
|---|---|
| `[0]` | Row reference (N/A for image imports) |
| `[1]` | Human-readable error message |
| `[2]` | Additional context (N/A for image imports) |

### Common Error Messages

| Error | Cause |
|---|---|
| `"File '...' is not a valid image file."` | Unsupported file type submitted |
| `"Mindee API key is not configured."` | Missing Mindee config in server settings |
| `"Failed to parse image with Mindee API."` | Mindee returned no usable data |
| `"Blurred image detected (future date)."` | OCR extracted a far-future date — likely blurred/unreadable image |
| `"File '...' was previously imported with errors."` | ZIP was imported before and had errors |
| `"File '...' was already imported successfully."` | Duplicate import attempt |

---

## 11. Download Error Log

When an import results in errors, the response includes an `error_log_url` pointing to a downloadable Excel file.

### Error Log URL

```json
{
    "error_log_url": "{{storage_url}}/error-logs/toll-import-errors-20260330120000.xlsx"
}
```

### Error Log Excel Structure

| Column | Description |
|---|---|
| `ID` | Row or file reference |
| `Error Message` | Full error description |

> The error log is generated by `ReceiptProcessErrorsExport` and formatted with a blue header row and auto-sized columns.

---

## 12. Receipt to Expense

After a receipt image is saved (`status = 'pending'`), it is linked to a toll expense record (in `fuel_reports`) via the `receipt_id` field. This linking happens during the OCR processing pipeline:

1. Image is processed → `expense_receipt_images` record created
2. Toll data (VRID, crossing date, amount, vehicle) extracted from OCR
3. A `fuel_report` record is created with `report_type = 'Toll'`
4. `fuel_report.receipt_id` is set to the `expense_receipt_images.id`

### Linked Fields

| `expense_receipt_images` field | `fuel_reports` field | Description |
|---|---|---|
| `id` | `receipt_id` | Links receipt to expense |
| `vehicle_assigned_uuid` | `vehicle_uuid` | Matched vehicle |
| `captured_at` | `crossing_date` | Toll crossing date/time |
| `extracted_data.total_amount` | `amount` | Toll cost |

---

## 13. Receipt Status

Receipt records in `expense_receipt_images` carry two status fields. The UI Filter provides a "Status" dropdown with these static options:

### `status` — Processing Status (Dropdown)

| Value | Description |
|---|---|
| `processed` | Receipt has been matched and linked to a `fuel_report` record |
| `pending` | Receipt uploaded but not yet converted to a toll expense record |
| `failed` | Receipt OCR processing or automated extraction failed |
| `duplicate` | Receipt was detected and marked as a duplicate |

### `sync_status` — Mobile Sync Status

| Value | Description |
|---|---|
| `online` | Receipt was uploaded directly via web/API |
| `offline_synced` | Receipt was captured offline (mobile app) and later synced |

---

## Field Reference — Expense Receipt Image Object

| Field | Type | Description |
|---|---|---|
| `uuid` | UUID | Unique record identifier |
| `company_uuid` | UUID | Company the receipt belongs to |
| `driver_uuid` | UUID | Driver who captured the receipt |
| `driver_name` | string | Driver full name (when loaded) |
| `reference_id` | integer | Internal reference number |
| `file_path` | string | Storage path to the image file |
| `file_uuid` | UUID | UUID of the linked `File` record |
| `is_duplicate` | boolean | `true` if this is a duplicate of another receipt |
| `geofence_status` | string | Geofence position at capture time |
| `captured_at` | ISO 8601 | Date/time the receipt was physically captured |
| `status` | string | Processing status: `pending` or `processed` |
| `sync_status` | string | Sync mode: `online` or `offline_synced` |
| `latitude` | string | GPS latitude at capture |
| `longitude` | string | GPS longitude at capture |
| `location_name` | string | Resolved address/location name |
| `extracted_data` | object | Full OCR-extracted data from Mindee (see fields above) |
| `product` | string | Derived display: `purchase_category (product_type)` |
| `amount` | string | Derived display: `"GBP 5.50"` |
| `product_volume` | string | Derived display: volume + unit |
| `created_at` | ISO 8601 | Record creation timestamp |
| `updated_at` | ISO 8601 | Record last updated timestamp |

---

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| Toll Receipts List | `GET` | `/int/v1/expense-receipt-images` |
| Search / Filter Receipts | `GET` | `/int/v1/expense-receipt-images?status=...` |
| View Receipt | `GET` | `/int/v1/expense-receipt-images/{uuid}` |
| Upload Receipt (single image/PDF) | `POST` | `/int/v1/fuel-reports/import` |
| Bulk Upload (ZIP) | `POST` | `/int/v1/toll-zip-import/import` |

> **Note:** Create, Update, and Delete operations are **not supported** for receipt images (`405 Method Not Allowed`). Receipts are created exclusively via the upload/import endpoints above.
