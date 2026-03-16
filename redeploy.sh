#!/usr/bin/env bash
# =================================================================
# redeploy.sh — Update rápido após o primeiro deploy
# Uso: bash redeploy.sh
# Sincroniza código, rebuild e restart sem reconfigurar SSL/domínio
# =================================================================

set -euo pipefail

VPS_IP="82.25.79.50"
VPS_USER="root"
VPS_DIR="/opt/juridico"
SSH_TARGET="${VPS_USER}@${VPS_IP}"
COMPOSE_FILE="docker-compose.prod.yml"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log() { echo -e "${BLUE}[redeploy]${NC} $*"; }
ok()  { echo -e "${GREEN}[✔]${NC} $*"; }

echo -e "${BOLD}[redeploy] Sistema Jurídico ADV — Update rápido${NC}"

# 1. Sync
log "Sincronizando código..."
rsync -az --delete \
  --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='.env*' --exclude='public/uploads' --exclude='.agent' \
  --info=progress2 \
  ./ "${SSH_TARGET}:${VPS_DIR}/"
ok "Código sincronizado"

# 2. Build + restart
log "Rebuild e restart dos containers..."
ssh "${SSH_TARGET}" bash << 'EOF'
set -euo pipefail
cd /opt/juridico
docker compose --env-file .env.production -f docker-compose.prod.yml build --parallel app worker
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps app worker
echo "[vps] Containers atualizados"
docker compose --env-file .env.production -f docker-compose.prod.yml ps
EOF

# 3. Migrations (se houver novas)
log "Verificando migrations..."
sleep 5
ssh "${SSH_TARGET}" bash << 'EOF'
set -euo pipefail
cd /opt/juridico
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm \
  --entrypoint "" app \
  sh -c "npx prisma migrate deploy && echo 'Migrations OK'"
EOF

ok "Redeploy concluído"
