# Fuel Expenses API Documentation

> **Base URL:** `{{url}}/int/v1/fuel-expenses`
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

## 1. Fuel Tracking List

**`GET {{url}}/int/v1/fuel-expenses`**

Returns a paginated list of fuel expense records for the authenticated company.

### Query Parameters

#### Pagination & Sorting

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `15` | Records per page |
| `sort` | string | `-created_at` | Sort field. Prefix `-` for descending |

#### Example Request

```
GET {{url}}/int/v1/fuel-expenses?page=1&limit=15&sort=-created_at
```

### Response

```json
{
    "fuel_expenses": [
        {
            "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "public_id": "fexp_abc123",
            "report_type": "Fuel",
            "status": "pending",
            "report": "Fuel fill-up at Shell M25",
            "odometer": "45200",
            "amount": 85.50,
            "amount_incl_tax": 102.60,
            "converted_amount": null,
            "converted_currency": null,
            "currency": "GBP",
            "volume": "75.5",
            "metric_unit": "L",
            "payment_method": "Card",
            "card_type": "Visa",
            "vr_id": "VR-001234",
            "trip_id": "TRIP-5678",
            "crossing_date": "2026-03-28T08:30:00.000000Z",
            "direction": null,
            "location": {
                "type": "Point",
                "coordinates": [-0.1278, 51.5074]
            },
            "reporter_name": "Admin User",
            "driver_name": "John Smith",
            "vehicle_name": "Truck 01 - AB12 CDE",
            "seen_status_of_amazon": "new",
            "receipt_id": null,
            "created_at": "2026-03-28T09:00:00.000000Z",
            "updated_at": "2026-03-28T09:00:00.000000Z"
        }
    ],
    "meta": {
        "total": 120,
        "per_page": 15,
        "current_page": 1,
        "last_page": 8
    }
}
```

---

## 2. Search Fuel Records

**`GET {{url}}/int/v1/fuel-expenses?query={search_term}`**

Full-text search across multiple fields with 200ms debounce on the frontend.

### Searchable Fields

- Driver name
- Vehicle plate number
- Vehicle model
- `public_id`
- `vr_id`
- `trip_id`
- `seen_status_of_amazon`
- Reporter name

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `query` | string | Search term |

### Example Request

```
GET {{url}}/int/v1/fuel-expenses?query=AB12+CDE
```

### Response

