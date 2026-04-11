# Fleet Page API Documentation

> **Base URL:** `{{url}}/int/v1/fleets`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## 1. Fleets List

**`GET /int/v1/fleets`**

Fetches the paginated list of fleets displayed in the table. Eagerly loads related `parent_fleet`, `service_area`, and `zone`.

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | — | Items per page |
| `sort` | string | `-created_at` | Sort field. Prepend `-` for descending |
| `with[]` | array | `parent_fleet, service_area, zone` | Eager-loaded relations |
| `query` | string | — | Full-text search |
| `name` | string | — | Filter by fleet name |
| `public_id` | string | — | Filter by public ID |
| `status` | string | — | Filter by status: `active`, `disabled`, `decommissioned` |
| `zone` | UUID | — | Filter by zone UUID |
| `service_area` | UUID | — | Filter by service area UUID |
| `parent_fleet_uuid` | UUID | — | Filter by parent fleet UUID |
| `vendor` | UUID | — | Filter by vendor UUID |
| `task` | string | — | Filter by task |
| `drivers_count` | integer | — | Filter by number of drivers |
| `drivers_online_count` | integer | — | Filter by active drivers count |
| `createdAt` | date | — | Filter by creation date |
| `updatedAt` | date | — | Filter by last update date |

#### Example Request

