# Authentication

PrintLedger uses local-network password login with users stored in PostgreSQL.

## First Administrator

The first admin is bootstrapped from `.env` only when the users table has no active users:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
APP_SECRET_KEY=change-me
```

Change these values before running PrintLedger in a real local network.

After the first login, change the password from the web UI:

```text
http://localhost:3000/profile
```

Later `.env` password changes do not modify existing database users.

## Password Storage

Passwords are stored only as `password_hash` in PostgreSQL. Plain-text passwords are never stored in the database.

## Roles

Current roles:

- `admin`
- `user`

Admin users can manage users from:

```text
http://localhost:3000/users
```

The backup section is also admin-only.

## Public Endpoints

The following endpoints are available without a bearer token:

- `GET /health`
- `GET /api/db-check`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Application API endpoints under `/api/*` require:

```text
Authorization: Bearer <token>
```

## Login API Example

```powershell
$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$login = Invoke-RestMethod http://localhost:8000/api/auth/login -Method Post -ContentType "application/json" -Body $body
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod http://localhost:8000/api/auth/me -Headers $headers
```

## Password Change

Current users can change their own password from `/profile` or through:

```text
POST /api/auth/change-password
```

New passwords must be at least 8 characters long.
