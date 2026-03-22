# =============================================================================
# PREPARE-DEPLOY.PS1
# Script local (Windows) — prepara tudo para enviar à VPS
# Execute: .\scripts\prepare-deploy.ps1 -VPS_IP "SEU_IP" -VPS_USER "root"
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$VPS_IP,

    [Parameter(Mandatory=$false)]
    [string]$VPS_USER = "root",

    [Parameter(Mandatory=$false)]
    [int]$VPS_PORT = 22,

    [Parameter(Mandatory=$false)]
    [string]$VPS_PATH = "/var/www/sistema-juridico"
)

$PROJECT_DIR = "C:\Users\dougc\Documents\Sistema Juridico ADV"
$PG_DUMP = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
$DUMP_FILE = "$PROJECT_DIR\backups\db_backup_deploy.dump"
$SSH_TARGET = "${VPS_USER}@${VPS_IP}"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SISTEMA JURIDICO ADV — PREPARE DEPLOY" -ForegroundColor Cyan
Write-Host "  VPS: $SSH_TARGET:$VPS_PATH" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Criar pasta backups se não existir
New-Item -ItemType Directory -Force -Path "$PROJECT_DIR\backups" | Out-Null

# -------------------------------------------------------------------------
# ETAPA 1 — Dump do banco de dados (via Docker)
# -------------------------------------------------------------------------
Write-Host "`n[1/4] Gerando dump do banco PostgreSQL..." -ForegroundColor Yellow

# Tenta pelo Docker primeiro (banco local roda em container)
$dockerDump = docker exec sistema-juridico-db pg_dump -U juridico -d sistema_juridico -F c 2>$null
if ($LASTEXITCODE -eq 0) {
    docker exec sistema-juridico-db pg_dump -U juridico -d sistema_juridico -F c | Set-Content -Path $DUMP_FILE -Encoding Byte
    Write-Host "  ✓ Dump via Docker OK" -ForegroundColor Green
} elseif (Test-Path $PG_DUMP) {
    & $PG_DUMP -U juridico -h localhost -p 5432 -d sistema_juridico -F c -f $DUMP_FILE
    Write-Host "  ✓ Dump via pg_dump local OK" -ForegroundColor Green
} else {
    Write-Host "  ✗ ERRO: Docker container não encontrado e pg_dump não está em $PG_DUMP" -ForegroundColor Red
    Write-Host "    Instale PostgreSQL 16 ou suba o Docker antes de rodar este script." -ForegroundColor Red
    exit 1
}

$dumpSize = (Get-Item $DUMP_FILE).Length / 1MB
Write-Host "  Tamanho do dump: $([math]::Round($dumpSize, 2)) MB" -ForegroundColor Gray

# -------------------------------------------------------------------------
# ETAPA 2 — Enviar dump para VPS
# -------------------------------------------------------------------------
Write-Host "`n[2/4] Enviando dump para VPS..." -ForegroundColor Yellow
scp -P $VPS_PORT $DUMP_FILE "${SSH_TARGET}:/tmp/db_backup_deploy.dump"
if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ ERRO ao enviar dump" -ForegroundColor Red; exit 1 }
Write-Host "  ✓ Dump enviado para /tmp/db_backup_deploy.dump" -ForegroundColor Green

# -------------------------------------------------------------------------
# ETAPA 3 — Enviar uploads (fotos, documentos, PDFs)
# -------------------------------------------------------------------------
Write-Host "`n[3/4] Sincronizando uploads..." -ForegroundColor Yellow
$uploadsDir = "$PROJECT_DIR\public\uploads"
if (Test-Path $uploadsDir) {
    scp -P $VPS_PORT -r $uploadsDir "${SSH_TARGET}:${VPS_PATH}/public/"
    if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ ERRO ao enviar uploads" -ForegroundColor Red; exit 1 }
    Write-Host "  ✓ Uploads sincronizados" -ForegroundColor Green
} else {
    Write-Host "  ! Pasta uploads não encontrada, pulando..." -ForegroundColor Yellow
}

# -------------------------------------------------------------------------
# ETAPA 4 — Enviar .env
# -------------------------------------------------------------------------
Write-Host "`n[4/4] Enviando arquivo .env..." -ForegroundColor Yellow
$envFile = "$PROJECT_DIR\.env"
if (Test-Path $envFile) {
    scp -P $VPS_PORT $envFile "${SSH_TARGET}:${VPS_PATH}/.env"
    if ($LASTEXITCODE -ne 0) { Write-Host "  ✗ ERRO ao enviar .env" -ForegroundColor Red; exit 1 }
    Write-Host "  ✓ .env enviado" -ForegroundColor Green
    Write-Host "  ! IMPORTANTE: Edite o .env na VPS e ajuste as URLs para o domínio/IP da VPS" -ForegroundColor Yellow
} else {
    Write-Host "  ✗ ERRO: arquivo .env não encontrado em $envFile" -ForegroundColor Red
    exit 1
}

# -------------------------------------------------------------------------
# Resumo
# -------------------------------------------------------------------------
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  PREPARAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximo passo — execute na VPS:" -ForegroundColor White
Write-Host "  ssh ${SSH_TARGET}" -ForegroundColor Gray
Write-Host "  bash ${VPS_PATH}/scripts/vps-deploy.sh" -ForegroundColor Gray
Write-Host ""