Same structure as [Fuel Tracking List](#1-fuel-tracking-list).

---

## 3. Filter Fuel Records

**`GET {{url}}/int/v1/fuel-expenses`** with filter query params.

### Filter Parameters

#### Text / ID Filters

| Param | Type | Description |
|---|---|---|
| `public_id` | string | Filter by public ID (shown as **ID** in UI) |
| `vr_id` | string | Filter by VRID / Trip No |
| `odometer` | string | Filter by odometer reading |
| `receipt_id` | string | Filter by linked receipt ID |
| `seen_status_of_amazon` | string | `new`, `unseen`, `seen` |

#### Dropdown Filters

| Param | Type | Description |
|---|---|---|
| `vehicle` | UUID | Filter by vehicle — selected from **Vehicle** dropdown |
| `payment_method` | string | Filter by payment method (**Payment Status** dropdown): `Card`, `Cash`, `Other` |
| `driver` | UUID / public_id / name | Filter by driver |
| `reporter` | UUID / public_id / name | Filter by reporter |
| `status` | string (comma-separated) | Filter by approval status: `pending`, `approved`, `rejected` |
| `report_type` | string | Filter by report type (case-insensitive: `fuel`) |

#### Date Filters

| Param | Type | Description |
|---|---|---|
| `crossing_date` | date or range | Filter by transaction date (`YYYY-MM-DD` or `YYYY-MM-DD,YYYY-MM-DD`) |
| `from_date` | date | Transaction/created date from (YYYY-MM-DD) |
| `to_date` | date | Transaction/created date to (YYYY-MM-DD) |
| `created_at` | date or range | Filter by record creation date |
| `updated_at` | date or range | Filter by last updated date |

#### Numeric Filters

| Param | Type | Description |
|---|---|---|
| `volume` | string | Filter by fuel volume value |

### Example Request

```
GET {{url}}/int/v1/fuel-expenses?vehicle=veh_xxx&payment_method=Card&from_date=2026-03-01&to_date=2026-03-31
```

### Response

Same structure as [Fuel Tracking List](#1-fuel-tracking-list).

---

## 4. Vehicle Dropdown

**`GET {{url}}/int/v1/vehicles`**

Returns a list of vehicles for the **Vehicle** filter dropdown. Scoped to the authenticated company.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `999` | Use a high limit to load all vehicles for dropdown |
| `sort` | string | `-created_at` | Sort order |

### Example Request

```
GET {{url}}/int/v1/vehicles?limit=999&sort=-created_at
```

### Response

```json
{
    "vehicles": [
        {
            "uuid": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "public_id": "VEH-0001",
            "name": "Truck 01 - AB12 CDE",
            "display_name": "Truck 01 - AB12 CDE",
            "plate_number": "AB12 CDE",
            "make": "Volvo",
            "model": "FH16",
            "year": "2022",
            "status": "active"
        }
    ],
    "meta": {
        "total": 25,
        "per_page": 999,
        "current_page": 1,
        "last_page": 1
    }
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `uuid` | UUID | Vehicle UUID — pass as `vehicle` filter param |
| `public_id` | string | Human-readable ID (e.g. `VEH-0001`) |
| `name` / `display_name` | string | Display label shown in dropdown |
| `plate_number` | string | Vehicle registration plate |
| `make` | string | Vehicle manufacturer |
| `model` | string | Vehicle model |
| `year` | string | Vehicle year |
| `status` | string | Vehicle status |

### Error Responses

| Status | Body |
|---|---|
| `401` | `{ "error": "Unauthorized" }` |

---

## 5. Dropdown Reference Values

Static option sets used by the **Payment Status**, **Payment Method**, and **Volume** dropdowns in the Create / Edit form. No API call needed — these are fixed values sent in the request body.

---

### Payment Status (Approval Status)

Sent as the `status` field.

| Value | Label |
|---|---|
| `pending` | Pending |
| `approved` | Approved |
| `rejected` | Rejected |

---

### Payment Method

Sent as the `payment_method` field.

| Value | Label |
|---|---|
| `Card` | Card |
| `Other` | Other |

---

### Volume — Metric Unit

Sent as the `metric_unit` field alongside the `volume` value.

| Value | Label |
|---|---|
| `mL` | Milliliter *(mL)* |
| `cL` | Centiliter *(cL)* |
| `dL` | Deciliter *(dL)* |
| `kg` | Kilogram *(kg)* |
| `dm` | Decimeter *(dm)* |
| `L` | Liter *(L)* — **default** |
| `gal` | Gallon (US) *(gal)* |
| `pt` | Pint (US) *(pt)* |
| `qt` | Quart (US) *(qt)* |

---

## 6. Clear Filters

No dedicated endpoint. Re-issue the list request without filter parameters.

### Example (cleared)

```
GET {{url}}/int/v1/fuel-expenses?page=1&limit=15&sort=-created_at
```

---

## 7. Upload Fuel Data (Import)

Upload a file before processing. Supports Excel/CSV spreadsheets, images, PDFs, and ZIP archives containing receipt images.

### Step 1 — Upload File

**`POST {{url}}/int/v1/files/upload`**

`Content-Type: multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | File to upload (Excel, CSV, image, PDF, or ZIP) |
| `type` | string | Set to `fuel-import` |

**Response:**

```json
{
    "uuid": "file-uuid-here",
    "original_filename": "fuel_data.xlsx",
    "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "file_size": 20480,
    "url": "https://..."
}
```

### Step 2 — Process Import (Excel / CSV)

**`POST {{url}}/int/v1/fuel-excel-import/import`**

| Field | Type | Description |
|---|---|---|
| `files` | array of UUIDs | File UUIDs uploaded in Step 1 |

<!-- ### Step 2 (Alternative) — Process ZIP Import (Receipt Images)

**`POST {{url}}/int/v1/fuel-zip-import/import`**

| Field | Type | Description |
|---|---|---|
| `files` | array of UUIDs | UUID of uploaded `.zip` file |
| `uuid` | UUID (optional) | Parent UUID for import log tracking | -->

### Supported File Types

| Type | Extensions | Import Endpoint |
|---|---|---|
| Spreadsheet | `.csv`, `.tsv`, `.xls`, `.xlsx` | `/fuel-excel-import/import` |
<!-- | Image / Receipt | `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.tiff`, `.svg` | `/fuel-zip-import/import` |
| Document | `.pdf` | `/fuel-zip-import/import` | -->
| Archive | `.zip` (containing images/PDFs) | `/fuel-zip-import/import` |

### Expected Import Columns (Excel / CSV)

| Column | Accepted Aliases |
|---|---|
| VRID | `vr_id`, `vrid`, `trip_no` |
| Date / Time | `crossing_date`, `date`, `date_time`, `Date/Time`, `crossing_date_time` |
| Vehicle | `vehicle`, `reg`, `Reg`, `Reg.`, `vehicle_name` |
| Driver | `driver`, `driver_name` |
| Reporter | `reporter`, `reporter_name`, `reported_by` |
| Amount (excl. VAT) | `net`, `amount`, `cost`, `price`, `total_net`, `pre_vat_amount` |
| Amount (incl. VAT) | `gross`, `amount_incl_tax`, `total_amount` |
| Currency | `currency`, `amount_currency` |
| Volume | `volume`, `quantity`, `fuel_amount`, `liters`, `Quantity` |
| Unit | `metric_unit`, `unit_of_measurement`, `volume_unit`, `fuel_unit` |
| Odometer | `odometer`, `usage` |
| Trip ID | `trip_id` |
| Report | `report`, `fuel_report`, `content`, `info` |

> Max rows per import: **2000**. Files previously exported from fuel expenses (`Fuel_Usage_Tracker_*`) cannot be re-imported.

---

## 8. Import Processing

### Duplicate Detection

Imports check for existing records in this priority order:

| Priority | Check |
|---|---|
| 1 | `receipt_id` match |
| 2 | `vr_id` + `crossing_date` (exact datetime) |
| 3 | `receipt_number` + `crossing_date` |
| 4 | `supplier_name` + datetime + amount |

- **Duplicate found** → record is **updated**
- **No duplicate** → new record is **created**

---

## 9. Import Result

### Success Response

```json
{
    "success": true,
    "message": "Fuel import completed successfully",
    "inserted_count": 42,
    "updated_count": 5,
    "skipped_count": 3,
    "total_processed": 50,
    "created_fuel_expense": 42,
    "updated_fuel_expense": 5,
    "status": "ok"
}
```

### Partial Success Response

```json
{
    "success": false,
    "partial_success": true,
    "created_fuel_expense": 30,
    "updated_fuel_expense": 2,
    "total_errors": 5,
    "message": "Partial import completed. 30 fuel expenses created, 2 fuel expenses updated, 5 errors found.",
    "errors": [
        ["7", "Vehicle with plate 'ZZ99 XXX' not found.", "{...row data...}"],
        ["12", "Invalid date format in crossing_date column.", "{...row data...}"]
    ]
}
```

### Failure Response

```json
{
    "success": false,
    "errors": [
        ["N/A", "Import failed: Maximum of 2000 rows allowed. Your file contains 2500 rows.", "N/A"]
    ],
    "message": "Import failed. No fuel expenses were imported due to errors.",
    "status": 422
}
```

### ZIP Import — Success Response

```json
{
    "success": true,
    "message": "Import completed successfully. 8 receipt image(s) saved.",
    "inserted_count": 8,
    "total_processed": 8,
    "processed_files": [
        { "filename": "receipts.zip", "processed": 8, "created": 8 }
    ],
    "status": "ok"
}
```

---

## 10. Download Error Log

When an import returns errors, the response includes an `error_log_url`:

```json
{
    "error_log_url": "{{storage_url}}/error-logs/fuel-import-errors-20260330.xlsx"
}
```

### Error Log Excel Structure

| Column | Description |
|---|---|
| `ID` | Row number or file reference |
| `Error Message` | Description of the error |

---

## 11. Re-import Fuel Data

After an error, upload a corrected file and re-submit to the same import endpoint. Files that were previously imported successfully are blocked from re-import (returns "already imported" message).

---

## 12. Import History

**`GET {{url}}/api/v1/expense-reports/fuel-import-logs`**

Returns a paginated list of all fuel import logs for the authenticated company. Shown when the user clicks the **Import History** button in the UI.

Each record represents one uploaded file and its import outcome — linked file metadata, uploader, record counts, and error log download URL.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `per_page` / `limit` | integer | `15` | Records per page (max `100`) |

### Example Request

```
GET {{url}}/api/v1/expense-reports/fuel-import-logs?per_page=15
```

### Response

```json
{
    "status": "success",
    "data": [
        {
            "file_uuid": "file-uuid-here",
            "original_filename": "fuel_data.xlsx",
            "file_path": "uploads/fuel-imports/fuel_data.xlsx",
            "file_url": "https://s3.amazonaws.com/.../fuel_data.xlsx",
            "file_uploaded_at": "2026-03-28T08:00:00.000000Z",
            "uploader_uuid": "usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "uploader_name": "Admin User",
            "import_log_uuid": "imp_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "status": "COMPLETED",
            "error_log_file_path": null,
            "error_log_url": null,
            "imported_at": "2026-03-28T08:01:00.000000Z",
            "total_records": 50,
            "success_records": 48,
            "failed_records": 2,
            "skipped_records": 0
        }
    ],
    "pagination": {
        "current_page": 1,
        "per_page": 15,
        "total": 10,
        "last_page": 1,
        "from": 1,
        "to": 10
    }
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `file_uuid` | UUID | UUID of the uploaded file |
| `original_filename` | string | Original name of the uploaded file |
| `file_url` | string | Download URL of the uploaded file |
| `file_uploaded_at` | ISO 8601 | When the file was uploaded |
| `uploader_name` | string | Name of the user who uploaded the file |
| `import_log_uuid` | UUID | UUID of the import log record |
| `status` | string | Import status: `COMPLETED`, `PARTIALLY_COMPLETED`, `ERROR` |
| `error_log_url` | string \| null | Download URL for the error log CSV (present when `status` is `PARTIALLY_COMPLETED` or `ERROR`) |
| `imported_at` | ISO 8601 | When the import was processed |
| `total_records` | integer | Total rows in the file |
| `success_records` | integer | Rows successfully imported |
| `failed_records` | integer | Rows that failed |
| `skipped_records` | integer | Rows skipped (duplicates or blank) |

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "status": "error", "message": "Company context required" }` |
| `500` | `{ "status": "error", "message": "Failed to list fuel import logs" }` |

---

## 13. Add Fuel Record

**`POST {{url}}/int/v1/fuel-expenses`**

Creates a new fuel expense record.

### Request Body

```json
{
    "fuel_expense": {
        "report_type": "Fuel",
        "driver_uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "vehicle_uuid": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "reported_by_uuid": "usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "status": "pending",
        "report": "Fuel fill-up at Shell M25",
        "odometer": "45200",
        "amount": 85.50,
        "amount_incl_tax": 102.60,
        "currency": "GBP",
        "volume": "75.5",
        "metric_unit": "L",
        "payment_method": "Card",
        "card_type": "Visa",
        "vr_id": "VR-001234",
        "trip_id": "TRIP-5678",
        "crossing_date": "2026-03-28T08:30:00.000Z",
        "location": {
            "type": "Point",
            "coordinates": [-0.1278, 51.5074]
        }
    }
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `report_type` | string | No | Default: `"Fuel"` |
| `driver_uuid` | UUID | Yes | Assigned driver UUID |
| `vehicle_uuid` | UUID | Yes | Assigned vehicle UUID |
| `reported_by_uuid` | UUID | Yes | Reporter (user) UUID |
| `status` | string | Yes | `pending`, `approved`, `rejected` |
| `amount` | decimal | Yes | Cost excluding VAT (must not be zero) |
| `currency` | string | Yes | ISO currency code (e.g. `GBP`) |
| `payment_method` | string | Yes | `Card` or `Other` |
| `card_type` | string | No | e.g. `Visa`, `Mastercard` |
| `amount_incl_tax` | decimal | No | Cost including VAT |
| `converted_amount` | decimal | No | Amount in converted currency |
| `converted_currency` | string | No | ISO code for converted currency |
| `volume` | string | No | Fuel volume dispensed |
| `metric_unit` | string | No | Unit of volume (e.g. `L`, `gal`) |
| `odometer` | string | No | Vehicle odometer reading |
| `report` | string | No | Notes or description |
| `vr_id` | string | No | VRID / Trip No |
| `trip_id` | string | No | Trip identifier |
| `crossing_date` | ISO 8601 | No | Date/time of fuel transaction |
| `location` | GeoJSON Point | No | GPS location of fuel station |

### Response

Returns the created fuel expense object (same structure as [View Fuel Record](#12-view-fuel-record)).

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Validation failed.", "errors": { ... } }` |

---

## 14. Edit Fuel Record

**`PUT {{url}}/int/v1/fuel-expenses/{id}`**

Updates an existing fuel expense record.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Fuel expense UUID |

### Request Body

Same fields as [Add Fuel Record](#10-add-fuel-record). Include only fields to update.

```json
{
    "fuel_expense": {
        "status": "approved",
        "amount": 90.00,
        "odometer": "45350",
        "report": "Updated station name"
    }
}
```

### Response

Returns the updated fuel expense object.

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Fuel expense resource not found." }` |

---

## 15. View Fuel Record

**`GET {{url}}/int/v1/fuel-expenses/{id}`**

Returns full details of a single fuel expense record.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID or public_id | Fuel expense identifier |

### Example Request

```
GET {{url}}/int/v1/fuel-expenses/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response

```json
{
    "fuel_expense": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "public_id": "fexp_abc123",
        "report_type": "Fuel",
        "status": "pending",
        "report": "Fuel fill-up at Shell M25",
        "odometer": "45200",
        "amount": 85.50,
        "amount_incl_tax": 102.60,
        "converted_amount": null,
        "converted_currency": null,
        "currency": "GBP",
        "volume": "75.5",
        "metric_unit": "L",
        "payment_method": "Card",
        "card_type": "Visa",
        "vr_id": "VR-001234",
        "trip_id": "TRIP-5678",
        "crossing_date": "2026-03-28T08:30:00.000000Z",
        "direction": null,
        "location": {
            "type": "Point",
            "coordinates": [-0.1278, 51.5074]
        },
        "reported_by_uuid": "usr_xxxxxxxx-...",
        "driver_uuid": "drv_xxxxxxxx-...",
        "vehicle_uuid": "veh_xxxxxxxx-...",
        "reporter_name": "Admin User",
        "driver_name": "John Smith",
        "vehicle_name": "Truck 01 - AB12 CDE",
        "reporter": { "uuid": "usr_xxx...", "name": "Admin User" },
        "driver": { "uuid": "drv_xxx...", "name": "John Smith" },
        "vehicle": { "uuid": "veh_xxx...", "plate_number": "AB12 CDE" },
        "fuel_json": {},
        "seen_status_of_amazon": "new",
        "receipt_id": null,
        "files": [],
        "created_at": "2026-03-28T09:00:00.000000Z",
        "updated_at": "2026-03-28T09:00:00.000000Z"
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Fuel expense resource not found." }` |

---

## 16. Delete Fuel Record

**`DELETE {{url}}/int/v1/fuel-expenses/{id}`**

Soft-deletes a single fuel expense record.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Fuel expense UUID |

### Example Request

```
DELETE {{url}}/int/v1/fuel-expenses/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response

```json
{
    "id": "fexp_abc123",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "public_id": "fexp_abc123",
    "object": "fuel_expense",
    "time": "2026-03-30T10:00:00.000000Z",
    "deleted": true
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Fuel expense resource not found." }` |

---

## 17. Bulk Delete Fuel Records

**`DELETE {{url}}/int/v1/fuel-expenses/bulk-delete`**

Soft-deletes multiple fuel expense records in a single request.

### Request Body

```json
{
    "ids": [
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "b2c3d4e5-f6a7-8901-bcde-f12345678901"
    ]
}
```

| Field | Type | Description |
|---|---|---|
| `ids` | array of UUIDs | UUIDs of fuel expense records to delete |

### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 fuel_expenses"
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |

---

## 18. Export Fuel Data

**`GET {{url}}/int/v1/fuel-expenses/export`** or **`POST {{url}}/int/v1/fuel-expenses/export`**

Exports fuel expense records to an Excel (`.xlsx`) or CSV file.

### Query / Body Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `xlsx` | Export format: `xlsx` or `csv` |
| `selections` | array of UUIDs | `[]` | Export specific records by UUID; omit to export all |
| `from_date` | date | — | Start of date range (YYYY-MM-DD) |
| `to_date` | date | — | End of date range (YYYY-MM-DD) |
| `start_date` | date | — | Alias for `from_date` |
| `end_date` | date | — | Alias for `to_date` |
| `filter_by` | string | — | Additional filter field |

### Exported Columns

| Column | Source Field |
|---|---|
| VRID | `vr_id` |
| Date | `crossing_date` or `created_at` (formatted `DD/MM/YYYY HH:MM`) |
| Vehicle Registration | `vehicle.plate_number` |
| Product | `fuel_json.product_type` or `meta.product` |
| Station Name | `fuel_json.supplier_name` or `fuel_json.site_name` or `meta.station_name` |
| Cost | `amount` (excl. VAT) |
| Cost (Including VAT) | `amount_incl_tax` |
| Currency | `currency` |
| Volume | `volume` |
| Unit | `metric_unit` |

> The exported file includes a **green header row**, **auto-sized columns**, and a **total row** at the bottom summing cost columns.

### Example Request

```
GET {{url}}/int/v1/fuel-expenses/export?format=xlsx&from_date=2026-03-01&to_date=2026-03-31
```

### Response

Returns a binary file download.

- **Content-Disposition:** `attachment; filename="Fuel_Usage_Tracker_YYYYMMDDHHMMSS.xlsx"`

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "No fuel data available for the selected date range." }` |

---

## Fuel Expense — Field Reference

| Field | Type | Description |
|---|---|---|
| `uuid` | UUID | Unique identifier |
| `public_id` | string | Human-readable ID (e.g. `fexp_abc123`) |
| `report_type` | string | Default: `"Fuel"` |
| `status` | string | `pending`, `approved`, `rejected` |
| `report` | string | Notes or description |
| `odometer` | string | Vehicle odometer at time of fill-up |
| `amount` | decimal | Cost excluding VAT |
| `amount_incl_tax` | decimal | Cost including VAT |
| `converted_amount` | decimal | Amount in converted currency |
| `converted_currency` | string | ISO code of converted currency |
| `currency` | string | ISO currency code |
| `volume` | string | Fuel volume dispensed |
| `metric_unit` | string | Volume unit (e.g. `L`, `gal`) |
| `payment_method` | string | `Card` or `Other` |
| `card_type` | string | Card type (e.g. `Visa`) |
| `vr_id` | string | VRID / Trip No |
| `trip_id` | string | Trip identifier |
| `crossing_date` | ISO 8601 | Date and time of fuel transaction |
| `direction` | string | Travel direction |
| `fuel_json` | object | Raw OCR/import metadata |
| `location` | GeoJSON Point | GPS location of fuel station |
| `seen_status_of_amazon` | string | `new`, `unseen`, `seen` |
| `receipt_id` | integer | Linked `expense_receipt_images.id` |
| `import_file_hash` | string | Hash of source import file |
| `import_filename` | string | Original import filename |
| `driver_uuid` | UUID | Assigned driver |
| `vehicle_uuid` | UUID | Assigned vehicle |
| `reported_by_uuid` | UUID | Reporter user UUID |
| `created_at` | ISO 8601 | Record creation timestamp |
| `updated_at` | ISO 8601 | Last updated timestamp |

---

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| Fuel Tracking List | `GET` | `/int/v1/fuel-expenses` |
| Search Fuel Records | `GET` | `/int/v1/fuel-expenses?query=...` |
| Filter Fuel Records | `GET` | `/int/v1/fuel-expenses?driver=...&status=...` |
| View Fuel Record | `GET` | `/int/v1/fuel-expenses/{uuid}` |
| Add Fuel Record | `POST` | `/int/v1/fuel-expenses` |
| Edit Fuel Record | `PUT` | `/int/v1/fuel-expenses/{uuid}` |
| Delete Fuel Record | `DELETE` | `/int/v1/fuel-expenses/{uuid}` |
| Bulk Delete | `DELETE` | `/int/v1/fuel-expenses/bulk-delete` |
| Export Fuel Data | `GET/POST` | `/int/v1/fuel-expenses/export` |
| Import (Excel/CSV) | `POST` | `/int/v1/fuel-excel-import/import` |
<!-- | Import (ZIP/Images) | `POST` | `/int/v1/fuel-zip-import/import` | -->
