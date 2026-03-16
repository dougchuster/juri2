# Deploy Completo (Vercel + Worker)

Este projeto fica funcional com arquitetura hibrida:
- `Vercel`: frontend + API stateless + cron jobs.
- `Worker externo`: processamento BullMQ (`npm run worker:start`).
- `PostgreSQL` e `Redis`: gerenciados.

## 1. Arquivos de deploy incluidos

- `vercel.json`: agenda os crons que substituem `node-cron`.
- `Dockerfile.worker`: imagem para subir o worker BullMQ.
- `.env.vercel.example`: variaveis para o app na Vercel.
- `.env.worker.example`: variaveis para o worker externo.

## 2. Preparar servicos gerenciados

1. Crie um PostgreSQL gerenciado (Neon, Supabase, RDS, etc).
2. Crie um Redis gerenciado (Upstash, Redis Cloud, etc).
3. Guarde:
   - `DATABASE_URL`
   - `REDIS_URL`

## 3. Deploy da aplicacao na Vercel

1. Importe o repositorio na Vercel.
2. Configure as variaveis com base em `.env.vercel.example`.
3. Defina:
   - `CRON_SECRET`: segredo dos crons da Vercel.
   - `JOBS_SECRET_KEY`: idealmente igual ao `CRON_SECRET`.
4. Mantenha:
   - `CRON_ENABLED=false`
   - `ENABLE_WHATSAPP_RUNTIME=false`
5. Deploy.

## 4. Deploy do worker externo

Opcao recomendada: Railway/Render/Fly com Docker.

1. Use `Dockerfile.worker`.
2. Configure variaveis com base em `.env.worker.example`.
3. Garanta que `DATABASE_URL` e `REDIS_URL` apontem para producao.
4. Suba 1 instancia do worker (escale depois se necessario).

Opcao local rapida (teste):

```bash
cp .env.worker.example .env.worker
docker compose -f docker-compose.worker.yml up --build -d
```

## 5. Migrations do banco

Execute no pipeline de deploy (ou manualmente):

```bash
npx prisma migrate deploy
npx prisma generate
```

## 6. Cron jobs ativos (Vercel)

Configurados em `vercel.json`:
- `*/2 * * * *` -> `/api/jobs/process`
- `0 8 * * *` -> `/api/jobs/scheduler`
- `0 13 * * *` -> `/api/jobs/scheduler`
- `5 * * * *` -> `/api/jobs/operacoes`
- `20 * * * *` -> `/api/jobs/publicacoes`
- `*/5 * * * *` -> `/api/jobs/demandas`
- `*/15 * * * *` -> `/api/jobs/automacao-nacional`
- `40 */6 * * *` -> `/api/jobs/datajud-monitor`
- `10 3 * * *` -> `/api/jobs/datajud-aliases`

## 7. Checklist de validacao

1. Abrir app na Vercel e autenticar.
2. Testar endpoint de health de jobs manualmente:
   - `GET /api/jobs/process?secret=...`
3. Verificar logs da Vercel (execucao de cron).
4. Verificar logs do worker externo (consumo BullMQ).
5. Confirmar escrita/leitura no banco para jobs.

## 8. Observacoes importantes

- Uploads ainda usam disco local (`public/uploads`). Em serverless, isso nao e persistente entre builds/instancias.
- Para producao robusta, migre uploads para S3/R2/Blob.
- Integracao WhatsApp via Baileys exige runtime stateful dedicado; por isso `ENABLE_WHATSAPP_RUNTIME=false` na Vercel.
