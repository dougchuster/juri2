#!/usr/bin/env bash
# =================================================================
# vps-setup.sh — Rodar DIRETAMENTE no VPS como root
# cd /var/www/adv && bash vps-setup.sh
# =================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "\n${BLUE}━━━━ $* ${NC}"; }
ok()   { echo -e "${GREEN}[✔] $*${NC}"; }
warn() { echo -e "${YELLOW}[!] $*${NC}"; }
fail() { echo -e "${RED}[✘] $*${NC}"; exit 1; }
ask()  { echo -e "${YELLOW}>>> $*${NC}"; }

DOMAIN="adv.chuster.com.br"
APP_DIR="/var/www/adv"
COMPOSE_CMD="docker compose --env-file .env.production -f docker-compose.prod.yml"

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════╗"
echo "║  Sistema Jurídico ADV — Setup VPS Automatizado  ║"
echo "║  Domínio: adv.chuster.com.br                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

cd "$APP_DIR" || fail "Diretório $APP_DIR não encontrado. Rode: git clone ... /var/www/adv"

# ══════════════════════════════════════════════════════════════════
# PASSO 1 — Verificar DNS
# ══════════════════════════════════════════════════════════════════
log "1/8 Verificando DNS para $DOMAIN"

VPS_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
DNS_IP=$(dig +short "$DOMAIN" 2>/dev/null | head -1)

echo "  IP do VPS : $VPS_IP"
echo "  IP no DNS : ${DNS_IP:-'(não resolvido)'}"

if [ "${DNS_IP}" != "${VPS_IP}" ]; then
  warn "DNS ainda não aponta para este servidor."
  warn "Adicione no seu registrador:  A  adv  $VPS_IP"
  warn ""
  ask "Deseja continuar mesmo assim? O SSL falhará se o DNS não estiver propagado."
  ask "Digite 'sim' para continuar ou pressione Ctrl+C para cancelar:"
  read -r CONFIRM
  [[ "$CONFIRM" == "sim" ]] || fail "Abortado. Configure o DNS e rode novamente."
else
  ok "DNS OK — $DOMAIN → $VPS_IP"
fi

# ══════════════════════════════════════════════════════════════════
# PASSO 2 — Instalar dependências
# ══════════════════════════════════════════════════════════════════
log "2/8 Instalando dependências do sistema"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

# Docker Compose plugin
if ! docker compose version >/dev/null 2>&1; then
  echo "  Instalando docker-compose-plugin..."
  apt-get install -y -qq docker-compose-plugin
fi
ok "Docker: $(docker --version | grep -o 'Docker version [^,]*')"
ok "Compose: $(docker compose version --short)"

# certbot
if ! command -v certbot >/dev/null 2>&1; then
  echo "  Instalando certbot..."
  apt-get install -y -qq certbot
fi
ok "certbot: $(certbot --version 2>&1)"

# dnsutils (dig)
command -v dig >/dev/null 2>&1 || apt-get install -y -qq dnsutils

# ══════════════════════════════════════════════════════════════════
# PASSO 3 — Criar .env.production
# ══════════════════════════════════════════════════════════════════
log "3/8 Configurando .env.production"

if [ -f .env.production ] && ! grep -qE "TROQUE_POR|SEU_DOMINIO|GERE_UM_SEGREDO|ALTERE_PARA" .env.production 2>/dev/null; then
  ok ".env.production já configurado — pulando geração"
else
  echo "  Gerando senhas e segredos..."

  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')
  REDIS_PASS=$(openssl rand -base64 24 | tr -d '/+=')
  AUTH_SECRET=$(openssl rand -base64 32)
  PORTAL_SECRET=$(openssl rand -base64 32)

  cat > .env.production << ENV
# =============================================================
# PRODUÇÃO — gerado automaticamente pelo vps-setup.sh
# =============================================================

# Postgres
DB_USER=juridico
DB_PASSWORD=${DB_PASS}
DB_NAME=sistema_juridico

# Redis
REDIS_PASSWORD=${REDIS_PASS}

