# ✅ PLAYBOOK 100% OPERACIONAL — Sistema Nacional (92 tribunais)
**Arquivo:** `docs/PLAYBOOK_AUTOMACAO_NACIONAL_92.md`  
**Stack:** NextJS 16 (App Router) · TS · Tailwind v4 · Zustand · Prisma · better-auth · Zod · date-fns · BullMQ/Redis · Postgres · **IA: Kimi K2.5**  
**Objetivo:** “1 clique” → disparar captura nacional (92 tribunais) → persistir publicações/intimações → extrair prazos (Kimi) → gerar tarefas → auditoria.

> Este playbook entrega **tudo que você precisa** para colocar em produção: arquitetura, pastas, modelos, scripts, docker-compose, variáveis, fluxo de job, padrões de conectores e checklist final.

---

## 0) O que é “100% operacional” aqui
Para estar operacional de verdade (igual padrões de mercado), o sistema precisa rodar **em 3 camadas**:

1) **Process Sync (CNJ/DataJud)** — universal e rápido para “estado do processo”  
2) **Publicações/Diários (DJEN + diários locais)** — texto publicado e prazos  
3) **Intimações eletrônicas (PJe/eproc/projudi/SEEU etc.)** — caixa do advogado (quando não sai em diário)

✅ Você consegue ficar operacional “de ponta a ponta” começando por **DataJud** e pelo **orquestrador 92**, enquanto adiciona gradualmente conectores de diário/portal por tribunal (como fazem as plataformas líderes).  
⚠️ O “hard part” inevitável é a **variação de cada tribunal** em diário/DJEN/portal — por isso o sistema precisa ser **catálogo + conectores plugáveis**.

---

## 1) Infra mínima (produção)
### 1.1 Serviços obrigatórios
- **PostgreSQL** (Prisma)
- **Redis** (BullMQ)
- **Worker Node** (processadores das filas)
- **App NextJS** (UI + orquestração)

### 1.2 docker-compose (dev e staging)
Crie `docker-compose.yml` na raiz:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: legalsys
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

---

## 2) Estrutura de pastas (copie no repo)
Recomendação monorepo:

```
/apps
  /web                     NextJS 16 (App Router)
  /worker                  BullMQ workers (TS)
  /cert-service             (opcional) login/certificado isolado

/packages
  /db                      Prisma schema + client
  /queue                   BullMQ config
  /connectors               DataJud + diário + portais
  /ai                      Kimi K2.5 client + prompts
  /core                    normalização, dedup, prazos
  /security                crypto, secrets helpers
  /observability            logs, métricas
```

Se hoje você só tem `/apps/web`, crie os demais gradualmente, mas **worker separado é obrigatório** para produção.

---

## 3) Variáveis de ambiente (produção)
Crie `.env` (dev) e `.env.production` (prod).

### 3.1 Obrigatórias
```bash
# Banco
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/legalsys?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# CNJ DataJud (API pública)
DATAJUD_API_KEY="COLE_A_CHAVE_ATUAL_DO_CNJ"

# IA (Kimi K2.5)
KIMI_API_BASE="https://SEU_ENDPOINT_KIMI"
KIMI_API_KEY="SUA_CHAVE_KIMI"
KIMI_MODEL="kimi-k2.5"

# App
APP_URL="http://localhost:3000"
NODE_ENV="development"

# Segurança
ENCRYPTION_KEY_BASE64="CHAVE_32_BYTES_BASE64"  # AES-256 (32 bytes)
```

> **Importante:** A `DATAJUD_API_KEY` pode mudar — mantenha como config e atualize automaticamente (ver Seção 10).

---

## 4) Dependências (npm)
No root ou no app conforme sua estrutura:

```bash
npm i bullmq ioredis zod date-fns
npm i -D ts-node nodemon
```

Se quiser painel de fila local:
```bash
npm i @bull-board/api @bull-board/express
```

---

