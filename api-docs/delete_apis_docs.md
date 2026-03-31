# Delete APIs Documentation

> **Base URL:** `{{url}}/int/v1`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## Overview

Two types of delete operations are available for each resource:

| Type | Method | Pattern | Description |
|---|---|---|---|
| Single Delete | `DELETE` | `/int/v1/{resource}/{id}` | Deletes one record by UUID |
| Bulk Delete | `DELETE` | `/int/v1/{resource}/bulk-delete` | Deletes multiple records by UUID array |

All deletes are **soft deletes** — records are not permanently removed; `deleted_at` is set.

---

## Single Delete — Standard Response

All single delete endpoints return the same structure:

**Success (200)**

```json
{
    "id": "order_abc123",
    "uuid": "351ef358-72dc-432f-9332-0cb79a496a29",
    "public_id": "order_abc123",
    "object": "order",
    "time": "2026-03-30T10:00:00.000000Z",
    "deleted": true
}
```

**Not Found (404)**

```json
{
    "error": "{Resource} resource not found."
}
```

---

## Bulk Delete — Standard Response

All standard bulk delete endpoints return:

**Success (200)**

```json
{
    "status": "OK",
    "message": "Deleted {n} {resource}"
}
```

**Nothing to delete (400)**

```json
{
    "error": "Nothing to delete."
}
```

---

## 1. Orders

### Single Delete

**`DELETE /int/v1/orders/{id}`**

Soft-deletes a single order.

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Order UUID |

#### Example Request

```
DELETE {{url}}/int/v1/orders/351ef358-72dc-432f-9332-0cb79a496a29
```

#### Response

```json
{
    "id": "order_abc123",
    "uuid": "351ef358-72dc-432f-9332-0cb79a496a29",
    "public_id": "order_abc123",
    "object": "order",
    "time": "2026-03-30T10:00:00.000000Z",
    "deleted": true
}
```

#### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Order resource not found." }` |

---

### Bulk Delete

**`DELETE /int/v1/orders/bulk-delete`**

Soft-deletes multiple orders and their related route segments.

#### Request Body

```json
{
    "ids": [
        "351ef358-72dc-432f-9332-0cb79a496a29",
        "2c5e6e8b-88a6-4758-843b-119be03b6cb4"
    ]
}
```

#### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 orders and their related route segments",
    "count": 2
}
```

#### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |
| `500` | `{ "error": "Failed to bulk delete orders." }` |

---

## 2. Places

### Single Delete

**`DELETE /int/v1/places/{id}`**

Soft-deletes a single place.

#### Example Request

```
DELETE {{url}}/int/v1/places/plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Response

```json
{
    "id": "PLc-0001",
    "uuid": "plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "public_id": "PLc-0001",
    "object": "place",
    "time": "2026-03-30T10:00:00.000000Z",
    "deleted": true
}
```

---

### Bulk Delete

**`DELETE /int/v1/places/bulk-delete`**

Deletes multiple places. Places referenced by active orders cannot be deleted without force confirmation.

> This endpoint has a **multi-step confirmation flow** — the first call checks references; the second call with `force: true` performs the deletion.

#### Request Body

