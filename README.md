# PrintLedger

PrintLedger is a web system for internal accounting of printer cartridges, consumables, and printers.

This repository currently contains the first-stage scaffold only: FastAPI backend, Next.js frontend, PostgreSQL, and Docker Compose wiring.

## Stack

- Backend: Python, FastAPI, SQLAlchemy 2.0, Alembic
- Frontend: Next.js, TypeScript
- Database: PostgreSQL
- Local run: Docker Compose

## Quick Start

1. Create local environment file:

```powershell
Copy-Item .env.example .env
```

2. Build services:

```powershell
docker compose build
```

3. Start services:

```powershell
docker compose up -d
```

4. Check backend:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

5. Open frontend:

```text
http://localhost:3000
```

## Services

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend health: `http://localhost:8000/health`
- PostgreSQL: `localhost:5432`

## Project Structure

```text
printledger/
  apps/
    backend/
      app/
        api/
        core/
        db/
        models/
        schemas/
        services/
      migrations/
    frontend/
      app/
  infra/
    nginx/
  docs/
  scripts/
  docker-compose.yml
  .env.example
  README.md
```

## Alembic

Alembic is scaffolded for future migrations. After models are added, create migrations from the backend container:

```powershell
docker compose exec backend alembic revision --autogenerate -m "initial schema"
docker compose exec backend alembic upgrade head
```

## Notes

- Secrets are not stored in code. Use `.env` locally and keep `.env.example` as a template.
- The first stage intentionally does not implement cartridge, printer, user, or audit business logic yet.
- Inventory balances should later be calculated from operation history rather than stored as a manually edited source of truth.

