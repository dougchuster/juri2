#!/bin/bash
# =============================================================================
# VPS-UPDATE.SH - Atualizacao rapida no servidor de producao
# Execute na VPS: bash /var/www/adv/scripts/vps-update.sh
# =============================================================================

set -euo pipefail

APP_DIR="/var/www/adv"
COMPOSE_FILE="docker-compose.prod.yml"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${CYAN}[--]${NC} $1"; }

echo -e "${CYAN}=== SISTEMA JURIDICO - UPDATE ===${NC}"

cd "$APP_DIR"

info "Puxando codigo novo..."
git fetch origin main
git reset --hard origin/main
log "Codigo atualizado"

info "Buildando app e worker..."
docker compose --env-file .env.production -f "$COMPOSE_FILE" build --parallel app worker
log "Build OK"

info "Aplicando migrations..."
docker compose --env-file .env.production -f "$COMPOSE_FILE" run --rm \
  --entrypoint "" app \
  sh -lc "npx prisma migrate deploy"
log "Prisma OK"

info "Subindo servicos..."
docker compose --env-file .env.production -f "$COMPOSE_FILE" up -d --force-recreate --no-deps app worker evolution-api nginx
log "Containers atualizados"

echo ""
docker compose --env-file .env.production -f "$COMPOSE_FILE" ps
echo ""
echo -e "${GREEN}Update concluido!${NC}"
