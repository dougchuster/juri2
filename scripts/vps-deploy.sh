#!/bin/bash
# =============================================================================
# VPS-DEPLOY.SH — Deploy completo do zero na VPS
# Execute: bash /tmp/vps-deploy.sh   (antes de ter o projeto clonado)
#    OU:   bash /var/www/sistema-juridico/scripts/vps-deploy.sh
#
# O script detecta se é primeira instalação ou atualização.
# =============================================================================

set -e  # Para se qualquer comando falhar

# ─── CONFIGURAÇÕES ───────────────────────────────────────────────────────────
APP_DIR="/var/www/sistema-juridico"
REPO_URL="https://github.com/dougchuster/sistema_juridico.git"
BRANCH="main"
NODE_VERSION="20"
DB_NAME="sistema_juridico"
DB_USER="juridico"
DB_PASS="juridico123"
DUMP_FILE="/tmp/db_backup_deploy.dump"
PM2_LOG_DIR="/var/log/pm2"

# Cor nos logs
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
echo -e "${CYAN}   SISTEMA JURIDICO ADV — DEPLOY VPS COMPLETO${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""

# ─── ETAPA 1: Dependências do sistema ────────────────────────────────────────
info "[1/9] Verificando dependências do sistema..."

# Atualizar apt
apt-get update -qq

# Node.js 20
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    info "Instalando Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    log "Node.js $(node -v) instalado"
else
    log "Node.js $(node -v) já instalado"
fi

# Git
if ! command -v git &>/dev/null; then
    apt-get install -y git
fi

# PM2
if ! command -v pm2 &>/dev/null; then
    info "Instalando PM2..."
    npm install -g pm2
    log "PM2 instalado"
else
    log "PM2 $(pm2 -v) já instalado"
fi

# Docker
if ! command -v docker &>/dev/null; then
    info "Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker instalado"
else
    log "Docker $(docker -v | cut -d' ' -f3 | tr -d ',') já instalado"
fi

# Docker Compose
if ! command -v docker compose &>/dev/null && ! command -v docker-compose &>/dev/null; then
    info "Instalando Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
    log "Docker Compose instalado"
else
    log "Docker Compose já instalado"
fi

# ─── ETAPA 2: Preparar diretório do app ──────────────────────────────────────
info "[2/9] Preparando diretório da aplicação..."

PRIMEIRA_VEZ=false
if [ ! -d "$APP_DIR/.git" ]; then
    PRIMEIRA_VEZ=true
    info "Primeira instalação — clonando repositório..."
    mkdir -p "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    log "Repositório clonado em $APP_DIR"
else
    info "Atualização — fazendo pull do repositório..."
    cd "$APP_DIR"
    # Parar serviços antes de atualizar
    pm2 stop all 2>/dev/null || true
    git fetch --all
    git reset --hard origin/$BRANCH
    log "Código atualizado para origin/$BRANCH"
fi

cd "$APP_DIR"

# ─── ETAPA 3: Subir serviços Docker (Postgres, Redis, Evolution) ─────────────
info "[3/9] Iniciando serviços Docker..."

# Ajustar webhook URL no docker-compose para funcionar no Linux
# host.docker.internal não funciona nativamente no Linux
HOST_IP=$(ip route get 1 | awk '{print $7; exit}')
if grep -q "host.docker.internal" docker-compose.yml; then
    sed -i "s|host.docker.internal|${HOST_IP}|g" docker-compose.yml
    warn "WEBHOOK_GLOBAL_URL ajustado de host.docker.internal para $HOST_IP"
fi

# Criar log dir
mkdir -p "$PM2_LOG_DIR"

# Subir containers
docker compose up -d postgres redis
log "Postgres e Redis iniciados"

# Aguardar Postgres ficar pronto
info "Aguardando PostgreSQL ficar pronto..."
for i in {1..30}; do
    if docker exec sistema-juridico-db pg_isready -U "$DB_USER" &>/dev/null; then
        log "PostgreSQL pronto"
        break
    fi
    sleep 2
done

# ─── ETAPA 4: Banco de dados ──────────────────────────────────────────────────
info "[4/9] Configurando banco de dados..."

