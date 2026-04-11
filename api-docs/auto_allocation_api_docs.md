# Auto-Allocation API Documentation

> **Internal Base URL:** `{{url}}/api/v1`
> **Allocation Engine URL:** `https://dev-resource-allocation.agilecyber.com`
>
> The Auto-Allocation flow fetches shift and resource data from the Ontrack API,
> sends it to the Allocation Engine to solve, then applies the result back via Ontrack API.

---

## Flow Overview

The auto-allocation UI executes the following steps in order:

```
Step 1 — Load page data (parallel)
  GET  /api/v1/shift-assignments/data          ← shifts, drivers, vehicles, constraints
  GET  /int/v1/fleets                          ← fleet list for fleet selector
  GET  /int/v1/orders                          ← orders in date range for display
  GET  /api/v1/auto-allocation-constraints     ← active constraints for the period

Step 2 — Fill resource availability & confirm constraints (UI action)
  User reviews driver availability, adjusts constraints, then confirms.

Step 3 — Re-fetch shift data for the confirmed allocation window
  GET  /api/v1/shift-assignments/data          ← same endpoint, narrowed date range

Step 4 — Initiate allocation engine
  POST https://dev-resource-allocation.agilecyber.com/initiate-async-allocation
                                               ← body = output of Step 3 + constraints

Step 5 — Apply results back to Ontrack
  POST /api/v1/shift-assignments/apply-allocations
                                               ← body = allocation engine response
```

---

## Endpoints Overview

| Step | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/v1/shift-assignments/data` | None | Fetch shifts, drivers, vehicles, constraints |
| 1 | `GET` | `/int/v1/fleets` | None | Fetch fleet list for selector |
| 1 | `GET` | `/int/v1/orders` | None | Fetch orders for date range display |
| 1 | `GET` | `/api/v1/auto-allocation-constraints` | Required | Fetch active constraints for period |
| 3 | `GET` | `/api/v1/shift-assignments/data` | None | Re-fetch for confirmed allocation window |
| 4 | `POST` | `https://dev-resource-allocation.agilecyber.com/initiate-async-allocation` | None | Trigger allocation engine (external) |
| 5 | `POST` | `/api/v1/shift-assignments/apply-allocations` | None | Save allocation results to Ontrack |
| — | `GET` | `/api/v1/shift-assignments/current-week` | Required | Shortcut: fetch data for current week |
| — | `GET` | `/api/v1/shift-assignments/next-week` | Required | Shortcut: fetch data for next week |
| — | `GET` | `/api/v1/shift-assignments/available-drivers` | Required | Get available drivers for a date |
| — | `POST` | `/api/v1/auto-allocation-constraints` | Required | Save or update allocation constraints |

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

The body is the full output of Step 3 (`/shift-assignments/data`) passed directly to the allocation engine.