```json
{
    "ids": [
        "plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "plc_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `ids` | array of UUIDs | Yes | UUIDs of places to delete |
| `force` | boolean | No | Pass `true` to confirm and execute deletion |

#### Response — Case A: All places referenced by orders (cannot delete)

```json
{
    "hasActiveOrders": true,
    "message": "All selected places are referenced by orders and cannot be deleted.",
    "cannotDelete": [
        { "uuid": "plc_xxx...", "public_id": "PLc-0001", "name": "Depot A", "code": "DEP-A" }
    ],
    "cannotDeleteCount": 1
}
```

#### Response — Case B: All places safe to delete (requires confirmation)

First call (without `force`):

```json
{
    "requiresConfirmation": true,
    "message": "All selected places can be deleted. Please confirm.",
    "deletablePlaces": [
        { "uuid": "plc_xxx...", "public_id": "PLc-0001", "name": "Depot A", "code": "DEP-A" }
    ],
    "deletableCount": 2
}
```

Second call (with `force: true`):

```json
{
    "status": "success",
    "message": "Deleted 2 places",
    "count": 2,
    "deletedPlaces": [
        { "uuid": "plc_xxx...", "public_id": "PLc-0001", "name": "Depot A", "code": "DEP-A" }
    ]
}
```

#### Response — Case C: Mixed (some can delete, some cannot)

First call (without `force`):

```json
{
    "message": "Some places cannot be deleted due to existing orders. Others can be deleted after confirmation.",
    "cannotDelete": [
        { "uuid": "plc_xxx...", "public_id": "PLc-0001", "name": "Depot A", "code": "DEP-A" }
    ],
    "cannotDeleteCount": 1,
    "requiresConfirmation": [
        { "uuid": "plc_yyy...", "public_id": "PLc-0002", "name": "Depot B", "code": "DEP-B" }
    ],
    "requiresCount": 1
}
```

Second call (with `force: true`) — deletes only the safe ones, skips the rest:

```json
{
    "status": "success",
    "message": "Deleted 1 places",
    "count": 1,
    "deletedPlaces": [
        { "uuid": "plc_yyy...", "public_id": "PLc-0002", "name": "Depot B", "code": "DEP-B" }
    ],
    "skippedPlaces": [
        { "uuid": "plc_xxx...", "public_id": "PLc-0001", "name": "Depot A", "code": "DEP-A" }
    ],
    "skippedCount": 1
}
```

#### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |

---

## 3. Drivers

### Update Driver Status

**`PUT /int/v1/drivers/{id}`**

Updates the status of a single driver record.

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Driver UUID |

#### Request Body

```json
{
    "driver": {
        "status": "active"
    }
}
```

#### Status Values

| Value | Description |
|---|---|
| `active` | Driver is active and available |
| `inactive` | Driver is inactive |
| `deactivated` | Driver account deactivated |

#### Response

Returns the updated driver object.

#### Error Responses

| Status | Body |
|---|---|
| `404` | `{ "error": "Driver resource not found." }` |

---


## 4. Vehicles

### Single Delete

**`DELETE /int/v1/vehicles/{id}`**

#### Example Request

```
DELETE {{url}}/int/v1/vehicles/veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Response

```json
{
    "id": "vehicle_abc123",
    "uuid": "veh_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "public_id": "vehicle_abc123",
    "object": "vehicle",
    "time": "2026-03-30T10:00:00.000000Z",
    "deleted": true
}
```

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

#### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 vehicles"
}
```

---

## 5. Fleets

### Single Delete

**`DELETE /int/v1/fleets/{id}`**

#### Example Request

```
DELETE {{url}}/int/v1/fleets/flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Response

```json
{
    "id": "FLT-0001",
    "uuid": "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "public_id": "FLT-0001",
    "object": "fleet",
    "time": "2026-03-30T10:00:00.000000Z",
    "deleted": true
}
```

---

### Bulk Delete

**`DELETE /int/v1/fleets/bulk-delete`**

#### Request Body

```json
{
    "ids": [
        "flt_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "flt_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ]
}
```

#### Response

```json
{
    "status": "OK",
    "message": "Deleted 2 fleets"
}
```

---


---

## Endpoint Summary

### Single Delete Endpoints

| Resource | Endpoint |
|---|---|
| Orders | `DELETE /int/v1/orders/{id}` |
| Places | `DELETE /int/v1/places/{id}` |
| Vehicles | `DELETE /int/v1/vehicles/{id}` |
| Fleets | `DELETE /int/v1/fleets/{id}` |

### Bulk Delete Endpoints

| Resource | Endpoint | Special Behaviour |
|---|---|---|
| Orders | `DELETE /int/v1/orders/bulk-delete` | Also deletes related route segments |
| Places | `DELETE /int/v1/places/bulk-delete` | Multi-step confirmation; checks active order references |
| Vehicles | `DELETE /int/v1/vehicles/bulk-delete` | — |
| Fleets | `DELETE /int/v1/fleets/bulk-delete` | — |

### Driver Status / Priority Endpoints

| Action | Method | Endpoint |
|---|---|---|
| Update Driver Status | `PUT` | `/int/v1/drivers/{id}` |
| Bulk Update Driver Priority | `PUT` | `/int/v1/drivers/bulk-priority` |

