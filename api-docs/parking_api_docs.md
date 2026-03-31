# Parking API Documentation

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

> Parking expense records are stored in the `fuel_reports` table with `report_type = 'Parking'`.
> Always pass `report_type=parking` when listing or filtering.

---

## 1. Parking Reports List

**`GET {{url}}/int/v1/fuel-reports`**

Returns a paginated list of parking expense records for the authenticated company.

### Query Parameters

#### Pagination & Sorting

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | `15` | Records per page |
| `sort` | string | `-created_at` | Sort field. Prefix `-` for descending |

#### Filters

| Param | Type | Description |
|---|---|---|
| `report_type` | string | Must be `parking` to return parking records |
| `query` | string | Search across driver name, vehicle plate, `public_id`, `vr_id`, `trip_id` |
| `vehicle` | UUID | Filter by vehicle UUID |
| `driver` | UUID | Filter by driver UUID |
| `status` | string | Filter by record status |
| `start_date` | date | Filter from date — applies to `created_at` (YYYY-MM-DD) |
| `end_date` | date | Filter to date — applies to `created_at` (YYYY-MM-DD) |

### Example Request

```
GET {{url}}/int/v1/fuel-reports?report_type=parking&page=1&sort=-created_at
```

### Response

```json
{
    "fuel_reports": [
        {
            "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "public_id": "fuel_abc123",
            "report_type": "Parking",
            "status": "pending",
            "amount": 12.50,
            "currency": "GBP",
            "payment_method": "Card",
            "card_type": "Visa",
            "odometer": "45200",
            "report": "Overnight parking at M25 Services",
            "location": {
                "type": "Point",
                "coordinates": [-0.1278, 51.5074]
            },
            "driver": {
                "uuid": "drv_xxx...",
                "name": "John Smith"
            },
            "vehicle": {
                "uuid": "veh_xxx...",
                "plate_number": "AB12 CDE"
            },
            "reporter": {
                "uuid": "usr_xxx...",
                "name": "Admin User"
            },
            "created_at": "2026-03-28T09:00:00.000000Z",
            "updated_at": "2026-03-28T09:00:00.000000Z"
        }
    ],
    "meta": {
        "total": 50,
        "per_page": 15,
        "current_page": 1,
        "last_page": 4
    }
}
```

---

## 2. View Parking Report

**`GET {{url}}/int/v1/fuel-reports/{id}`**

Returns full details of a single parking expense record.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID or public_id | Parking report identifier |

### Example Request

