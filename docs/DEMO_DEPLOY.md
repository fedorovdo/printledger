# PrintLedger Public Demo Deployment

PrintLedger frontend can be built as a static, read-only interactive demo.

Target domain:

```text
https://demo.printledger.simplyadmin.org
```

## Feasibility

Static export is feasible for the public demo because:

- demo mode uses built-in frontend mock data;
- no backend or PostgreSQL calls are required;
- write operations are blocked in the frontend API helper;
- dynamic demo pages are pre-generated for mock printer and cartridge IDs;
- `next/image` optimization is disabled only for demo export.

Normal production deployment remains unchanged. Conditional static export is enabled only when:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

## Required Environment Variables

```bash
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_BASE_URL=
```

`NEXT_PUBLIC_API_BASE_URL` should be empty for the static demo because all supported data is served from mock data inside the frontend bundle.

## Local Demo Build

From the repository root:

```bash
cd apps/frontend
npm install
npm run build:demo
```

The static output is generated in:

```text
apps/frontend/out
```

You can preview it with any static file server, for example:

```bash
npx serve out
```

## Cloudflare Pages

Recommended deployment target: Cloudflare Pages static site.

For a monorepo setup:

- Root directory: `apps/frontend`
- Build command: `npm ci && npm run build:demo`
- Build output directory: `out`
- Production environment variables:
  - `NEXT_PUBLIC_DEMO_MODE=true`
  - `NEXT_PUBLIC_API_BASE_URL=`

Then attach the custom domain:

```text
demo.printledger.simplyadmin.org
```

## What Works in Demo Mode

The same frontend UI is used for the demo. Supported pages include:

- `/`
- `/printers`
- `/printers/[id]`
- `/cartridges`
- `/cartridges/[id]`
- `/locations`
- `/operations`
- `/backup`
- `/users`
- `/about`

Demo mode automatically signs in as:

```text
demo-admin
```

Role:

```text
admin
```

## Read-only Behavior

Create, update, delete, restore, password change, user management writes, and backup writes are blocked.

Users see:

```text
Demo mode: data changes are disabled.
```

or in Russian:

```text
Демо-режим: изменение данных отключено.
```

## Limitations

- Demo data is static and resets on every page reload.
- No real backend, PostgreSQL, backup, restore, or authentication service is used.
- Backup download returns a small placeholder file.
- Only mock printer and cartridge card IDs are generated in static export.
- The demo is intended for product exploration, not for operational use.

## Normal Production Deployment

Do not use demo mode for real installations.

For production with PostgreSQL, FastAPI, nginx, and Docker Compose, use:

- [DEPLOY_RU.md](DEPLOY_RU.md)
- [DEPLOY_ROCKY_RU.md](DEPLOY_ROCKY_RU.md)
