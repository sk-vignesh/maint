# Order API Documentation

> **Base URL:** `{{url}}/int/v1`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## Table of Contents

1. [List Orders](#1-list-orders)
2. [View Order](#2-view-order)
3. [Create Order](#3-create-order)
4. [Update Order / Assign Driver](#4-update-order--assign-driver)
5. [Delete Order](#5-delete-order)
6. [Dispatch Order](#6-dispatch-order)
7. [Trip Import](#7-trip-import)
8. [Frontend Logs](#8-frontend-logs)
9. [Supporting APIs — Filters](#9-supporting-apis--filters)
10. [Filter Reference](#10-filter-reference)

---

## 1. List Orders

**`GET {{url}}/int/v1/orders`**

Returns a paginated list of orders for the authenticated company.

> **Note — Fleet Name:** The list response returns `fleet_uuid` but not the fleet name. A separate call to `GET /int/v1/fleets/{uuid}` is currently needed to resolve the name. **Recommended:** include `fleet_name` directly in the orders list response to remove this extra round-trip.

### Example Request

```
GET {{url}}/int/v1/orders?drawerOpen=0&layout=table&page=1&sort=-created_at
```

### Query Parameters

#### Pagination & Display

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `15` | Results per page |
| `layout` | string | — | UI hint: `table`, `map`, `list` |
| `sort` | string | `-created_at` | Sort field. Prefix `-` for descending. Supports: `status`, `driver`, `fleet`, `customer`, `facilitator`, `pickup`, `dropoff`, `vehicle`, `created_by`, `updated_by`, `created_at`, `scheduled_at`, `tracking` |

#### Search

| Param | Type | Description |
|---|---|---|
| `query` | string | Full-text search across `public_id`, `internal_id`, `trip_id`, tracking number |

#### Status Filters

| Param | Type | Description |
|---|---|---|
| `status` | string \| array | `created`, `dispatched`, `started`, `completed`, `canceled`. Accepts single value or array: `status[]=completed&status[]=canceled` |
| `unassigned` | boolean | `true` — orders with no driver assigned |
| `active` | boolean | `true` — orders with a driver, not completed/pending |
| `dispatched` | boolean | Filter by dispatched flag |
| `started` | boolean | Filter by started flag |
| `adhoc` | boolean | Ad-hoc orders only |
| `pod_required` | boolean | Orders requiring proof of delivery |

#### Assignment Filters

| Param | Type | Description |
|---|---|---|
| `driver` | string | Driver `uuid` or `public_id`. Includes drivers assigned via entities |
| `vehicle` | string | Vehicle `uuid` or `public_id` |
| `fleet` | string | Fleet `uuid`, `public_id`, `internal_id`, or name |

#### Location Filters

| Param | Type | Description |
|---|---|---|
| `pickup` | string | Pickup place `uuid`, `public_id`, `internal_id`, or name |
| `dropoff` | string | Dropoff place `uuid`, `public_id`, `internal_id`, or name |
| `return` | string | Return place `uuid` or `public_id` |
| `nearby` | string | `latitude,longitude` — orders near coordinates. Also accepts a driver ID or address |
| `distance` | integer | Radius in metres for `nearby` (default: `6000`) |

#### Party Filters

| Param | Type | Description |
|---|---|---|
| `customer` | string | Customer `uuid` or `public_id` |
| `facilitator` | string | Facilitator `uuid` or `public_id` |
| `created_by` | UUID | Creator user UUID |
| `updated_by` | UUID | Last-updater user UUID |

#### Date Filters

| Param | Type | Description |
|---|---|---|
| `on` | date | Orders scheduled on a specific date (`YYYY-MM-DD`). Use with `timezone` |
| `timezone` | string | Timezone for `on` filter (e.g. `Europe/London`) |
| `scheduled_at` | date | Orders with `scheduled_at >=` this date |
| `end_date` | date | Orders with `estimated_end_date <=` this date |

#### Other Filters

| Param | Type | Description |
|---|---|---|
| `type` | string | Filter by order type or order config key |
| `order_config` | string | Order config `uuid`, `public_id`, or key |
| `payload` | string | Payload `uuid` or `public_id` |
| `tracking` | string | Exact tracking number match |
| `trip_hash_id` | string | Trip hash identifier |
| `entity_status` | string | Tracking status code on order entities |
| `with_tracker_data` | boolean | Include real-time tracker data in response |
| `exclude` | string \| array | Exclude orders by `uuid` or `public_id` |

### Response

```json
{
  "orders": [
    {
      "id": "order_abc123",
      "uuid": "351ef358-72dc-432f-9332-0cb79a496a29",
      "public_id": "order_abc123",
      "internal_id": "ORD-001",
      "status": "dispatched",
      "type": "delivery",
      "dispatched": true,
      "dispatched_at": "2026-03-20T08:00:00.000000Z",
      "started": false,
      "started_at": null,
      "scheduled_at": "2026-03-21T09:00:00.000000Z",
      "estimated_end_date": "2026-03-21T17:00:00.000000Z",
      "distance": 15420,
      "time": 1800,
      "notes": "Handle with care",
      "pod_required": true,
      "pod_method": "signature",
      "adhoc": false,
      "fleet_uuid": "b1fe6f82-f2e0-4fb2-bbc0-b9043ada827b",
      "trip_id": "TRIP-001",
      "trip_hash_id": "ABC-1234",
      "driver_assigned_uuid": "drv_xyz789",
      "vehicle_assigned_uuid": "veh_xyz789",
      "tracking_number_uuid": "37f41510-837e-4219-a4ba-c5a841920237",
      "payload_uuid": "payload_uuid_here",
      "driver_name": "John Doe",
      "customer_name": "Acme Corp",
      "facilitator_name": "Fleet Hub",
      "pickup_name": "Warehouse A",
      "dropoff_name": "Customer HQ",
      "created_by_name": "Admin User",
      "updated_by_name": "Admin User",
      "payload": {
        "id": "payload_abc",
        "pickup": { "uuid": "...", "name": "Warehouse A", "address": "..." },
        "dropoff": { "uuid": "...", "name": "Customer HQ", "address": "..." },
        "return": null,
        "waypoints": []
      },
      "driver_assigned": {
        "uuid": "drv_xyz789",
        "public_id": "driver_abc",
        "name": "John Doe",
        "phone": "+44700000000"
      },
      "vehicle_assigned": {
        "uuid": "veh_xyz789",
        "public_id": "vehicle_abc",
        "plate_number": "AB12 CDE"
      },
      "tracking_number": {
        "uuid": "37f41510-...",
        "tracking_number": "TRK-000123"
      },
      "created_at": "2026-03-19T10:00:00.000000Z",
      "updated_at": "2026-03-20T08:00:00.000000Z"
    }
  ],
  "meta": {
    "total": 250,
    "per_page": 15,
    "current_page": 1,
    "last_page": 17
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `401` | `{ "error": "Unauthorized." }` |
| `403` | `{ "error": "Forbidden." }` |

---

## 2. View Order

**`GET {{url}}/int/v1/orders/{id}`**

Returns a single order with full relationship data including attached files.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Order `uuid` or `public_id` |

### Example Request

```
GET {{url}}/int/v1/orders/351ef358-72dc-432f-9332-0cb79a496a29
```

### Response

```json
{
  "order": {
    "uuid": "351ef358-72dc-432f-9332-0cb79a496a29",
    "public_id": "order_abc123",
    "internal_id": "ORD-001",
    "status": "dispatched",
    "type": "delivery",
    "dispatched": true,
    "dispatched_at": "2026-03-20T08:00:00.000000Z",
    "started": false,
    "started_at": null,
    "scheduled_at": "2026-03-21T09:00:00.000000Z",
    "estimated_end_date": "2026-03-21T17:00:00.000000Z",
    "distance": 15420,
    "time": 1800,
    "notes": "Handle with care",
    "pod_required": true,
    "pod_method": "signature",
    "fleet_uuid": "b1fe6f82-f2e0-4fb2-bbc0-b9043ada827b",
    "trip_id": "TRIP-001",
    "trip_hash_id": "ABC-1234",
    "payload": {
      "id": "payload_abc",
      "pickup": { "uuid": "...", "name": "Warehouse A", "address": "..." },
      "dropoff": { "uuid": "...", "name": "Customer HQ", "address": "..." },
      "return": null,
      "waypoints": []
    },
    "driver_assigned": {
      "uuid": "drv_xyz789",
      "name": "John Doe",
      "phone": "+44700000000"
    },
    "vehicle_assigned": {
      "uuid": "veh_xyz789",
      "plate_number": "AB12 CDE"
    },
    "customer": {
      "uuid": "...",
      "name": "Acme Corp",
      "type": "vendor"
    },
    "facilitator": null,
    "tracking_number": {
      "uuid": "37f41510-...",
      "tracking_number": "TRK-000123"
    },
    "files": [
      {
        "uuid": "...",
        "original_filename": "delivery_note.pdf",
        "url": "https://..."
      }
    ],
    "purchase_rate": null,
    "custom_field_values": [],
    "created_at": "2026-03-19T10:00:00.000000Z",
    "updated_at": "2026-03-20T08:00:00.000000Z"
  }
}
```

### Companion calls made on the View page

| Purpose | Endpoint |
|---|---|
| Fetch order files | `GET {{url}}/int/v1/files?sort=-created_at&subject_uuid={order_uuid}` |
| Log frontend events | `POST {{url}}/api/v1/frontend/logs` |

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Order not found." }` |

---

## 3. Create Order

**`POST {{url}}/int/v1/orders`**

Creates a new order. After creation, the tracker endpoint is called to initialise real-time tracking.

### Companion calls made on the Create page

| Step | Purpose | Endpoint |
|---|---|---|
| 1 | Upload attachment | `POST {{url}}/int/v1/files/upload` |
| 2 | Create the order | `POST {{url}}/int/v1/orders` |
| 3 | Initialise tracker | `GET {{url}}/int/v1/orders/{uuid}/tracker` |
| 4 | Search pickup location | `GET {{url}}/int/v1/places/search?geo=true&latitude={lat}&longitude={lng}` |
| 5 | Search dropoff location | `GET {{url}}/int/v1/places/search?geo=true&latitude={lat}&longitude={lng}` |
| 6 | Log frontend events | `POST {{url}}/api/v1/frontend/logs` |

### File Upload (Step 1)

**`POST {{url}}/int/v1/files/upload`**

`Content-Type: multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | Yes | The file to upload |
| `subject_uuid` | UUID | No | Associate with an order UUID |
| `subject_type` | string | No | e.g. `order` |
| `type` | string | No | File type tag |
| `path` | string | No | uploads/fleet-ops/order-imports |


**Response:**

```json
{
  "uuid": "file_uuid_here",
  "public_id": "file_abc123",
  "original_filename": "delivery_note.pdf",
  "content_type": "application/pdf",
  "file_size": 20480,
  "url": "https://...",
  "created_at": "2026-03-20T10:00:00.000000Z"
}
```

### Create Order (Step 2)

**`POST {{url}}/int/v1/orders`**

### Request Body

```json
{
  "order": {
    "status": "created",
    "type": "delivery",
    "internal_id": "ORD-001",
    "notes": "Handle with care",
    "pod_required": true,
    "pod_method": "signature",
    "adhoc": false,
    "adhoc_distance": null,
    "dispatched": false,
    "scheduled_at": "2026-03-21T09:00:00.000000Z",
    "estimated_end_date": "2026-03-21T17:00:00.000000Z",
    "fleet_uuid": "b1fe6f82-f2e0-4fb2-bbc0-b9043ada827b",
    "driver_assigned_uuid": "drv_xyz789",
    "vehicle_assigned_uuid": "veh_xyz789",
    "order_config_uuid": "config_uuid_here",
    "customer_uuid": "contact_uuid_here",
    "customer_type": "contact",
    "facilitator_uuid": "vendor_uuid_here",
    "facilitator_type": "vendor",
    "purchase_rate_uuid": null,
    "payload": {
      "pickup_uuid": "place_uuid_here",
      "dropoff_uuid": "place_uuid_here",
      "return_uuid": null,
      "waypoints": [],
      "entities": []
    }
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Initial status (default: `created`) |
| `type` | string | No | Order type identifier |
| `order_config_uuid` | UUID | No | Order configuration UUID |
| `internal_id` | string | No | Your internal reference ID |
| `notes` | string | No | Order notes |
| `pod_required` | boolean | No | Require proof of delivery |
| `pod_method` | string | No | `signature`, `photo`, `qr_scan` |
| `adhoc` | boolean | No | Ad-hoc delivery (no pre-assigned driver) |
| `adhoc_distance` | integer | No | Max matching radius in metres for adhoc orders |
| `dispatched` | boolean | No | Immediately dispatch on creation |
| `scheduled_at` | datetime | No | Scheduled pickup time |
| `estimated_end_date` | datetime | No | Estimated completion time |
| `fleet_uuid` | UUID | No | Fleet assignment |
| `driver_assigned_uuid` | UUID | No | Pre-assign driver |
| `vehicle_assigned_uuid` | UUID | No | Pre-assign vehicle |
| `customer_uuid` | UUID | No | Customer UUID |
| `customer_type` | string | No | `contact` or `vendor` |
| `facilitator_uuid` | UUID | No | Facilitator UUID |
| `facilitator_type` | string | No | `contact` or `vendor` |
| `purchase_rate_uuid` | UUID | No | Purchase rate UUID |
| `payload.pickup_uuid` | UUID | No | Pickup place UUID |
| `payload.dropoff_uuid` | UUID | No | Dropoff place UUID |
| `payload.return_uuid` | UUID | No | Return place UUID |
| `payload.waypoints` | array | No | Intermediate waypoints |
| `payload.entities` | array | No | Entities/items in the order |

### Response

Returns the created order object (same structure as [View Order](#2-view-order)).

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Validation failed.", "errors": { ... } }` |
| `422` | `{ "error": "Unprocessable entity." }` |

### Geo Place Search (Steps 4 & 5)

**`GET {{url}}/int/v1/places/search?geo=true&latitude={lat}&longitude={lng}`**

Returns places near a coordinate for use in the pickup/dropoff selector.

| Param | Type | Required | Description |
|---|---|---|---|
| `geo` | boolean | Yes | Must be `true` to enable geo search |
| `latitude` | float | Yes | Search latitude |
| `longitude` | float | Yes | Search longitude |

**Example:**

```
GET {{url}}/int/v1/places/search?geo=true&latitude=13.089500427246094&longitude=80.2739028930664
```

**Response:**

```json
{
  "places": [
    {
      "uuid": "place_uuid_here",
      "name": "Warehouse A",
      "address": "1 Industrial Road, Chennai",
      "location": {
        "latitude": 13.0895,
        "longitude": 80.2739
      },
      "distance": 120
    }
  ]
}
```

---

## 4. Update Order / Assign Driver

**`PUT {{url}}/int/v1/orders/{id}`**

Updates an existing order. Used for assigning or reassigning a driver and vehicle, or updating any other order field.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Order `uuid` or `public_id` |

### Example Request — Assign Driver

```
PUT {{url}}/int/v1/orders/351ef358-72dc-432f-9332-0cb79a496a29
```

```json
{
  "order": {
    "driver_assigned_uuid": "drv_xyz789",
    "vehicle_assigned_uuid": "veh_xyz789"
  }
}
```

### Example Request — General Update

```json
{
  "order": {
    "notes": "Updated delivery instructions",
    "scheduled_at": "2026-03-22T10:00:00.000000Z",
    "fleet_uuid": "b1fe6f82-f2e0-4fb2-bbc0-b9043ada827b"
  }
}
```

### Response

Returns the updated order object.

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Order not found." }` |
| `422` | `{ "error": "Validation failed.", "errors": { ... } }` |

---

## 5. Delete Order

**`DELETE {{url}}/int/v1/orders/{id}`**

Soft-deletes an order.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Order `uuid` or `public_id` |

### Example Request

```
DELETE {{url}}/int/v1/orders/2c5e6e8b-88a6-4758-843b-119be03b6cb4
```

### Response

```json
{
  "status": "OK",
  "message": "Order deleted successfully."
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Order not found." }` |

---

## 6. Dispatch Order

**`PATCH {{url}}/int/v1/orders/dispatch`**

Dispatches an order. Sets `dispatched = true`, records `dispatched_at`, and inserts a dispatch tracking activity entry.

### Request Body

```json
{
  "uuid": "351ef358-72dc-432f-9332-0cb79a496a29"
}
```

### Response

```json
{
  "status": "OK",
  "order": {
    "uuid": "351ef358-72dc-432f-9332-0cb79a496a29",
    "dispatched": true,
    "dispatched_at": "2026-03-20T08:00:00.000000Z",
    "status": "dispatched"
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Order is already dispatched." }` |
| `400` | `{ "error": "Order requires a driver before dispatch." }` |
| `404` | `{ "error": "Order not found." }` |

---

## 7. Trip Import

Importing trips is a two-step process: first create any missing places, then import the orders.

### Step 1 — Upload File

**`POST {{url}}/int/v1/files/upload`**

Upload the Excel/CSV import file before processing. See [File Upload](#file-upload-step-1) for full request/response details.
curl --location '{{url}}/int/v1/files/upload' \
--header 'Authorization: Bearer 4365|TCFjWOGsvQCbfMI0NAjjzygMMVedQxfLZQaIrAkJ' \
--form 'path="uploads/fleet-ops/order-imports"' \
--form 'type="order_import"' \
--form 'file_size="42256"' \
--form 'Content-Type="text/csv"' \
--form 'file=@"/C:/Users/ACS/Downloads/Trips (37) - Copy1.csv"' \
--form 'disk="s3"'

### Step 2 — Create Missing Places

**`POST {{url}}/int/v1/orders/process-import-create-missing-places`**

Parses the uploaded file, identifies place codes that do not yet exist, geocodes them, and creates the missing Place records. Must be called before importing orders.
curl --location '{{url}}/int/v1/orders/process-import-create-missing-places' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer 4365|TCFjWOGsvQCbfMI0NAjjzygMMVedQxfLZQaIrAkJ' \
--data '{
    "files": [
        "file_uuid"
    ]
}'

#### Request

`Content-Type: multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | Yes | Excel/CSV import file |

#### Response — Success

```json
{
  "status": "OK",
  "created": 5,
  "skipped": 2,
  "errors": [],
  "places": [
    {
      "uuid": "...",
      "name": "Depot A",
      "address": "1 High Street, London, EC1A 1BB",
      "location": {
        "latitude": 51.5155,
        "longitude": -0.0922
      }
    }
  ]
}
```

#### Response — Partial Errors

```json
{
  "status": "OK",
  "created": 3,
  "skipped": 1,
  "errors": [
    { "row": 5, "code": "XYZ999", "message": "Postal code could not be geocoded." }
  ]
}
```

#### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "No file uploaded." }` |
| `422` | `{ "error": "Invalid file format. Expected Excel or CSV." }` |

---

### Step 3 — Process Import Orders

**`POST {{url}}/int/v1/orders/process-import-orders`**

Reads the Excel file and bulk-creates or updates orders, route segments, and driver/vehicle assignments.
curl --location '{{url}}/int/v1/orders/process-import-orders' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer 4365|TCFjWOGsvQCbfMI0NAjjzygMMVedQxfLZQaIrAkJ' \
--data '{
    "files": [
        "file_uuid"
    ]
}'

#### Request

`Content-Type: multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | Yes | Excel import file |

#### Import File Expected Columns

| Column | Description |
|---|---|
| `block_id` | Groups rows into a single order/trip |
| `driver_name` | Driver full name (fuzzy-matched against existing drivers) |
| `plate_number` | Vehicle plate number (fuzzy-matched) |
| `scheduled_at` | Scheduled pickup date/time |
| `estimated_end_date` | Estimated completion date/time |
| `pickup_code` | Place code for pickup location |
| `dropoff_code` | Place code for dropoff location |
| `fleet_name` | Fleet name to assign the order to |

#### Response

```json
{
  "status": "OK",
  "created": 12,
  "updated": 3,
  "errors": [],
  "failed_rows_file": null
}
```

#### Response — With Errors

```json
{
  "status": "partial",
  "created": 10,
  "updated": 2,
  "errors": [
    { "row": 7, "block_id": "BLK-007", "message": "Driver 'J Smith' not found." },
    { "row": 9, "block_id": "BLK-009", "message": "Place code 'ZZZ123' does not exist." }
  ],
  "failed_rows_file": "https://..."
}
```

#### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "No file uploaded." }` |
| `422` | `{ "error": "Invalid spreadsheet structure." }` |

---

## 8. Frontend Logs

**`POST {{url}}/api/v1/frontend/logs`**

Sends client-side log events to the server for diagnostics and error tracking. Called from both the Create Order and View Order pages.

### Request Body

```json
{
  "level": "error",
  "message": "Failed to load order data",
  "context": {
    "order_uuid": "351ef358-72dc-432f-9332-0cb79a496a29",
    "user_agent": "Mozilla/5.0 ...",
    "url": "/orders/351ef358-72dc-432f-9332-0cb79a496a29"
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `level` | string | Yes | `debug`, `info`, `warning`, `error` |
| `message` | string | Yes | Log message |
| `context` | object | No | Additional key-value metadata |

### Response

```json
{
  "status": "OK"
}
```

---

## 9. Supporting APIs — Filters

The following APIs populate dropdown filters on the Orders list page.

### Places — Pickup & Dropoff

**`GET {{url}}/int/v1/places?limit=500`**

Returns places for use in the pickup/dropoff filter dropdowns.

### Drivers

**`GET {{url}}/int/v1/drivers?limit=500`**

Returns all drivers for the driver filter dropdown.

### Fleets

**`GET {{url}}/int/v1/fleets?limit=500`**

Returns all fleets for the fleet filter dropdown.

### Fleet — Single Lookup

**`GET {{url}}/int/v1/fleets/{uuid}`**

Resolves a fleet name from a `fleet_uuid` returned in the orders list.

> **Pending API change:** `fleet_name` (or a `fleet { uuid, name }` object) should be included directly in the orders list response to eliminate this lookup.

### Order Configs (Status / Type filter)

**`GET {{url}}/int/v1/order-configs`**

Returns available order types/configs used to populate the status and type filter dropdowns.

### Vehicles

**`GET {{url}}/int/v1/vehicles?limit=-1&sort=created_at`**

Returns all vehicles. `limit=-1` disables pagination.

---

## 10. Filter Reference

Complete reference of all supported filter parameters for `GET /int/v1/orders`.

| Parameter | Type | Example | Description |
|---|---|---|---|
| `status` | string \| array | `status=dispatched` or `status[]=completed&status[]=canceled` | Filter by order status |
| `unassigned` | boolean | `unassigned=true` | Orders with no driver |
| `active` | boolean | `active=true` | Orders with driver, not completed |
| `dispatched` | boolean | `dispatched=true` | Dispatched orders |
| `started` | boolean | `started=true` | Started orders |
| `adhoc` | boolean | `adhoc=true` | Ad-hoc orders only |
| `pod_required` | boolean | `pod_required=true` | Orders requiring proof of delivery |
| `driver` | string | `driver=driver_abc` | Driver UUID or public_id |
| `vehicle` | string | `vehicle=vehicle_abc` | Vehicle UUID or public_id |
| `fleet` | string | `fleet=fleet_abc` | Fleet UUID, public_id, internal_id, or name |
| `pickup` | string | `pickup=place_abc` | Pickup place UUID, public_id, internal_id, or name |
| `dropoff` | string | `dropoff=place_abc` | Dropoff place UUID, public_id, internal_id, or name |
| `return` | string | `return=place_abc` | Return place UUID or public_id |
| `customer` | string | `customer=contact_abc` | Customer UUID or public_id |
| `facilitator` | string | `facilitator=vendor_abc` | Facilitator UUID or public_id |
| `payload` | string | `payload=payload_abc` | Payload UUID or public_id |
| `tracking` | string | `tracking=TRK-000123` | Exact tracking number |
| `trip_hash_id` | string | `trip_hash_id=ABC-1234` | Trip hash ID |
| `entity_status` | string | `entity_status=pending` | Tracking status on order entities |
| `nearby` | string | `nearby=13.08,80.27` | Proximity filter (lat,lng or driver ID or address) |
| `distance` | integer | `distance=6000` | Radius in metres for `nearby` (default 6000) |
| `on` | date | `on=2026-03-21` | Orders scheduled on this date |
| `timezone` | string | `timezone=Europe/London` | Timezone for `on` filter |
| `scheduled_at` | date | `scheduled_at=2026-03-20` | `scheduled_at >=` date |
| `end_date` | date | `end_date=2026-03-25` | `estimated_end_date <=` date |
| `type` | string | `type=delivery` | Order type or config key |
| `order_config` | string | `order_config=config_abc` | Order config UUID, public_id, or key |
| `created_by` | UUID | `created_by=user_uuid` | Order creator |
| `updated_by` | UUID | `updated_by=user_uuid` | Last updater |
| `query` | string | `query=ORD-001` | Full-text search: public_id, internal_id, trip_id, tracking number |
| `with_tracker_data` | boolean | `with_tracker_data=true` | Include tracker data in response |
| `exclude` | string \| array | `exclude[]=order_uuid` | Exclude specific orders |
| `sort` | string | `sort=-created_at` or `sort=driver:asc` | Sort field. Prefix `-` for descending |
| `page` | integer | `page=2` | Pagination page |
| `per_page` | integer | `per_page=25` | Results per page |
| `layout` | string | `layout=table` | UI layout hint: `table`, `map`, `list` |