# URLs internas Docker (não alterar os hosts)
DATABASE_URL="postgresql://juridico:${DB_PASS}@postgres:5432/sistema_juridico"
REDIS_URL="redis://:${REDIS_PASS}@redis:6379"

# App
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NEXT_PUBLIC_APP_NAME="Sistema Jurídico ADV"

# Auth
BETTER_AUTH_SECRET="${AUTH_SECRET}"
BETTER_AUTH_URL="https://${DOMAIN}"

# Email (configure depois)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="Sistema Jurídico <noreply@chuster.com.br>"

# IA
GEMINI_API_KEY=""

# CNJ DataJud
DATAJUD_API_KEY=""
DATAJUD_ALIASES_URL=""
DATAJUD_ACCESS_URL="https://datajud-wiki.cnj.jus.br/api-publica/acesso/"
DATAJUD_ENDPOINTS_URL="https://datajud-wiki.cnj.jus.br/api-publica/endpoints/"
DATAJUD_MONITOR_ENABLED="true"
DATAJUD_MONITOR_TIMEOUT_MS="15000"
DATAJUD_ALIASES_ENABLED="true"

# Cron (habilitar na VPS)
CRON_SECRET=""
JOBS_SECRET_KEY=""
CRON_ENABLED="true"

# WhatsApp
ENABLE_WHATSAPP_RUNTIME="true"
EVOLUTION_WEBHOOK_SECRET=""

# Google Calendar
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Microsoft Outlook
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_TENANT_ID="common"

# Asaas
ASAAS_API_KEY=""
ASAAS_ENV="production"

# ClickSign
CLICKSIGN_ACCESS_TOKEN=""
CLICKSIGN_ENV="production"

# Portal do Cliente
PORTAL_TOKEN_SECRET="${PORTAL_SECRET}"
ENV

  ok ".env.production criado"
  echo ""
  echo -e "${YELLOW}  ┌─ GUARDE ESTAS CREDENCIAIS ───────────────────────┐${NC}"
  echo -e "${YELLOW}  │ DB_PASSWORD:       ${DB_PASS}${NC}"
  echo -e "${YELLOW}  │ REDIS_PASSWORD:    ${REDIS_PASS}${NC}"
  echo -e "${YELLOW}  │ BETTER_AUTH_SECRET: (salvo em .env.production)   │${NC}"
  echo -e "${YELLOW}  └───────────────────────────────────────────────────┘${NC}"
  echo ""
fi

# ══════════════════════════════════════════════════════════════════
# PASSO 4 — Configurar nginx
# ══════════════════════════════════════════════════════════════════
log "4/8 Configurando nginx para $DOMAIN"

if grep -q "SEU_DOMINIO" nginx/app.conf 2>/dev/null; then
  sed -i "s/SEU_DOMINIO\.com\.br/${DOMAIN}/g" nginx/app.conf
  ok "nginx/app.conf atualizado"
else
  ok "nginx/app.conf já configurado"
fi

# Remover www do subdomínio (www.adv.chuster.com.br não faz sentido)
sed -i "s/server_name ${DOMAIN} www\.${DOMAIN};/server_name ${DOMAIN};/g" nginx/app.conf
# Certificado só do subdomínio
sed -i "s|-d ${DOMAIN} -d www\.${DOMAIN}|-d ${DOMAIN}|g" nginx/app.conf 2>/dev/null || true

grep "server_name" nginx/app.conf | head -4

# ══════════════════════════════════════════════════════════════════
# PASSO 5 — Emitir certificado SSL
# ══════════════════════════════════════════════════════════════════
log "5/8 Certificado SSL (Let's Encrypt)"

