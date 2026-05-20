#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/fedorovdo/printledger.git"
INSTALL_DIR="/opt/printledger"
COMPOSE_FILE="docker-compose.images.yml"

log() {
  echo "[PrintLedger] $*"
}

fail() {
  echo "[PrintLedger] ERROR: $*" >&2
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Run this script as root or with sudo."
  fi
}

load_os_release() {
  if [[ ! -f /etc/os-release ]]; then
    fail "/etc/os-release was not found. Unsupported Linux distribution."
  fi

  # shellcheck disable=SC1091
  . /etc/os-release

  OS_ID="${ID:-}"
  OS_ID_LIKE="${ID_LIKE:-}"
  OS_VERSION_CODENAME="${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}"
}

is_debian_like() {
  [[ "${OS_ID}" == "debian" || "${OS_ID}" == "ubuntu" || " ${OS_ID_LIKE} " == *" debian "* || " ${OS_ID_LIKE} " == *" ubuntu "* ]]
}

is_rhel_like() {
  [[ "${OS_ID}" == "rhel" || "${OS_ID}" == "rocky" || "${OS_ID}" == "almalinux" || "${OS_ID}" == "centos" || " ${OS_ID_LIKE} " == *" rhel "* || " ${OS_ID_LIKE} " == *" fedora "* ]]
}

docker_ready() {
  command_exists docker && docker --version >/dev/null 2>&1 && docker compose version >/dev/null 2>&1
}

install_docker_debian() {
  log "Installing base packages with apt..."
  apt-get update
  apt-get install -y git curl openssl ca-certificates

  if docker_ready; then
    log "Docker and Docker Compose plugin are already installed."
    return
  fi

  local docker_repo_os
  if [[ "${OS_ID}" == "ubuntu" || " ${OS_ID_LIKE} " == *" ubuntu "* ]]; then
    docker_repo_os="ubuntu"
  else
    docker_repo_os="debian"
  fi

  if [[ -z "${OS_VERSION_CODENAME}" ]]; then
    fail "Could not determine VERSION_CODENAME from /etc/os-release."
  fi

  log "Installing Docker Engine from the official Docker repository..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${docker_repo_os}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  local arch
  arch="$(dpkg --print-architecture)"

  echo "deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${docker_repo_os} ${OS_VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker_rhel() {
  log "Installing base packages with dnf..."
  dnf install -y dnf-plugins-core git curl openssl ca-certificates

  if docker_ready; then
    log "Docker and Docker Compose plugin are already installed."
    return
  fi

  log "Installing Docker Engine from the official Docker repository..."
  dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
  dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_dependencies() {
  if is_debian_like; then
    install_docker_debian
  elif is_rhel_like; then
    install_docker_rhel
  else
    fail "Unsupported Linux distribution: ID=${OS_ID}, ID_LIKE=${OS_ID_LIKE}"
  fi

  log "Enabling and starting Docker..."
  systemctl enable --now docker
}

detect_server_ip() {
  hostname -I 2>/dev/null \
    | tr ' ' '\n' \
    | grep -E '^[0-9]+(\.[0-9]+){3}$' \
    | head -n 1 || true
}

set_env_value() {
  local key="$1"
  local value="$2"
  local file="$3"
  local escaped_value

  escaped_value="${value//\\/\\\\}"
  escaped_value="${escaped_value//&/\\&}"
  escaped_value="${escaped_value//|/\\|}"

  if grep -q "^${key}=" "${file}"; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "${file}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${file}"
  fi
}

prepare_install_dir() {
  if [[ -e "${INSTALL_DIR}" ]]; then
    cat >&2 <<EOF
[PrintLedger] ERROR: ${INSTALL_DIR} already exists.

The installer will not remove or overwrite an existing installation.
To update an existing installation, run:

  cd ${INSTALL_DIR}
  docker compose -f ${COMPOSE_FILE} pull
  docker compose -f ${COMPOSE_FILE} up -d
  docker compose -f ${COMPOSE_FILE} exec backend alembic upgrade head

EOF
    exit 1
  fi

  log "Cloning repository into ${INSTALL_DIR}..."
  git clone "${REPO_URL}" "${INSTALL_DIR}"
}

create_env_file() {
  log "Generating production .env..."

  cd "${INSTALL_DIR}"
  cp .env.prod.example .env

  local postgres_password
  local app_secret_key
  local admin_password
  local server_ip
  local cors_origins

  postgres_password="$(openssl rand -base64 24)"
  app_secret_key="$(openssl rand -hex 32)"
  admin_password="$(openssl rand -base64 18)"
  server_ip="$(detect_server_ip)"

  if [[ -n "${server_ip}" ]]; then
    cors_origins="[\"http://localhost\",\"http://127.0.0.1\",\"http://${server_ip}\"]"
  else
    cors_origins="[\"http://localhost\",\"http://127.0.0.1\"]"
  fi

  set_env_value "POSTGRES_PASSWORD" "${postgres_password}" .env
  set_env_value "APP_SECRET_KEY" "${app_secret_key}" .env
  set_env_value "ADMIN_USERNAME" "admin" .env
  set_env_value "ADMIN_PASSWORD" "${admin_password}" .env
  set_env_value "PRINTLEDGER_IMAGE_TAG" "latest" .env
  set_env_value "NEXT_PUBLIC_API_BASE_URL" "" .env
  set_env_value "BACKEND_CORS_ORIGINS" "${cors_origins}" .env

  ADMIN_PASSWORD_GENERATED="${admin_password}"
  SERVER_IP_DETECTED="${server_ip}"
}

open_firewalld_http() {
  if ! command_exists firewall-cmd; then
    return
  fi

  if ! firewall-cmd --state >/dev/null 2>&1; then
    return
  fi

  log "Opening HTTP service in firewalld..."
  firewall-cmd --permanent --add-service=http
  firewall-cmd --reload
}

start_printledger() {
  cd "${INSTALL_DIR}"

  log "Pulling GHCR images..."
  docker compose -f "${COMPOSE_FILE}" pull

  log "Starting services..."
  docker compose -f "${COMPOSE_FILE}" up -d

  log "Applying database migrations..."
  docker compose -f "${COMPOSE_FILE}" exec -T backend alembic upgrade head
}

print_summary() {
  local url="http://localhost/"
  if [[ -n "${SERVER_IP_DETECTED:-}" ]]; then
    url="http://${SERVER_IP_DETECTED}/"
  fi

  cat <<EOF

[PrintLedger] Installation complete.

URL: ${url}
ADMIN_USERNAME: admin
ADMIN_PASSWORD: ${ADMIN_PASSWORD_GENERATED}
Install path: ${INSTALL_DIR}

Status:
  cd ${INSTALL_DIR}
  docker compose -f ${COMPOSE_FILE} ps

Logs:
  cd ${INSTALL_DIR}
  docker compose -f ${COMPOSE_FILE} logs -f

Please save the admin password now and change it after the first sign-in.
EOF
}

main() {
  ADMIN_PASSWORD_GENERATED=""
  SERVER_IP_DETECTED=""

  require_root
  load_os_release
  install_dependencies
  prepare_install_dir
  create_env_file
  open_firewalld_http
  start_printledger
  print_summary
}

main "$@"
