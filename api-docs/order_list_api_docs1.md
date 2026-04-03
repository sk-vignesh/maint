# Order List & View API Documentation

> **Base URL:** `{{url}}/int/v1/orders`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## 1. List Orders

**`GET /int/v1/orders/list`**

Returns a paginated list of orders with lightweight relation data. All joined relations (driver, vehicle, customer, facilitator, fleet) are returned as `{ uuid, name }` only. Payload includes full pickup/dropoff place details. Dates are returned as stored in DB (`Y-m-d H:i:s` UTC).

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `50` | Number of records per page |
| `page` | integer | `1` | Page number |
| `all` | boolean | `false` | If `true`, returns all records in a single response without pagination |
| `sort` | string | `created_at:desc` | Sort column and direction e.g. `created_at:desc`. Allowed: `created_at`, `updated_at`, `scheduled_at`, `status`, `type`, `distance`, `time` |
| `query` | string | — | Full-text search on `public_id`, `internal_id`, tracking number, payload pickup/dropoff/waypoint place names |
| `status` | string | — | Filter by status. Single value, comma-separated list, or `active` (excludes `completed`, `expired`, `canceled`) |
| `driver` | string | — | UUID → exact match on `driver_assigned_uuid`; string → `public_id` / `internal_id` lookup |
| `fleet` | string | — | UUID → exact match on `fleet_uuid`; string → `public_id` / `internal_id` / name LIKE |
| `pickup` | string | — | UUID → exact payload `pickup_uuid` or waypoint place; string → `public_id` / `internal_id` / name LIKE |
| `dropoff` | string | — | UUID → exact payload `dropoff_uuid` or waypoint place; string → `public_id` / `internal_id` / name LIKE |
| `on` | date | — | Single-day overlap filter on `scheduled_at` / `estimated_end_date` |
| `timezone` | string | `UTC` | Timezone for `on` filter (e.g. `Asia/Kolkata`) |
| `scheduled_at` | date | — | Filter by scheduled date. Use with `end_date` for range, or alone for exact date |
| `end_date` | date | — | End of date range for `scheduled_at` filter |
| `created_at` | date | — | Filter by exact created date |
| `updated_at` | date | — | Filter by exact updated date |
| `created_by` | UUID | — | Filter by creator UUID |
| `updated_by` | UUID | — | Filter by updater UUID |
| `public_id` | string | — | LIKE search on order `public_id` |
| `trip_id` | string | — | LIKE search on `trip_id` |

### Response — paginated (default)