```
GET {{url}}/int/v1/fuel-reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response

```json
{
    "fuel_report": {
        "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "public_id": "fuel_abc123",
        "report_type": "Parking",
        "status": "pending",
        "amount": 12.50,
        "currency": "GBP",
        "payment_method": "Card",
        "card_type": "Visa",
        "odometer": "45200",
        "report": "Overnight parking at M25 Services",
        "location": {
            "type": "Point",
            "coordinates": [-0.1278, 51.5074]
        },
        "driver": { "uuid": "drv_xxx...", "name": "John Smith" },
        "vehicle": { "uuid": "veh_xxx...", "plate_number": "AB12 CDE" },
        "reporter": { "uuid": "usr_xxx...", "name": "Admin User" },
        "files": [],
        "created_at": "2026-03-28T09:00:00.000000Z",
        "updated_at": "2026-03-28T09:00:00.000000Z"
    }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Fuel report resource not found." }` |

---

## 3. Create Parking Report

**`POST {{url}}/int/v1/fuel-reports`**

Creates a new parking expense record.

### Request Body

```json
{
    "fuel_report": {
        "report_type": "Parking",
        "driver_uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "vehicle_uuid": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "reported_by_uuid": "usr_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "status": "pending",
        "amount": 12.50,
        "currency": "GBP",
        "payment_method": "Card",
        "card_type": "Visa",
        "odometer": "45200",
        "report": "Overnight parking at M25 Services",
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
| `report_type` | string | **Yes** | Must be `"Parking"` |
| `driver_uuid` | UUID | Yes | Assigned driver UUID |
| `vehicle_uuid` | UUID | Yes | Assigned vehicle UUID |
| `reported_by_uuid` | UUID | Yes | Reporter (user) UUID |
| `status` | string | Yes | `pending`, `approved`, `rejected` |
| `amount` | decimal | Yes | Parking cost (must not be zero) |
| `currency` | string | Yes | ISO currency code (e.g. `GBP`) |
| `payment_method` | string | Yes | `Card` or `Other` |
| `card_type` | string | No | e.g. `Visa`, `Mastercard` |
| `odometer` | string | No | Vehicle odometer reading |
| `report` | string | No | Notes or description |
| `location` | GeoJSON Point | No | GPS coordinates of parking location |

### Response

Returns the created parking report object (same structure as [View Parking Report](#2-view-parking-report)).

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Validation failed.", "errors": { ... } }` |

---

## 4. Edit Parking Report

**`PUT {{url}}/int/v1/fuel-reports/{id}`**

Updates an existing parking report. Only include fields you want to change.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Parking report UUID |

### Request Body

```json
{
    "fuel_report": {
        "status": "approved",
        "amount": 15.00,
        "payment_method": "Other",
        "report": "Updated notes"
    }
}
```

### Response

Returns the updated parking report object.

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Fuel report resource not found." }` |

---

## 5. Delete Parking Report

**`DELETE {{url}}/int/v1/fuel-reports/{id}`**

Soft-deletes a single parking expense record.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Parking report UUID |

### Example Request

```
DELETE {{url}}/int/v1/fuel-reports/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Response

```json
{
    "id": "fuel_abc123",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "public_id": "fuel_abc123",
    "object": "fuel_report",
    "time": "2026-03-30T10:00:00.000000Z",
    "deleted": true
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Fuel report resource not found." }` |

---

## 6. Bulk Delete Parking Reports

**`DELETE {{url}}/int/v1/fuel-reports/bulk-delete`**

Soft-deletes multiple parking expense records in a single request.

### Request Body

```json
{
    "ids": [
        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "b2c3d4e5-f6a7-8901-bcde-f12345678901"
    ]
}
```

### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 fuel_reports"
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |

---

## 7. Export Parking Reports

**`GET {{url}}/int/v1/fuel-reports/export`** or **`POST {{url}}/int/v1/fuel-reports/export`**

Exports parking reports to Excel or CSV.

### Query / Body Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `format` | string | `xlsx` | Export format: `xlsx` or `csv` |
| `report_type` | string | — | Must be `parking` to export parking records |
| `selections` | array of UUIDs | `[]` | Export specific records by UUID; omit to export all |
| `from_date` | date | — | Start of date range (YYYY-MM-DD) |
| `to_date` | date | — | End of date range (YYYY-MM-DD) |
| `start_date` | date | — | Alias for `from_date` |
| `end_date` | date | — | Alias for `to_date` |

> Date filter applies to `crossing_date` when set, otherwise falls back to `created_at`.

### Example Request

```
GET {{url}}/int/v1/fuel-reports/export?format=xlsx&report_type=parking&from_date=2026-03-01&to_date=2026-03-31
```

### Response

Returns a binary file download.

- **Content-Disposition:** `attachment; filename="fuel_report-YYYY-MM-DD-HH:MM.xlsx"`

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "No data available for the selected date range." }` |

---

## 8. Dropdown Reference Values

### Driver Dropdown

**`GET {{url}}/int/v1/drivers?limit=999&sort=-created_at`**

Returns all drivers for the authenticated company. Pass the selected `uuid` as the `driver` filter param or `driver_uuid` in the request body.

```json
{
    "data": [
        {
            "uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "public_id": "DRV-0001",
            "name": "John Smith",
            "internal_id": "EMP-001"
        }
    ]
}
```

---

## Parking Report — Field Reference

| Field | Type | Description |
|---|---|---|
| `uuid` | UUID | Unique identifier |
| `public_id` | string | Human-readable ID (e.g. `fuel_abc123`) |
| `report_type` | string | Always `"Parking"` for parking records |
| `status` | string | `pending`, `approved`, `rejected` |
| `amount` | decimal | Parking cost |
| `currency` | string | ISO currency code (e.g. `GBP`) |
| `payment_method` | string | `Card` or `Other` |
| `card_type` | string | e.g. `Visa`, `Mastercard` |
| `odometer` | string | Vehicle odometer at time of parking |
| `report` | string | Notes or description |
| `location` | GeoJSON Point | GPS location of parking |
| `driver_uuid` | UUID | Assigned driver |
| `vehicle_uuid` | UUID | Assigned vehicle |
| `reported_by_uuid` | UUID | User who filed the report |
| `created_at` | ISO 8601 | Record creation timestamp |
| `updated_at` | ISO 8601 | Last updated timestamp |

---

## Endpoint Summary

| Action | Method | Endpoint |
|---|---|---|
| List Parking Reports | `GET` | `/int/v1/fuel-reports?report_type=parking` |
| View Parking Report | `GET` | `/int/v1/fuel-reports/{uuid}` |
| Create Parking Report | `POST` | `/int/v1/fuel-reports` |
| Edit Parking Report | `PUT` | `/int/v1/fuel-reports/{uuid}` |
| Delete Parking Report | `DELETE` | `/int/v1/fuel-reports/{uuid}` |
| Bulk Delete | `DELETE` | `/int/v1/fuel-reports/bulk-delete` |
| Export Parking Reports | `GET/POST` | `/int/v1/fuel-reports/export?report_type=parking` |
