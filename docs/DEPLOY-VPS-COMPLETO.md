# 🚀 Deploy Completo — Local → VPS

> Transfere **tudo**: código, banco de dados, uploads e configurações.
> Pré-requisito: você não se importa em perder o que está na VPS hoje.

---

## 📋 Informações do seu ambiente local

| Item | Valor |
|------|-------|
| Banco local | `postgresql://juridico:juridico123@localhost:5432/sistema_juridico` |
| Uploads | `public/uploads/` (chat-interno, comunicacao, documentos, funcionarios, imgs, whatsapp) |
| Start | `npm start` (ts-node server.ts) + worker separado |
| Build | `npm run build` |

---

## ETAPA 1 — Commitar tudo localmente

Execute no terminal do projeto (Windows):

```bash
cd "C:/Users/dougc/Documents/Sistema Juridico ADV"

git add -A

git commit -m "feat: timeline unificada, CRM melhorado, chat interno, automações, seed Douglas, correções gerais"

git push origin main
```

---

## ETAPA 2 — Preparar a VPS (execute via SSH)

### 2.1 — Parar tudo que está rodando
```bash
pm2 delete all
# ou se usar systemd:
# systemctl stop sistema-juridico
```

### 2.2 — Instalar dependências do sistema (se necessário)
```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL (se não tiver)
sudo apt-get install -y postgresql postgresql-contrib

# rsync (para uploads)
sudo apt-get install -y rsync
```

---

## ETAPA 3 — Banco de dados: dump local → VPS

### 3.1 — Exportar banco LOCAL (execute no Windows, no PowerShell/CMD)

```bash
# No terminal do Windows (com pg_dump do PostgreSQL instalado)
pg_dump -U juridico -h localhost -d sistema_juridico -F c -f C:\backup-juridico.dump
```

> Se não tiver `pg_dump` no PATH, está em: `C:\Program Files\PostgreSQL\16\bin\pg_dump.exe`

```bash
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U juridico -h localhost -d sistema_juridico -F c -f C:\backup-juridico.dump
```

### 3.2 — Enviar o dump para a VPS
```bash
# Substitua IP_DA_VPS e usuario_ssh
scp C:\backup-juridico.dump usuario_ssh@IP_DA_VPS:/tmp/backup-juridico.dump
```

### 3.3 — Restaurar na VPS (via SSH na VPS)
```bash
# Criar usuário e banco (se não existir)
sudo -u postgres psql -c "CREATE USER juridico WITH PASSWORD 'juridico123';"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sistema_juridico;"
sudo -u postgres psql -c "CREATE DATABASE sistema_juridico OWNER juridico;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sistema_juridico TO juridico;"

# Restaurar o dump
pg_restore -U juridico -h localhost -d sistema_juridico -F c /tmp/backup-juridico.dump

# Limpar o arquivo temporário
rm /tmp/backup-juridico.dump
```

---

## ETAPA 4 — Código: clonar/atualizar na VPS

```bash
# Se for a primeira vez (clone):
git clone https://github.com/SEU_USUARIO/SEU_REPO.git /var/www/sistema-juridico
cd /var/www/sistema-juridico

# Se já existir (atualizar):
cd /var/www/sistema-juridico
git fetch --all
git reset --hard origin/main
```

---

## ETAPA 5 — Configurar .env na VPS

```bash
nano /var/www/sistema-juridico/.env
```

Conteúdo mínimo (ajuste os valores para a VPS):

```env
DATABASE_URL="postgresql://juridico:juridico123@localhost:5432/sistema_juridico"
NEXTAUTH_SECRET="sua_chave_secreta_aqui"
NEXTAUTH_URL="https://seudominio.com.br"

# Copie as demais variáveis do seu .env local
# (API keys, Evolution API, SMTP, etc.)
```

> ⚠️ **Nunca commite o `.env` no git.** Copie manualmente ou use `scp`.

Para copiar o .env local direto:
```bash
scp "C:\Users\dougc\Documents\Sistema Juridico ADV\.env" usuario_ssh@IP_DA_VPS:/var/www/sistema-juridico/.env
```

Depois ajuste apenas o `NEXTAUTH_URL` para o domínio da VPS.

---

## ETAPA 6 — Instalar dependências e buildar

```bash
cd /var/www/sistema-juridico

npm install

# Gerar o Prisma Client
npx prisma generate

# NÃO rodar migrate (banco já veio do dump com estrutura correta)
# Se quiser garantir migrations aplicadas:
npx prisma migrate deploy

# Build da aplicação
npm run build
```

---

## ETAPA 7 — Transferir uploads

```bash
# Do Windows para VPS (execute no terminal local)
scp -r "C:\Users\dougc\Documents\Sistema Juridico ADV\public\uploads\" usuario_ssh@IP_DA_VPS:/var/www/sistema-juridico/public/uploads/
```

---

## ETAPA 8 — Iniciar com PM2

```bash
cd /var/www/sistema-juridico

# Iniciar app principal
pm2 start npm --name "sistema-juridico" -- start

# Iniciar worker (automações, filas)
pm2 start npm --name "sistema-juridico-worker" -- run worker:start

# Salvar para reiniciar com o servidor
pm2 save
pm2 startup

# Verificar status
pm2 status
pm2 logs sistema-juridico --lines 50
```

---

## ETAPA 9 — Verificação final

```bash
# Checar se a aplicação responde
curl http://localhost:3000

# Checar banco
psql -U juridico -h localhost -d sistema_juridico -c "\dt" | head -20

# Ver logs em tempo real
pm2 logs --lines 100
```

---

## 🔁 Deploys futuros (após o primeiro)

Para próximas atualizações de código (sem precisar do banco):

```bash
# Na VPS
cd /var/www/sistema-juridico
git pull origin main
npm install
npm run build
npx prisma migrate deploy   # só aplica migrations novas
pm2 restart all
```

---

## ⚡ Script automático (opcional)

Salve como `scripts/deploy-vps.sh` e rode na VPS:

```bash
#!/bin/bash
set -e
APP_DIR="/var/www/sistema-juridico"

echo "🔄 Atualizando código..."
cd $APP_DIR
git fetch --all
git reset --hard origin/main

echo "📦 Instalando dependências..."
npm install

echo "🔧 Gerando Prisma..."
npx prisma generate
npx prisma migrate deploy

echo "🏗️  Building..."
npm run build

echo "🚀 Reiniciando serviços..."
pm2 restart all

echo "✅ Deploy concluído!"
pm2 status
```

---

## 📌 Checklist final

- [ ] `git push` feito com todos os arquivos
- [ ] Dump do banco gerado localmente
- [ ] Dump enviado e restaurado na VPS
- [ ] `.env` configurado na VPS (com NEXTAUTH_URL correto)
- [ ] `npm install && npm run build` executados
- [ ] `prisma generate` executado
- [ ] Uploads transferidos via scp
- [ ] PM2 rodando app + worker
- [ ] `pm2 save && pm2 startup` executados
- [ ] Testado via browser
