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

Edit `.env` before using the app in your local network. At minimum, change:

```env
APP_SECRET_KEY=change-me
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Do not keep `ADMIN_PASSWORD=admin123` for real local-network use.

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

## Production Deployment

For installation on a Linux server in a local network, use the separate production Compose file:

```bash
cp .env.prod.example .env
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Change `POSTGRES_PASSWORD`, `APP_SECRET_KEY`, and `ADMIN_PASSWORD` before starting production. The production stack exposes nginx on port `80`, so the app opens at `http://SERVER_IP`.

Read the full Russian deployment guide in [docs/DEPLOY_RU.md](docs/DEPLOY_RU.md). Make a backup before every update.

## Authentication

PrintLedger uses a simple local-network password login.

- Configure the admin login in `.env` with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- Configure token signing with `APP_SECRET_KEY`.
- Default examples in `.env.example` are `admin` / `admin123`; change them before using the system in a real LAN.
- To change the password later, edit `.env` and restart the backend with `docker compose up -d`.
- `GET /health` and `GET /api/db-check` are available without authorization for diagnostics.
- Application API endpoints under `/api/*` require `Authorization: Bearer <token>`, except `/api/auth/login`, `/api/auth/logout`, and `/api/db-check`.

Login API example:

```powershell
$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$login = Invoke-RestMethod http://localhost:8000/api/auth/login -Method Post -ContentType "application/json" -Body $body
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod http://localhost:8000/api/auth/me -Headers $headers
```

## Database Backup And Restore

Backup files are written to `backups/` and are ignored by git. Make a backup before system updates, migrations, or risky manual database work.

Backups can also be managed from the authenticated web UI:

```text
http://localhost:3000/backup
```

The web UI can list, create, download, restore, and delete backup files. Restore is protected by an explicit `RESTORE` confirmation because it overwrites the current database.
Before any web restore, PrintLedger automatically creates a pre-restore emergency backup named `printledger_pre_restore_YYYY-MM-DD_HH-mm-ss.dump`.
Backup deletion through the UI is irreversible. Keep at least the latest known-good backup before cleaning old files.

PostgreSQL client tools inside the backend image must match the PostgreSQL server major version. The current Compose stack uses PostgreSQL 16, so `apps/backend/Dockerfile` installs `postgresql-client-16`. If the `postgres` image is later upgraded to another major version, update the backend client package at the same time before creating or restoring backups.

Windows backup:

```powershell
.\scripts\backup_db.ps1
```

Windows restore remains available as an emergency/manual option:

```powershell
.\scripts\restore_db.ps1 -BackupFile .\backups\printledger_backup_YYYY-MM-DD_HH-mm-ss.dump
```

Linux backup:

```bash
chmod +x scripts/backup_db.sh scripts/restore_db.sh
./scripts/backup_db.sh
```

Linux restore:

```bash
./scripts/restore_db.sh backups/printledger_backup_YYYY-MM-DD_HH-mm-ss.dump
```

Restore overwrites the current PostgreSQL database and asks for `YES` confirmation. After restore, run:

```powershell
docker compose exec backend alembic upgrade head
```

## Frontend MVP

Open the app at `http://localhost:3000`.

Pages:

- `http://localhost:3000/` - dashboard with backend, database, cartridge model, printer, and archived printer status cards.
- `http://localhost:3000/cartridges` - compact cartridge stock list with search, sorting, and quick stock-in/replacement actions opened in a right-side panel.
- `http://localhost:3000/printers` - printer list with Active/In repair/Archive/All filters and quick-add forms for printer models and printers opened in a right-side panel.
- `http://localhost:3000/locations` - location directory management with the location list first, organization/branch/location forms opened in a right-side panel, and room-aware labels.
- `http://localhost:3000/operations` - cartridge inventory transaction list.
- `http://localhost:3000/backup` - authenticated backup list, create, download, restore, and delete actions.
- `http://localhost:3000/about` - application version, backend/database status, environment, and documentation hint.

The UI uses `NEXT_PUBLIC_API_BASE_URL`. In dev it points to `http://localhost:8000`; in production it is empty so the browser uses same-origin `/api` and `/health` through nginx.
RU is the default language; switch to EN from the top-right language control.
Frontend enum labels are localized for RU/EN, while API payload values remain stable English enum values such as `new`, `refilled`, `laser`, and `written_off`.
Open `http://localhost:3000/login` and sign in with the admin credentials from `.env`.

### Dashboard Analytics

The dashboard includes cartridge usage analytics for purchasing planning.

- Backend endpoint: `GET /api/analytics/cartridge-usage?days=30|90|365`.
- Optional filter: `cartridge_model_id`.
- Usage is calculated from cartridge inventory transactions: `install` and `write_off` count as consumption.
- Returns current warehouse stock, average monthly usage, estimated months of stock left, and recommended purchases for 1 and 3 months.
- When a cartridge model is selected, the response also includes monthly usage breakdown for the selected period.
- Inactive cartridge models are hidden by default; use `include_inactive=true` or the dashboard checkbox to include them.
- The dashboard table highlights models that need purchasing for the 3-month target and can export the current analytics view to CSV for Excel.

