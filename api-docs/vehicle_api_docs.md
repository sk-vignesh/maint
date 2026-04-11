# Vehicle Page API Documentation

> **Base URL:** `{{url}}/int/v1/vehicles`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## 1. Vehicle List (Handsontable)

**`GET /int/v1/vehicles`**

Fetches all vehicles displayed in the Handsontable grid. Loads all records at once (no pagination) for the inline edit table.

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `sort` | string | `created_at` | Sort field. Prepend `-` for descending (e.g. `-created_at`) |
| `query` | string | — | Full-text search across plate number, make, model |
| `limit` | integer | `-1` | `-1` loads all records (no pagination) |

#### Example Request

```
GET {{url}}/int/v1/vehicles?sort=created_at&limit=-1
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `public_id` | string | Human-readable ID (e.g. `VHC-0001`) |
| `plate_number` | string | Vehicle registration/plate number (uppercase) |
| `make` | string | Vehicle manufacturer (e.g. `Ford`, `Mercedes`) |
| `model` | string | Vehicle model (e.g. `Transit`) |
| `year` | string | Manufacturing year (4-digit) |
| `status` | string | Vehicle status (e.g. `active`, `inactive`) |
| `fleet_uuid` | UUID / null | Assigned fleet UUID |
| `last_pmi_date` | date / null | Last planned maintenance inspection date (`YYYY-MM-DD`) |
| `tachograph_cal_date` | date / null | Last tachograph calibration date (`YYYY-MM-DD`) |
| `fleet_vehicles` | array | Fleet relationship records including fleet name |

---

## 2. Search Vehicles

**`GET /int/v1/vehicles?query={search_term}`**

Full-text search. Updates URL query param and refreshes the model.

#### Example Request

```
GET {{url}}/int/v1/vehicles?query=transit&sort=created_at&limit=-1
```

---

## 3. Filter Vehicles

The vehicle table supports filtering via query params (passed through route query params).

#### Filterable Params

| Param | Filter Type | Example |
|---|---|---|
| `query` | full-text search | `query=ford` |
| `sort` | sort field | `sort=-created_at` |

> The vehicle Handsontable page uses minimal filters (search + sort only). More advanced column filters are available in the standard vehicles list (`/int/v1/vehicles` with additional params like `status`, `fleet`, `make`, `country`, etc.).

---

## 4. Clear Filters

Resets `query` to null and `sort` to `created_at`, then reloads:

```
GET {{url}}/int/v1/vehicles?sort=created_at&limit=-1
```

---

## 5. Inline Create Vehicle

**`POST {{url}}/int/v1/vehicles`**

Creates a new vehicle when a new row is filled in the Handsontable grid. Triggered automatically when required fields (`plate_number`, `make`, `status`) are completed.

#### Request Body

```json
{
    "vehicle": {
        "uuid": null,
        "public_id": null,
        "internal_id": null,
        "company_uuid": null,
        "photo_uuid": null,
        "vendor_uuid": null,
        "online": false,
        "fleet_uuid": null,
        "photo_url": "https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/vehicle-placeholder.png",
        "is_vehicle_available": null,
        "driver_name": null,
        "vendor_name": null,
        "display_name": null,
        "availability_message": null,
        "fleet_vehicle_name": null,
        "avatar_url": "https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/vehicle-icons/mini_bus.svg",
        "avatar_value": null,
        "location": {
            "coordinates": [0, 0],
            "type": "Point",
            "bbox": [0, 0, 0, 0]
        },
        "make": "Ford",
        "model": "Transit",
        "year": "2022",
        "trim": null,
        "type": null,
        "plate_number": "AB12 CDE",
        "fleet_vehicles": [],
        "vin": null,
        "status": "Active",
        "slug": null,
        "last_pmi_date": null,
        "next_pmi_date": null,
        "pmi_interval": null,
        "pmi_interval_unit": null,
        "tachograph_cal_date": null,
        "deleted_at": null,
        "created_at": null,
        "updated_at": null,
        "vendor": null
    }
}
```

#### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `plate_number` | string | Yes | Vehicle registration number — auto-converted to uppercase |
| `make` | string | Yes | Vehicle manufacturer (e.g. `Ford`, `Mercedes`) |
| `status` | string | Yes | Vehicle status. Defaults to `Active` if blank |
| `model` | string | No | Vehicle model (e.g. `Transit`) |
| `year` | string | No | Manufacturing year (4-digit) |
| `trim` | string | No | Vehicle trim level |
| `type` | string | No | Vehicle type |
| `vin` | string | No | Vehicle Identification Number |
| `fleet_uuid` | UUID | No | Fleet assignment — vehicle can exist without a fleet |
| `vendor_uuid` | UUID | No | Associated vendor UUID |
| `photo_uuid` | UUID | No | UUID of the vehicle photo file |
| `online` | boolean | No | Whether the vehicle is online. Default: `false` |
| `last_pmi_date` | date | No | Last planned maintenance inspection date (`YYYY-MM-DD`) |
| `next_pmi_date` | date | No | Next planned maintenance inspection date (`YYYY-MM-DD`) |
| `pmi_interval` | integer | No | PMI interval value |
| `pmi_interval_unit` | string | No | PMI interval unit (e.g. `days`, `months`) |
| `tachograph_cal_date` | date | No | Last tachograph calibration date (`YYYY-MM-DD`) |
| `avatar_value` | string | No | Avatar icon identifier |

#### Validation Rules

- `plate_number`, `make`, `status` are required before saving
- `year` must be a valid 4-digit year (if provided)
- Fleet is **optional** — a vehicle can be saved without a fleet assignment
- Plate number is automatically converted to **uppercase** on input

---

## 6. Inline Edit Vehicle

**`PUT /int/v1/vehicles/{id}`**

Updates an existing vehicle when any cell value is changed in the Handsontable grid. Triggered automatically on cell change.

#### Example Request

```
PUT {{url}}/int/v1/vehicles/veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Request Body

