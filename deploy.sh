#!/usr/bin/env bash
# =================================================================
# deploy.sh — Deploy completo no VPS
# Uso: bash deploy.sh
#
# Pré-requisitos (local):
#   - rsync instalado  (Windows: use WSL ou Git Bash)
#   - Acesso SSH configurado: ssh root@82.25.79.50
#   - .env.production preenchido na raiz do projeto
#
# O que faz:
#   1. Valida pré-requisitos locais
#   2. Verifica se .env.production está preenchido
#   3. Configura o domínio no nginx/app.conf
#   4. Sincroniza código para o VPS via rsync
#   5. No VPS: instala Docker Compose v2 se necessário
#   6. Emite certificado SSL (Let's Encrypt) se necessário
#   7. Build e sobe todos os containers
#   8. Roda migrations do Prisma
# =================================================================

set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────
VPS_IP="82.25.79.50"
VPS_USER="root"
VPS_DIR="/opt/juridico"
SSH_TARGET="${VPS_USER}@${VPS_IP}"
COMPOSE_FILE="docker-compose.prod.yml"
# --env-file garante que ${DB_USER}, ${REDIS_PASSWORD}, etc. sejam lidos
# pelo Docker Compose para interpolar o YAML (além do env_file por serviço)
COMPOSE_CMD="docker compose --env-file .env.production -f ${COMPOSE_FILE}"

# ── Cores ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[✔]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
fail() { echo -e "${RED}[✘]${NC} $*"; exit 1; }

# ── Banner ────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║   Sistema Jurídico ADV — Deploy para VPS     ║"
echo "║   Target: ${VPS_USER}@${VPS_IP}                  ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Pré-requisitos locais ──────────────────────────────────────
log "Verificando pré-requisitos locais..."

command -v rsync >/dev/null 2>&1 || fail "rsync não encontrado. No Windows use WSL ou Git Bash com rsync."
command -v ssh   >/dev/null 2>&1 || fail "ssh não encontrado."

# Testar conexão SSH
ssh -o ConnectTimeout=5 -o BatchMode=yes "${SSH_TARGET}" "echo ok" >/dev/null 2>&1 \
  || fail "Não foi possível conectar ao VPS via SSH. Verifique: ssh ${SSH_TARGET}"
ok "Conexão SSH OK"

# ── 2. Validar .env.production ────────────────────────────────────
log "Verificando .env.production..."

[ -f ".env.production" ] || fail ".env.production não encontrado. Copie .env.production.example e preencha os valores."

# Checar placeholders não substituídos
if grep -qE "TROQUE_POR|SEU_DOMINIO|GERE_UM_SEGREDO|ALTERE_PARA" .env.production 2>/dev/null; then
  fail ".env.production ainda tem placeholders. Edite o arquivo antes de continuar."
fi

# Ler domínio do .env.production
DOMAIN=$(grep "^NEXT_PUBLIC_APP_URL=" .env.production \
  | sed 's/NEXT_PUBLIC_APP_URL=//' \
  | sed 's|https\?://||' \
  | sed 's|/.*||' \
  | tr -d '"' | tr -d "'" | tr -d ' ')

[ -n "${DOMAIN}" ] || fail "NEXT_PUBLIC_APP_URL não definido em .env.production"

# Ler e-mail para certbot (do SMTP_USER ou prompt)
EMAIL=$(grep "^SMTP_USER=" .env.production | sed 's/SMTP_USER=//' | tr -d '"' | tr -d "'")
if [ -z "${EMAIL}" ]; then
  echo -n "  Digite seu e-mail para o Let's Encrypt (notificações de cert): "
  read -r EMAIL
fi
[ -n "${EMAIL}" ] || fail "E-mail obrigatório para emissão do certificado SSL."

ok ".env.production OK — Domínio: ${DOMAIN} | E-mail: ${EMAIL}"

# ── 3. Configurar nginx com o domínio real ────────────────────────
log "Configurando nginx/app.conf para domínio: ${DOMAIN}..."

if grep -q "SEU_DOMINIO" nginx/app.conf; then
  # Substituir placeholder pelo domínio real
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/SEU_DOMINIO\.com\.br/${DOMAIN}/g" nginx/app.conf
  else
    sed -i "s/SEU_DOMINIO\.com\.br/${DOMAIN}/g" nginx/app.conf
  fi
  ok "nginx/app.conf configurado para: ${DOMAIN}"
else
  ok "nginx/app.conf já configurado para: ${DOMAIN}"
fi

# ── 4. Sincronizar código para o VPS ─────────────────────────────
log "Sincronizando código para ${SSH_TARGET}:${VPS_DIR} ..."

ssh "${SSH_TARGET}" "mkdir -p ${VPS_DIR}"

rsync -az --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.development' \
  --exclude='.env.vercel.example' \
  --exclude='.env.worker.example' \
  --exclude='public/uploads' \
  --exclude='coverage' \
  --exclude='tmp' \
  --exclude='.agent' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --info=progress2 \
  ./ "${SSH_TARGET}:${VPS_DIR}/"

ok "Código sincronizado"

# ── 5. Enviar .env.production separadamente ───────────────────────
log "Enviando .env.production..."
scp .env.production "${SSH_TARGET}:${VPS_DIR}/.env.production"
ok ".env.production enviado"

# ── 6. Setup no VPS ───────────────────────────────────────────────
log "Executando setup no VPS..."

ssh "${SSH_TARGET}" bash << 'REMOTE_EOF'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "[vps] Atualizando apt..."
apt-get update -qq

# Docker Compose plugin
if ! docker compose version >/dev/null 2>&1; then
  echo "[vps] Instalando Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