if [ -f "$DUMP_FILE" ]; then
    info "Restaurando dump do banco (enviado pelo prepare-deploy.ps1)..."

    # Criar user/banco se necessário
    docker exec sistema-juridico-db psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
    docker exec sistema-juridico-db psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
    docker exec sistema-juridico-db psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
    docker exec sistema-juridico-db psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

    # Copiar dump para dentro do container e restaurar
    docker cp "$DUMP_FILE" sistema-juridico-db:/tmp/db_backup.dump
    docker exec sistema-juridico-db pg_restore -U "$DB_USER" -d "$DB_NAME" -F c /tmp/db_backup.dump || warn "Alguns erros na restauração são normais (objetos já existentes)"
    docker exec sistema-juridico-db rm /tmp/db_backup.dump
    rm -f "$DUMP_FILE"
    log "Banco restaurado do dump"
else
    warn "Dump não encontrado em $DUMP_FILE — rodando migrations do zero"
    warn "Execute prepare-deploy.ps1 localmente para enviar o banco com dados reais"

    # Criar banco vazio e rodar migrations
    docker exec sistema-juridico-db psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
    docker exec sistema-juridico-db psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
    docker exec sistema-juridico-db psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
fi

# ─── ETAPA 5: Arquivo .env ────────────────────────────────────────────────────
info "[5/9] Verificando .env..."

if [ ! -f "$APP_DIR/.env" ]; then
    warn ".env não encontrado! Crie o arquivo antes de continuar:"
    warn "  scp .env ${USER}@$(hostname -I | awk '{print $1}'):${APP_DIR}/.env"
    warn "Depois execute: bash $APP_DIR/scripts/vps-deploy.sh"
    echo ""
    echo "Variáveis mínimas necessárias:"
    echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
    echo "  BETTER_AUTH_SECRET=<chave_aleatoria>"
    echo "  BETTER_AUTH_URL=https://seudominio.com.br"
    echo "  NEXTAUTH_URL=https://seudominio.com.br"
    exit 1
fi

# Verificar variáveis críticas
if ! grep -q "DATABASE_URL" "$APP_DIR/.env"; then
    err "DATABASE_URL não encontrada no .env"
fi

log ".env encontrado e verificado"

# ─── ETAPA 6: Instalar dependências e build ───────────────────────────────────
info "[6/9] Instalando dependências npm..."
npm ci --prefer-offline 2>/dev/null || npm install
log "npm install concluído"

info "Gerando Prisma client..."
npx prisma generate
log "Prisma client gerado"

info "Aplicando migrations..."
npx prisma migrate deploy
log "Migrations aplicadas"

info "Buildando aplicação Next.js (pode demorar ~3 min)..."
npm run build
log "Build concluído"

# ─── ETAPA 7: Subir Evolution API ────────────────────────────────────────────
info "[7/9] Iniciando Evolution API..."
docker compose up -d evolution-api
log "Evolution API iniciada na porta 8080"

# ─── ETAPA 8: Iniciar app com PM2 ─────────────────────────────────────────────
info "[8/9] Iniciando aplicação com PM2..."

pm2 delete all 2>/dev/null || true
pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash 2>/dev/null || true
log "Aplicação iniciada com PM2"

# ─── ETAPA 9: Verificação ─────────────────────────────────────────────────────
info "[9/9] Verificando serviços..."

sleep 5

echo ""
echo -e "${CYAN}─── Status PM2 ───────────────────────────────${NC}"
pm2 status

echo ""
echo -e "${CYAN}─── Status Docker ────────────────────────────${NC}"
docker compose ps

echo ""
# Testar se app responde
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "307" ]; then
    log "Aplicação respondendo em http://localhost:3000 (HTTP $HTTP_CODE)"
else
    warn "Aplicação ainda não responde (HTTP $HTTP_CODE) — verifique os logs: pm2 logs sistema-juridico"
fi

# ─── Resumo final ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}   DEPLOY CONCLUÍDO!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo "Acesse: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Comandos úteis:"
echo "  pm2 logs sistema-juridico --lines 100   # logs do app"
echo "  pm2 logs sistema-juridico-worker         # logs do worker"
echo "  pm2 restart all                          # reiniciar tudo"
echo "  docker compose ps                        # status containers"
echo "  docker compose logs evolution-api        # logs evolution"
echo ""
echo "Para próximos deploys (só código):"
echo "  bash $APP_DIR/scripts/vps-update.sh"
echo ""
