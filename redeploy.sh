#!/usr/bin/env bash
# =================================================================
# redeploy.sh - Update rapido no servidor de producao
# Uso: bash redeploy.sh
# Atualiza o codigo no servidor, executa migrations e reinicia
# os servicos dockerizados da aplicacao.
# =================================================================

set -euo pipefail

VPS_IP="187.77.255.211"
VPS_USER="root"
VPS_DIR="/var/www/adv"
SSH_TARGET="${VPS_USER}@${VPS_IP}"
COMPOSE_FILE="docker-compose.prod.yml"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log() { echo -e "${BLUE}[redeploy]${NC} $*"; }
ok() { echo -e "${GREEN}[ok]${NC} $*"; }

echo -e "${BOLD}[redeploy] Sistema Juridico ADV - update rapido${NC}"

ssh "${SSH_TARGET}" bash << EOF
set -euo pipefail
cd "${VPS_DIR}"

echo "[vps] Atualizando repositorio..."
git fetch origin main
git reset --hard origin/main

echo "[vps] Buildando app e worker..."
docker compose --env-file .env.production -f "${COMPOSE_FILE}" build --parallel app worker

echo "[vps] Aplicando migrations..."
docker compose --env-file .env.production -f "${COMPOSE_FILE}" run --rm \
  --entrypoint "" app \
  sh -lc 'npx prisma migrate deploy'

echo "[vps] Subindo servicos..."
docker compose --env-file .env.production -f "${COMPOSE_FILE}" up -d --force-recreate --no-deps app worker evolution-api nginx

echo "[vps] Status final"
docker compose --env-file .env.production -f "${COMPOSE_FILE}" ps
EOF

ok "Redeploy concluido"
