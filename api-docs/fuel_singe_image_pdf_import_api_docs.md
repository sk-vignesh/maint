# Fuel Receipt Image Import API Documentation

> **Base URL:** `{{url}}/int/v1`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## Overview

This API allows you to import fuel receipt images and PDFs by uploading them to the file service and then submitting the file UUIDs to the image import endpoint. Each image is processed through the Mindee OCR API to extract receipt data, which is saved to the `expense_receipt_images` table for review and reconciliation.

A single image may contain multiple receipts — each detected receipt is saved as a separate record. If a vehicle registration number (VRN) is found on the receipt, the system automatically resolves and links the matching vehicle in the company.

---

## Step 1 — Upload Image / PDF

**`POST {{url}}/int/v1/files/upload`**

`Content-Type: multipart/form-data`

Upload the image or PDF before processing. The file UUID returned is used in Step 2.

### Request Fields

| Field | Type | Description |
|---|---|---|
| `file` | file | Image or PDF file to upload |
| `path` | string | `{AWS_FILE_PATH}/fuel-imports/{company_uuid}` |
| `disk` | string | Configured AWS disk |
| `bucket` | string | Configured AWS bucket |
| `type` | string | Set to `fuel-import` |

**Accepted file types:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`, `.svg`, `.pdf`

### Response

```json
{
    "uuid": "file-uuid-here",
    "original_filename": "fuel_receipt.jpg",
    "content_type": "image/jpeg",
    "file_size": 204800,
    "url": "https://..."
}
```

---

## Step 2 — Process Image Import

**`POST {{url}}/int/v1/fuel-image-import/import`**

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
- The Mindee OCR API extracts receipt data (amount, date, vehicle VRN, supplier, etc.).
- If a VRN is found on the receipt, the matching vehicle in the company is automatically resolved and linked.
- A single image may contain multiple receipts — each is saved as a separate `expense_receipt_images` record.
- If extraction fails for a file, that file is logged as `failed` in `expense_receipt_image_logs` and processing continues with the remaining files.

---

## Responses

### Success

```json
{
    "success": true,
    "message": "1 receipt image saved successfully.",
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
| `total_processed` | integer | Number of receipts processed |
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
| `total_processed` | integer | Number of receipts processed before the error(s) |
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

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| Upload image / PDF | `POST` | `/int/v1/files/upload` |
| Process image import | `POST` | `/int/v1/fuel-image-import/import` |
