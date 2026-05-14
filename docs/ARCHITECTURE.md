# Architecture

PrintLedger is a monorepo with separate backend, frontend, infrastructure, documentation, and scripts.

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
      components/
      lib/
      public/
  infra/
    nginx/
  docs/
  scripts/
  docker-compose.yml
  docker-compose.prod.yml
```

## Backend

The backend is a FastAPI application.

- SQLAlchemy 2.0 is used for ORM models.
- Alembic is used for migrations.
- PostgreSQL is the source of truth.
- Service modules hold domain logic for inventory, printer lifecycle, backups, and users.
- Pydantic schemas define API input and output shapes.

## Frontend

The frontend is a Next.js and TypeScript application.

- Client-side fetching is used for the MVP UI.
- Authentication tokens are stored in browser local storage.
- RU/EN labels are handled in a simple local i18n dictionary.
- Static branding assets are served from `apps/frontend/public`.

## Database

Core areas:

- users and roles;
- organizations, branches, and locations;
- printer models and physical printers;
- cartridge models;
- cartridge inventory transactions;
- installed cartridges and cartridge history;
- printer movement, repair, and archive history;
- audit log foundation.

Cartridge warehouse stock is calculated from operation history, not manually edited as a separate source of truth.

## Docker Compose

Development stack:

- `postgres`
- `backend`
- `frontend`

Production stack:

- `postgres`
- `backend`
- `frontend`
- `nginx`

Production exposes nginx on port `80`. Backend and frontend communicate inside the Docker network.

## Backups

Backups use PostgreSQL client tools and custom-format dumps. The backend image includes a PostgreSQL client matching the server major version.
