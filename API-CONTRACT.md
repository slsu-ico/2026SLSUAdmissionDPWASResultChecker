# API Contract (Frontend <-> Backend)

This project frontend expects a `GET /api/search-result` endpoint.

## Base URL configuration

The frontend builds API URLs from:

1. `window.APP_CONFIG.apiBaseUrl` (highest priority), or
2. `<meta name="api-base-url" content="...">`, or
3. same-origin (`""`) by default.

Example for Laravel host:

```html
<meta name="api-base-url" content="https://admission-api.yourdomain.com">
```

## Endpoint

`GET /api/search-result`

### Query params

- `q` (string, optional): application/examinee number

When `q` is missing/empty, frontend uses this as readiness check.

## Expected responses

### 1) Readiness check success

HTTP `200`

```json
{
  "ready": true
}
```

### 2) DPWAS match

HTTP `200`

```json
{
  "found": true,
  "type": "dpwas",
  "date": "2026-04-29",
  "time": "8:00AM"
}
```

Notes:
- `date` and `time` are optional in UI. If missing, UI shows `To be announced`.

### 3) First-release qualified match

HTTP `200`

```json
{
  "found": true,
  "type": "first_release",
  "program": "BS Computer Science"
}
```

Notes:
- `program` is optional in UI. If missing, UI shows `To be announced`.

### 4) Not found

HTTP `200`

```json
{
  "found": false
}
```

### 5) Error

HTTP `4xx` or `5xx`

```json
{
  "error": "Human-readable message"
}
```

## Laravel implementation notes

- Keep the JSON keys exactly as above to avoid frontend changes.
- Return `application/json`.
- Enable CORS only if frontend and Laravel API are on different origins.
