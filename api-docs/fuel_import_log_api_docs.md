# Fuel Import Log API Documentation

> **Base URL:** `{{url}}/api/v1`
> **Auth:** All endpoints require a valid Bearer token.

---

## Login API

**`POST {{url}}/api/v1/auth/login`**

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

## Fuel Import Logs

**`GET /expense-reports/fuel-import-logs`**

Returns a paginated, combined list of fuel import log entries for the authenticated company. The response merges two sources:

- **`spreadsheet`** logs — from Excel/CSV fuel report imports (`files` + `import_logs` tables, `type = 'fuel_report_import'`)
- **`receipt`** logs — from ZIP-based fuel receipt image imports (`expense_receipt_image_logs` table, `report_type = 'fuel'`)

Both are unified into a single response sorted by `log_date` descending.

### Tabs

The UI exposes three tabs that map directly to the `log_type` query parameter:

| Tab | `log_type` value | Description |
|---|---|---|
| All | _(omit param)_ | Returns both spreadsheet and receipt logs |
| Spreadsheet | `spreadsheet` | Returns Excel/CSV import logs only |
| Receipt | `receipt` | Returns ZIP receipt image logs only |

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `15` | Records per page (max: 100). Also accepted as `per_page` |
| `sort` | string | `-log_date` | Sort field. Use `-log_date` for newest first |
| `log_type` | string | — | Filter by tab: `spreadsheet` or `receipt`. Omit to return both |

### Example Requests

```
GET /api/v1/expense-reports/fuel-import-logs?page=1&sort=-log_date
GET /api/v1/expense-reports/fuel-import-logs?log_type=receipt&page=1&limit=20
GET /api/v1/expense-reports/fuel-import-logs?log_type=spreadsheet&page=1
```

### Response — Success (HTTP 200)

```json
{
    "status": "success",
    "data": [
        {
            "log_type": "spreadsheet",
            "file_uuid": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
            "filename": "fuel_report_march.xlsx",
            "file_url": "https://storage.example.com/uploads/fuel_report_march.xlsx",
            "file_download_url": "http://localhost:8000/int/v1/files/f1a2b3c4-.../download",
            "log_date": "2026-04-01T09:30:00.000000Z",
            "uploader_name": "John Smith",
            "reason": null,
            "import_log_uuid": "imp-uuid-001-...",
            "status": "COMPLETED",
            "error_log_url": "https://storage.example.com/error-logs/fuel_errors.txt",
            "total_records": 200,
            "success_records": 197,
            "failed_records": 3,
            "skipped_records": 0
        },
        {
            "log_type": "receipt",
            "file_uuid": "a9b8c7d6-e5f4-3210-abcd-ef0987654321",
            "filename": "fuel_receipt_001.jpg",
            "file_url": "https://storage.example.com/uploads/fuel_zip_extracted/fuel_receipt_001.jpg",
            "file_download_url": "http://localhost:8000/int/v1/files/a9b8c7d6-.../download",
            "log_date": "2026-04-01T10:00:00.000000Z",
            "uploader_name": null,
            "reason": "OCR extraction failed: image quality too low.",
            "import_log_uuid": null,
            "status": "failed",
            "error_log_url": "http://localhost:8000/int/v1/files/a9b8c7d6-.../download",
            "total_records": null,
            "success_records": null,
            "failed_records": null,
            "skipped_records": null
        }
    ],
    "pagination": {
        "current_page": 1,
        "per_page": 15,
        "total": 35,
        "last_page": 3
    }
}
```

### Response — Error (HTTP 400)

```json
{
    "status": "error",
    "message": "Company context required"
}
```

### Response — Server Error (HTTP 500)

```json
{
    "status": "error",
    "message": "Failed to list fuel import logs",
    "error": "..."
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `status` | string | `success` or `error` |
| `data` | array | Array of log entry objects |
| `pagination.current_page` | integer | Current page number |
| `pagination.per_page` | integer | Records per page |
| `pagination.total` | integer | Total matching records |
| `pagination.last_page` | integer | Last page number |

### Log Entry Fields

| Field | Type | Description |
|---|---|---|
| `log_type` | string | `spreadsheet` (Excel/CSV import) or `receipt` (ZIP image import) |
| `file_uuid` | string | UUID of the imported file |
| `filename` | string | Original filename |
| `file_url` | string\|null | Direct storage URL of the file |
| `file_download_url` | string\|null | Authenticated download URL via the files API (`/int/v1/files/{uuid}/download`) |
| `log_date` | datetime | When the log entry was created |
| `uploader_name` | string\|null | Name of the user who uploaded the file (`spreadsheet` logs only) |
| `reason` | string\|null | Failure reason (`receipt` logs only, when status is `failed`) |
| `import_log_uuid` | string\|null | UUID of the related import log record (`spreadsheet` logs only) |
| `status` | string | See status values below |
| `error_log_url` | string\|null | Download URL — behaviour differs by `log_type` (see Download Behaviour below) |
| `total_records` | integer\|null | Total records in the import (`spreadsheet` logs only) |
| `success_records` | integer\|null | Successfully imported records (`spreadsheet` logs only) |
| `failed_records` | integer\|null | Failed records (`spreadsheet` logs only) |
| `skipped_records` | integer\|null | Skipped records (`spreadsheet` logs only) |

### Status Values

| `log_type` | `status` values |
|---|---|
| `spreadsheet` | `COMPLETED`, `PARTIALLY_COMPLETED`, `ERROR` |
| `receipt` | `success`, `failed`, `partial` |

---

## Download Behaviour

The download action on each log row uses `error_log_url` but behaves differently depending on `log_type`:

### Spreadsheet (`log_type = 'spreadsheet'`)

- Use `error_log_url` to download the **error log text file**.
- This is a public storage URL — no authentication header required.
- Download can be triggered directly (e.g. `window.open(error_log_url)`).

### Receipt (`log_type = 'receipt'`)

- Use `file_download_url` to download the **receipt image or PDF file**.
- This is an internal endpoint (`/int/v1/files/{uuid}/download`) that requires a Bearer token.
- The request must include an `Authorization: Bearer {token}` header.

```js
// Receipt download example
fetch(row.file_download_url, {
    headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.blob())
.then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = row.filename || 'receipt';
    a.click();
    window.URL.revokeObjectURL(url);
});
```