fi
echo "[vps] Docker Compose: $(docker compose version --short)"

# certbot
if ! command -v certbot >/dev/null 2>&1; then
  echo "[vps] Instalando certbot..."
  apt-get install -y -qq certbot
fi
echo "[vps] certbot: $(certbot --version 2>&1 | head -1)"

# Diretórios
mkdir -p /var/www/certbot /etc/letsencrypt

echo "[vps] Setup concluído"
REMOTE_EOF

ok "Setup do VPS concluído"

# ── 7. SSL — emitir certificado se não existir ───────────────────
log "Verificando certificado SSL para ${DOMAIN}..."

CERT_EXISTS=$(ssh "${SSH_TARGET}" "[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ] && echo yes || echo no" 2>/dev/null)

if [ "${CERT_EXISTS}" = "no" ]; then
  warn "Certificado SSL não encontrado. Emitindo via Let's Encrypt..."
  warn "ATENÇÃO: porta 80 de ${DOMAIN} precisa apontar para ${VPS_IP}"

  ssh "${SSH_TARGET}" bash << CERT_EOF
set -euo pipefail

# Parar nginx/apache que possam estar na porta 80
systemctl stop nginx apache2 2>/dev/null || true
# Parar containers que usem porta 80
docker ps -q --filter "publish=80" | xargs -r docker stop 2>/dev/null || true

sleep 2

# Nginx temporário para desafio ACME
docker run -d --name nginx_acme_tmp \
  -p 80:80 \
  -v /var/www/certbot:/var/www/certbot \
  nginx:1.27-alpine \
  sh -c 'echo "server { listen 80; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 ok; } }" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

sleep 5

# Emitir certificado
certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email ${EMAIL} \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  -d ${DOMAIN} \
  -d www.${DOMAIN}

# Derrubar nginx temporário
docker stop nginx_acme_tmp && docker rm nginx_acme_tmp || true

echo "[vps] Certificado SSL emitido com sucesso para ${DOMAIN}"
CERT_EOF

  ok "Certificado SSL emitido para ${DOMAIN}"
else
  ok "Certificado SSL já existe para ${DOMAIN}"
fi

# ── 8. Build das imagens ──────────────────────────────────────────
log "Fazendo build das imagens Docker (pode demorar 5–15 min na 1ª vez)..."

ssh "${SSH_TARGET}" bash << BUILD_EOF
set -euo pipefail
cd ${VPS_DIR}

# Pull imagens base em paralelo para acelerar
docker pull node:20-alpine &
docker pull postgres:16-alpine &
docker pull redis:7-alpine &
docker pull nginx:1.27-alpine &
docker pull certbot/certbot:latest &
wait

# Build das imagens da aplicação
docker compose --env-file .env.production -f ${COMPOSE_FILE} build --parallel
echo "[vps] Build concluído"
BUILD_EOF

ok "Build concluído"

# ── 9. Iniciar serviços ───────────────────────────────────────────
log "Iniciando todos os serviços..."

ssh "${SSH_TARGET}" bash << START_EOF
set -euo pipefail
cd ${VPS_DIR}

# Parar containers anteriores (zero-downtime não é necessário aqui)
docker compose --env-file .env.production -f ${COMPOSE_FILE} down --remove-orphans 2>/dev/null || true

# Subir tudo
docker compose --env-file .env.production -f ${COMPOSE_FILE} up -d

echo "[vps] Serviços iniciados"
docker compose --env-file .env.production -f ${COMPOSE_FILE} ps
START_EOF

ok "Serviços iniciados"

# ── 10. Migrations do banco ───────────────────────────────────────
log "Aguardando banco de dados ficar pronto (15s)..."
sleep 15

log "Executando migrations do Prisma..."

ssh "${SSH_TARGET}" bash << MIGRATE_EOF
set -euo pipefail
cd ${VPS_DIR}

# Aguardar o postgres estar healthy
echo "[vps] Aguardando postgres..."
for i in \$(seq 1 24); do
  STATUS=\$(docker inspect --format='{{.State.Health.Status}}' juridico-db 2>/dev/null || echo "starting")
  [ "\${STATUS}" = "healthy" ] && break
  echo "  postgres status: \${STATUS} (tentativa \${i}/24)"
  [ \$i -eq 24 ] && echo "[!] Timeout aguardando postgres" && exit 1
  sleep 5
done
echo "[vps] postgres pronto"

# Rodar migrate deploy
docker compose --env-file .env.production -f ${COMPOSE_FILE} run --rm \
  --entrypoint "" \
  app \
  sh -c "npx prisma migrate deploy && echo '[vps] Migrations OK'"
MIGRATE_EOF

ok "Migrations executadas"

# ── 11. Status final ──────────────────────────────────────────────
log "Status dos containers:"
ssh "${SSH_TARGET}" "cd ${VPS_DIR} && docker compose --env-file .env.production -f ${COMPOSE_FILE} ps"

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   Deploy concluído com sucesso!              ║${NC}"
echo -e "${GREEN}${BOLD}║   URL: https://${DOMAIN}${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Comandos úteis no VPS:${NC}  ssh ${SSH_TARGET}  &&  cd ${VPS_DIR}"
echo "  docker compose --env-file .env.production -f ${COMPOSE_FILE} logs -f app"
echo "  docker compose --env-file .env.production -f ${COMPOSE_FILE} logs -f worker"
echo "  docker compose --env-file .env.production -f ${COMPOSE_FILE} restart app"
echo "  docker compose --env-file .env.production -f ${COMPOSE_FILE} down"
echo ""
echo -e "${YELLOW}Para redeploys rápidos (sem rebuild):${NC}"
echo "  bash redeploy.sh"
echo ""
