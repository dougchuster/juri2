# =============================================================================
# PREPARE-DEPLOY.PS1
# Script local (Windows) - prepara dump e uploads para a VPS
# Execute: .\scripts\prepare-deploy.ps1 -VPS_IP "187.77.255.211" -VPS_USER "root"
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$VPS_IP,

    [Parameter(Mandatory=$false)]
    [string]$VPS_USER = "root",

    [Parameter(Mandatory=$false)]
    [int]$VPS_PORT = 22,

    [Parameter(Mandatory=$false)]
    [string]$VPS_PATH = "/var/www/adv"
)

$PROJECT_DIR = "C:\Users\dougc\Documents\Sistema Juridico ADV"
$PG_DUMP = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
$DUMP_FILE = "$PROJECT_DIR\backups\db_backup_deploy.dump"
$SSH_TARGET = "${VPS_USER}@${VPS_IP}"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SISTEMA JURIDICO ADV - PREPARE DEPLOY" -ForegroundColor Cyan
Write-Host "  VPS: $SSH_TARGET:$VPS_PATH" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "$PROJECT_DIR\backups" | Out-Null

# -------------------------------------------------------------------------
# ETAPA 1 - Dump do banco de dados
# -------------------------------------------------------------------------
Write-Host "`n[1/4] Gerando dump do banco PostgreSQL..." -ForegroundColor Yellow

$dockerDump = docker exec sistema-juridico-db pg_dump -U juridico -d sistema_juridico -F c 2>$null
if ($LASTEXITCODE -eq 0) {
    docker exec sistema-juridico-db pg_dump -U juridico -d sistema_juridico -F c | Set-Content -Path $DUMP_FILE -Encoding Byte
    Write-Host "  OK: Dump via Docker" -ForegroundColor Green
} elseif (Test-Path $PG_DUMP) {
    & $PG_DUMP -U juridico -h localhost -p 5432 -d sistema_juridico -F c -f $DUMP_FILE
    Write-Host "  OK: Dump via pg_dump local" -ForegroundColor Green
} else {
    Write-Host "  ERRO: Docker indisponivel e pg_dump nao encontrado em $PG_DUMP" -ForegroundColor Red
    exit 1
}

$dumpSize = (Get-Item $DUMP_FILE).Length / 1MB
Write-Host "  Tamanho do dump: $([math]::Round($dumpSize, 2)) MB" -ForegroundColor Gray

# -------------------------------------------------------------------------
# ETAPA 2 - Enviar dump para VPS
# -------------------------------------------------------------------------
Write-Host "`n[2/4] Enviando dump para VPS..." -ForegroundColor Yellow
scp -P $VPS_PORT $DUMP_FILE "${SSH_TARGET}:/tmp/db_backup_deploy.dump"
if ($LASTEXITCODE -ne 0) { Write-Host "  ERRO ao enviar dump" -ForegroundColor Red; exit 1 }
Write-Host "  OK: Dump enviado" -ForegroundColor Green

# -------------------------------------------------------------------------
# ETAPA 3 - Enviar uploads
# -------------------------------------------------------------------------
Write-Host "`n[3/4] Sincronizando uploads..." -ForegroundColor Yellow
$uploadsDir = "$PROJECT_DIR\public\uploads"
if (Test-Path $uploadsDir) {
    scp -P $VPS_PORT -r $uploadsDir "${SSH_TARGET}:${VPS_PATH}/public/"
    if ($LASTEXITCODE -ne 0) { Write-Host "  ERRO ao enviar uploads" -ForegroundColor Red; exit 1 }
    Write-Host "  OK: Uploads sincronizados" -ForegroundColor Green
} else {
    Write-Host "  Pasta uploads nao encontrada, pulando..." -ForegroundColor Yellow
}

# -------------------------------------------------------------------------
# ETAPA 4 - Preservar .env.production remoto
# -------------------------------------------------------------------------
Write-Host "`n[4/4] Preservando .env.production da VPS..." -ForegroundColor Yellow
Write-Host "  Este script nao envia mais o .env de desenvolvimento para producao." -ForegroundColor Yellow
Write-Host "  Revise o .env.production diretamente no servidor antes do deploy." -ForegroundColor Yellow

# -------------------------------------------------------------------------
# Resumo
# -------------------------------------------------------------------------
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  PREPARACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximo passo - execute na VPS:" -ForegroundColor White
Write-Host "  ssh ${SSH_TARGET}" -ForegroundColor Gray
Write-Host "  bash ${VPS_PATH}/scripts/vps-deploy.sh" -ForegroundColor Gray
Write-Host ""