```json
{
  "data": [
    {
      "uuid": "b1fe6f82-f2e0-4fb2-bbc0-b9043ada827b",
      "public_id": "order_abc123",
      "internal_id": "ORD-001",
      "type": "delivery",
      "status": "dispatched",
      "dispatched": true,
      "distance": 12000,
      "time": 1800,
      "scheduled_at": "2025-12-29 08:30:00",
      "dispatched_at": "2025-12-29 09:00:00",
      "started_at": null,
      "estimated_end_date": "2025-12-31 08:30:00",
      "created_at": "2026-01-26 06:18:10",
      "updated_at": "2026-01-26 06:18:10",
      "trip_id": "TRIP-001",
      "trip_hash_id": "abc123",
      "fleet_uuid": "fleet-uuid-here",
      "carrier": null,
      "driver_assigned_uuid": "driver-uuid-here",
      "vehicle_assigned_uuid": "vehicle-uuid-here",
      "payload_uuid": "payload-uuid-here",
      "fleet": {
        "uuid": "fleet-uuid-here",
        "name": "Fleet Alpha"
      },
      "driver_assigned": {
        "uuid": "driver-uuid-here",
        "name": "John Doe",
        "license_number": "DL-123456"
      },
      "vehicle_assigned": {
        "uuid": "vehicle-uuid-here",
        "name": "2022 Toyota Hilux ABC123",
        "plate_number": "ABC123"
      },
      "customer": {
        "uuid": "customer-uuid-here",
        "name": "Acme Corp"
      },
      "facilitator": {
        "uuid": "facilitator-uuid-here",
        "name": "Logistics Ltd"
      },
      "route_segments": [
        {
          "uuid": "segment-uuid-here",
          "facility_sequence": 1,
          "shipper_accounts": null
        }
      ],
      "payload": {
        "uuid": "payload-uuid-here",
        "pickup": {
          "uuid": "place-uuid-here",
          "public_id": "place_abc123",
          "name": "Warehouse A",
          "street1": "123 Main St",
          "street2": null,
          "city": "Mumbai",
          "province": "Maharashtra",
          "postal_code": "400001",
          "neighborhood": null,
          "country": "IN",
          "phone": "+91 98765 43210",
          "type": "warehouse",
          "latitude": 19.076,
          "longitude": 72.8777
        },
        "dropoff": {
          "uuid": "place-uuid-here",
          "public_id": "place_def456",
          "name": "Store B",
          "street1": "456 Market Rd",
          "street2": null,
          "city": "Pune",
          "province": "Maharashtra",
          "postal_code": "411001",
          "neighborhood": null,
          "country": "IN",
          "phone": null,
          "type": "store",
          "latitude": 18.5204,
          "longitude": 73.8567
        },
        "waypoints": [
          {
            "uuid": "waypoint-uuid-here",
            "place_uuid": "place-uuid-here",
            "name": "Stop A"
          }
        ]
      }
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

### Response — all records (`all=true`)

```json
{
  "data": [ "...all orders..." ],
  "meta": {
    "total": 2000,
    "per_page": 2000,
    "current_page": 1,
    "last_page": 1
  }
}
```

> Null relations (e.g. no driver assigned) return `null` instead of `{ uuid, name }`.
> `route_segments` returns `[]` when none exist.

### Error Responses

| Status | Body |
|---|---|
| `401` | `{ "error": "Unauthenticated." }` |

---

## 2. View Order

**`GET /int/v1/orders/list/{id}`**

Returns a single order by `uuid` or `public_id`. Uses the same serialization format as the list endpoint — dates as `Y-m-d H:i:s` UTC. Additionally includes `waypoints` inside `payload`.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Order `uuid` or `public_id` |

### Response

```json
{
  "data": {
    "uuid": "b1fe6f82-f2e0-4fb2-bbc0-b9043ada827b",
    "public_id": "order_abc123",
    "internal_id": "ORD-001",
    "type": "delivery",
    "status": "dispatched",
    "dispatched": true,
    "distance": 12000,
    "time": 1800,
    "scheduled_at": "2025-12-29 08:30:00",
    "dispatched_at": "2025-12-29 09:00:00",
    "started_at": null,
    "estimated_end_date": "2025-12-31 08:30:00",
    "created_at": "2026-01-26 06:18:10",
    "updated_at": "2026-01-26 06:18:10",
    "trip_id": "TRIP-001",
    "trip_hash_id": "abc123",
    "fleet_uuid": "fleet-uuid-here",
    "carrier": null,
    "driver_assigned_uuid": "driver-uuid-here",
    "vehicle_assigned_uuid": "vehicle-uuid-here",
    "payload_uuid": "payload-uuid-here",
    "fleet": {
      "uuid": "fleet-uuid-here",
      "name": "Fleet Alpha"
    },
    "driver_assigned": {
      "uuid": "driver-uuid-here",
      "name": "John Doe",
      "license_number": "DL-123456"
    },
    "vehicle_assigned": {
      "uuid": "vehicle-uuid-here",
      "name": "2022 Toyota Hilux ABC123",
      "plate_number": "ABC123"
    },
    "customer": {
      "uuid": "customer-uuid-here",
      "name": "Acme Corp"
    },
    "facilitator": {
      "uuid": "facilitator-uuid-here",
      "name": "Logistics Ltd"
    },
    "route_segments": [
      {
        "uuid": "segment-uuid-here",
        "facility_sequence": 1,
        "shipper_accounts": null
      }
    ],
    "payload": {
      "uuid": "payload-uuid-here",
      "waypoints": [
        {
          "uuid": "waypoint-uuid-here",
          "public_id": "waypoint_abc123",
          "waypoint_public_id": "waypoint_abc123",
          "place_uuid": "place-uuid-here",
          "order": 1,
          "type": null,
          "tracking": "TRK-0001",
          "status": "Waypoint Created",
          "status_code": "CREATED",
          "name": "Stop A",
          "street1": "123 Main St",
          "street2": null,
          "city": "Mumbai",
          "province": "Maharashtra",
          "postal_code": "400001",
          "country": "IN",
          "phone": null,
          "latitude": 19.076,
          "longitude": 72.8777
        }
      ],
      "pickup": {
        "uuid": "place-uuid-here",
        "public_id": "place_abc123",
        "name": "Warehouse A",
        "street1": "123 Main St",
        "street2": null,
        "city": "Mumbai",
        "province": "Maharashtra",
        "postal_code": "400001",
        "neighborhood": null,
        "country": "IN",
        "phone": "+91 98765 43210",
        "type": "warehouse",
        "latitude": 19.076,
        "longitude": 72.8777
      },
      "dropoff": {
        "uuid": "place-uuid-here",
        "public_id": "place_def456",
        "name": "Store B",
        "street1": "456 Market Rd",
        "street2": null,
        "city": "Pune",
        "province": "Maharashtra",
        "postal_code": "411001",
        "neighborhood": null,
        "country": "IN",
        "phone": null,
        "type": "store",
        "latitude": 18.5204,
        "longitude": 73.8567
      }
    }
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Order not found." }` |
| `401` | `{ "error": "Unauthenticated." }` |

---

## Field Reference

### Order Fields

| Field | Type | Description |
|---|---|---|
| `uuid` | string | Internal unique identifier |
| `public_id` | string | Public-facing order ID (e.g. `order_abc123`) |
| `internal_id` | string | Internal reference ID |
| `type` | string | Order type (e.g. `delivery`) |
| `status` | string | Current status (e.g. `created`, `dispatched`, `started`, `completed`, `canceled`) |
| `dispatched` | boolean | Whether the order has been dispatched |
| `distance` | integer | Distance in metres |
| `time` | integer | Estimated duration in seconds |
| `scheduled_at` | string | Scheduled start datetime (`Y-m-d H:i:s` UTC) |
| `dispatched_at` | string\|null | Datetime order was dispatched |
| `started_at` | string\|null | Datetime order was started |
| `estimated_end_date` | string\|null | Estimated completion datetime |
| `created_at` | string | Record creation datetime (`Y-m-d H:i:s` UTC) |
| `updated_at` | string | Record last updated datetime (`Y-m-d H:i:s` UTC) |
| `trip_id` | string\|null | Trip identifier |
| `trip_hash_id` | string\|null | Trip hash identifier |
| `fleet_uuid` | string\|null | UUID of the assigned fleet |
| `carrier` | string\|null | Carrier name |
| `driver_assigned_uuid` | string\|null | UUID of assigned driver |
| `vehicle_assigned_uuid` | string\|null | UUID of assigned vehicle |
| `payload_uuid` | string\|null | UUID of the payload |

### Relation Fields

| Field | Type | Description |
|---|---|---|
| `fleet` | `{ uuid, name }` \| null | Assigned fleet |
| `driver_assigned` | `{ uuid, name, license_number }` \| null | Assigned driver. `license_number` is from `drivers_license_number` |
| `vehicle_assigned` | `{ uuid, name, plate_number }` \| null | Assigned vehicle. `name` is computed from year/make/model/trim/plate |
| `customer` | `{ uuid, name }` \| null | Order customer (Vendor or Contact) |
| `facilitator` | `{ uuid, name }` \| null | Order facilitator (Vendor, IntegratedVendor, or Contact) |
| `route_segments` | array | List of route segments (empty array if none). See Route Segment Fields |
| `payload` | object \| null | Payload with pickup/dropoff place details. `waypoints` is included in both list and view APIs — populated when pickup or dropoff is null |

### Place Fields (pickup / dropoff)

| Field | Type | Description |
|---|---|---|
| `uuid` | string | Place unique identifier |
| `public_id` | string | Public-facing place ID |
| `name` | string\|null | Place name |
| `street1` | string\|null | Street address line 1 |
| `street2` | string\|null | Street address line 2 |
| `city` | string\|null | City |
| `province` | string\|null | State / province |
| `postal_code` | string\|null | Postal / ZIP code |
| `neighborhood` | string\|null | Neighborhood |
| `country` | string\|null | Country code (ISO 3166-1 alpha-2) |
| `phone` | string\|null | Contact phone number |
| `type` | string\|null | Place type (e.g. `warehouse`, `store`) |
| `latitude` | float\|null | Latitude coordinate |
| `longitude` | float\|null | Longitude coordinate |

### Route Segment Fields

| Field | Type | Description |
|---|---|---|
| `uuid` | string | Segment unique identifier |
| `facility_sequence` | integer\|null | Sequence number of the facility |
| `shipper_accounts` | string\|null | Shipper account references |

### Waypoint Fields — List API

| Field | Type | Description |
|---|---|---|
| `uuid` | string | Waypoint unique identifier |
| `place_uuid` | string\|null | UUID of the associated place |
| `name` | string\|null | Place name |

### Waypoint Fields — View API

| Field | Type | Description |
|---|---|---|
| `uuid` | string | Waypoint unique identifier |
| `public_id` | string | Public-facing waypoint ID |
| `waypoint_public_id` | string | Alias of `public_id` |
| `place_uuid` | string\|null | UUID of the associated place |
| `order` | integer | Sequence position of the waypoint |
| `type` | string\|null | Waypoint type |
| `tracking` | string\|null | Tracking number string |
| `status` | string | Latest status label (default: `Waypoint Created`) |
| `status_code` | string | Latest status code (default: `CREATED`) |
| `name` | string\|null | Place name |
| `street1` | string\|null | Street address line 1 |
| `street2` | string\|null | Street address line 2 |
| `city` | string\|null | City |
| `province` | string\|null | State / province |
| `postal_code` | string\|null | Postal / ZIP code |
| `country` | string\|null | Country code (ISO 3166-1 alpha-2) |
| `phone` | string\|null | Contact phone number |
| `latitude` | float\|null | Latitude coordinate |
| `longitude` | float\|null | Longitude coordinate |

---

## Differences: List vs View

| Feature | List (`/list`) | View (`/list/{id}`) |
|---|---|---|
| Pagination | Yes (limit/page or `all=true`) | Single record |
| `driver_assigned.license_number` | Included | Included |
| `vehicle_assigned.plate_number` | Included | Included |
| `payload.waypoints` | Lightweight — `uuid`, `place_uuid`, `name` only. Populated when pickup or dropoff is null | Full detail — all place address fields, `status`, `status_code`, `tracking`, `order`, `type` |
| `payload.pickup` / `payload.dropoff` | Full place fields | Full place fields |
| `route_segments` | Included | Included |
| Dates | `Y-m-d H:i:s` UTC | `Y-m-d H:i:s` UTC |
