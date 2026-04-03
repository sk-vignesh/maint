# Auto-Allocation API Documentation

> **Internal Base URL:** `{{url}}/api/v1`
> **Allocation Engine URL:** `https://dev-resource-allocation.agilecyber.com`
>
> The Auto-Allocation flow fetches shift and resource data from the Ontrack API,
> sends it to the Allocation Engine to solve, then applies the result back via Ontrack API.

---

## Flow Overview

```
1. GET  /api/v1/shift-assignments/data          ← Fetch shifts, drivers, vehicles, constraints
2. GET  /api/v1/auto-allocation-constraints      ← Fetch/confirm active constraints
3. POST /initiate-async-allocation               ← Send to Allocation Engine (solve)
4. POST /api/v1/shift-assignments/apply-allocations  ← Save results back to Ontrack
```

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/shift-assignments/data` | None | Fetch shift assignment input data |
| `GET` | `/api/v1/shift-assignments/current-week` | Required | Fetch data for current week |
| `GET` | `/api/v1/shift-assignments/next-week` | Required | Fetch data for next week |
| `GET` | `/api/v1/shift-assignments/available-drivers` | Required | Get available drivers for a date |
| `POST` | `/api/v1/shift-assignments/apply-allocations` | None | Save allocation results |
| `GET` | `/api/v1/auto-allocation-constraints` | Required | Get allocation constraints |
| `POST` | `/api/v1/auto-allocation-constraints` | Required | Update allocation constraints |
| `POST` | `/initiate-async-allocation` | None | Trigger allocation engine (external) |

---

## 1. Get Shift Assignment Data

**`GET /api/v1/shift-assignments/data`**

Fetches all data needed to run the allocation: date range, drivers (resources), shifts (orders), vehicles, pre-assignments, previous allocations, and constraints. Supports two modes: **date range** or **selected orders**.

### Mode A — Date Range

| Param | Type | Required | Description |
|---|---|---|---|
| `start_date` | date | Yes | Start date. Accepts `DD-MM-YYYY` or `YYYY-MM-DD` |
| `end_date` | date | Yes | End date. Accepts `DD-MM-YYYY` or `YYYY-MM-DD` |
| `company_uuid` | string | No | Company UUID to scope results |
| `fleet_uuid` | string | No | Filter to a specific fleet |
| `time_zone` | string | No | Timezone for date conversion. Default: `UTC` |

### Example

```
GET /api/v1/shift-assignments/data?start_date=01-01-2026&end_date=30-01-2026&company_uuid=ac5006be-238e-4928-b622-7454871b98bb
```

### Mode B — Selected Orders (Bulk Allocation)

| Param | Type | Required | Description |
|---|---|---|---|
| `selected_orders` | string | Yes | Comma-separated list of order IDs in brackets e.g. `[id1,id2,id3]` |
| `company_uuid` | string | Yes | Company UUID |
| `fleet_uuid` | string | No | Filter to a specific fleet |
| `time_zone` | string | No | Timezone. Default: `UTC` |

### Example

```
GET /api/v1/shift-assignments/data?company_uuid=ac5006be-...&selected_orders=[xDchCTC,ewGKvzb,Trips-0F2TH7FPX]
```

### Response

```json
{
  "problem_type": "shift_assignment",
  "dates": [
    "2026-01-01",
    "2026-01-02",
    "..."
  ],
  "dated_shifts": [
    {
      "id": "B-BX162QM67",
      "trip_hash_id": "F-oUGY",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-01 17:00:00",
      "end_time": "2026-01-02 05:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    }
  ],
  "resources": [
    {
      "id": "bda5a011-f21e-491f-b410-463c0040c9f8",
      "name": "Walker",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "fleet_trip_lengths": [
        {
          "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
          "trip_length": 34
        }
      ],
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 166,
      "preferences": [],
      "preferred_vehicles": [],
      "preferred_rest_days": [],
      "non_working_dates": [],
      "is_recurring_driver": true
    }
  ],
  "vehicles_data": [
    {
      "id": "b5a4142e-ef54-44a3-ae59-044a034d037e",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "plate_no": "MN2UILK",
      "unavailable_dates": []
    }
  ],
  "previous_allocation_data": [
    {
      "resource_id": "bda5a011-f21e-491f-b410-463c0040c9f8",
      "resource_name": "Walker",
      "assignments": {
        "2025-12-25": {},
        "2025-12-31": {}
      }
    }
  ],
  "pre_assigned_shifts": [],
  "pre_assigned_vehicles": [],
  "company_uuid": "ac5006be-238e-4928-b622-7454871b98bb",
  "fleet_uuid": null,
  "fleet_name": null,
  "constraints": [
    {
      "icon": "clock",
      "name": "...",
      "type": "min_rest_hrs_between_shifts",
      "is_active": true,
      "is_default": 1,
      "parameters": { "value": 11 },
      "description": "...",
      "display_order": 1
    }
  ]
}
```

---

## 2. Get Current Week Data

**`GET /api/v1/shift-assignments/current-week`**

Shortcut for fetching shift assignment data for the current calendar week. Requires auth.

| Param | Type | Description |
|---|---|---|
| `company_uuid` | string | Company UUID |
| `fleet_uuid` | string | Optional fleet filter |
| `time_zone` | string | Timezone. Default: `UTC` |

Response shape is identical to `/shift-assignments/data`.

---

## 3. Get Next Week Data

**`GET /api/v1/shift-assignments/next-week`**

Shortcut for fetching shift assignment data for the next calendar week. Requires auth.

| Param | Type | Description |
|---|---|---|
| `company_uuid` | string | Company UUID |
| `fleet_uuid` | string | Optional fleet filter |
| `time_zone` | string | Timezone. Default: `UTC` |

Response shape is identical to `/shift-assignments/data`.

---

## 4. Get Available Drivers

**`GET /api/v1/shift-assignments/available-drivers`**

Returns drivers who are not on approved leave for a specific date.

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | date | Yes | Date to check (`Y-m-d`) |
| `company_uuid` | string | No | Company UUID |
| `fleet_uuid` | string | No | Fleet filter |

### Response

```json
{
  "success": true,
  "data": {
    "date": "2026-01-15",
    "available_drivers": [
      {
        "id": "driver-public-id",
        "name": "Walker",
        "status": "active",
        "online": true
      }
    ],
    "total_available": 4
  }
}
```

---

## 5. Initiate Async Allocation (Allocation Engine)

**`POST https://dev-resource-allocation.agilecyber.com/initiate-async-allocation`**

Sends the full allocation problem to the external allocation engine to solve. The body is the response from `/shift-assignments/data` with `problem_type` added.

### Request Body

```json
{
  "problem_type": "shift_assignment",
  "dates": ["2026-01-01", "2026-01-02", "..."],
  "dated_shifts": [
    {
      "id": "B-BX162QM67",
      "trip_hash_id": "F-oUGY",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-01 17:00:00",
      "end_time": "2026-01-02 05:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    }
  ],
  "resources": [
    {
      "id": "bda5a011-f21e-491f-b410-463c0040c9f8",
      "name": "Walker",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7", "trip_length": 34 }
      ],
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 166,
      "preferences": [],
      "preferred_vehicles": [],
      "preferred_rest_days": [],
      "non_working_dates": [],
      "is_recurring_driver": true
    }
  ],
  "previous_allocation_data": [
    {
      "resource_id": "bda5a011-f21e-491f-b410-463c0040c9f8",
      "resource_name": "Walker",
      "assignments": {
        "2025-12-25": {},
        "2025-12-31": {}
      }
    }
  ],
  "vehicles_data": [
    {
      "id": "b5a4142e-ef54-44a3-ae59-044a034d037e",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "plate_no": "MN2UILK",
      "unavailable_dates": []
    }
  ],
  "company_uuid": "ac5006be-238e-4928-b622-7454871b98bb",
  "fleet_uuid": null,
  "fleet_name": null,
  "pre_assigned_vehicles": [],
  "pre_assigned_shifts": [],
  "constraints": [
    {
      "type": "min_rest_hrs_between_shifts",
      "is_active": true,
      "is_default": 1,
      "parameters": { "value": 11 },
      "display_order": 1
    }
  ]
}
```

### Request Body Fields

| Field | Type | Description |
|---|---|---|
| `problem_type` | string | Always `shift_assignment` |
| `dates` | array | List of dates (`Y-m-d`) in the allocation window |
| `dated_shifts` | array | Shifts (orders) to be assigned — see Dated Shift Fields |
| `resources` | array | Drivers available for assignment — see Resource Fields |
| `previous_allocation_data` | array | Last 7 days of assignments per driver for continuity |
| `vehicles_data` | array | Vehicles with their unavailable dates — see Vehicle Data Fields |
| `pre_assigned_shifts` | array | Shifts already assigned (driver locked) |
| `pre_assigned_vehicles` | array | Shifts with a vehicle pre-assigned |
| `company_uuid` | string | Company UUID |
| `fleet_uuid` | string\|null | Fleet UUID filter (null = all fleets) |
| `fleet_name` | string\|null | Fleet name |
| `constraints` | array | Active allocation constraints — see Constraint Fields |

### Allocation Engine Response

The engine returns the solved allocation result — the same structure as the `apply-allocations` request body. Pass this directly to `/api/v1/shift-assignments/apply-allocations`.

---

## 6. Apply Allocations

**`POST /api/v1/shift-assignments/apply-allocations`**

Saves the allocation engine results back to Ontrack — assigns drivers and vehicles to orders.

### Request Body

```json
{
  "uuid": "tvsi0-0n8n9",
  "company_uuid": "ac5006be-238e-4928-b622-7454871b98bb",
  "allocated_resources": [
    {
      "resource_id": "bda5a011-f21e-491f-b410-463c0040c9f8",
      "resource_name": "Walker",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7", "trip_length": 34 }
      ],
      "assignments": {
        "2026-03-21": {
          "id": "Trips-MG6VC46NR",
          "trip_hash_id": "F-vyaa",
          "start_time": "2026-03-21 21:30:00",
          "end_time": "2026-03-22 09:49:00",
          "duration_minutes": 739,
          "vehicle_id": "ab5fd6d7-3fb4-4457-8c50-c31017722b2f",
          "plate_no": "KD2UIIS",
          "preference_violated": false
        },
        "2026-03-22": {
          "id": "Trips-RQ0JXCCH8",
          "trip_hash_id": "F-nmEz",
          "start_time": "2026-03-22 21:30:00",
          "end_time": "2026-03-23 09:36:00",
          "duration_minutes": 726,
          "vehicle_id": "ab5fd6d7-3fb4-4457-8c50-c31017722b2f",
          "plate_no": "KD2UIIS",
          "ongoing_trip": true,
          "ongoing_trip_id": "Trips-MG6VC46NR",
          "ongoing_trip_hash_id": "F-vyaa",
          "ongoing_trip_endtime": "2026-03-22 09:49:00",
          "ongoing_vehicle_id": "ab5fd6d7-3fb4-4457-8c50-c31017722b2f",
          "ongoing_vehicle_plate_no": "KD2UIIS",
          "ongoing_trip_pre_assigned": false,
          "ongoing_trip_duration_minutes": 739,
          "ongoing_trip_preference_violated": false,
          "preference_violated": false
        },
        "2026-03-23": {
          "ongoing_trip": true,
          "ongoing_trip_id": "Trips-RQ0JXCCH8",
          "ongoing_trip_hash_id": "F-nmEz",
          "ongoing_trip_endtime": "2026-03-23 09:36:00",
          "ongoing_vehicle_id": "ab5fd6d7-3fb4-4457-8c50-c31017722b2f",
          "ongoing_vehicle_plate_no": "KD2UIIS",
          "ongoing_trip_pre_assigned": false,
          "ongoing_trip_duration_minutes": 726,
          "ongoing_trip_preference_violated": false
        },
        "2026-03-24": {}
      }
    }
  ],
  "uncovered_shifts": {
    "2026-03-11": ["F-SxXD"],
    "2026-03-16": ["T-Dcwi"],
    "2026-03-19": ["F-114e", "F-bB02"]
  }
}
```

### Request Body Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `company_uuid` | string | Yes | Company UUID |
| `allocated_resources` | array | Yes | Array of driver assignments — see Allocated Resource Fields |
| `uuid` | string | No | Allocation UUID — stored on each order as `allocation_uuid` |
| `uncovered_shifts` | object | No | Shifts that could not be covered, keyed by date. Each value is an array of `trip_hash_id` values |
| `timezone` | string | No | Timezone for time conversion. Default: `UTC` |

### Assignment Object Fields

Each date key in `assignments` contains either an empty object `{}` (no assignment) or:

| Field | Type | Description |
|---|---|---|
| `id` | string | Order public ID or trip ID |
| `trip_hash_id` | string | Short trip hash ID |
| `start_time` | string | Shift start datetime (`Y-m-d H:i:s`) |
| `end_time` | string | Shift end datetime (`Y-m-d H:i:s`) |
| `duration_minutes` | integer | Total shift duration in minutes |
| `vehicle_id` | string | UUID of the vehicle assigned |
| `plate_no` | string | Vehicle plate number |
| `preference_violated` | boolean | Whether a driver preference was violated |
| `pre_assigned` | boolean | Whether this was a pre-existing manual assignment |
| `ongoing_trip` | boolean | Whether a previous day's shift overlaps into this date |
| `ongoing_trip_id` | string | ID of the ongoing trip from previous day |
| `ongoing_trip_hash_id` | string | Hash ID of the ongoing trip |
| `ongoing_trip_endtime` | string | When the ongoing trip ends |
| `ongoing_vehicle_id` | string | Vehicle UUID for the ongoing trip |
| `ongoing_vehicle_plate_no` | string | Plate number for the ongoing trip vehicle |
| `ongoing_trip_pre_assigned` | boolean | Whether the ongoing trip was pre-assigned |
| `ongoing_trip_duration_minutes` | integer | Duration of the ongoing trip |
| `ongoing_trip_preference_violated` | boolean | Whether ongoing trip violated preferences |

### Response

```json
{
  "success": true,
  "data": {
    "allocation_uuid": "tvsi0-0n8n9",
    "updated_orders": 15,
    "updated_order_ids": ["Trips-MG6VC46NR", "Trips-RQ0JXCCH8"],
    "unassigned_orders": 3,
    "unassigned_order_ids": ["F-SxXD", "T-Dcwi"],
    "skipped_assignments": 0,
    "errors": []
  },
  "message": "Allocations applied successfully"
}
```

### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "success": false, "message": "company_uuid is required." }` |
| `400` | `{ "success": false, "message": "allocated_resources must be an array." }` |

---

## 7. Get Auto-Allocation Constraints

**`GET /api/v1/auto-allocation-constraints`**

Fetches the allocation constraints configured for the company. Supports optional date-range scoping to retrieve constraints saved for a specific period.

| Param | Type | Description |
|---|---|---|
| `from_date` | date | Start of date range (`Y-m-d`) |
| `to_date` | date | End of date range (`Y-m-d`) |
| `only_active` | boolean | If `true`, returns only `is_active=true` constraints |

### Example

```
GET /api/v1/auto-allocation-constraints?from_date=2026-01-01&to_date=2026-01-30
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "icon": "clock",
      "name": "fleet-ops.management.allocation-settings.legal-safety-rules.rules.min-rest-hrs-between-shifts.name",
      "type": "min_rest_hrs_between_shifts",
      "is_active": true,
      "is_default": 1,
      "parameters": { "value": 11 },
      "description": "...",
      "display_order": 1
    },
    {
      "icon": "calendar-alt",
      "type": "min_weekly_continuous_rest_hrs",
      "is_active": true,
      "is_default": 1,
      "parameters": { "value": 46, "validation_value": 24 },
      "display_order": 2
    },
    {
      "icon": "route",
      "type": "max_weekly_trips",
      "is_active": true,
      "is_default": 0,
      "parameters": { "value": 5 },
      "display_order": 3
    },
    {
      "icon": "user-clock",
      "type": "shift_preference",
      "is_active": true,
      "is_default": 0,
      "parameters": null,
      "display_order": 4
    },
    {
      "icon": "calendar-check",
      "type": "preferred_rest_days",
      "is_active": true,
      "is_default": 0,
      "parameters": null,
      "display_order": 5
    },
    {
      "icon": "tools",
      "type": "vehicle_maintenance",
      "is_active": true,
      "is_default": 1,
      "parameters": null,
      "display_order": 6
    },
    {
      "icon": "truck",
      "type": "preferred_vehicle",
      "is_active": true,
      "is_default": 0,
      "parameters": null,
      "display_order": 7
    },
    {
      "icon": "user-check",
      "type": "driver_availability",
      "is_active": true,
      "is_default": 1,
      "parameters": null,
      "display_order": 8
    }
  ]
}
```

---

## 8. Update Auto-Allocation Constraints

**`POST /api/v1/auto-allocation-constraints`**

Saves or updates allocation constraints for the company. When `from_date` and `to_date` are provided, the constraints are saved as a date-range-specific record; otherwise they update the company-level defaults.

### Request Body

```json
{
  "constraints": [
    {
      "type": "min_rest_hrs_between_shifts",
      "is_active": true,
      "parameters": { "value": 11 }
    },
    {
      "type": "max_weekly_trips",
      "is_active": true,
      "parameters": { "value": 5 }
    },
    {
      "type": "preferred_vehicle",
      "is_active": false,
      "parameters": null
    }
  ],
  "from_date": "2026-01-01",
  "to_date": "2026-01-30"
}
```

### Response — with date range

```json
{
  "success": true,
  "message": "Constraints saved with date range",
  "data": {
    "uuid": "constraint-uuid-here",
    "constraints": [ "..." ],
    "from_date": "2026-01-01",
    "to_date": "2026-01-30"
  }
}
```

### Response — without date range (company-level)

```json
{
  "success": true,
  "message": "Constraints updated successfully",
  "data": {
    "constraints": [ "..." ]
  }
}
```

---

## Field Reference

### Dated Shift Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Order public ID or trip ID |
| `trip_hash_id` | string | Short hash ID of the trip/order |
| `fleet_uuid` | string | Primary fleet UUID this shift belongs to |
| `fleet_uuids` | array | All fleet UUIDs (may be empty) |
| `fleet_color` | string | Hex color for the fleet (used in UI) |
| `start_time` | string | Shift start datetime (`Y-m-d H:i:s` UTC) |
| `end_time` | string | Shift end datetime (`Y-m-d H:i:s` UTC) |
| `duration_minutes` | integer | Shift duration in minutes |
| `date` | string\|null | Specific date override (usually null) |

### Resource (Driver) Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Driver UUID |
| `name` | string | Driver full name |
| `fleet_uuids` | array | Fleet UUIDs the driver belongs to |
| `fleet_trip_lengths` | array | Per-fleet trip length (hours). See Fleet Trip Length Fields |
| `unavailable_dates` | array | Dates driver is on approved leave (`Y-m-d`) |
| `non_working_dates` | array | Dates from recurring off-shift patterns |
| `maximum_trips_per_week` | integer | Max trips allowed per week |
| `priority` | integer | Driver priority score (higher = preferred first) |
| `preferences` | object\|array | Day-of-week shift time preferences. See Preference Fields |
| `preferred_vehicles` | array | Vehicle UUIDs this driver prefers |
| `preferred_rest_days` | array | Preferred days off (e.g. `["Saturday", "Sunday"]`) |
| `is_recurring_driver` | boolean | Whether driver has a recurring shift pattern |

### Fleet Trip Length Fields

| Field | Type | Description |
|---|---|---|
| `fleet_uuid` | string | Fleet UUID |
| `trip_length` | integer\|null | Number of trips in the fleet for the period |

### Driver Preference Fields

Keyed by lowercase day name (`monday`, `tuesday`, etc.), each value is an array of time windows:

| Field | Type | Description |
|---|---|---|
| `start` | string | Earliest acceptable start time (`HH:mm:ss`) |
| `end` | string | Latest acceptable end time (`HH:mm:ss`) |
| `start_time` | string | Preferred start time (`HH:mm:ss`) |
| `start_time_flexibility` | integer | Flexibility in hours around `start_time` |

### Vehicle Data Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Vehicle UUID |
| `fleet_uuids` | array | Fleet UUIDs the vehicle belongs to |
| `plate_no` | string | Vehicle plate number |
| `unavailable_dates` | array | Dates vehicle is under maintenance (`Y-m-d`) |

### Allocated Resource Fields

| Field | Type | Description |
|---|---|---|
| `resource_id` | string | Driver UUID |
| `resource_name` | string | Driver name |
| `fleet_uuids` | array | Fleet UUIDs |
| `fleet_trip_lengths` | array | Fleet trip length data |
| `assignments` | object | Date-keyed assignment map. Empty `{}` = no assignment for that date |

### Constraint Fields

| Field | Type | Description |
|---|---|---|
| `type` | string | Constraint type identifier — see Constraint Types |
| `is_active` | boolean | Whether this constraint is enforced during allocation |
| `is_default` | integer | `1` = always-on default, `0` = optional |
| `parameters` | object\|null | Configuration values for the constraint |
| `icon` | string | FontAwesome icon name (UI only) |
| `name` | string | i18n translation key (UI label) |
| `description` | string | i18n translation key (UI description) |
| `display_order` | integer | Sort order in UI |

### Constraint Types

| Type | Default | Parameters | Description |
|---|---|---|---|
| `min_rest_hrs_between_shifts` | Yes | `{ "value": 11 }` | Minimum rest hours required between consecutive shifts |
| `min_weekly_continuous_rest_hrs` | Yes | `{ "value": 46, "validation_value": 24 }` | Minimum continuous weekly rest hours required |
| `max_weekly_trips` | No | `{ "value": 5 }` | Maximum number of trips per driver per week |
| `shift_preference` | No | null | Respect driver's day/time shift preferences |
| `preferred_rest_days` | No | null | Respect driver's preferred rest days |
| `preferred_vehicle` | No | null | Assign preferred vehicle to driver where possible |
| `vehicle_maintenance` | Yes | null | Exclude vehicles with active maintenance schedules |
| `driver_availability` | Yes | null | Exclude drivers on approved leave |

---

## Constraint Lookup Priority

When fetching constraints, the system uses this hierarchy:

1. **Date-range specific** — checks `auto_allocation_constraints` table for a record where `from_date` and `to_date` overlap the requested period
2. **Company-level default** — falls back to `companies.auto_allocation_constraints` JSON column if no date-range record exists

---

## Supporting APIs

The following standard Ontrack APIs are also called during the auto-allocation UI flow to populate fleet and order context:

### Get Fleets

```
GET /int/v1/fleets?company_uuid={uuid}
```

Returns available fleets for the company to populate the fleet selector.

### Get Orders

```
GET /int/v1/orders?start_date={DD-MM-YYYY}&end_date={DD-MM-YYYY}&company_uuid={uuid}
```

Returns orders in the date range for display alongside allocation results.
