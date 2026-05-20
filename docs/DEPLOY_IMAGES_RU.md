# Установка PrintLedger через готовые Docker images

Этот вариант установки использует готовые образы из GitHub Container Registry (GHCR), поэтому на сервере не нужно локально собирать backend и frontend.

Образы:

- `ghcr.io/fedorovdo/printledger-backend`
- `ghcr.io/fedorovdo/printledger-frontend`

Важно: для установки без `docker login` GHCR packages должны быть опубликованы как **Public**.

## Требования

- Linux-сервер в локальной сети.
- Docker Engine.
- Docker Compose plugin.
- Открытый порт `80`.
- Доступ по SSH.

## Подготовка проекта

Склонируйте репозиторий:

```bash
git clone https://github.com/fedorovdo/printledger.git
cd printledger
```

Создайте `.env` из production-примера:

```bash
cp .env.prod.example .env
```

Обязательно измените в `.env`:

- `POSTGRES_PASSWORD`
- `APP_SECRET_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `BACKEND_CORS_ORIGINS`

`ADMIN_USERNAME` и `ADMIN_PASSWORD` используются для создания первого администратора в пустой базе. После первого входа пароль рекомендуется сменить в интерфейсе.

Для production через nginx обычно оставляют:

```env
NEXT_PUBLIC_API_BASE_URL=
```

## Запуск

Скачайте образы и запустите сервисы:

```bash
docker compose -f docker-compose.images.yml pull
docker compose -f docker-compose.images.yml up -d
```

Примените миграции:

```bash
docker compose -f docker-compose.images.yml exec backend alembic upgrade head
```

Откройте систему:

```text
http://SERVER_IP
```

## Использование конкретной версии

По умолчанию используется tag `latest`.

Чтобы запустить конкретный релиз, добавьте в `.env`:

```env
PRINTLEDGER_IMAGE_TAG=v0.1.0
```

Затем выполните:

```bash
docker compose -f docker-compose.images.yml pull
docker compose -f docker-compose.images.yml up -d
docker compose -f docker-compose.images.yml exec backend alembic upgrade head
```

## Обновление

Перед обновлением сделайте backup.

```bash
./scripts/backup_db.sh
```

Затем скачайте новые образы и перезапустите сервисы:

```bash
docker compose -f docker-compose.images.yml pull
docker compose -f docker-compose.images.yml up -d
docker compose -f docker-compose.images.yml exec backend alembic upgrade head
```

## Логи и проверка

Проверить состояние контейнеров:

```bash
docker compose -f docker-compose.images.yml ps
```

Проверить health endpoint:

```bash
curl http://localhost/health
```

Проверить доступ к базе через backend:

```bash
curl http://localhost/api/db-check
```

Посмотреть логи backend:

```bash
docker compose -f docker-compose.images.yml logs -f backend
```

Посмотреть логи nginx:

```bash
docker compose -f docker-compose.images.yml logs -f nginx
```

## Backup

Backup можно сделать через интерфейс `/backup` или скриптом:

```bash
./scripts/backup_db.sh
```

Backup-файлы сохраняются в `backups/` и не должны попадать в git.

## Если GHCR требует авторизацию

Если при `pull` появляется ошибка доступа, проверьте, что packages в GitHub Container Registry опубликованы как Public.

Для приватных packages потребуется вход:

```bash
docker login ghcr.io
```

Но для обычной установки PrintLedger без GitHub-аккаунта рекомендуется держать public images открытыми.
