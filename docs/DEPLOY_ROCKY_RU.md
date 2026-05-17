# Установка PrintLedger на Rocky Linux

Это подробный пример production-развертывания PrintLedger на отдельном Rocky Linux сервере в локальной сети.

Предполагается, что система будет открываться по адресу:

```text
http://SERVER_IP
```

Замените `SERVER_IP` на реальный IP-адрес сервера.

## 1. Требования

- Rocky Linux 9 или совместимая система.
- Доступ по SSH.
- Пользователь с правами `sudo`.
- Открытый порт `80`.
- Доступ в интернет для установки пакетов и загрузки Docker images.

## 2. Установка Docker Engine и Docker Compose plugin

Обновите систему и установите необходимые пакеты:

```bash
sudo dnf -y update
sudo dnf -y install dnf-plugins-core git openssl
```

Добавьте официальный Docker repository:

```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

Установите Docker Engine и Compose plugin:

```bash
sudo dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Запустите Docker и включите автозапуск:

```bash
sudo systemctl enable --now docker
```

Проверьте установку:

```bash
docker --version
docker compose version
sudo systemctl status docker
```

Чтобы запускать Docker без `sudo`, добавьте пользователя в группу `docker`:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

После этого переподключитесь по SSH или выполните `newgrp docker`.

## 3. Проверка порта 80

Проверьте, не занят ли порт `80`:

```bash
sudo ss -ltnp | grep ':80 ' || true
```

Если команда показывает процесс, который уже слушает порт `80`, остановите или перенастройте этот сервис перед запуском PrintLedger.

Если включен `firewalld`, откройте HTTP:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## 4. Загрузка проекта

Создайте каталог `/opt`, если он еще не подготовлен для приложений:

```bash
sudo mkdir -p /opt
sudo chown "$USER:$USER" /opt
```

Склонируйте проект:

```bash
git clone https://github.com/fedorovdo/printledger.git /opt/printledger
cd /opt/printledger
```

## 5. Создание production `.env`

Создайте `.env` из примера:

```bash
cp .env.prod.example .env
```

Откройте файл:

```bash
nano .env
```

Обязательно измените:

- `POSTGRES_PASSWORD`
- `APP_SECRET_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `BACKEND_CORS_ORIGINS`

## 6. Генерация APP_SECRET_KEY

Вариант через `openssl`:

```bash
openssl rand -hex 32
```

Вариант через `python3`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Скопируйте результат в `.env`:

```env
APP_SECRET_KEY=PASTE_GENERATED_SECRET_HERE
```

## 7. Важное предупреждение про BACKEND_CORS_ORIGINS

`BACKEND_CORS_ORIGINS` должен быть JSON-массивом, а не простой строкой.

Правильно:

```env
BACKEND_CORS_ORIGINS=["http://SERVER_IP","http://localhost","http://127.0.0.1"]
```

Пример для сервера `192.168.1.10`:

```env
BACKEND_CORS_ORIGINS=["http://192.168.1.10","http://localhost","http://127.0.0.1"]
```

Неправильно:

```env
BACKEND_CORS_ORIGINS=http://192.168.1.10
```

Для production frontend обычно оставляют:

```env
NEXT_PUBLIC_API_BASE_URL=
```

Так frontend будет обращаться к backend через nginx same-origin.

## 8. Запуск production compose

Соберите и запустите сервисы:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Проверьте контейнеры:

```bash
docker compose -f docker-compose.prod.yml ps
```

## 9. Применение миграций

После первого запуска примените Alembic migrations:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## 10. Проверки

Проверьте health endpoint:

```bash
curl http://localhost/health
```

Ожидаемый ответ:

```json
{"status":"ok"}
```

Проверьте подключение к базе:

```bash
curl http://localhost/api/db-check
```

Ожидаемый ответ:

```json
{"database":"ok"}
```

Проверьте, что branding PNG отдается через frontend/nginx:

```bash
curl -I http://localhost/branding/logo-main.png
```

Ожидаемо должен быть HTTP `200`.

Если проверяете с другого компьютера в сети:

```bash
curl http://SERVER_IP/health
curl http://SERVER_IP/api/db-check
curl -I http://SERVER_IP/branding/logo-main.png
```

## 11. Первый вход

Откройте в браузере:

```text
http://SERVER_IP
```

Войдите под пользователем из `.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

После первого входа рекомендуется сразу сменить пароль в интерфейсе.

Важно: `ADMIN_USERNAME` и `ADMIN_PASSWORD` используются для bootstrap первого администратора, если база пустая. После создания пользователей авторизация идет через таблицу `users` в PostgreSQL, а пароли хранятся только как hash.

## 12. Backup

Перед обновлением системы всегда делайте backup.

Через интерфейс:

```text
http://SERVER_IP/backup
```

Через shell script:

```bash
./scripts/backup_db.sh
```

Backup-файлы сохраняются в `backups/` и не должны попадать в git.

Проверьте, что backup появился:

```bash
ls -lah backups/
```

## 13. Обновление через git pull

Перед обновлением:

```bash
cd /opt/printledger
./scripts/backup_db.sh
```

Обновите код:

```bash
git pull
```

Пересоберите и перезапустите production compose:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Примените миграции:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Проверьте систему:

```bash
curl http://localhost/health
curl http://localhost/api/db-check
```

## 14. Частые ошибки

### Порт 80 уже занят

Проверка:

```bash
sudo ss -ltnp | grep ':80 ' || true
```

Решение: остановите конфликтующий nginx/apache/другой сервис или измените published port в `docker-compose.prod.yml`.

### BACKEND_CORS_ORIGINS указан не как JSON-массив

Неправильно:

```env
BACKEND_CORS_ORIGINS=http://192.168.1.10
```

Правильно:

```env
BACKEND_CORS_ORIGINS=["http://192.168.1.10","http://localhost","http://127.0.0.1"]
```

После изменения `.env` перезапустите сервисы:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Не открывается сайт с другого компьютера

Проверьте:

- IP сервера.
- Открыт ли порт `80` в firewall.
- Запущен ли контейнер `nginx`.

Команды:

```bash
docker compose -f docker-compose.prod.yml ps
sudo firewall-cmd --list-services
```

### Branding PNG не отдается

Проверьте:

```bash
curl -I http://localhost/branding/logo-main.png
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

Если файл не найден, пересоберите frontend:

```bash
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend nginx
```

### Миграции не применены

Симптомы: backend запускается, но часть API падает с ошибками таблиц или колонок.

Решение:

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Не удается войти первым администратором

Проверьте `.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `APP_SECRET_KEY`

Если в базе уже есть пользователи, `.env` больше не меняет их пароли. Смените пароль через интерфейс администратора или восстановите доступ через базу вручную.

