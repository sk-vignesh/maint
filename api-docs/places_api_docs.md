# Places Page API Documentation

> **Base URL:** `{{url}}/int/v1/places`
> **Auth:** All endpoints require a valid session cookie / authenticated user.

---

## 1. Places List

**`GET /int/v1/places`**

Fetches the paginated list of places displayed in the table.

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `limit` | integer | — | Items per page |
| `sort` | string | `-created_at` | Sort field. Prepend `-` for descending (e.g. `-created_at`) |
| `query` | string | — | Full-text search across name, address, city, postal code |
| `name` | string | — | Filter by place name |
| `public_id` | string | — | Filter by public ID |
| `address` | string | — | Filter by address |
| `city` | string | — | Filter by city |
| `state` | string | — | Filter by state/county |
| `country` | string | — | Filter by country code (e.g. `GB`) |
| `postal_code` | string | — | Filter by postal/zip code |
| `neighborhood` | string | — | Filter by neighborhood |
| `phone` | string | — | Filter by phone number |
| `created_at` | date | — | Filter by creation date |
| `updated_at` | date | — | Filter by last update date |

#### Example Request

```
GET {{url}}/int/v1/places?sort=-created_at&page=1&limit=15
```

#### Response Fields

| Field | Type | Description |
|---|---|---|
| `public_id` | string | Human-readable ID (e.g. `PLc-0001`) |
| `name` | string | Place name |
| `code` | string | Short place code/identifier |
| `address` | string | Full street address |
| `city` | string | City |
| `state` | string | State or county |
| `country` | string | ISO 3166-1 alpha-2 country code |
| `postal_code` | string | Postal/zip code |
| `neighborhood` | string | Neighborhood |
| `phone` | string | Contact phone number |
| `location` | GeoJSON | `{ type: "Point", coordinates: [lng, lat], bbox: [...] }` — selectable via map picker |
| `latitude` | float | Latitude (derived from location) |
| `longitude` | float | Longitude (derived from location) |

---

## 2. Search Places

**`GET /int/v1/places?query={search_term}`**

Full-text search with 200ms debounce. Resets to page 1 on new search.

#### Example Request

```
GET {{url}}/int/v1/places?query=london&sort=-created_at&page=1
```

---

## 3. Filter Places

**`GET /int/v1/places`** with filter query params.

Filters are combined as AND conditions.

#### All Filterable Params

| Param | Filter Type | Example |
|---|---|---|
| `name` | string match | `name=Depot A` |
| `public_id` | string match | `public_id=PLc-0001` |
| `address` | string match | `address=High Street` |
| `city` | string match | `city=London` |
| `state` | string match | `state=Greater London` |
| `country` | country code | `country=GB` |
| `postal_code` | string match | `postal_code=SW1A` |
| `neighborhood` | string match | `neighborhood=Soho` |
| `phone` | string match | `phone=+44` |
| `created_at` | date | `created_at=2026-03-01` |
| `updated_at` | date | `updated_at=2026-03-27` |

#### Example — Filter by city and country

```
GET {{url}}/int/v1/places?city=London&country=GB&sort=-created_at
```

---

## 4. Clear Filters

Resets all filter params to null and reloads with defaults:

```
GET {{url}}/int/v1/places?sort=-created_at&page=1
```

---

## 5. Create Place

**`POST /int/v1/places`**

Creates a new place from the place form panel (sidebar).

#### Request Body

```json
{
{
    "place": {
        "public_id": null,
        "company_uuid": "ac5006be-238e-4928-b622-7454871b98bb",
        "vendor_uuid": null,
        "name": "newd",
        "phone": "+44565756767",
        "type": null,
        "avatar_url": "https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/place-icons/basic-building.png",
        "avatar_value": null,
        "address": "2222+22 KIZAK,  TYUMEN OBLAST - KIZAK, 627222, RUSSIA",
        "address_html": "2222+22 KIZAK,  TYUMEN OBLAST - KIZAK, 627222, RUSSIA",
        "street1": "2222+22 Kizak,  Tyumen Oblast",
        "street2": null,
        "city": "Kizak",
        "province": "tn",
        "postal_code": "627222",
        "neighborhood": null,
        "district": null,
        "building": null,
        "security_access_code": null,
        "country": "RU",
        "country_name": "Russia",
        "vendor_name": null,
        "_import_id": null,
        "eta": null,
        "location": {
            "type": "Point",
            "coordinates": [
                67,
                56
            ],
            "bbox": [
                67,
                56,
                67,
                56
            ]
        },
        "deleted_at": null,
        "created_at": null,
        "updated_at": null,
        "code": "newd"
    }
}
```

