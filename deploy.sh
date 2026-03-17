#!/usr/bin/env bash
# =================================================================
# deploy.sh — Deploy via PM2 no VPS
# Uso: bash deploy.sh
#
# O que faz no VPS (/var/www/adv):
#   1. git pull
#   2. npm install
#   3. npx prisma migrate deploy
#   4. npx prisma generate
#   5. npm run build
#   6. pm2 restart adv
# =================================================================

set -euo pipefail

VPS="root@82.25.79.50"
APP_DIR="/var/www/adv"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[✔]${NC} $*"; }
fail() { echo -e "${RED}[✘]${NC} $*"; exit 1; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║   Sistema Jurídico ADV — Deploy PM2          ║"
echo "║   Target: ${VPS}              ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Testar conexão SSH
log "Testando conexão SSH..."
ssh -o ConnectTimeout=10 -o BatchMode=yes "${VPS}" "echo ok" >/dev/null 2>&1 \
  || fail "Sem acesso SSH ao VPS. Configure a chave SSH primeiro."
ok "Conexão SSH OK"

# Executar deploy no VPS
log "Iniciando deploy em ${VPS}:${APP_DIR} ..."

ssh -o ConnectTimeout=30 "${VPS}" bash << 'REMOTE'
set -euo pipefail

APP_DIR="/var/www/adv"
cd "$APP_DIR" || { echo "[✘] Diretório $APP_DIR não encontrado"; exit 1; }

echo ""
echo "━━━━ [1/6] git pull ━━━━"
git pull

echo ""
echo "━━━━ [2/6] npm install ━━━━"
npm install

echo ""
echo "━━━━ [3/6] prisma migrate deploy ━━━━"
npx prisma migrate deploy

echo ""
echo "━━━━ [4/6] prisma generate ━━━━"
npx prisma generate

echo ""
echo "━━━━ [5/6] npm run build ━━━━"
npm run build

echo ""
echo "━━━━ [6/6] pm2 restart adv ━━━━"
pm2 restart adv

echo ""
pm2 status
REMOTE

ok "Deploy concluído!"
echo ""
echo -e "${GREEN}${BOLD}  URL: https://adv.chuster.com.br${NC}"
echo ""
echo -e "${YELLOW}Logs em tempo real:${NC}"
echo "  ssh ${VPS} 'pm2 logs adv'"
echo ""