Manual frontend checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000
Invoke-WebRequest -UseBasicParsing http://localhost:3000/cartridges
Invoke-WebRequest -UseBasicParsing http://localhost:3000/printers
Invoke-WebRequest -UseBasicParsing http://localhost:3000/locations
Invoke-WebRequest -UseBasicParsing http://localhost:3000/operations
Invoke-WebRequest -UseBasicParsing http://localhost:3000/about
```

### Frontend Workflows

The `/cartridges` page is now a compact stock list with search, sortable columns, quick stock-in, and quick replacement/install actions. Advanced actions for a specific cartridge model, including correction and refill return, live on `/cartridges/{cartridge_model_id}`.

Add a cartridge model:

1. Open `http://localhost:3000/cartridges`.
2. Click the `+` cartridge model button to expand the form.
3. Fill vendor, model, SKU, cartridge type, minimum stock, and notes.
4. Submit the form. The form collapses and the model appears in the stock table.

Receive cartridges into stock:

1. Open `http://localhost:3000/cartridges`.
2. Click `Приход` in the needed cartridge row, or use the `+` stock-in button.
3. The cartridge model is preselected for row actions; enter quantity and condition `new` or `refilled`.
4. Submit the form. The side panel closes and the stock columns update.

Install a cartridge:

1. Open `http://localhost:3000/cartridges`.
2. Click `Замена` in the needed cartridge row.
3. Select an active printer, condition, slot/color, and submit the form.
4. The side panel closes and the stock columns update. If there is no warehouse stock, the replacement button is disabled; if the slot is already occupied, the UI shows a clear conflict message.

Remove a cartridge:

1. Open `http://localhost:3000/printers`.
2. Open the printer card from the printer model link or the `Открыть` button.
3. Use `Снять картридж`, select installed cartridge, add removal reason/comment, and choose one follow-up action.
4. Submit the form and check the installed cartridges table on the card.

Removal follow-up actions:

- `Вернуть на склад` - creates a `return_to_stock` transaction and returns one cartridge to stock with the same condition, `new` or `refilled`.
- `Отправить на заправку` - creates a `send_to_refill` transaction.
- `Списать` - creates a `write_off` transaction.
- `Просто снять` - records only the removal from the printer.

Move a printer:

1. Open `http://localhost:3000/printers`.
2. Open the printer card from the printer model link or the `Открыть` button.
3. Use `Переместить принтер`, select target location, reason, and notes.
4. Submit the form and check the printer location on the card or in the list.

Send a printer to repair and return it:

1. Open `http://localhost:3000/printers`.
2. Open the printer card from the printer model link or the `Открыть` button.
3. Use `Отправить в ремонт`.
4. To return it, use `Вернуть из ремонта` with the repair ID from the repair history block.

Archive or write off a printer:

1. Open `http://localhost:3000/printers`.
2. Open the printer card from the printer model link or the `Открыть` button.
3. Use `Архивировать / списать`, select archive reason, and comment.
4. Submit the form. The dashboard archived count updates on the next dashboard load.

Printer archive behavior:

- `/printers` is now a clean list plus quick-add forms. Operations for a specific printer live on `/printers/{printer_id}`.
- The printer list supports quick client-side search by model, IP, serial number, inventory number, location, room, and status.
- Printer table columns can be sorted by clicking their headers.
- Active printers can be moved directly from the list with the `Локация` action. This uses the same move API as the printer card, so movement history is preserved.
- Printers are not physically deleted from the database.
- The main `/printers` table opens with the `Активные` filter and hides archived or written-off printers by default.
- Use `Архив/Списанные` to view archived and written-off printers.
- Use `Все` to view every printer in one table.
- Archived and written-off rows are visually muted, and statuses are shown as readable labels.

### Cartridge Card

Open a cartridge card from `http://localhost:3000/cartridges` by clicking the cartridge model name or the `Open` button.
Direct URL format:

```text
http://localhost:3000/cartridges/{cartridge_model_id}
```

The card shows model details, stock summary, low-stock status, and operation history from `GET /api/cartridge-models/{cartridge_model_id}/history`.

Available card actions:

- Receive cartridges into stock with `POST /api/cartridge-transactions/stock-in`.
- Install one cartridge into a selected printer with `POST /api/cartridge-transactions/install`.
- Apply plus/minus correction with `POST /api/cartridge-transactions/correction`.
- Register refill return with `POST /api/cartridge-transactions/refill-return`.

### Printer Card

Open a printer card from `http://localhost:3000/printers` by clicking the printer model or the `Open` button.
Direct URL format:

```text
http://localhost:3000/printers/{printer_id}
```

