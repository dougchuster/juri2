# Deploy Completo — Local → VPS (Do Zero)

> Leva **tudo**: código, banco de dados, uploads, configurações.
> Pré-requisito: você não se importa em perder o que está na VPS hoje.

---

## Arquitetura na VPS

```
VPS
├── Docker containers (postgres, redis, evolution-api)
├── PM2 processos
│   ├── sistema-juridico        → Next.js app (porta 3000)
│   └── sistema-juridico-worker → BullMQ worker
└── /var/www/sistema-juridico/  → código clonado do GitHub
```

---

## PASSO 1 — Commitar e fazer push (local, Windows)

```bash
# No terminal do projeto
git add -A
git commit -m "sua mensagem"
git push origin main
```

---

## PASSO 2 — Preparar e enviar banco + uploads (local, Windows PowerShell)

Execute o script `prepare-deploy.ps1` passando o IP da sua VPS:

```powershell
cd "C:\Users\dougc\Documents\Sistema Juridico ADV"

.\scripts\prepare-deploy.ps1 -VPS_IP "SEU_IP_AQUI" -VPS_USER "root"
```

**O script faz automaticamente:**
- Dump do banco PostgreSQL (via Docker local)
- Envia o dump para `/tmp/db_backup_deploy.dump` na VPS
- Sincroniza `public/uploads/` para a VPS
- Envia o `.env` para a VPS

> Requisito: ter `scp` disponível no PowerShell (instale OpenSSH ou use Git Bash)

---

## PASSO 3 — Executar deploy na VPS (via SSH)

```bash
# 1. Conectar na VPS
ssh root@SEU_IP

# 2. Baixar e executar o script de deploy
# Se for a primeira vez (sem o projeto clonado ainda):
curl -fsSL https://raw.githubusercontent.com/dougchuster/sistema_juridico/main/scripts/vps-deploy.sh | bash

# OU, se já tiver o projeto clonado:
bash /var/www/sistema-juridico/scripts/vps-deploy.sh
```

**O script `vps-deploy.sh` faz automaticamente:**
1. Instala Node.js 20, Docker, PM2 (se necessário)
2. Clona o repositório (ou atualiza se já existir)
3. Sobe Docker: postgres, redis
4. Restaura o dump do banco
5. Verifica o `.env`
6. `npm install` + `prisma generate` + `prisma migrate deploy`
7. `npm run build`
8. Sobe Evolution API via Docker
9. Inicia app + worker via PM2
10. Verifica se tudo está respondendo

---

## PASSO 4 — Ajustar .env na VPS

Após o deploy, edite o `.env` na VPS para ajustar as URLs:

```bash
nano /var/www/sistema-juridico/.env
```

Variáveis que **precisam mudar** do local para produção:

```env
# Banco (já aponta para localhost — OK)
DATABASE_URL="postgresql://juridico:juridico123@localhost:5432/sistema_juridico"

# URL da aplicação — MUDAR para domínio/IP real
BETTER_AUTH_URL="https://seudominio.com.br"
NEXTAUTH_URL="https://seudominio.com.br"

# Evolution API — MUDAR para IP/domínio da VPS
EVOLUTION_API_URL="http://SEU_IP:8080"

# Redis (já OK)
REDIS_URL="redis://localhost:6379"
```

Após editar o .env:
```bash
pm2 restart all
```

---

## Deploys futuros (só código, sem recriar banco)

```bash
# Na VPS
bash /var/www/sistema-juridico/scripts/vps-update.sh
```

Ou localmente, o script faz push + envia o update:
```bash
git push origin main
ssh root@SEU_IP "bash /var/www/sistema-juridico/scripts/vps-update.sh"
```

---

## Comandos úteis na VPS

```bash
# Status geral
pm2 status
docker compose -f /var/www/sistema-juridico/docker-compose.yml ps

# Logs
pm2 logs sistema-juridico --lines 100
pm2 logs sistema-juridico-worker --lines 50
docker compose -f /var/www/sistema-juridico/docker-compose.yml logs evolution-api

# Reiniciar
pm2 restart all

# Banco
docker exec -it sistema-juridico-db psql -U juridico -d sistema_juridico

# Parar tudo
pm2 stop all
docker compose -f /var/www/sistema-juridico/docker-compose.yml down
```

---

## Checklist do deploy

### Local (antes de começar)
- [ ] `git push origin main` feito com todas as mudanças
- [ ] Docker local rodando (para o pg_dump)
- [ ] `.\scripts\prepare-deploy.ps1 -VPS_IP "SEU_IP"` executado com sucesso

### VPS
- [ ] `bash vps-deploy.sh` executado sem erros
- [ ] `.env` ajustado com URLs de produção
- [ ] `pm2 restart all` feito após ajustar .env
- [ ] `pm2 status` mostra app + worker como `online`
- [ ] `docker compose ps` mostra postgres, redis, evolution como `Up`
- [ ] Acesso pelo browser funcionando
- [ ] Login funcionando
- [ ] WhatsApp / Evolution API conectando

---

## Arquivos criados neste deploy

| Arquivo | Descrição |
|---------|-----------|
| `scripts/prepare-deploy.ps1` | Script Windows para preparar e enviar tudo à VPS |
| `scripts/vps-deploy.sh` | Script VPS para deploy completo do zero |
| `scripts/vps-update.sh` | Script VPS para updates rápidos de código |
| `ecosystem.config.js` | Configuração PM2 (app + worker) |
