# Backup And Restore

PrintLedger stores PostgreSQL backup files in `backups/`. Backup files are ignored by git.

Make a backup before system updates, migrations, risky manual database work, or production upgrades.

## Web UI

Admin users can manage backups from:

```text
http://localhost:3000/backup
```

The web UI can:

- list backup files;
- create a new backup;
- download a backup;
- restore a backup;
- delete old backup files.

Restore is protected by an explicit `RESTORE` confirmation because it overwrites the current database. Before web restore, PrintLedger creates a pre-restore backup named like:

```text
printledger_pre_restore_YYYY-MM-DD_HH-mm-ss.dump
```

Backup deletion through the UI is irreversible. Keep at least the latest known-good backup.

## PostgreSQL Client Compatibility

PostgreSQL client tools inside the backend image must match the PostgreSQL server major version.

The current Compose stack uses PostgreSQL 16, so `apps/backend/Dockerfile` installs `postgresql-client-16`.

If the `postgres` image is upgraded to another major version, update the backend client package before creating or restoring backups.

## Windows Scripts

Create a backup:

```powershell
.\scripts\backup_db.ps1
```

Restore from a backup:

```powershell
.\scripts\restore_db.ps1 -BackupFile .\backups\printledger_backup_YYYY-MM-DD_HH-mm-ss.dump
```

## Linux Scripts

Create a backup:

```bash
chmod +x scripts/backup_db.sh scripts/restore_db.sh
./scripts/backup_db.sh
```

Restore from a backup:

```bash
./scripts/restore_db.sh backups/printledger_backup_YYYY-MM-DD_HH-mm-ss.dump
```

After restore, run migrations:

```bash
docker compose exec backend alembic upgrade head
```

## Russian Guide

Detailed Russian instructions are available in [BACKUP_RU.md](BACKUP_RU.md).
