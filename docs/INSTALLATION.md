# Installation

This guide covers local development setup with Docker Compose.

## Requirements

- Docker Desktop or Docker Engine.
- Docker Compose plugin.
- Git.
- Open ports:
  - `3000` for the frontend in development.
  - `8000` for the backend in development.
  - `5432` for PostgreSQL in development, if local access is needed.

## Environment

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Edit `.env` before using the app in a real local network. At minimum, change:

```env
APP_SECRET_KEY=change-me
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are used only to bootstrap the first administrator when the users table has no active users.

## Start The Development Stack

```powershell
docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head
```

Open:

```text
http://localhost:3000
```

Backend diagnostics:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/api/db-check
```

## Services

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend health: `http://localhost:8000/health`
- Database check: `http://localhost:8000/api/db-check`
- PostgreSQL: `localhost:5432`

## Migrations

Apply migrations:

```powershell
docker compose exec backend alembic upgrade head
```

Show migration status:

```powershell
docker compose exec backend alembic current
```

Create a new migration after changing SQLAlchemy models:

```powershell
docker compose exec backend alembic revision --autogenerate -m "describe change"
```

## Production

Production deployment uses `docker-compose.prod.yml` and nginx. See:

- [docs/DEPLOY_RU.md](DEPLOY_RU.md)
- [docs/ARCHITECTURE.md](ARCHITECTURE.md)
