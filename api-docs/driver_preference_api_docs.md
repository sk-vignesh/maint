# Login API
**`GET {{url}}/int/v1/auth/login`**
# Request

```json
{
    "identity": "[EMAIL_ADDRESS]",
    "password": "[PASSWORD]",
    "remember": false
}```

# Response
{
    "token": "{{token}}",
    "type": "user"
}

# Driver Preference API Documentation

> **Base URL:** `{{url}}/int/v1/drivers`
> **Auth:** All endpoints require a valid session token (`Authorization: Bearer {{token}}`).

---

## 1. List All Driver Preferences

**`GET /preferences`**

Returns shift preferences for all drivers in the authenticated company.

### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | string | — | Filter by driver status (e.g. `active`, `inactive`) |
| `limit` | integer | `100` | Max results per page (capped at 500) |
| `page` | integer | `1` | Page number |

### Request

```bash
curl --location '{{url}}/int/v1/drivers/preferences' \
--header 'Authorization: Bearer {{token}}'
```

### Response

```json
{
  "data": [
    {
      "id": "drv_abc123",
      "uuid": "246b1c27-9bd7-4b5a-a113-309b895de901",
      "name": "John Smith",
      "shift_preferences": {
        "monday": [
          { "start": "08:00:00", "end": "16:00:00" }
        ],
        "tuesday": [
          { "start": "08:00:00", "end": "16:00:00" }
        ],
        "wednesday": [
          { "start": "08:00:00", "end": "16:00:00" }
        ],
        "thursday": [
          { "start": "08:00:00", "end": "16:00:00" }
        ],
        "friday": [
          { "start": "08:00:00", "end": "16:00:00" }
        ]
      },
      "preferred_rest_days": ["Saturday", "Sunday"],
      "maximum_trips_per_week": 5,
      "number_of_consecutive_working_days": 5,
      "status": "active",
      "online": false
    }
  ],
  "total": 42,
  "per_page": 100,
  "current_page": 1,
  "last_page": 1
}
```

> `shift_preferences` is an empty object `{}` if not yet configured for a driver.
> `preferred_rest_days` is an empty array `[]` if no rest days are set.

### Error Responses

| Status | Body |
|---|---|
| `401` | `{ "errors": ["Unauthenticated."] }` |

---

## 2. View Single Driver Preference

**`GET /{id}/preferences`**

Returns shift preference data for a single driver.

> Also accessible via `GET /{id}/preference` (singular).

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Driver `public_id` (e.g. `drv_abc123`) or `uuid` |

### Request

```bash
curl --location '{{url}}/int/v1/drivers/246b1c27-9bd7-4b5a-a113-309b895de901/preferences' \
--header 'Authorization: Bearer {{token}}'
```

### Response

```json
{
  "id": "drv_abc123",
  "uuid": "246b1c27-9bd7-4b5a-a113-309b895de901",
  "name": "John Smith",
  "shift_preferences": {
    "monday": [
      { "start": "08:00:00", "end": "16:00:00" }
    ],
    "tuesday": [
      { "start": "08:00:00", "end": "16:00:00" }
    ],
    "wednesday": [
      { "start": "08:00:00", "end": "16:00:00" }
    ],
    "thursday": [
      { "start": "08:00:00", "end": "16:00:00" }
    ],
    "friday": [
      { "start": "08:00:00", "end": "16:00:00" }
    ],
    "saturday": [],
    "sunday": []
  },
  "preferred_rest_days": ["Saturday", "Sunday"],
  "maximum_trips_per_week": 5,
  "number_of_consecutive_working_days": 5
}
```

### Shift Preferences — `all_days` Format

If the driver works the same hours every day, preferences may use the `all_days` key instead of individual day keys:

```json
{
  "shift_preferences": {
    "all_days": [
      { "start": "07:00:00", "end": "19:00:00" }
    ]
  },
  "preferred_rest_days": []
}
```

### Field Reference

| Field | Type | Description |
|---|---|---|
| `id` | string | Driver public ID |
| `uuid` | string | Driver UUID |
| `name` | string | Driver full name (from linked user account) |
| `shift_preferences` | object | Keyed by day name or `all_days`. Each value is an array of `{ start, end }` time ranges in `HH:mm:ss` format |
| `preferred_rest_days` | array | Day names automatically derived from days with no shift defined (e.g. `["Saturday", "Sunday"]`) |
| `maximum_trips_per_week` | integer | Max number of trips allowed per week (1–5) |
| `number_of_consecutive_working_days` | integer | Max consecutive days the driver should work |

### Error Responses

| Status | Body |
|---|---|
| `401` | `{ "errors": ["Unauthenticated."] }` |
| `404` | `{ "error": "Driver not found." }` |

