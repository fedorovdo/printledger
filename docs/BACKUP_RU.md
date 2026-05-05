# Резервное копирование PrintLedger

## Зачем нужен backup

Backup нужен, чтобы можно было восстановить базу PostgreSQL после ошибки, неудачного обновления, случайного удаления данных или сбоя сервера.

Рекомендуется делать backup:

- перед обновлением приложения;
- перед применением миграций;
- перед ручными изменениями в базе;
- ежедневно или еженедельно по расписанию на рабочем сервере.

## Где лежат файлы

Скрипты сохраняют файлы в папку:

```text
backups/
```

Имя файла выглядит так:

```text
printledger_backup_YYYY-MM-DD_HH-mm-ss.dump
```

Файлы backup не попадают в git.

## Backup на Windows

Из корня проекта выполните:

```powershell
.\scripts\backup_db.ps1
```

Скрипт создаст папку `backups`, если ее нет, выполнит `pg_dump` внутри контейнера `postgres` и выведет путь к созданному файлу.

Проверить, что файл создан:

```powershell
Get-ChildItem .\backups
```

## Restore на Windows

Восстановление перезаписывает текущую базу данных. Перед запуском убедитесь, что выбран правильный файл.

```powershell
.\scripts\restore_db.ps1 -BackupFile .\backups\printledger_backup_YYYY-MM-DD_HH-mm-ss.dump
```

Скрипт попросит ввести `YES`. После восстановления рекомендуется выполнить:

```powershell
docker compose exec backend alembic upgrade head
```

## Backup на Linux-сервере

Один раз дайте права на запуск:

```bash
chmod +x scripts/backup_db.sh scripts/restore_db.sh
```

Создать backup:

```bash
./scripts/backup_db.sh
```

Проверить файл:

```bash
ls -lh backups/
```

## Restore на Linux-сервере

Восстановление перезаписывает текущую базу данных.

```bash
./scripts/restore_db.sh backups/printledger_backup_YYYY-MM-DD_HH-mm-ss.dump
```

После восстановления:

```bash
docker compose exec backend alembic upgrade head
```

## Рекомендации

Для локальной разработки достаточно делать backup перед важными изменениями. Для рабочего сервера лучше настроить регулярный запуск скрипта: ежедневно, если данные меняются часто, или еженедельно для спокойного режима эксплуатации.