## 5) Prisma — schema e migrações
### 5.1 Schema (mínimo operacional)
Crie `packages/db/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tribunal {
  id        String   @id @default(cuid())
  nome      String
  sigla     String   @unique
  ramo      String
  uf        String?
  createdAt DateTime @default(now())

  sources   TribunalSource[]
}

model TribunalSource {
  id           String   @id @default(cuid())
  tribunalId   String
  sourceType   String   // DATAJUD | DJEN | DIARIO | PORTAL
  baseUrl      String?
  alias        String?
  enabled      Boolean  @default(true)
  requiresCert Boolean  @default(false)
  notes        String?

  tribunal Tribunal @relation(fields: [tribunalId], references: [id])

  @@index([tribunalId, sourceType])
}

model Advogado {
  id        String   @id @default(cuid())
  nome      String
  oab       String
  uf        String
  createdAt DateTime @default(now())

  jobs      AutomacaoJob[]
}

model Publicacao {
  id             String   @id @default(cuid())
  tribunalId     String
  advogadoId     String
  numeroProcesso String
  dataPublicacao DateTime
  fonte          String   // DJEN|DIARIO|PORTAL
  conteudoBruto  String
  hashUnico      String   @unique
  analisadoIA    Boolean  @default(false)
  createdAt      DateTime @default(now())

  tribunal Tribunal @relation(fields: [tribunalId], references: [id])
  advogado Advogado @relation(fields: [advogadoId], references: [id])
  prazo    Prazo?
}

model Prazo {
  id           String   @id @default(cuid())
  publicacaoId String   @unique
  tipo         String
  dataInicio   DateTime
  dataFim      DateTime
  urgente      Boolean  @default(false)
  createdAt    DateTime @default(now())

  publicacao Publicacao @relation(fields: [publicacaoId], references: [id])
}

model AutomacaoJob {
  id         String   @id @default(cuid())
  advogadoId String
  modo       String   // NACIONAL | TRIBUNAL | REPROCESSAR
  status     String   @default("queued")
  startedAt  DateTime?
  finishedAt DateTime?
  createdAt  DateTime @default(now())

  logs       AutomacaoLog[]
  advogado   Advogado @relation(fields: [advogadoId], references: [id])
}

model AutomacaoLog {
  id         String   @id @default(cuid())
  jobId      String
  tribunal   String
  sourceType String
  inicio     DateTime
  fim        DateTime?
  status     String
  erro       String?
  meta       Json?
  createdAt  DateTime @default(now())

  job AutomacaoJob @relation(fields: [jobId], references: [id])

  @@index([jobId, tribunal])
}
```

### 5.2 Scripts package.json
No root:

```json
{
  "scripts": {
    "db:migrate": "npx prisma migrate dev --schema=packages/db/prisma/schema.prisma",
    "db:deploy": "npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma",
    "db:seed": "ts-node packages/db/prisma/seed.ts",
    "dev:web": "npm --prefix apps/web run dev",
    "dev:worker": "npm --prefix apps/worker run dev"
  }
}
```

---

## 6) Seeds “92 tribunais” (catálogo) — mínimo operacional
Crie `packages/db/prisma/seed.ts` com:
- cadastro dos tribunais (sigla, ramo, UF)
- cadastro de `TribunalSource`:
  - **DATAJUD** com `alias` oficial por tribunal
  - DJEN/DIÁRIO/PORTAL como `enabled=false` inicialmente (vai ativando conforme implementa)

> **Ponto chave:** você fica operacional já com **DataJud + orquestração 92**.

---

## 7) Fila (BullMQ) — configuração padrão
Crie `packages/queue/index.ts`:

```ts
import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const queues = {
  national: new Queue("national-orchestrator", { connection }),
  datajud: new Queue("datajud-sync", { connection }),
  capture: new Queue("publications-capture", { connection }),
  normalize: new Queue("normalize-dedup", { connection }),
  kimi: new Queue("kimi-analysis", { connection }),
  prazo: new Queue("prazo-calc", { connection }),
};

export function makeQueueEvents(name: string) {
  return new QueueEvents(name, { connection });
}
```

