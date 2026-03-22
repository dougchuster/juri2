#!/bin/bash
# =============================================================================
# VPS-UPDATE.SH — Atualização rápida de código (sem recriar banco/Docker)
# Execute na VPS: bash /var/www/sistema-juridico/scripts/vps-update.sh
# =============================================================================

set -e

APP_DIR="/var/www/sistema-juridico"
GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${CYAN}[--]${NC} $1"; }

echo -e "${CYAN}=== SISTEMA JURIDICO — UPDATE ===${NC}"

cd "$APP_DIR"

info "Puxando código novo..."
git fetch --all
git reset --hard origin/main
log "Código atualizado"

info "Instalando dependências..."
npm ci --prefer-offline 2>/dev/null || npm install
log "npm install OK"

info "Gerando Prisma + migrations..."
npx prisma generate
npx prisma migrate deploy
log "Prisma OK"

info "Buildando..."
npm run build
log "Build OK"

info "Reiniciando PM2..."
pm2 restart all
log "PM2 reiniciado"

echo ""
pm2 status
echo ""
echo -e "${GREEN}Update concluído!${NC}"
