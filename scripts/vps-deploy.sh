#!/bin/bash
# =============================================================================
# VPS-DEPLOY.SH - Bootstrap de producao para o servidor atual
# Execute: bash /tmp/vps-deploy.sh
#    OU:   bash /var/www/adv/scripts/vps-deploy.sh
# =============================================================================

set -euo pipefail

APP_DIR="/var/www/adv"
REPO_URL="https://github.com/dougchuster/juri2.git"
BRANCH="main"
COMPOSE_FILE="docker-compose.prod.yml"
DUMP_FILE="/tmp/db_backup_deploy.dump"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${CYAN}[--]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}   SISTEMA JURIDICO ADV - DEPLOY VPS${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""

info "[1/6] Verificando dependencias basicas..."
apt-get update -qq
command -v git >/dev/null 2>&1 || apt-get install -y git
command -v docker >/dev/null 2>&1 || { curl -fsSL https://get.docker.com | sh; systemctl enable docker; systemctl start docker; }
if ! command -v docker compose >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi
log "Dependencias OK"

info "[2/6] Preparando repositorio..."
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi
cd "$APP_DIR"
log "Repositorio pronto em $APP_DIR"

info "[3/6] Validando .env.production..."
if [ ! -f "$APP_DIR/.env.production" ]; then
  err ".env.production nao encontrado em $APP_DIR"
fi
if ! grep -q "DATABASE_URL" "$APP_DIR/.env.production"; then
  err "DATABASE_URL nao encontrada no .env.production"
fi
log ".env.production encontrado"

info "[4/6] Subindo infraestrutura base..."
docker compose --env-file .env.production -f "$COMPOSE_FILE" up -d postgres redis
for i in {1..30}; do
  if docker exec juridico-db pg_isready -U juridico >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
log "Postgres e Redis prontos"

info "[5/6] Restaurando dump opcional e aplicando migrations..."
if [ -f "$DUMP_FILE" ]; then
  docker cp "$DUMP_FILE" juridico-db:/tmp/db_backup_deploy.dump
  docker exec juridico-db sh -lc 'pg_restore -U juridico --no-owner --no-privileges -d sistema_juridico /tmp/db_backup_deploy.dump'
  rm -f "$DUMP_FILE"
  log "Dump restaurado"
else
  warn "Nenhum dump encontrado em $DUMP_FILE - seguindo apenas com migrations"
fi

docker compose --env-file .env.production -f "$COMPOSE_FILE" build --parallel app worker
docker compose --env-file .env.production -f "$COMPOSE_FILE" run --rm \
  --entrypoint "" app \
  sh -lc "npx prisma migrate deploy"
log "Build e migrations concluidos"

info "[6/6] Subindo stack de producao..."
docker compose --env-file .env.production -f "$COMPOSE_FILE" up -d app worker evolution-api nginx
docker compose --env-file .env.production -f "$COMPOSE_FILE" ps

echo ""
echo -e "${GREEN}Deploy concluido!${NC}"
echo "Aplicacao: https://adv.chuster.com.br"
echo "Update futuro: bash $APP_DIR/scripts/vps-update.sh"
