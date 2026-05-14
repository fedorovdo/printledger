# Установка PrintLedger на Linux-сервер

Документ описывает production-запуск PrintLedger на отдельном Linux-сервере в локальной сети. Dev-файл `docker-compose.yml` для разработки не меняется; для сервера используется отдельный `docker-compose.prod.yml`.

## Требования к серверу

- Linux-сервер в локальной сети.
- Docker.
- Docker Compose plugin.
- Открытый порт `80`.
- Доступ по SSH.

## Установка

Скопируйте проект на сервер или выполните `git clone`.

Создайте production env-файл:

```bash
cp .env.prod.example .env
```

Обязательно измените в `.env`:

- `POSTGRES_PASSWORD` - пароль базы данных.
- `APP_SECRET_KEY` - длинный случайный секрет для подписи токенов.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - логин и пароль первого администратора. Они используются только при первом bootstrap, если в базе еще нет активных пользователей.
- `BACKEND_CORS_ORIGINS` - адрес сервера, например `http://192.168.1.10`.

Если сервер открывается по IP `192.168.1.10`, пример:

```env
BACKEND_CORS_ORIGINS=http://192.168.1.10
```

Production frontend работает через nginx same-origin, поэтому `NEXT_PUBLIC_API_BASE_URL` обычно оставляют пустым.

Соберите и запустите сервисы:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Примените миграции:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Откройте систему:

```text
http://SERVER_IP
```

Войдите под `ADMIN_USERNAME` и своим `ADMIN_PASSWORD` из `.env`. После первого входа смените пароль через страницу `Профиль`; далее пользователи и хеши паролей хранятся в PostgreSQL, а `.env` нужен только для bootstrap пустой базы.

## Проверка

Проверить состояние контейнеров:

```bash
docker compose -f docker-compose.prod.yml ps
```

Проверить health endpoint:

```bash
curl http://localhost/health
```

Посмотреть логи nginx:

```bash
docker compose -f docker-compose.prod.yml logs -f nginx
```

Посмотреть логи backend:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

## Backup

Перед обновлением системы backup обязателен.

Через скрипт:

```bash
./scripts/backup_db.sh
```

Или через интерфейс:

```text
http://SERVER_IP/backup
```

Backup-файлы лежат в `backups/` и не попадают в git.

## Restore

Через интерфейс:

1. Откройте `http://SERVER_IP/backup`.
2. Нажмите `Восстановить` напротив нужного файла.
3. Введите `RESTORE`.
4. Подтвердите восстановление.

Перед restore PrintLedger автоматически создает аварийный `printledger_pre_restore_YYYY-MM-DD_HH-mm-ss.dump`.

Аварийный restore через скрипт:

```bash
./scripts/restore_db.sh backups/file.dump
```

## Обновление

Сначала сделайте backup:

```bash
./scripts/backup_db.sh
```

Затем обновите код и контейнеры:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Проверьте систему:

```bash
curl http://localhost/health
```

Откройте:

```text
http://SERVER_IP
```

## Остановка

Остановить production stack:

```bash
docker compose -f docker-compose.prod.yml down
```

Данные PostgreSQL хранятся в named volume `postgres_data`, поэтому обычный `down` их не удаляет.
