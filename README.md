# PrintLedger

PrintLedger is a web system for internal accounting of printer cartridges, consumables, and printers.

This repository currently contains the early project foundation: FastAPI backend, Next.js frontend, PostgreSQL, Alembic migrations, and minimal CRUD APIs for core reference data.

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

5. Apply database migrations:

```powershell
docker compose exec backend alembic upgrade head
```

6. Check database connectivity:

```powershell
Invoke-RestMethod http://localhost:8000/api/db-check
```

7. Open frontend:

```text
http://localhost:3000
```

## Services

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Backend health: `http://localhost:8000/health`
- Database check: `http://localhost:8000/api/db-check`
- PostgreSQL: `localhost:5432`

## Frontend MVP

Open the app at `http://localhost:3000`.

Pages:

- `http://localhost:3000/` - dashboard with backend, database, cartridge model, printer, and archived printer status cards.
- `http://localhost:3000/cartridges` - cartridge stock table, cartridge model creation, and stock-in form.
- `http://localhost:3000/printers` - printer list, printer model creation, and printer creation form.
- `http://localhost:3000/locations` - simple create/list sections for organizations, branches, and locations.
- `http://localhost:3000/operations` - cartridge inventory transaction list.

The UI uses `NEXT_PUBLIC_API_URL` when provided and falls back to `http://localhost:8000`.
RU is the default language; switch to EN from the top-right language control.