The card shows printer details with resolved printer model and location names, plus installed cartridges, cartridge history, location history, repair history, and archive history.
Archived and written-off printers show a badge on the card; install, move, and send-to-repair actions are disabled for them.

Available card actions:

- Edit physical printer details such as model, serial number, inventory number, IP, MAC, and notes.
- Install a cartridge into the current printer.
- Remove an installed cartridge and choose exactly one follow-up action: return to stock, send to refill, write off, or remove only.
- Move the printer to another location.
- Send the printer to repair and return it from repair.
- Archive or write off the printer.

Printer location is intentionally changed through the move workflow, not the edit form, so movement history stays complete.

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

## Duplicate Protection

Stage 18 adds application-level duplicate validation for core directories. Stage 18.1 tightens model validation so cartridge models are unique by `model_name` regardless of vendor, and printer models are unique by `name` regardless of vendor. The backend normalizes text before comparison: trims spaces, collapses repeated spaces, and compares values without case sensitivity.

Protected entities:

- Printer models: `name`.
- Cartridge models: `model_name`; `purchase_sku` is also unique when filled.
- Organizations: `name`; `short_name` is also unique when filled.
- Branches: `organization_id + name`.
- Locations: `organization_id + branch_id + department + room`; display name is also checked when filled.
- Printers: `inventory_number`, `serial_number`, `mac_address`, and `ip_address` when filled. Inventory numbers are checked across all printers; the other identifiers are checked among non-archived printers.

Duplicate create/update requests return `409 Conflict` with a readable Russian message. Existing duplicates are not deleted or changed automatically. If duplicates already exist in a database, clean them up manually later by editing, archiving, or consolidating records.

Database-level unique indexes are intentionally not added yet because they could fail on existing duplicated data. They can be added later after data cleanup.

Manufacturer/vendor is currently a text field with frontend suggestions from existing values. A dedicated manufacturer directory can be added later if needed.

## Safe Model Management

Printer and cartridge model catalogs can be managed from the frontend:

- `/printers` -> `+ Printer model` opens the printer model form in a right-side panel; the catalog table stays on the page.
- `/cartridges` -> `+ Cartridge model` opens the cartridge model form in a right-side panel; the catalog table stays on the page.
- Models can be edited with `PATCH /api/printer-models/{id}` and `PATCH /api/cartridge-models/{id}`.
- Unused models can be deleted.
- Linked models are protected: deleting a printer model used by printers or compatibility rows returns `409 Conflict`; deleting a cartridge model used by inventory history, installed cartridges, cartridge history, or compatibility rows returns `409 Conflict`.
- Linked or outdated models can be deactivated with `PATCH ... { "is_active": false }`. Deactivated models remain in history and catalog filters, but disappear from working selection lists such as add-printer, stock-in, and cartridge install.
- Deactivated models can be returned to work with `PATCH ... { "is_active": true }`.

No database migrations are used for this stage. Existing linked data is preserved; deleting a linked model should be handled through deactivation or a dedicated cleanup workflow.

## Location Directory Management

Organizations, branches, and locations are managed on `/locations`.

- Add/edit forms open in a right-side panel, so the location list stays visible and long tables do not push forms out of view.
- Organization and branch directories are shown below the location list as full-width tables for easier reading and editing.
- Records can be edited with `PATCH /api/organizations/{id}`, `PATCH /api/branches/{id}`, and `PATCH /api/locations/{id}`.
- Unused records can be physically deleted.
- Linked records are protected and return `409 Conflict`. If a record is used, deactivate it with `PATCH ... { "is_active": false }` instead of deleting it.
- Deactivated organizations, branches, and locations remain available for history, but inactive locations are hidden from working printer location selects.
- Printer creation and printer movement selects show only active locations whose organization and branch are also active.
- For locations, organization and room are required. Branch, department, and room description are optional.
- `room` is the main working field. In the UI, `display_name` is treated as an optional room description, for example `Серверная`, `Склад`, or `Приемная`.
- If `display_name` is empty, the backend generates a service display name from department and room, for example `каб. 214` or `Бухгалтерия, каб. 214`; the locations table hides that generated duplicate and shows `—` in the description column.
- Printer location labels now include organization, branch, optional department, and room, so cabinet numbers are visible in printer lists, printer cards, and movement selects.
- A room can also be created directly from the `/printers` quick-add printer form with `+ Кабинет`; the new room is selected automatically.

No database migrations are used for this stage because `is_active` already exists on these tables.

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
  return_to_stock = $true
  send_to_refill = $false
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

Create an organization, branch, and location:

```powershell
$suffix = Get-Date -Format "yyyyMMddHHmmss"
$orgBody = @{
  name = "Smoke Organization $suffix"
  short_name = "SMOKE-$suffix"
} | ConvertTo-Json
$org = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/organizations -ContentType "application/json" -Body $orgBody

$locationBody = @{
  organization_id = $org.id
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
