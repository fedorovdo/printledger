# Smoke Tests

These checks are intended for local development after Docker Compose is running and migrations are applied.

## Base Checks

```powershell
docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend python -m compileall app
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

Diagnostics:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/api/db-check
Invoke-WebRequest -UseBasicParsing http://localhost:3000
```

## Authentication Check

```powershell
$body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$login = Invoke-RestMethod http://localhost:8000/api/auth/login -Method Post -ContentType "application/json" -Body $body
$headers = @{ Authorization = "Bearer $($login.access_token)" }
Invoke-RestMethod http://localhost:8000/api/auth/me -Headers $headers
```

Use the actual password from your `.env` or database user.

## Cartridge Inventory Smoke Check

Create a cartridge model:

```powershell
$suffix = Get-Date -Format "yyyyMMddHHmmss"
$cartridgeBody = @{
  vendor = "HP"
  model_name = "CF259X-$suffix"
  purchase_sku = "CF259X-$suffix"
  cartridge_type = "toner"
  min_stock_level = 2
} | ConvertTo-Json
$cartridge = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/cartridge-models -Headers $headers -ContentType "application/json" -Body $cartridgeBody
```

Add stock:

```powershell
$stockInBody = @{
  cartridge_model_id = $cartridge.id
  quantity = 10
  item_condition = "new"
  reason = "Initial stock"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/cartridge-transactions/stock-in -Headers $headers -ContentType "application/json" -Body $stockInBody
```

Check stock:

```powershell
Invoke-RestMethod http://localhost:8000/api/cartridge-stock -Headers $headers
```

## Printer Lifecycle Smoke Check

Create minimal location data and a printer:

```powershell
$suffix = Get-Date -Format "yyyyMMddHHmmss"
$orgBody = @{ name = "Smoke Organization $suffix"; short_name = "SMOKE-$suffix" } | ConvertTo-Json
$org = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/organizations -Headers $headers -ContentType "application/json" -Body $orgBody

$locationBody = @{ organization_id = $org.id; room = "101" } | ConvertTo-Json
$location = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/locations -Headers $headers -ContentType "application/json" -Body $locationBody

$printerModelBody = @{
  vendor = "HP"
  name = "Smoke Printer $suffix"
  print_technology = "laser"
  color_mode = "mono"
  cartridge_slots_count = 1
} | ConvertTo-Json
$printerModel = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printer-models -Headers $headers -ContentType "application/json" -Body $printerModelBody

$printerBody = @{
  printer_model_id = $printerModel.id
  inventory_number = "PL-SMOKE-$suffix"
  current_location_id = $location.id
  status = "in_work"
} | ConvertTo-Json
$printer = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printers -Headers $headers -ContentType "application/json" -Body $printerBody
```

Move printer:

```powershell
$targetLocationBody = @{ organization_id = $org.id; room = "202" } | ConvertTo-Json
$targetLocation = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/locations -Headers $headers -ContentType "application/json" -Body $targetLocationBody

$moveBody = @{ to_location_id = $targetLocation.id; reason = "Smoke move"; notes = "Smoke test" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/printers/$($printer.id)/move -Headers $headers -ContentType "application/json" -Body $moveBody
```

## Backup Smoke Check

```powershell
Invoke-RestMethod http://localhost:8000/api/backups -Headers $headers
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/backups/create -Headers $headers -ContentType "application/json" -Body "{}"
```

Manual restore tests should be done only when it is acceptable to overwrite the current development database.
