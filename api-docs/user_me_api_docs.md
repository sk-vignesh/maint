# User Me API Documentation

> **Base URL:** `{{url}}/int/v1/users`
> **Auth:** Requires a valid authenticated session.

---

## Get Current User

**`GET /int/v1/users/me`**

Returns the profile of the currently authenticated user, including their role, policies, and permissions.

### Request

No parameters required.

### Response

```json
{
  "user": {
    "id": 1234,
    "uuid": "2a4f8c1d-3e7b-4a09-b812-9f0e1d2c3456",
    "public_id": "user_abc123",
    "company_uuid": "c1d2e3f4-0000-1111-2222-333344445555",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "phone": "+91 98765 43210",
    "country": "IN",
    "timezone": "Asia/Kolkata",
    "avatar_url": "https://example.com/avatars/johndoe.jpg",
    "meta": {},
    "type": "user",
    "locale": "en",
    "types": ["user"],
    "company_name": "Acme Corp",
    "role_name": "Administrator",
    "session_status": "active",
    "is_admin": true,
    "is_online": true,
    "date_of_birth": null,
    "email_verified_at": "2025-01-01 10:00:00",
    "phone_verified_at": null,
    "last_seen_at": "2026-04-02 08:30:00",
    "last_login": "2026-04-02 08:00:00",
    "updated_at": "2026-04-01 12:00:00",
    "created_at": "2025-01-01 09:00:00",
    "role": {
      "id": 10,
      "company_uuid": "c1d2e3f4-0000-1111-2222-333344445555",
      "name": "Administrator",
      "guard_name": "web",
      "description": "Full access administrator",
      "type": "admin",
      "service": null,
      "is_mutable": false,
      "is_deletable": false,
      "policies": [],
      "permissions": [],
      "updated_at": "2025-01-01 09:00:00",
      "created_at": "2025-01-01 09:00:00"
    },
    "policies": [],
    "permissions": [
      {
        "id": 5,
        "name": "fleet-ops create order",
        "guard_name": "web",
        "description": "Allows creating orders",
        "updated_at": "2025-01-01 09:00:00",
        "created_at": "2025-01-01 09:00:00"
      }
    ]
  }
}
```

### Error Responses

| Status | Body |
|---|---|
| `401` | `{ "error": "No user session found" }` |

---

## Field Reference

### User Fields

| Field | Type | Description |
|---|---|---|
| `id` | integer | Internal user ID |
| `uuid` | string | Unique user identifier |
| `public_id` | string | Public-facing user ID (e.g. `user_abc123`) |
| `company_uuid` | string | UUID of the user's company |
| `name` | string | Full name |
| `username` | string\|null | Username |
| `email` | string | Email address |
| `phone` | string\|null | Phone number |
| `country` | string\|null | Country code (ISO 3166-1 alpha-2) |
| `timezone` | string\|null | User's timezone (e.g. `Asia/Kolkata`) |
| `avatar_url` | string\|null | URL to the user's avatar image |
| `meta` | object | Additional metadata |
| `type` | string | User type (e.g. `user`, `driver`) |
| `locale` | string\|null | User's locale (e.g. `en`) |
| `types` | array | All types associated with the user |
| `company_name` | string\|null | Name of the user's company |
| `role_name` | string\|null | Name of the assigned role |
| `session_status` | string\|null | Current session status (e.g. `active`) |
| `is_admin` | boolean | Whether the user has admin privileges |
| `is_online` | boolean | Whether the user is currently online |
| `date_of_birth` | string\|null | Date of birth (`Y-m-d`) |
| `email_verified_at` | string\|null | Datetime email was verified |
| `phone_verified_at` | string\|null | Datetime phone was verified |
| `last_seen_at` | string\|null | Datetime user was last seen |
| `last_login` | string\|null | Datetime of last login |
| `updated_at` | string | Record last updated datetime |
| `created_at` | string | Record creation datetime |
| `role` | object\|null | Assigned role — see Role Fields |
| `policies` | array | List of directly assigned policies |
| `permissions` | array | List of directly assigned permissions — see Permission Fields |

### Role Fields

| Field | Type | Description |
|---|---|---|
| `id` | integer | Role ID |
| `company_uuid` | string\|null | UUID of the owning company |
| `name` | string | Role name |
| `guard_name` | string | Auth guard (e.g. `web`) |
| `description` | string\|null | Role description |
| `type` | string\|null | Role type (e.g. `admin`) |
| `service` | string\|null | Service the role belongs to |
| `is_mutable` | boolean | Whether the role can be edited |
| `is_deletable` | boolean | Whether the role can be deleted |
| `policies` | array | Policies attached to this role |
| `permissions` | array | Permissions attached to this role |
| `updated_at` | string | Record last updated datetime |
| `created_at` | string | Record creation datetime |

### Permission Fields

| Field | Type | Description |
|---|---|---|
| `id` | integer | Permission ID |
| `name` | string | Permission name (e.g. `fleet-ops create order`) |
| `guard_name` | string | Auth guard (e.g. `web`) |
| `description` | string\|null | Permission description |
| `updated_at` | string | Record last updated datetime |
| `created_at` | string | Record creation datetime |
