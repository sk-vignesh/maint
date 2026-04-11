# Toll Receipt Image Import API Documentation

> **Base URL:** `{{url}}/int/v1`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## Overview

This API allows you to import toll receipt images and PDFs by uploading them to the file service and then submitting the file UUIDs to the image import endpoint. Each image is processed through the Mindee OCR API to extract receipt data, which is saved to the `expense_receipt_images` table for review and reconciliation.

If a vehicle registration number (VRN) is detected on the receipt, the system automatically resolves and links the matching vehicle in the company. The crossing date/time is parsed from the extracted `parsed_date` and `parsed_time` fields when available.

---

## Step 1 — Upload Image / PDF

**`POST {{url}}/int/v1/files/upload`**

`Content-Type: multipart/form-data`

Upload the image or PDF before processing. The file UUID returned is used in Step 2.

### Request Fields

| Field | Type | Description |
|---|---|---|
| `file` | file | Image or PDF file to upload |
| `path` | string | `{AWS_FILE_PATH}/toll-imports/{company_uuid}` |
| `disk` | string | Configured AWS disk |
| `bucket` | string | Configured AWS bucket |
| `type` | string | Set to `toll_import` |

**Accepted file types:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`, `.svg`, `.pdf`

### Response

```json
{
    "uuid": "file-uuid-here",
    "original_filename": "toll_receipt.jpg",
    "content_type": "image/jpeg",
    "file_size": 153600,
    "url": "https://..."
}
```

---

## Step 2 — Process Image Import

**`POST {{url}}/int/v1/toll-image-import/import`**

`Content-Type: application/json`

Submits one or more previously uploaded file UUIDs for OCR extraction and import into `expense_receipt_images`.

### Request Body

```json
{
    "files": [
        "file-uuid-1",
        "file-uuid-2"
    ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `files` | array of UUIDs | Yes | File UUIDs returned from the upload step |

### Processing Behaviour

- Each file is validated to be a supported image or PDF type.
- The Mindee OCR API extracts receipt data (amount, crossing date/time, vehicle VRN, location, etc.).
- `captured_at` is derived from `parsed_date` + `parsed_time` fields in the extracted data. If parsing fails, it falls back to the current timestamp.
- If a VRN is found on the receipt, the matching vehicle in the company is automatically resolved and linked.
- Only one receipt record is created per file (unlike the fuel image import which supports multiple receipts per image).
- If extraction fails for a file, that file is logged as `failed` in `expense_receipt_image_logs` and processing continues with the remaining files.

---

## Responses

### Success

```json
{
    "success": true,
    "message": "2 receipt image(s) saved successfully.",
    "inserted_count": 2,
    "total_processed": 2,
    "status": "ok"
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | `true` when all files processed without error |
| `message` | string | Human-readable summary |
| `inserted_count` | integer | Number of receipt records created |
| `total_processed` | integer | Number of files processed |
| `status` | string | `ok` |

---

### Partial Success

Returned when at least one receipt was saved but one or more files had errors.

```json
{
    "success": false,
    "partial_success": true,
    "message": "Partial import completed. 1 receipt image(s) saved, 1 error(s).",
    "inserted_count": 1,
    "total_processed": 1,
    "errors": [
        ["N/A", "Error extracting data from 'receipt2.jpg': Failed to extract data from image.", "N/A"]
    ],
    "status": "partial"
}
```

| Field | Type | Description |
|---|---|---|
| `success` | boolean | `false` when any error occurred |
| `partial_success` | boolean | `true` when at least one receipt was saved despite errors |
| `inserted_count` | integer | Number of receipt records successfully created |
| `total_processed` | integer | Number of files processed before error(s) |
| `errors` | array | Each entry is `[row_ref, error_message, row_data]` |
| `status` | string | `partial` |

---

### Failure — No Receipts Saved

```json
{
    "success": false,
    "message": "Import failed. No receipt images were saved.",
    "inserted_count": 0,
    "total_processed": 0,
    "errors": [
        ["N/A", "'document.xlsx' is not a supported image or PDF file.", "N/A"]
    ],
    "status": "error"
}
```

---

### Failure — Empty / No Supported Files

```json
{
    "success": false,
    "message": "Import failed. No supported image or PDF files were provided.",
    "inserted_count": 0,
    "total_processed": 0,
    "status": "empty"
}
```



---

## Error Responses

| HTTP Status | Body |
|---|---|
| `422` | `{ "success": false, "message": "No files provided for import." }` |
| `422` | `{ "success": false, "message": "No matching file records found." }` |
| `422` | `{ "success": false, "message": "Import failed. No supported image or PDF files were provided.", "status": "empty" }` |
| `422` | `{ "success": false, "message": "Import failed. No receipt images were saved.", "status": "error" }` |

---
Corrected toll expense list
##  Toll Expenses List

**`GET {{url}}/int/v1/fuel-reports?page=1&report_type=toll&sort=-created_at&with%5B%5D=driver&with%5B%5D=vehicle&with%5B%5D=reporter`**

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
    "fuel_reports": [
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
## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| Upload image / PDF | `POST` | `/int/v1/files/upload` |
| Process image import | `POST` | `/int/v1/toll-image-import/import` |
| LIST | `GET` | `/int/v1/fuel-reports?page=1&report_type=toll&sort=-created_at&with%5B%5D=driver&with%5B%5D=vehicle&with%5B%5D=reporter` |