```json
{
  "vehicle":{
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

#### Notes

- Save is triggered immediately on cell change (no manual save button)
- For bulk paste operations (>50 rows), records are saved in batches
- Success notification is debounced (5 seconds) to reduce UI noise during bulk edits

---

## 7. Assign Fleet

Fleet assignment is done inline via the **Fleet column dropdown** in the Handsontable grid. It is saved as part of the inline create or inline edit request:

**`POST /int/v1/vehicles`** (on create) or **`PUT /int/v1/vehicles/{id}`** (on update)

```json
{
  "fleet_uuid": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

Fleet options are loaded on table setup via:

**`GET /int/v1/fleets?limit=500`**

Returns all fleets for the Fleet column dropdown.

---

## 8. Update Status

Status is updated inline via the **Status column dropdown** in the Handsontable grid. It is saved as part of the inline edit request:

**`PUT /int/v1/vehicles/{id}`**

```json
{
  "status": "inactive"
}
```

#### Available Status Values

| Value | Description |
|---|---|
| `active` | Vehicle is operational |
| `inactive` | Vehicle is not in use |

---

## 9. Delete Vehicle

**`DELETE /int/v1/vehicles/{id}`**

Deletes a vehicle via the row context menu (right-click → Delete) after a confirmation prompt.

#### Example Request

```
DELETE {{url}}/int/v1/vehicles/veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 10. Import Vehicles

### Step 1 — Upload File

**`POST /int/v1/files/upload`** (file upload service)

Uploads the spreadsheet file to S3 before processing.

| Field | Value |
|---|---|
| `path` | `{AWS_FILE_PATH}/vehicle-imports/{company_uuid}` |
| `disk` | Configured AWS disk |
| `bucket` | Configured AWS bucket |
| `type` | `vehicle_import` |

Accepted file types: `.xls`, `.xlsx`, `.csv`

### Step 2 — Process Import

**`POST /int/v1/vehicles/import`**

Processes the uploaded file and creates vehicle records.

#### Request Body

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

#### Response — Partial Error (Import Result with Errors)

```json
{
  "error_log_url": "https://s3.amazonaws.com/.../vehicle-import-errors.csv"
}
```

> If `error_log_url` is present, some rows failed. The page **immediately refreshes** to show successfully imported vehicles, and the error log CSV can be downloaded.

---

## 11. Download Error Log

When an import returns `error_log_url`, the user can click "Download Error Log" to download the CSV file directly from the S3 URL:

```
GET {error_log_url}
```

After download completes:
- Modal is reset to initial state
- Modal is closed
- Page is refreshed to show all imported vehicles

---

## 12. Re-import Vehicles

After an error state, the modal resets to allow a new file upload. This is the same flow as the initial import:

1. Reset modal to initial state (clear error, clear upload queue)
2. User uploads a corrected spreadsheet
3. `POST /int/v1/vehicles/import` is called again with new file IDs

---

## 13. Export Vehicles

**`GET /int/v1/vehicles/export`**

Exports all visible vehicle data to a spreadsheet.

#### Example Request

```
GET {{url}}/int/v1/vehicles/export
```

> The vehicle table export does not pass `selections[]` — it exports all vehicles currently visible.

---
---

### Bulk Delete

**`DELETE /int/v1/vehicles/bulk-delete`**

#### Request Body

```json
{
    "ids": [
        "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "veh_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ]
}
```
Confirm bulk delete
#### Request Body

```json

{
    "ids": [
        "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "veh_xxxxxxxx-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```
#### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 vehicles"
}
```

---

## Key Vehicle Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `uuid` | UUID | — | Unique identifier (assigned by server) |
| `public_id` | string | — | Human-readable ID (e.g. `VHC-0001`) |
| `internal_id` | string | No | Company internal reference |
| `plate_number` | string | Yes | Registration/plate number (stored uppercase) |
| `make` | string | Yes | Vehicle manufacturer |
| `model` | string | No | Vehicle model |
| `year` | string | No | Manufacturing year (4-digit) |
| `trim` | string | No | Vehicle trim level |
| `type` | string | No | Vehicle type |
| `vin` | string | No | Vehicle Identification Number |
| `status` | string | Yes | Vehicle status. Defaults to `Active` |
| `online` | boolean | No | Whether vehicle is currently online |
| `fleet_uuid` | UUID | No | Assigned fleet (optional) |
| `vendor_uuid` | UUID | No | Associated vendor UUID |
| `photo_uuid` | UUID | No | UUID of vehicle photo file |
| `avatar_url` | string | No | URL of vehicle avatar icon |
| `avatar_value` | string | No | Avatar icon identifier |
| `location` | GeoJSON Point | No | Current GPS location of the vehicle |
| `last_pmi_date` | date | No | Last planned maintenance inspection (`YYYY-MM-DD`) |
| `next_pmi_date` | date | No | Next planned maintenance inspection (`YYYY-MM-DD`) |
| `pmi_interval` | integer | No | PMI interval value |
| `pmi_interval_unit` | string | No | PMI interval unit (e.g. `days`, `months`) |
| `tachograph_cal_date` | date | No | Last tachograph calibration date (`YYYY-MM-DD`) |
| `driver_name` | string | — | Name of assigned driver (read-only, resolved by server) |
| `display_name` | string | — | Computed display name (read-only) |
| `fleet_vehicles` | array | — | Fleet relationship records (read-only) |
| `created_at` | ISO 8601 | — | Record creation timestamp |
| `updated_at` | ISO 8601 | — | Last updated timestamp |

---

## Fleets Dropdown API

**`GET /int/v1/fleets?limit=500`**

Fetches all available fleets to populate the Fleet column dropdown in the Handsontable grid. Called once on table setup.