---

## 3. Update Driver Shift Preferences

**`PUT /{id}`**

Updates shift preferences (and other driver fields) for a single driver.

> Uses the standard driver update endpoint. Only include fields you want to change — all fields are optional.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | string | Driver `public_id` (e.g. `drv_abc123`) or `uuid` |

---

### Format A — `all_days` with flexibility window

Driver works the same start time every day with a flexibility buffer (no fixed end time).

```bash
curl --location --request PUT '{{url}}/int/v1/drivers/246b1c27-9bd7-4b5a-a113-309b895de901' \
--header 'Authorization: Bearer {{token}}' \
--header 'Content-Type: application/json' \
--data '{
  "shift_preferences": {
    "all_days": {
      "start_time": "07:00:00",
      "start_time_flexibility": 3
    }
  }
}'
```



### Format C — Day-wise with fixed start and end time

Different hours per day. Any day omitted is treated as a rest day.

```bash
curl --location --request PUT '{{url}}/int/v1/drivers/246b1c27-9bd7-4b5a-a113-309b895de901' \
--header 'Authorization: Bearer {{token}}' \
--header 'Content-Type: application/json' \
--data '{
  "shift_preferences": {
    "monday":    [{ "start": "08:00:00", "end": "16:00:00" }],
    "tuesday":   [{ "start": "08:00:00", "end": "16:00:00" }],
    "wednesday": [{ "start": "08:00:00", "end": "16:00:00" }],
    "thursday":  [{ "start": "08:00:00", "end": "16:00:00" }],
    "friday":    [{ "start": "08:00:00", "end": "16:00:00" }]
  },
  "maximum_trips_per_week": 5,
  "number_of_consecutive_working_days": 5
}'
```

<!-- ### Format D — Day-wise with flexibility window

```bash
curl --location --request PUT '{{url}}/int/v1/drivers/246b1c27-9bd7-4b5a-a113-309b895de901' \
--header 'Authorization: Bearer {{token}}' \
--header 'Content-Type: application/json' \
--data '{
  "shift_preferences": {
    "monday":    [{ "start_time": "08:00:00", "start_time_flexibility": 2 }],
    "tuesday":   [{ "start_time": "08:00:00", "start_time_flexibility": 2 }],
    "wednesday": [{ "start_time": "08:00:00", "start_time_flexibility": 2 }]
  }
}'
``` -->

### `shift_preferences` Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `all_days` | object | one of `all_days` or day keys | Applies the same preference to every day. Mutually exclusive with day-wise keys. |
| `all_days.start_time` | string `HH:mm:ss` | required if no `start` | Shift start time |
| `all_days.start_time_flexibility` | integer (≥ 1) | required if no `end` | Flexibility window in hours around start time |
| `all_days.start` | string `HH:mm:ss` | required if no `start_time` | Fixed shift start time |
| `all_days.end` | string `HH:mm:ss` | required if no `start_time_flexibility` | Fixed shift end time (must be after `start`) |
| `monday` … `sunday` | array | — | Array of shift objects for that day. Omit a day to mark it as a rest day. |
| `[day][].start_time` | string `HH:mm:ss` | required if no `start` | Shift start time (day-wise) |
| `[day][].start_time_flexibility` | integer (≥ 1) | required if no `end` | Flexibility window in hours (day-wise) |
| `[day][].start` | string `HH:mm:ss` | required if no `start_time` | Fixed start time (day-wise) |
| `[day][].end` | string `HH:mm:ss` | required if no `start_time_flexibility` | Fixed end time, must be after `start` (day-wise) |
| `maximum_trips_per_week` | integer `1–5` | — | Max trips allowed per week |
| `number_of_consecutive_working_days` | integer | — | Max consecutive days driver should work |

> `all_days` and day-wise keys (`monday`…`sunday`) are **mutually exclusive** — use one or the other, not both.
> Either `start`/`end` (fixed window) **or** `start_time`/`start_time_flexibility` (flexible window) must be provided — not both.

### Response

Returns the full updated driver object.

```json
{
  "data": {
    "id": "drv_abc123",
    "uuid": "246b1c27-9bd7-4b5a-a113-309b895de901",
    "name": "John Smith",
    "shift_preferences": {
      "all_days": {
        "start_time": "07:00:00",
        "start_time_flexibility": 3
      }
    },
    "preferred_rest_days": [],
    "maximum_trips_per_week": 5,
    "number_of_consecutive_working_days": 5,
    "status": "active",
    "online": false
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `401` | `{ "errors": ["Unauthenticated."] }` |
| `404` | `{ "errors": ["There is nothing to see here."] }` |
| `422` | `{ "errors": { "shift_preferences.all_days.start_time": ["..."] } }` |

---
