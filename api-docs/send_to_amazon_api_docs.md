# Send to Amazon API Documentation

> **Base URL:** `{{url}}/api/v1/report-email`
> **Auth:** The `send` and `logs` endpoints require a valid Bearer token. The `track-open`, `r/{token}`, and `download/{token}` endpoints are public (no auth required — they use encrypted tokens).

---

## Overview

The **Send to Amazon** feature generates a fuel or toll report (xlsx/csv) and uploads it directly to the company's configured S3 folder (`AFP_TOLLS/{CARRIER_CODE}/`). After a successful upload the exported records are marked `seen` so they are not re-exported unintentionally.

The same endpoint handles **both fuel and toll** reports — the `report_type` field controls which dataset is exported.

---

## 1. Send Report to Amazon (Fuel or Toll)

**`POST /api/v1/report-email/send`**

Generates a report file from the selected records (or a date-filtered range) and uploads it to S3. Optionally filters records by their `seen_status_of_amazon` value.

### Auth

`Authorization: Bearer {{token}}`

### Request Body

```json
{
    "report_type": "fuel-report",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "filter_param": "ready_to_sent",
    "format": "xlsx",
    "selections": []
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `report_type` | string | **yes** | `fuel-report` or `toll-report` |
| `from_date` | date | no | Start of date range filter (`YYYY-MM-DD`). Also accepted as `start_date`. |
| `to_date` | date | no | End of date range filter (`YYYY-MM-DD`). Also accepted as `end_date`. |
| `filter_param` | string | no | `ready_to_sent` — new records only; `unseen` — previously exported but not yet downloaded; `all` — all seen + unseen records. Omit for no status filter. |
| `format` | string | no | `xlsx` (default) or `csv` |
| `selections` | array | no | Array of record UUIDs to restrict the export. If omitted, all matching records are exported. |

### `filter_param` Behaviour

| Value | Records included |
|---|---|
| `ready_to_sent` | `seen_status_of_amazon = 'new'` (newly created, never exported) |
| `unseen` | Records that have been exported but not yet downloaded by Amazon (`seen_status_of_amazon = 'unseen'`) |
| `all` | Records with `seen_status_of_amazon` of `unseen` **or** `seen` |
| *(omitted)* | No status filter — all records matching the date range / selections |

### S3 Storage Path

Files are stored on S3 at:

```
{AMAZON_AFP_TOLL_FOLDER}/{CARRIER_CODE}/{FILE_PREFIX}{YYYYMMDDHHMMSS}.{ext}
```

- `AMAZON_AFP_TOLL_FOLDER` — configured via `.env` (default: `AFP_TOLLS`)
- `CARRIER_CODE` — first word of the company's carrier name, uppercased (e.g. `AZOQ`)
- `FILE_PREFIX` — `Fuel_Usage_Tracker_` for fuel reports, `Toll_Usage_Tracker_` for toll reports

Example S3 key: `AFP_TOLLS/AZOQ/Toll_Usage_Tracker_20260107103045.xlsx`

### Response — Success

```json
{
    "status": "ok",
    "message": "Report sent successfully",
    "email_log": {
        "uuid": "c1a2b3d4-...",
        "company_uuid": "ac5006be-...",
        "recipient_email": ["admin@example.com"],
        "file_type": "toll-report",
        "reference_token": "aBcDeFgH...",
        "status": "sent",
        "sent_at": "2026-01-07T10:30:45.000000Z",
        "meta": {
            "file_path": "AFP_TOLLS/AZOQ/Toll_Usage_Tracker_20260107103045.xlsx",
            "file_name": "Toll_Usage_Tracker_20260107103045.xlsx",
            "encrypted_token": "eyJ..."
        }
    },
    "download_url": "{{url}}/api/v1/report-email/r/aBcDeFgH...",
    "s3_file_url": "https://s3.amazonaws.com/bucket/AFP_TOLLS/AZOQ/Toll_Usage_Tracker_20260107103045.xlsx"
}
```

> After a successful upload, all exported records are automatically updated:
> `seen_status_of_amazon` → `'seen'`

### Error Responses

| Status | Body | Cause |
|---|---|---|
| `400` | `{ "error": "There are no newly created reports available." }` | `filter_param=ready_to_sent` and no `new` records exist |
| `400` | `{ "error": "There are no unseen records available to generate the report." }` | `filter_param=unseen` and no `unseen` records exist |
| `400` | `{ "error": "There are no records available to generate the report." }` | No records match the given date range / selections |
| `404` | `{ "error": "Company not found." }` | Authenticated user has no company |
| `422` | `{ "error": "..." }` | Validation failure (e.g. invalid `report_type`) |
| `500` | `{ "error": "Failed to upload report to storage: ..." }` | S3 upload error |

---




## Fuel Report — Send to Amazon Example

```json
POST /api/v1/report-email/send
Authorization: Bearer {{token}}
Content-Type: application/json

{
    "report_type": "fuel-report",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "format": "xlsx"
}
```

---

## Toll Report — Send to Amazon Example

```json
POST /api/v1/report-email/send
Authorization: Bearer {{token}}
Content-Type: application/json

{
    "report_type": "toll-report",
    "from_date": "2026-01-01",
    "to_date": "2026-01-31",
    "filter_param": "ready_to_sent",
    "format": "xlsx"
}
```

---

## `seen_status_of_amazon` Lifecycle

```
new  ──(exported via Send to Amazon)──► unseen ──(Amazon downloads file)──► seen
```

| Value | Meaning |
|---|---|
| `new` | Record was just created, never included in a Send to Amazon export |
| `unseen` | Record was included in an export that was uploaded to S3, but Amazon has not yet downloaded the file |
| `seen` | Amazon has downloaded the file containing this record |
