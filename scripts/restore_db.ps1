[CmdletBinding()]
param(
    [string]$BackupFile,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
    Write-Host "Usage: .\scripts\restore_db.ps1 -BackupFile .\backups\printledger_backup_YYYY-MM-DD_HH-mm-ss.dump"
    Write-Host "Restores PostgreSQL database from a custom-format pg_dump file. This overwrites the current database."
    exit 0
}

function Get-EnvValue {
    param(
        [string]$Name,
        [string]$Default
    )

    $envPath = Join-Path $ProjectRoot ".env"
    if (Test-Path $envPath) {
        foreach ($line in Get-Content $envPath) {
            $trimmed = $line.Trim()
            if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
                continue
            }
            $parts = $trimmed.Split("=", 2)
            if ($parts.Length -eq 2 -and $parts[0].Trim() -eq $Name) {
                return $parts[1].Trim().Trim('"').Trim("'")
            }
        }
    }

    $processValue = [Environment]::GetEnvironmentVariable($Name)
    if ($processValue) {
        return $processValue
    }

    return $Default
}

if (-not $BackupFile) {
    Write-Error "BackupFile is required. Use -Help for usage."
    exit 1
}

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResolvedBackupFile = (Resolve-Path $BackupFile -ErrorAction SilentlyContinue).Path
if (-not $ResolvedBackupFile) {
    Write-Error "Backup file not found: $BackupFile"
    exit 1
}

$PostgresUser = Get-EnvValue -Name "POSTGRES_USER" -Default "printledger"
$PostgresDb = Get-EnvValue -Name "POSTGRES_DB" -Default "printledger"
$ContainerFile = "/tmp/printledger_restore.dump"

Write-Warning "Restore will overwrite database '$PostgresDb'."
$Confirmation = Read-Host "Type YES to continue"
if ($Confirmation -ne "YES") {
    Write-Host "Restore cancelled."
    exit 0
}

try {
    Push-Location $ProjectRoot
    docker compose cp $ResolvedBackupFile "postgres:$ContainerFile"
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose cp failed with exit code $LASTEXITCODE"
    }

    docker compose exec -T postgres dropdb -U $PostgresUser $PostgresDb --if-exists
    if ($LASTEXITCODE -ne 0) {
        throw "dropdb failed with exit code $LASTEXITCODE"
    }

    docker compose exec -T postgres createdb -U $PostgresUser $PostgresDb
    if ($LASTEXITCODE -ne 0) {
        throw "createdb failed with exit code $LASTEXITCODE"
    }

    docker compose exec -T postgres pg_restore -U $PostgresUser -d $PostgresDb --clean --if-exists $ContainerFile
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore failed with exit code $LASTEXITCODE"
    }

    docker compose exec -T postgres rm -f $ContainerFile | Out-Null
    Write-Host "Restore completed from: $ResolvedBackupFile"
    Write-Host "Recommended next step: docker compose exec backend alembic upgrade head"
} catch {
    Write-Error "Restore failed: $_"
    exit 1
} finally {
    Pop-Location
}
