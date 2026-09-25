# API Overview

This is a high-level API map. For the complete historical details, see [README_FULL.md](README_FULL.md).

Most `/api/*` endpoints require a bearer token. See [AUTH.md](AUTH.md).

## Diagnostics

- `GET /health`
- `GET /api/db-check`
- `GET /api/system/info`

## Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`

## Users

Admin-only:

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/{id}`
- `POST /api/users/{id}/reset-password`

## Core Directories

Organizations:

- `GET /api/organizations`
- `GET /api/organizations/{id}`
- `POST /api/organizations`
- `PATCH /api/organizations/{id}`
- `DELETE /api/organizations/{id}`

Branches:

- `GET /api/branches`
- `GET /api/branches/{id}`
- `POST /api/branches`
- `PATCH /api/branches/{id}`
- `DELETE /api/branches/{id}`

Locations:

- `GET /api/locations`
- `GET /api/locations/{id}`
- `POST /api/locations`
- `PATCH /api/locations/{id}`
- `DELETE /api/locations/{id}`

Printer models:

- `GET /api/printer-models`
- `GET /api/printer-models/{id}`
- `POST /api/printer-models`
- `PATCH /api/printer-models/{id}`
- `DELETE /api/printer-models/{id}`
- `GET /api/printer-models/{id}/compatible-cartridge-models`

Cartridge models:

- `GET /api/cartridge-models`
- `GET /api/cartridge-models/{id}`
- `POST /api/cartridge-models`
- `PATCH /api/cartridge-models/{id}`
- `DELETE /api/cartridge-models/{id}`
- `GET /api/cartridge-models/{id}/compatible-printer-models`
- `POST /api/cartridge-models/{id}/compatible-printer-models`
- `DELETE /api/cartridge-models/{id}/compatible-printer-models/{printer_model_id}`

Admin-only catalog import:

- `POST /api/cartridge-catalog/import/preview` (`multipart/form-data`, field `file`)
- `POST /api/cartridge-catalog/import/apply` (`multipart/form-data`, fields `file`, `snapshot_hash`)

Catalog Preview classifies rows as `create`, `existing`, or `error` without writing to the database. Apply reparses the same XLSX under a catalog-mutation lock, rejects a stale snapshot with `409`, blocks the whole batch on any invalid row, and atomically creates only missing `CartridgeModel` rows. It never creates stock transactions or overwrites existing models. See [EXCEL_CATALOG_IMPORT_RU.md](EXCEL_CATALOG_IMPORT_RU.md).

Printers:

- `GET /api/printers`
- `GET /api/printers/{id}`
- `POST /api/printers`
- `PATCH /api/printers/{id}`
- `DELETE /api/printers/{id}`

## Cartridge Inventory

- `GET /api/cartridge-inventory/export.xlsx`
- `POST /api/cartridge-inventory/import/preview` (`multipart/form-data`, field `file`)
- `POST /api/cartridge-inventory/import/apply` (`multipart/form-data`, fields `file`, `snapshot_hash`)
- `POST /api/cartridge-transactions/stock-in`
- `POST /api/cartridge-transactions/correction`
- `POST /api/cartridge-transactions/install`
- `POST /api/cartridge-transactions/remove`
- `POST /api/cartridge-transactions/refill-return`
- `GET /api/cartridge-transactions`
- `GET /api/cartridge-stock`
- `GET /api/printers/{printer_id}/installed-cartridges`
- `GET /api/cartridge-models/{cartridge_model_id}/history`
- `GET /api/printers/{printer_id}/cartridge-history`

The XLSX inventory preview is read-only. It validates physical `new` and `refilled` warehouse counts, calculates deltas, and returns a `snapshot_hash`; it does not create transactions or modify stock. Apply reparses the same XLSX under a stock-mutation lock, rejects stale hashes with `409`, blocks the whole batch if any row is invalid, and atomically creates only `correction_plus` / `correction_minus` transactions. See [EXCEL_INVENTORY_RU.md](EXCEL_INVENTORY_RU.md).

## Printer Lifecycle

- `POST /api/printers/{printer_id}/move`
- `GET /api/printers/{printer_id}/location-history`
- `POST /api/printers/{printer_id}/repairs`
- `PATCH /api/printer-repairs/{repair_id}`
- `GET /api/printers/{printer_id}/repairs`
- `POST /api/printers/{printer_id}/archive`
- `GET /api/printers/archived`
- `GET /api/printers/{printer_id}/archive-history`

## Analytics

- `GET /api/analytics/cartridge-usage?days=30|90|365`

Optional query parameters:

- `cartridge_model_id`
- `include_inactive`

Usage is calculated from cartridge transactions where `install` and `write_off` count as consumption.

## Backups

Admin-only:

- `GET /api/backups`
- `POST /api/backups/create`
- `GET /api/backups/{filename}/download`
- `POST /api/backups/{filename}/restore`
- `DELETE /api/backups/{filename}`