Manual frontend checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000
Invoke-WebRequest -UseBasicParsing http://localhost:3000/cartridges
Invoke-WebRequest -UseBasicParsing http://localhost:3000/printers
Invoke-WebRequest -UseBasicParsing http://localhost:3000/locations
Invoke-WebRequest -UseBasicParsing http://localhost:3000/operations
```

## API v1 Foundation

Minimal CRUD endpoints are available for core directories:

- `GET /api/organizations`
- `GET /api/organizations/{id}`
- `POST /api/organizations`
- `PATCH /api/organizations/{id}`
- `DELETE /api/organizations/{id}`
- `GET /api/branches`
- `GET /api/branches/{id}`
- `POST /api/branches`
- `PATCH /api/branches/{id}`
- `DELETE /api/branches/{id}`
- `GET /api/locations`
- `GET /api/locations/{id}`
- `POST /api/locations`
- `PATCH /api/locations/{id}`
- `DELETE /api/locations/{id}`
- `GET /api/printer-models`
- `GET /api/printer-models/{id}`
- `POST /api/printer-models`
- `PATCH /api/printer-models/{id}`
- `DELETE /api/printer-models/{id}`
- `GET /api/cartridge-models`
- `GET /api/cartridge-models/{id}`
- `POST /api/cartridge-models`
- `PATCH /api/cartridge-models/{id}`
- `DELETE /api/cartridge-models/{id}`
- `GET /api/printers`
- `GET /api/printers/{id}`
- `POST /api/printers`
- `PATCH /api/printers/{id}`
- `DELETE /api/printers/{id}`

`DELETE` endpoints currently perform soft deletion: directories are deactivated with `is_active=false`, and printers are archived with `is_archived=true`.

## Cartridge Inventory API

The cartridge inventory MVP records stock movements in `cartridge_inventory_transactions`.
Warehouse balances are calculated from transactions; installed cartridge count is calculated from `printer_installed_cartridges`.

Available endpoints:

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

### Inventory Smoke Check

Run these commands from PowerShell after `docker compose up -d` and `docker compose exec backend alembic upgrade head`.

Create a cartridge model:

```powershell
$cartridgeBody = @{
  vendor = "HP"
  model_name = "CF259X"
  purchase_sku = "CF259X"
  cartridge_type = "toner"
  min_stock_level = 2
} | ConvertTo-Json
$cartridge = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/cartridge-models -ContentType "application/json" -Body $cartridgeBody
```

Add 10 new cartridges to stock:

```powershell
$stockInBody = @{
  cartridge_model_id = $cartridge.id
  quantity = 10
  item_condition = "new"
  reason = "Initial stock"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/cartridge-transactions/stock-in -ContentType "application/json" -Body $stockInBody
```

Check stock:

```powershell
Invoke-RestMethod http://localhost:8000/api/cartridge-stock
```

Create a printer model:

```powershell
$printerModelBody = @{
  vendor = "HP"
  name = "LaserJet Pro M404dn"
  print_technology = "laser"
  color_mode = "mono"
  cartridge_slots_count = 1
} | ConvertTo-Json
$printerModel = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printer-models -ContentType "application/json" -Body $printerModelBody
```

Create a printer:

```powershell
$printerBody = @{
  printer_model_id = $printerModel.id
  inventory_number = "PL-SMOKE-001"
  status = "in_work"
} | ConvertTo-Json
$printer = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printers -ContentType "application/json" -Body $printerBody
```

Install one cartridge:

```powershell
$installBody = @{
  cartridge_model_id = $cartridge.id
  printer_id = $printer.id
  quantity = 1
  item_condition = "new"
  slot_name = "Black"
  color_role = "black"
  comment = "Smoke install"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/cartridge-transactions/install -ContentType "application/json" -Body $installBody
```

Check installed cartridges:

```powershell
$installed = Invoke-RestMethod http://localhost:8000/api/printers/$($printer.id)/installed-cartridges
$installed
```

Remove the cartridge:

```powershell
$removeBody = @{
  installed_cartridge_id = $installed[0].id
  removal_reason = "Smoke removal"
  send_to_refill = $true
  write_off = $false
  comment = "Smoke remove"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/cartridge-transactions/remove -ContentType "application/json" -Body $removeBody
```

## Printer Lifecycle API

Printer lifecycle operations keep append-only histories for moves, repairs, and archive/write-off actions.

Available endpoints:

- `POST /api/printers/{printer_id}/move`
- `GET /api/printers/{printer_id}/location-history`
- `POST /api/printers/{printer_id}/repairs`
- `PATCH /api/printer-repairs/{repair_id}`
- `GET /api/printers/{printer_id}/repairs`
- `POST /api/printers/{printer_id}/archive`
- `GET /api/printers/archived`
- `GET /api/printers/{printer_id}/archive-history`

### Printer Lifecycle Smoke Check

Run after migrations are applied.

Create an organization and location:

```powershell
$suffix = Get-Date -Format "yyyyMMddHHmmss"
$orgBody = @{
  name = "Smoke Organization $suffix"
  short_name = "SMOKE-$suffix"
} | ConvertTo-Json
$org = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/organizations -ContentType "application/json" -Body $orgBody

$locationBody = @{
  organization_id = $org.id
  display_name = "Smoke Room $suffix"
  department = "IT"
  room = "101"
} | ConvertTo-Json
$location = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/locations -ContentType "application/json" -Body $locationBody
```

Create a printer model and printer:

```powershell
$printerModelBody = @{
  vendor = "HP"
  name = "Lifecycle Smoke Printer $suffix"
  print_technology = "laser"
  color_mode = "mono"
  cartridge_slots_count = 1
} | ConvertTo-Json
$printerModel = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printer-models -ContentType "application/json" -Body $printerModelBody

$printerBody = @{
  printer_model_id = $printerModel.id
  inventory_number = "PL-LIFE-$suffix"
  current_location_id = $location.id
  status = "in_work"
} | ConvertTo-Json
$printer = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printers -ContentType "application/json" -Body $printerBody
```

Create another location and move the printer:

```powershell
$targetLocationBody = @{
  organization_id = $org.id
  display_name = "Smoke Room Target $suffix"
  department = "Finance"
  room = "202"
} | ConvertTo-Json
$targetLocation = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/locations -ContentType "application/json" -Body $targetLocationBody

$moveBody = @{
  to_location_id = $targetLocation.id
  reason = "Smoke move"
  notes = "Lifecycle smoke test"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printers/$($printer.id)/move -ContentType "application/json" -Body $moveBody
```

Send to repair and return from repair:

```powershell
$repairBody = @{
  service_company = "Smoke Service"
  reason = "Test repair"
  notes = "Sent from smoke test"
} | ConvertTo-Json
$repair = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printers/$($printer.id)/repairs -ContentType "application/json" -Body $repairBody

$repairReturnBody = @{
  repair_status = "returned"
  result = "Returned successfully"
} | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri http://localhost:8000/api/printer-repairs/$($repair.id) -ContentType "application/json" -Body $repairReturnBody
```

Archive the printer and list archived printers:

```powershell
$archiveBody = @{
  archive_reason = "archived"
  comment = "Smoke archive"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printers/$($printer.id)/archive -ContentType "application/json" -Body $archiveBody

Invoke-RestMethod http://localhost:8000/api/printers/archived
```

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

## Migrations

Apply migrations:

```powershell
docker compose exec backend alembic upgrade head
```

Create a new migration after changing SQLAlchemy models:

```powershell
docker compose exec backend alembic revision --autogenerate -m "describe change"
```

Show migration status:

```powershell
docker compose exec backend alembic current
```

## Notes

- Secrets are not stored in code. Use `.env` locally and keep `.env.example` as a template.
- Full authentication, audit workflows, Excel import, and order request generation are intentionally not implemented yet.
- Inventory balances should later be calculated from operation history rather than stored as a manually edited source of truth.