```json
{
  "problem_type": "shift_assignment",
  "dates": [
    "2026-01-01",
    "2026-01-02",
    "2026-01-03",
    "2026-01-04",
    "2026-01-05",
    "2026-01-06",
    "2026-01-07",
    "2026-01-08",
    "2026-01-09",
    "2026-01-10"
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
    },
    {
      "id": "B-WL9GH0KBM",
      "trip_hash_id": "F-jIZd",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 13:00:00",
      "end_time": "2026-01-03 01:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-G4MTK6B6N",
      "trip_hash_id": "F-Blkw",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 17:00:00",
      "end_time": "2026-01-03 05:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-Z1RF6BKZ4",
      "trip_hash_id": "F-dvgs",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 17:00:00",
      "end_time": "2026-01-03 05:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-RHS8Q7846",
      "trip_hash_id": "F-rHWQ",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 18:00:00",
      "end_time": "2026-01-03 06:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-1VC77NS5H",
      "trip_hash_id": "F-DN2i",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 19:00:00",
      "end_time": "2026-01-03 07:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-03Q9NWH42",
      "trip_hash_id": "F-TcZi",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 20:30:00",
      "end_time": "2026-01-03 09:00:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-DDRP2CKPL",
      "trip_hash_id": "F-usdE",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 22:00:00",
      "end_time": "2026-01-03 10:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-VPJ36SN9W",
      "trip_hash_id": "F-nJWT",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-02 22:30:00",
      "end_time": "2026-01-03 11:00:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-12NM0KHXS",
      "trip_hash_id": "F-B27g",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 13:00:00",
      "end_time": "2026-01-04 01:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-LTJDNM0VJ",
      "trip_hash_id": "F-Auze",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 17:00:00",
      "end_time": "2026-01-04 05:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-DR681G0GB",
      "trip_hash_id": "F-uBnM",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 17:00:00",
      "end_time": "2026-01-04 05:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-ZMQ06JSLP",
      "trip_hash_id": "F-RktR",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 18:00:00",
      "end_time": "2026-01-04 06:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-QN3P7V40B",
      "trip_hash_id": "F-VDou",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 19:00:00",
      "end_time": "2026-01-04 07:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-929HX2K9L",
      "trip_hash_id": "F-UtGE",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 20:30:00",
      "end_time": "2026-01-04 09:00:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-KNCFP2GDD",
      "trip_hash_id": "F-K85M",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 22:00:00",
      "end_time": "2026-01-04 10:30:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    },
    {
      "id": "B-H2VNKSFST",
      "trip_hash_id": "F-RTW3",
      "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7",
      "start_time": "2026-01-03 22:30:00",
      "end_time": "2026-01-04 11:00:00",
      "duration_minutes": 750,
      "fleet_uuids": [],
      "fleet_color": "#c4eaa4",
      "date": null
    }
  ],
  "resources": [
    {
      "id": "bda5a011-f21e-491f-b410-463c0040c9f8",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7", "trip_length": 34 }
      ],
      "name": "Walker",
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 166,
      "preferences": [],
      "preferred_vehicles": [],
      "preferred_rest_days": [],
      "non_working_dates": [],
      "is_recurring_driver": true
    },
    {
      "id": "7b4f85e1-d9df-424e-bf3b-0fb9e691786b",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7", "trip_length": 34 }
      ],
      "name": "liam",
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 171,
      "preferences": {
        "monday": [{ "end": "15:00:00", "start": "08:00:00" }],
        "saturday": [{ "end": "23:00:00", "start": "08:00:00" }],
        "thursday": [{ "end": "20:00:00", "start": "08:00:00" }],
        "wednesday": [{ "end": "14:00:00", "start": "08:00:00" }]
      },
      "preferred_vehicles": [],
      "preferred_rest_days": ["Tuesday", "Friday", "Sunday"],
      "non_working_dates": [],
      "is_recurring_driver": false
    },
    {
      "id": "575ed46a-b9d8-4bbc-8b9c-376059c65874",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7", "trip_length": 34 }
      ],
      "name": "Ananth",
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 157,
      "preferences": [],
      "preferred_vehicles": ["a13598d0-36f7-454b-913c-252017a1c1c6"],
      "preferred_rest_days": [],
      "non_working_dates": [],
      "is_recurring_driver": false
    },
    {
      "id": "48963208-9ff2-472b-b35b-b907d5b7d4d3",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "4d845840-619d-4014-9990-02f1408fbbd7", "trip_length": 34 }
      ],
      "name": "Wilson",
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 159,
      "preferences": [],
      "preferred_vehicles": [],
      "preferred_rest_days": [],
      "non_working_dates": [],
      "is_recurring_driver": false
    },
    {
      "id": "4cc24e7e-5527-4ba2-a88f-aa37e316af47",
      "fleet_uuids": ["8b14ed3a-3a89-499e-8b8a-845a504e1d2b"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "8b14ed3a-3a89-499e-8b8a-845a504e1d2b", "trip_length": null }
      ],
      "name": "Roberts",
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 165,
      "preferences": [],
      "preferred_vehicles": [],
      "preferred_rest_days": [],
      "non_working_dates": [],
      "is_recurring_driver": false
    },
    {
      "id": "5b1c9de6-b043-4d5e-86c0-daeef3415685",
      "fleet_uuids": ["bc6377ab-fc08-49a2-9b99-0ee8856e5677"],
      "fleet_trip_lengths": [
        { "fleet_uuid": "bc6377ab-fc08-49a2-9b99-0ee8856e5677", "trip_length": null }
      ],
      "name": "Hall",
      "unavailable_dates": [],
      "maximum_trips_per_week": 5,
      "priority": 167,
      "preferences": [],
      "preferred_vehicles": [],
      "preferred_rest_days": [],
      "non_working_dates": [],
      "is_recurring_driver": false
    }
  ],
  "previous_allocation_data": [
    {
      "resource_id": "bda5a011-f21e-491f-b410-463c0040c9f8",
      "resource_name": "Walker",
      "assignments": {
        "2025-12-25": {}, "2025-12-26": {}, "2025-12-27": {},
        "2025-12-28": {}, "2025-12-29": {}, "2025-12-30": {}, "2025-12-31": {}
      }
    },
    {
      "resource_id": "7b4f85e1-d9df-424e-bf3b-0fb9e691786b",
      "resource_name": "liam",
      "assignments": {
        "2025-12-25": {}, "2025-12-26": {}, "2025-12-27": {},
        "2025-12-28": {}, "2025-12-29": {}, "2025-12-30": {}, "2025-12-31": {}
      }
    },
    {
      "resource_id": "575ed46a-b9d8-4bbc-8b9c-376059c65874",
      "resource_name": "Ananth",
      "assignments": {
        "2025-12-25": {}, "2025-12-26": {}, "2025-12-27": {},
        "2025-12-28": {}, "2025-12-29": {}, "2025-12-30": {}, "2025-12-31": {}
      }
    },
    {
      "resource_id": "48963208-9ff2-472b-b35b-b907d5b7d4d3",
      "resource_name": "Wilson",
      "assignments": {
        "2025-12-25": {}, "2025-12-26": {}, "2025-12-27": {},
        "2025-12-28": {}, "2025-12-29": {}, "2025-12-30": {}, "2025-12-31": {}
      }
    },
    {
      "resource_id": "4cc24e7e-5527-4ba2-a88f-aa37e316af47",
      "resource_name": "Roberts",
      "assignments": {
        "2025-12-25": {}, "2025-12-26": {}, "2025-12-27": {},
        "2025-12-28": {}, "2025-12-29": {}, "2025-12-30": {}, "2025-12-31": {}
      }
    },
    {
      "resource_id": "5b1c9de6-b043-4d5e-86c0-daeef3415685",
      "resource_name": "Hall",
      "assignments": {
        "2025-12-25": {}, "2025-12-26": {}, "2025-12-27": {},
        "2025-12-28": {}, "2025-12-29": {}, "2025-12-30": {}, "2025-12-31": {}
      }
    }
  ],
  "vehicles_data": [
    {
      "id": "27627756-df0d-4d45-ad51-37b68cc64fde",
      "fleet_uuids": ["37e2db3f-a61f-4e88-bf9c-1b239debeba2"],
      "plate_no": "NU22GXK",
      "unavailable_dates": []
    },
    {
      "id": "a21cb53d-8a17-41dc-8928-b03c6c7c2de4",
      "fleet_uuids": ["37e2db3f-a61f-4e88-bf9c-1b239debeba2"],
      "plate_no": "NX22PHIL",
      "unavailable_dates": []
    },
    {
      "id": "a13598d0-36f7-454b-913c-252017a1c1c6",
      "fleet_uuids": ["b65c1ee6-1435-48ac-b110-f88075fcdec4"],
      "plate_no": "LX21TRK",
      "unavailable_dates": []
    },
    {
      "id": "b8340127-bce1-4499-9e09-e1d75d29e966",
      "fleet_uuids": ["37e2db3f-a61f-4e88-bf9c-1b239debeba2"],
      "plate_no": "KD20KAF",
      "unavailable_dates": []
    },
    {
      "id": "d3422f81-8c42-4226-a036-11d8599499b8",
      "fleet_uuids": ["37e2db3f-a61f-4e88-bf9c-1b239debeba2"],
      "plate_no": "MN22HGV",
      "unavailable_dates": []
    },
    {
      "id": "b5a4142e-ef54-44a3-ae59-044a034d037e",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "plate_no": "MN2UILK",
      "unavailable_dates": []
    },
    {
      "id": "ab5fd6d7-3fb4-4457-8c50-c31017722b2f",
      "fleet_uuids": ["4d845840-619d-4014-9990-02f1408fbbd7"],
      "plate_no": "KD2UIIS",
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
      "icon": "clock",
      "name": "fleet-ops.management.allocation-settings.legal-safety-rules.rules.min-rest-hrs-between-shifts.name",
      "type": "min_rest_hrs_between_shifts",
      "is_active": true,
      "is_default": 1,
      "parameters": { "value": 11 },
      "description": "fleet-ops.management.allocation-settings.legal-safety-rules.rules.min-rest-hrs-between-shifts.description",
      "display_order": 1
    },
    {
      "icon": "calendar-alt",
      "name": "fleet-ops.management.allocation-settings.legal-safety-rules.rules.min-weekly-continuous-rest-hrs.name",
      "type": "min_weekly_continuous_rest_hrs",
      "is_active": true,
      "is_default": 1,
      "parameters": { "value": 46, "validation_value": 24 },
      "description": "fleet-ops.management.allocation-settings.legal-safety-rules.rules.min-weekly-continuous-rest-hrs.description",
      "display_order": 2
    },
    {
      "icon": "route",
      "name": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.max-weekly-trips.name",
      "type": "max_weekly_trips",
      "is_active": true,
      "is_default": 0,
      "parameters": { "value": 5 },
      "description": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.max-weekly-trips.description",
      "display_order": 3
    },
    {
      "icon": "user-clock",
      "name": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.shift-preference.name",
      "type": "shift_preference",
      "is_active": true,
      "is_default": 0,
      "parameters": null,
      "description": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.shift-preference.description",
      "display_order": 4
    },
    {
      "icon": "calendar-check",
      "name": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.preferred-rest-days.name",
      "type": "preferred_rest_days",
      "is_active": true,
      "is_default": 0,
      "parameters": null,
      "description": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.preferred-rest-days.description",
      "display_order": 5
    },
    {
      "icon": "tools",
      "name": "fleet-ops.management.allocation-settings.legal-safety-rules.rules.vehicle-maintenance.name",
      "type": "vehicle_maintenance",
      "is_active": true,
      "is_default": 1,
      "parameters": null,
      "description": "fleet-ops.management.allocation-settings.legal-safety-rules.rules.vehicle-maintenance.description",
      "display_order": 6
    },
    {
      "icon": "truck",
      "name": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.preferred-vehicle.name",
      "type": "preferred_vehicle",
      "is_active": true,
      "is_default": 0,
      "parameters": null,
      "description": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.preferred-vehicle.description",
      "display_order": 7
    },
    {
      "icon": "user-check",
      "name": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.driver-availability.name",
      "type": "driver_availability",
      "is_active": true,
      "is_default": 1,
      "parameters": null,
      "description": "fleet-ops.management.allocation-settings.driver-scheduling-preferences.rules.driver-availability.description",
      "display_order": 8
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

## Supporting APIs (Step 1 — Page Load)

Called in parallel with `/shift-assignments/data` when the auto-allocation page first loads.

### Get Fleets

**`GET /int/v1/fleets`**

| Param | Type | Required | Description |
|---|---|---|---|
| `company_uuid` | string | Yes | Company UUID |

### Example

```
GET /int/v1/fleets?company_uuid=ac5006be-238e-4928-b622-7454871b98bb
```

Returns available fleets for the company to populate the fleet selector.

### Get Orders

**`GET /int/v1/orders`**

| Param | Type | Required | Description |
|---|---|---|---|
| `start_date` | date | Yes | Start date (`DD-MM-YYYY`) |
| `end_date` | date | Yes | End date (`DD-MM-YYYY`) |
| `company_uuid` | string | Yes | Company UUID |

### Example

```
GET /int/v1/orders?start_date=01-01-2026&end_date=30-01-2026&company_uuid=ac5006be-238e-4928-b622-7454871b98bb
```

Returns orders in the date range for display alongside allocation results.