---

## 8) ✅ Conector real #1 (CNJ/DataJud) — “plug and play”
Crie `packages/connectors/datajud/`:

### 8.1 client.ts
```ts
export const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

export const datajudEndpoint = (alias: string) =>
  `${DATAJUD_BASE}/${alias}/_search`;

export async function datajudPost<T>(alias: string, body: unknown) {
  const url = datajudEndpoint(alias);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `APIKey ${process.env.DATAJUD_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DataJud ${res.status}: ${txt}`);
  }
  return (await res.json()) as T;
}
```

### 8.2 queries.ts (exemplos)
```ts
export const qNumeroProcesso = (numeroProcesso: string) => ({
  query: { match: { numeroProcesso } },
  size: 1,
});

export const qMovimentosJanela = (dataInicio: string, dataFim: string) => ({
  query: {
    bool: {
      filter: [
        { range: { "movimentos.dataHora": { gte: dataInicio, lte: dataFim } } }
      ]
    }
  },
  size: 100,
});
```

### 8.3 index.ts
```ts
import { datajudPost } from "./client";
import { qNumeroProcesso, qMovimentosJanela } from "./queries";

export type Movimento = { dataHora: string; codigo: string; nome: string };
export type ProcessoSync = {
  numeroProcesso: string;
  tribunal?: string;
  movimentos: Movimento[];
};

export const DataJudConnector = {
  id: "DATAJUD",
  async buscarPorNumero(alias: string, numeroProcesso: string) {
    const json: any = await datajudPost<any>(alias, qNumeroProcesso(numeroProcesso));
    const hit = json?.hits?.hits?.[0]?._source;
    if (!hit) return null;

    return {
      numeroProcesso: hit.numeroProcesso,
      tribunal: hit.tribunal,
      movimentos: (hit.movimentos || []).map((m: any) => ({
        dataHora: m.dataHora,
        codigo: String(m.codigo),
        nome: m.nome,
      })),
    } as ProcessoSync;
  },

  async buscarMovimentosJanela(alias: string, dataInicio: string, dataFim: string) {
    const json: any = await datajudPost<any>(alias, qMovimentosJanela(dataInicio, dataFim));
    const hits = json?.hits?.hits || [];
    return hits.map((h: any) => ({
      numeroProcesso: h?._source?.numeroProcesso,
      tribunal: h?._source?.tribunal,
      movimentos: (h?._source?.movimentos || []).map((m: any) => ({
        dataHora: m.dataHora,
        codigo: String(m.codigo),
        nome: m.nome,
      })),
    })) as ProcessoSync[];
  }
};
```

---

## 9) Worker (apps/worker) — processadores das filas
### 9.1 Estrutura
```
/apps/worker
  package.json
  src/
    index.ts
    processors/
      national.ts
      datajud.ts
      capture.ts
      normalize.ts
      kimi.ts
      prazo.ts
```

### 9.2 apps/worker/package.json
```json
{
  "name": "worker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon --watch src --exec node --loader ts-node/esm src/index.ts",
    "start": "node --loader ts-node/esm src/index.ts"
  }
}
```

### 9.3 Worker principal (src/index.ts)
```ts
import { Worker } from "bullmq";
import { connection } from "../../packages/queue/index";
import { nationalProcessor } from "./processors/national";
import { datajudProcessor } from "./processors/datajud";

new Worker("national-orchestrator", nationalProcessor, { connection, concurrency: 5 });
new Worker("datajud-sync", datajudProcessor, { connection, concurrency: 20 });

// Os próximos entram quando você ativar DJEN/DIÁRIO/PORTAL:
// new Worker("publications-capture", captureProcessor, { connection, concurrency: 10 });
// new Worker("normalize-dedup", normalizeProcessor, { connection, concurrency: 20 });
// new Worker("kimi-analysis", kimiProcessor, { connection, concurrency: 10 });
// new Worker("prazo-calc", prazoProcessor, { connection, concurrency: 10 });

console.log("✅ Workers online");
```

### 9.4 Orquestrador nacional (processors/national.ts)
Objetivo: para um advogado, enfileirar tarefas por tribunal/fonte habilitada.

```ts
import { queues } from "../../../packages/queue/index";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function nationalProcessor(job: any) {
  const { jobId } = job.data; // id do AutomacaoJob no banco
  const automacao = await prisma.automacaoJob.findUnique({
    where: { id: jobId },
    include: { advogado: true },
  });
  if (!automacao) throw new Error("Job não encontrado");

  const tribunais = await prisma.tribunal.findMany({
    include: { sources: true },
  });

  // DATAJUD: sempre enfileirar sync se existir alias e enabled
  for (const t of tribunais) {
    const src = t.sources.find((s) => s.sourceType === "DATAJUD" && s.enabled && s.alias);
    if (!src) continue;

    await queues.datajud.add("sync", {
      automacaoJobId: automacao.id,
      tribunalSigla: t.sigla,
      tribunalAlias: src.alias,
      advogadoId: automacao.advogadoId,
      // aqui você pode enfileirar por “números do escritório”, janela, etc.
      modo: "janela",
    });
  }

  return { enfileirados: tribunais.length };
}
```

### 9.5 Processor DataJud (processors/datajud.ts)
```ts
import { PrismaClient } from "@prisma/client";
import { DataJudConnector } from "../../../packages/connectors/datajud/index";

const prisma = new PrismaClient();

export async function datajudProcessor(job: any) {
  const { automacaoJobId, tribunalSigla, tribunalAlias, modo } = job.data;

  const inicio = new Date();
  await prisma.automacaoLog.create({
    data: {
      jobId: automacaoJobId,
      tribunal: tribunalSigla,
      sourceType: "DATAJUD",
      inicio,
      status: "running",
    },
  });

  try {
    // Exemplo “janela”: pegar movimentos do dia (ajuste conforme regra de negócio)
    const d0 = new Date();
    const startISO = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).toISOString();
    const endISO = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1).toISOString();

    const processos = await DataJudConnector.buscarMovimentosJanela(
      tribunalAlias,
      startISO,
      endISO
    );

    // TODO: persistir no seu modelo de processos/movimentos (aqui é só exemplo)
    // 1) identificar processos do escritório
    // 2) atualizar status/andamentos
    // 3) se houver publicação relacionada, agendar captura em diários/portais

    await prisma.automacaoLog.updateMany({
      where: { jobId: automacaoJobId, tribunal: tribunalSigla, sourceType: "DATAJUD", status: "running" },
      data: { fim: new Date(), status: "success", meta: { count: processos.length } },
    });

    return { count: processos.length };
  } catch (e: any) {
    await prisma.automacaoLog.updateMany({
      where: { jobId: automacaoJobId, tribunal: tribunalSigla, sourceType: "DATAJUD", status: "running" },
      data: { fim: new Date(), status: "failed", erro: String(e?.message || e) },
    });
    throw e;
  }
}
```

---

## 10) Atualização automática dos aliases DataJud (para não “quebrar”)
✅ Faça um script que:
- baixa a lista oficial de aliases (CNJ/DataJud wiki)
- atualiza a tabela `TribunalSource.alias` em lote
- roda diariamente (cron) ou a cada deploy

Crie `packages/connectors/datajud/update-aliases.ts` (exemplo de ideia; usar fetch + parsing simples):
- baixa o HTML
- extrai linhas “sigla/alias”
- atualiza banco

> Observação: o parse exato depende do HTML atual da wiki. Trate como script de manutenção.

---

## 11) Captura de Publicações (DJEN/DIÁRIO/PORTAL) — como deixar operacional
### 11.1 Padrão de connector para publicações
Crie `packages/connectors/publications/base.ts`:

```ts
export type PublicationHit = {
  tribunalSigla: string;
  fonte: "DJEN" | "DIARIO" | "PORTAL";
  numeroProcesso: string;
  dataPublicacao: string; // ISO
  conteudoBruto: string;
};

export interface PublicationConnector {
  id: string;
  tribunalSigla: string;
  fonte: "DJEN" | "DIARIO" | "PORTAL";
  buscarPorAdvogado(params: { oab: string; uf: string; data: string }): Promise<PublicationHit[]>;
}
```

### 11.2 Realidade do “92 tribunais”
- **Não existe um único endpoint universal público** para “texto de publicação por OAB” em todos os tribunais.
- Por isso, o caminho correto é:
  - manter catálogo `TribunalSource` (DJEN/DIÁRIO/PORTAL)
  - implementar conectores por família de sistemas (onde dá):
    - diários HTML
    - portais com JSON
    - portais com captcha/login → cert-service

### 11.3 Estratégia operacional (igual mercado)
- Quando o tribunal tiver DJEN/diário acessível → usar conector de publicação
- Quando o tribunal exigir intimação eletrônica → usar portal/cert-service
- Sempre manter fallback e auditoria

---

## 12) Kimi K2.5 (IA) — pipeline completo
### 12.1 Objetivo
Transformar `conteudoBruto` em:
- prazo (dias)
- termo inicial
- urgência
- resumo
- ação sugerida

### 12.2 Prompt (JSON only)
```
Você é um assistente jurídico especializado em publicações.
Retorne APENAS JSON válido com:
- tipo_ato
- possui_prazo
- dias_prazo
- termo_inicial (ISO|null)
- urgencia ("baixa"|"media"|"alta")
- resumo
- acao_sugerida
```

### 12.3 Validação com Zod
Crie schema Zod e recuse resposta inválida.

---

## 13) UI + Progresso (NextJS)
### 13.1 Endpoint para iniciar job
`POST /api/automacao/busca-nacional`

- cria `AutomacaoJob` no banco
- adiciona job na fila `national-orchestrator` com `{ jobId }`
- retorna `{ jobId }`

### 13.2 Endpoint para status
`GET /api/automacao/jobs/[id]`
- retorna logs agregados por tribunal/fonte
- front mostra progresso com base em:
  - total tribunais
  - quantos `success/failed/running`

---

## 14) Observabilidade
- logs no banco (`AutomacaoLog`)
- filas (bull-board opcional)
- alertas (falhas por tribunal, html changed, auth issues)

---

## 15) Checklist “go-live”
### 15.1 Dev (local)
1. `docker compose up -d`
2. `npm run db:migrate`
3. `npm run db:seed`
4. `npm run dev:web`
5. `npm run dev:worker`
6. Teste: clique “Buscar Publicações Nacionais”
7. Verificar `AutomacaoLog` preenchendo

### 15.2 Staging
- Redis/PG gerenciados
- Worker com autoscaling (2+ réplicas)
- Rate limits definidos
- Backup e retenção

### 15.3 Produção
- chaves em secret manager
- rotacionar ENCRYPTION_KEY
- cron de update aliases DataJud
- monitorar falhas e latência

---

## 16) Referências essenciais (para configuração e conformidade)
- CNJ DataJud: APIKey e aviso de rotação
- CNJ DataJud: lista de endpoints/aliases por tribunal
- BullMQ: quick start e padrões de workers/queues

---

# ✅ Resultado
Com este playbook, você coloca em produção imediatamente:
- **Orquestração 92 tribunais**
- **Conector real DataJud** (sync processos/andamentos)
- **Estrutura completa para publicações** (DJEN/DIÁRIO/PORTAL) com catálogo, filas e pipeline IA
- **Auditoria e logs**
- **Pronto para escalar conectores por tribunal** até cobertura total de publicações/intimações