```
GET {{url}}/int/v1/fleets?sort=-created_at&page=1&with[]=parent_fleet&with[]=service_area&with[]=zone
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `public_id` | string | Human-readable fleet ID (e.g. `FLT-0001`) |
| `name` | string | Fleet name |
| `status` | string | `active`, `disabled`, or `decommissioned` |
| `trip_length` | integer | Number of trips |
| `drivers_count` | integer | Total drivers in fleet |
| `drivers_online_count` | integer | Active/online drivers |
| `task` | string | Fleet task/role |
| `parent_fleet` | object | Parent fleet details (if sub-fleet) |
| `service_area` | object | Associated service area |
| `zone` | object | Associated zone |

---

## 2. Search Fleets

**`GET /int/v1/fleets?query={search_term}`**

Full-text search with 200ms debounce. Resets to page 1 on new search.

#### Example Request

```
GET {{url}}/int/v1/fleets?query=tramper&sort=-created_at&page=1
```

---

## 3. Filter Fleets

**`GET /int/v1/fleets`** with filter query params.

Filters are combined as AND conditions.

#### All Filterable Params

| Param | Filter Type | Example |
|---|---|---|
| `name` | string match | `name=Tramper7` |
| `public_id` | string match | `public_id=FLT-0001` |
| `status` | select | `status=active` |
| `zone` | model UUID | `zone=zon_abc123` |
| `service_area` | model UUID | `service_area=sa_abc123` |
| `parent_fleet_uuid` | model UUID | `parent_fleet_uuid=flt_abc123` |
| `vendor` | model UUID | `vendor=vnd_abc123` |
| `task` | string | `task=delivery` |

#### Example — Filter by status and name

```
GET {{url}}/int/v1/fleets?status=active&name=Tramper
```

---

## 4. Clear Filters

Resets all filter params to null and reloads with default params:

```
GET {{url}}/int/v1/fleets?sort=-created_at&page=1
```

---

## 5. Create Fleet

**`POST /int/v1/fleets`**

Creates a new fleet from the fleet form panel (sidebar).

#### Request Body

```json
{
    "fleet":{
      "name": "Tramper7",
      "status": "active",
      "task": "delivery",
      "trip_length": 5,
      "parent_fleet_uuid": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
}
```

#### Request Body Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Fleet name |
| `status` | string | Yes | `active`, `disabled`, or `decommissioned`. Defaults to `active` |
| `task` | string | No | Fleet task or role description |
| `trip_length` | integer | No | Expected trip length |
| `parent_fleet_uuid` | UUID | No | UUID of the parent fleet (for sub-fleets) |

#### Response

Returns the created fleet object with `public_id`, `uuid`, and all fields.

---

## 6. Edit Fleet

**`PUT /int/v1/fleets/{id}`**

Updates an existing fleet from the fleet form panel.

#### Example Request

```
PUT {{url}}/int/v1/fleets/flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Request Body

```json
{
    "fleet":{
      "name": "Tramper7 Updated",
      "status": "active",
      "task": "delivery",
      "trip_length": 6
    }
}
```

---

## 7. View Fleet (Details Panel)

**`GET /int/v1/fleets/{id}`**

Loads fleet details into the side panel when a fleet name is clicked.

#### Example Request

```
GET {{url}}/int/v1/fleets/flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 8. Delete Fleet

**`DELETE /int/v1/fleets/{id}`**

Deletes a fleet after a confirmation prompt.

#### Example Request

```
DELETE {{url}}/int/v1/fleets/flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 9. Bulk Delete Fleets

**`DELETE {{url}}/int/v1/fleets/bulk-delete`**

Deletes multiple fleets in a single request.

#### Request Body

```json
{
    "ids": [
        "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "flt_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ]
}

```
Confirm bulk delete
#### Request Body

```json

{
    "ids": [
        "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "flt_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```

| Field | Type | Description |
|---|---|---|
| `ids` | array of UUIDs | UUIDs of the fleets to delete |

#### Response — Success

```json
{
    "status": "OK",
    "message": "Deleted 2 fleets successfully.",
    "count": 2
}
```

#### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |

---

## 10. Assign Driver to Fleet

**`POST /int/v1/fleets/assign-driver`**

Assigns a driver to a fleet from the fleet details panel → Drivers tab.

#### Request Body

```json
{
  "driver": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "fleet": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### Notes

- On success, the driver is added to the fleet's driver list in the UI immediately.
- Drivers are fetched for the fleet panel via: `GET /int/v1/drivers?fleet={fleet_uuid}&limit=500`

---

## 11. Remove Driver from Fleet

**`POST /int/v1/fleets/remove-driver`**

Removes a driver from a fleet from the fleet details panel → Drivers tab.

#### Request Body

```json
{
  "driver": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "fleet": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

---

## 12. Assign Vehicle to Fleet

**`POST /int/v1/fleets/assign-vehicle`**

Assigns a vehicle to a fleet from the fleet details panel → Vehicles tab.

#### Request Body

```json
{
  "vehicle": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "fleet": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

---

## 13. Remove Vehicle from Fleet

**`POST /int/v1/fleets/remove-vehicle`**

Removes a vehicle from a fleet from the fleet details panel → Vehicles tab.

#### Request Body

```json
{
  "vehicle": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "fleet": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

---

## 14. Fleet Drivers List (Details Panel)

**`GET /int/v1/drivers`**

Fetches drivers belonging to a fleet for the drivers tab inside the fleet details panel.

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `fleet` | UUID | Fleet UUID to filter drivers by |
| `limit` | integer | `500` — loads all fleet drivers at once |

#### Example Request

```
GET {{url}}/int/v1/drivers?fleet=flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&limit=500
```

---

## 15. Fleet Usage in Orders

Fleets are linked to orders via `fleet_uuid`. The following interactions occur:

### A. Fleet Filter on Orders List

```
GET {{url}}/int/v1/orders?fleet={fleet_uuid}
```

Filters the orders list to show only orders assigned to a specific fleet.

### B. Load Fleet for an Order

**`GET /int/v1/fleets/{fleet_uuid}`**

When an order has a `fleet_uuid` but the fleet relation is not loaded, the order view calls `order.loadFleet()` which triggers a `findRecord` for the fleet.

```
GET {{url}}/int/v1/fleets/flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### C. Fleet Dropdown in New Order / Scheduler

**`GET /int/v1/fleets`**

Fetches all available fleets to populate the fleet selection dropdown when creating or assigning an order.

### D. Order Fleet Assignment (Scheduler)

When saving an order from the scheduler calendar, the fleet is saved as part of the order PUT request:

```
PUT {{url}}/int/v1/orders/{order_uuid}
```

```json
{
  "fleet_uuid": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "driver_assigned_uuid": "drv_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "vehicle_assigned_uuid": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

---

## Key Fleet Fields

| Field | Type | Description |
|---|---|---|
| `public_id` | string | Human-readable ID (e.g. `FLT-0001`) |
| `name` | string | Fleet name |
| `status` | string | `active`, `disabled`, `decommissioned` |
| `task` | string | Fleet task/role |
| `trip_length` | integer | Number of trips associated |
| `drivers_count` | integer | Total drivers assigned to fleet |
| `drivers_online_count` | integer | Drivers currently active/online |
| `parent_fleet_uuid` | UUID / null | UUID of parent fleet (for sub-fleets) |
| `service_area_uuid` | UUID / null | Associated service area |
| `zone_uuid` | UUID / null | Associated zone |
| `vendor_uuid` | UUID / null | Associated vendor |

---

## Fleet Status Values

| Value | UI Label | Description |
|---|---|---|
| `active` | Active | Fleet is operational |
| `disabled` | Disabled | Fleet is temporarily inactive |
| `decommissioned` | Decommissioned | Fleet is permanently retired |