#### Required Fields

| Field | Notes |
|---|---|
| `name` | Place name |
| `location` | GeoJSON Point with valid `[longitude, latitude]` coordinates |

#### Optional Fields

| Field | Notes |
|---|---|
| `code` | Short identifier code |
| `address` | Street address |
| `city` | City |
| `state` | State or county |
| `country` | ISO country code |
| `postal_code` | Postal/zip code |
| `neighborhood` | Neighborhood |
| `phone` | Phone number |

#### Location Format

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude],
  "bbox": [longitude, latitude, longitude, latitude]
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Always `"Point"` |
| `coordinates` | array | `[longitude, latitude]` — GeoJSON standard (longitude first) |
| `bbox` | array | Optional bounding box: `[minLng, minLat, maxLng, maxLat]` |

> **Tip:** Instead of entering coordinates manually, you can use the **map picker** on the Create / Edit Place form — click any point on the map to auto-fill the coordinates and reverse-geocode the address. See [Section 10 — Select from Map](#10-select-from-map).

---

## 6. Edit Place

**`PUT /int/v1/places/{id}`**

Updates an existing place from the place form panel.

#### Example Request

```
PUT {{url}}/int/v1/places/plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Request Body

Same fields as Create Place.

---

## 7. View Place (Details Panel)

**`GET /int/v1/places/{id}`**

Loads place details into the side panel when a place name or code is clicked.

#### Example Request

```
GET {{url}}/int/v1/places/plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 8. Delete Place

**`DELETE /int/v1/places/{id}`**

Deletes a place after a confirmation prompt.

#### Example Request

```
DELETE {{url}}/int/v1/places/plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 9. Bulk Delete Places

**`DELETE {{url}}/int/v1/places/bulk-delete`**

Deletes multiple places in a single request.

#### Request Body

```json
{
    "ids": [
        "plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "plc_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ]
}

Confirm bulk delete
{
    "ids": [
        "plc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "plc_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
    ],
    "force": true
}
```

| Field | Type | Description |
|---|---|---|
| `ids` | array of UUIDs | UUIDs of the places to delete |

#### Response — Success

```json
{
    "status": "OK",
    "message": "Deleted 2 places successfully.",
    "count": 2
}
```

#### Error Responses

| Status | Body |
|---|---|
| `400` | `{ "error": "Nothing to delete." }` |

---

## 10. Select from Map

When creating or editing a place, the user can click on a map to select a location. This triggers a **Reverse Geocoding** API call to auto-fill address fields.

**`GET /int/v1/geocoder/reverse`**

Performs reverse geocoding to convert map coordinates into a street address.

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `coordinates` | string | `latitude,longitude` (comma-separated) |
| `single` | boolean | `true` — returns only the best match |

#### Example Request

```
GET {{url}}/int/v1/geocoder/reverse?coordinates=51.5074,-0.1278&single=true
```

#### Response

Returns a geocoded place object with address fields pre-filled:

```json
{
  "name": "Westminster",
  "address": "123 High Street",
  "city": "London",
  "state": "Greater London",
  "country": "GB",
  "postal_code": "SW1A 1AA",
  "location": {
    "type": "Point",
    "coordinates": [-0.1278, 51.5074]
  }
}
```

> After the geocoding result is received, address fields in the form are auto-populated and the coordinates input component is updated.

---

## 11. Update Map Location

When coordinates are manually updated (via coordinate input or map pin drag), the place's `location` field is updated in the saved request:

**`PUT /int/v1/places/{id}`**

```json
{
    "place": {
        "public_id": "place_jFpR2aD",
        "company_uuid": "ac5006be-238e-4928-b622-7454871b98bb",
        "vendor_uuid": null,
        "name": "PLA h",
        "phone": "+445657567",
        "type": null,
        "avatar_url": "https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/place-icons/basic-building.png",
        "avatar_value": "https://flb-assets.s3-ap-southeast-1.amazonaws.com/static/place-icons/basic-building.png",
        "address": "PLA - TEST, TN, 565467, AFGHANISTAN",
        "address_html": "PLA - TEST, TN, 565467, AFGHANISTAN",
        "street1": "TEST",
        "street2": null,
        "city": null,
        "province": "TN",
        "postal_code": "565467",
        "neighborhood": null,
        "district": null,
        "building": null,
        "security_access_code": null,
        "country": "AF",
        "country_name": "Afghanistan",
        "vendor_name": null,
        "_import_id": null,
        "eta": null,
        "location": {
            "type": "Point",
            "coordinates": [
                56,
                55
            ],
            "bbox": [
                56,
                55,
                56,
                55
            ]
        },
        "meta": [],
        "deleted_at": null,
        "created_at": "2026-04-08T12:44:42.000Z",
        "updated_at": "2026-04-08T12:44:42.000Z",
        "code": "pla"
    }
}
```

Validation rules:
- `location.coordinates` must be an array of exactly 2 values `[longitude, latitude]`
- Both coordinates must be non-null and non-zero (a zero-zero coordinate `[0,0]` is considered invalid/missing)

---

## 12. Import Places

### Step 1 — Upload File

**`POST /int/v1/files/upload`** (file upload service)

Uploads the spreadsheet file to S3 before processing.

| Field | Value |
|---|---|
| `path` | `{AWS_FILE_PATH}/place-imports/{company_uuid}` |
| `disk` | Configured AWS disk |
| `bucket` | Configured AWS bucket |
| `type` | `place_import` |

Accepted file types: `.xls`, `.xlsx`, `.csv`

### Step 2 — Process Import

**`POST /int/v1/places/import`**

Processes the uploaded file and creates place records.

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
  "imported": 20,
  "skipped": 3
}
```

---

## 13. Import Result

After import completes, one of two outcomes occurs:

### Success

All rows imported successfully. Modal closes and list refreshes automatically.

### Partial Error

```json
{
  "error_log_url": "https://s3.amazonaws.com/.../place-import-errors.csv"
}
```

> If `error_log_url` is present, some rows failed. The page refreshes to show successfully imported places and the error log CSV can be downloaded.

---

## 14. Download Error Log

When import returns `error_log_url`, the user clicks "Download Error Log":

```
GET {error_log_url}
```

After download completes:
- Modal is closed
- List refreshes to show successfully imported places with current filters preserved

---

## 15. Re-import Places

After an error state, the modal resets to allow a new corrected file upload. Same flow as initial import:

1. Reset modal to initial state (clear error, clear upload queue)
2. User uploads corrected spreadsheet
3. `POST /int/v1/places/import` is called again with new file IDs

---

## 16. Export Places

**`GET /int/v1/places/export`**

Exports selected or all place data to a spreadsheet file.

#### Query Parameters

| Param | Type | Description |
|---|---|---|
| `selections[]` | UUID[] | List of place IDs to export. If empty, exports all visible places. |

#### Example Request

```
GET {{url}}/int/v1/places/export?selections[]=plc_abc123&selections[]=plc_xyz456
```

---

## Key Place Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `public_id` | string | — | Human-readable ID (e.g. `PLc-0001`) |
| `name` | string | Yes | Place name |
| `code` | string | No | Short identifier code |
| `address` | string | No | Street address |
| `city` | string | No | City |
| `state` | string | No | State or county |
| `country` | string | No | ISO 3166-1 alpha-2 country code |
| `postal_code` | string | No | Postal/zip code |
| `neighborhood` | string | No | Neighborhood |
| `phone` | string | No | Contact phone number |
| `location` | GeoJSON | No | `{ type: "Point", coordinates: [lng, lat], bbox: [...] }` — can be set via map picker (see Section 10) |
| `latitude` | float | No | Latitude (derived from location) |
| `longitude` | float | No | Longitude (derived from location) |


---

## 17. Country Dropdown

**`GET {{url}}/int/v1/country/list?columns=id,name,code,alpha_code2`**

Returns the list of available countries for the **Country** field on the driver form/filter. Pass the `alpha_code2` value as the `country` field when creating or updating a driver.

#### Example Request

```
GET {{url}}/int/v1/country/list?columns=id%2Cname%2Ccode%2Calpha_code2
```

#### Response

```json
[
    { "id": 15,  "name": "Austria",                "code": "AUT", "alpha_code2": "AT" },
    { "id": 21,  "name": "Belarus",                "code": "BLR", "alpha_code2": "BY" },
    { "id": 22,  "name": "Belgium",                "code": "BEL", "alpha_code2": "BE" },
    { "id": 28,  "name": "Bosnia and Herzegovina", "code": "BIH", "alpha_code2": "BA" },
    { "id": 35,  "name": "Bulgaria",               "code": "BGR", "alpha_code2": "BG" },
    { "id": 55,  "name": "Croatia",                "code": "HRV", "alpha_code2": "HR" },
    { "id": 58,  "name": "Czech Republic",         "code": "CZE", "alpha_code2": "CZ" },
    { "id": 60,  "name": "Denmark",                "code": "DNK", "alpha_code2": "DK" },
    { "id": 74,  "name": "Finland",                "code": "FIN", "alpha_code2": "FI" },
    { "id": 75,  "name": "France",                 "code": "FRA", "alpha_code2": "FR" },
    { "id": 82,  "name": "Germany",                "code": "DEU", "alpha_code2": "DE" },
    { "id": 85,  "name": "Greece",                 "code": "GRC", "alpha_code2": "GR" },
    { "id": 99,  "name": "Hungary",                "code": "HUN", "alpha_code2": "HU" },
    { "id": 105, "name": "Ireland",                "code": "IRL", "alpha_code2": "IE" },
    { "id": 108, "name": "Italy",                  "code": "ITA", "alpha_code2": "IT" },
    { "id": 142, "name": "Moldova",                "code": "MDA", "alpha_code2": "MD" },
    { "id": 153, "name": "Netherlands",            "code": "NLD", "alpha_code2": "NL" },
    { "id": 164, "name": "Norway",                 "code": "NOR", "alpha_code2": "NO" },
    { "id": 175, "name": "Poland",                 "code": "POL", "alpha_code2": "PL" },
    { "id": 176, "name": "Portugal",               "code": "PRT", "alpha_code2": "PT" },
    { "id": 180, "name": "Romania",                "code": "ROU", "alpha_code2": "RO" },
    { "id": 181, "name": "Russian Federation",     "code": "RUS", "alpha_code2": "RU" },
    { "id": 195, "name": "Serbia",                 "code": "SRB", "alpha_code2": "RS" },
    { "id": 199, "name": "Slovakia",               "code": "SVK", "alpha_code2": "SK" },
    { "id": 207, "name": "Spain",                  "code": "ESP", "alpha_code2": "ES" },
    { "id": 213, "name": "Sweden",                 "code": "SWE", "alpha_code2": "SE" },
    { "id": 214, "name": "Switzerland",            "code": "CHE", "alpha_code2": "CH" },
    { "id": 231, "name": "Ukraine",                "code": "UKR", "alpha_code2": "UA" },
    { "id": 233, "name": "United Kingdom",         "code": "GBR", "alpha_code2": "GB" }
]
```

#### Field Reference

| Field | Type | Description |
|---|---|---|
| `id` | integer | Internal country ID |
| `name` | string | Country display name |
| `code` | string | ISO 3166-1 alpha-3 code |
| `alpha_code2` | string | ISO 3166-1 alpha-2 code — use this as the `country` field value |