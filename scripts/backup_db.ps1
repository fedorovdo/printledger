[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

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

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackupDir = Join-Path $ProjectRoot "backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$PostgresUser = Get-EnvValue -Name "POSTGRES_USER" -Default "printledger"
$PostgresDb = Get-EnvValue -Name "POSTGRES_DB" -Default "printledger"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupName = "printledger_backup_$Timestamp.dump"
$BackupFile = Join-Path $BackupDir $BackupName
$ContainerFile = "/tmp/$BackupName"

try {
    Push-Location $ProjectRoot
    docker compose exec -T postgres pg_dump -U $PostgresUser -d $PostgresDb -Fc -f $ContainerFile
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    docker compose cp "postgres:$ContainerFile" $BackupFile
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose cp failed with exit code $LASTEXITCODE"
    }

    docker compose exec -T postgres rm -f $ContainerFile | Out-Null
    Write-Host "Backup created: $BackupFile"
} catch {
    Write-Error "Backup failed: $_"
    exit 1
} finally {
    Pop-Location
}