mkdir -p /var/www/certbot

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  ok "Certificado já existe para $DOMAIN"
else
  echo "  Subindo nginx temporário para desafio ACME..."

  # Parar qualquer coisa na porta 80
  systemctl stop nginx apache2 2>/dev/null || true
  docker ps -q --filter "publish=80" | xargs -r docker stop 2>/dev/null || true
  sleep 2

  # Nginx temporário
  docker run -d --name acme_tmp \
    -p 80:80 \
    -v /var/www/certbot:/var/www/certbot \
    nginx:alpine \
    sh -c 'printf "server{\nlisten 80;\nlocation /.well-known/acme-challenge/{\nroot /var/www/certbot;\ntry_files \$uri =404;\n}\nlocation /{\nreturn 200 ok;\n}\n}" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

  sleep 5

  # Pegar e-mail do env ou usar padrão
  CERT_EMAIL=$(grep "^SMTP_USER=" .env.production | tr -d '"' | cut -d= -f2)
  [ -z "$CERT_EMAIL" ] && CERT_EMAIL="admin@chuster.com.br"

  echo "  Emitindo certificado para $DOMAIN (e-mail: $CERT_EMAIL)..."
  certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$CERT_EMAIL" \
    --agree-tos --no-eff-email --non-interactive \
    -d "$DOMAIN" \
    || { docker stop acme_tmp; docker rm acme_tmp; fail "Falha ao emitir certificado. Verifique se o DNS aponta para este servidor."; }

  docker stop acme_tmp && docker rm acme_tmp
  ok "Certificado SSL emitido com sucesso"
fi

ls -la "/etc/letsencrypt/live/${DOMAIN}/"

# ══════════════════════════════════════════════════════════════════
# PASSO 6 — Build das imagens Docker
# ══════════════════════════════════════════════════════════════════
log "6/8 Build das imagens Docker (5–15 min na 1ª vez)"

echo "  Fazendo pull das imagens base em paralelo..."
docker pull node:20-alpine &
docker pull postgres:16-alpine &
docker pull redis:7-alpine &
docker pull nginx:1.27-alpine &
docker pull certbot/certbot:latest &
wait
ok "Imagens base baixadas"

echo "  Buildando app e worker..."
$COMPOSE_CMD build --parallel
ok "Build concluído"

# ══════════════════════════════════════════════════════════════════
# PASSO 7 — Subir todos os containers
# ══════════════════════════════════════════════════════════════════
log "7/8 Iniciando containers"

$COMPOSE_CMD down --remove-orphans 2>/dev/null || true
$COMPOSE_CMD up -d

echo ""
$COMPOSE_CMD ps
echo ""

# Aguardar app ficar healthy
echo "  Aguardando app inicializar (pode levar ~90s)..."
for i in $(seq 1 36); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' juridico-app 2>/dev/null || echo "starting")
  printf "\r  Status: %-12s (tentativa %d/36)" "$STATUS" "$i"
  [ "$STATUS" = "healthy" ] && break
  sleep 5
done
echo ""
ok "App iniciado"

# ══════════════════════════════════════════════════════════════════
# PASSO 8 — Migrations do banco
# ══════════════════════════════════════════════════════════════════
log "8/8 Migrations do banco de dados"

echo "  Aguardando PostgreSQL..."
for i in $(seq 1 24); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' juridico-db 2>/dev/null || echo "starting")
  [ "$STATUS" = "healthy" ] && break
  printf "\r  PostgreSQL: %-12s (%d/24)" "$STATUS" "$i"
  sleep 5
done
echo ""

$COMPOSE_CMD run --rm --entrypoint "" app \
  sh -c "npx prisma migrate deploy && echo 'Migrations OK'"

ok "Migrations executadas"

# ══════════════════════════════════════════════════════════════════
# RESULTADO FINAL
# ══════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║        Deploy concluído com sucesso!                 ║${NC}"
echo -e "${GREEN}${BOLD}║                                                      ║${NC}"
echo -e "${GREEN}${BOLD}║  URL: https://adv.chuster.com.br                     ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Comandos úteis:${NC}"
echo "  $COMPOSE_CMD logs -f app       # logs em tempo real"
echo "  $COMPOSE_CMD logs -f worker    # logs do worker"
echo "  $COMPOSE_CMD ps                # status"
echo "  $COMPOSE_CMD restart app       # reiniciar app"
echo ""
echo -e "${YELLOW}Arquivo de configuração:${NC} $APP_DIR/.env.production"
echo -e "${YELLOW}Para configurar APIs (Gemini, etc):${NC} nano $APP_DIR/.env.production"
echo "  Após editar: $COMPOSE_CMD restart app"
echo ""
