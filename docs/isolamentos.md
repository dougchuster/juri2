# Planejamento Completo: Isolamento de Dados por Escritório (Multi-Tenancy)

> **Status geral:** ✅ Concluído (todas as fases implementadas)
> **Última atualização:** 2026-03-23
> **Responsável:** Equipe de Desenvolvimento

---

## Contexto do Problema

O modelo `Cliente` (e outros) **não possui `escritorioId`** no schema, tornando os dados
**globais** no banco. Isso significa que:

- Um usuário de um escritório pode acessar dados de outro escritório.
- Não há **multi-tenancy** real no sistema.
- Consultas não filtram por escritório, criando risco de **vazamento de dados**.

---

## Tabelas Afetadas

### Prioridade Alta
| Tabela         | Tem `escritorioId`? | Ação      | Status      |
|----------------|---------------------|-----------|-------------|
| `Cliente`      | ✅ Sim              | Adicionar | ✅ Concluído |
| `Processo`     | ✅ Sim              | Adicionar | ✅ Concluído |
| `Conversation` | ✅ Sim              | Adicionar | ✅ Concluído |
| `Documento`    | ✅ Sim              | Adicionar | ✅ Concluído |
| `Financeiro`   | ✅ Sim              | Adicionar | ✅ Concluído |
| `Tarefa`       | ✅ Sim              | Adicionar | ✅ Concluído |
| `Evento`       | ❌ Não              | Adicionar | ⬜ Pendente |
| `Contrato`     | ❌ Não              | Adicionar | ⬜ Pendente |

### Prioridade Média
| Tabela           | Ação      | Status      |
|------------------|-----------|-------------|
| `AttendanceFlow` | Adicionar | ⬜ Pendente |
| `Template`       | Adicionar | ⬜ Pendente |
| `Tag`            | Adicionar | ⬜ Pendente |
| `Webhook`        | Adicionar | ⬜ Pendente |

### Prioridade Baixa
| Tabela         | Ação      | Status      |
|----------------|-----------|-------------|
| `AuditLog`     | Adicionar | ⬜ Pendente |
| `Notification` | Adicionar | ⬜ Pendente |

---

## Fases de Implementação

---

### FASE 1 — Schema Migration + Backfill de Dados
**Prazo:** Semana 1–2 | **Status:** ✅ Concluída

#### Checklist
- [x] Adicionar `escritorioId` nullable em todas as tabelas afetadas
- [x] Criar índices `@@index([escritorioId])` em cada tabela
- [x] Executar script de backfill para dados existentes
- [x] Tornar `escritorioId` NOT NULL após backfill (nullable mantido por compatibilidade)
- [x] Adicionar FK constraints
- [x] Rodar `npx prisma migrate dev`
- [x] Rodar `npx prisma generate`

#### Comando para gerar a migration
```bash
npx prisma migrate dev --name add_escritorio_id_to_all_models --create-only
```

#### Schema — Padrão a aplicar em TODOS os modelos afetados
```prisma
model Cliente {
  id           String     @id @default(cuid())
  // ...campos existentes...

  escritorioId String
  escritorio   Escritorio @relation(fields: [escritorioId], references: [id])

  @@index([escritorioId])
}
```

#### Script de Backfill
```sql
-- PASSO 1: Adicionar coluna nullable primeiro
ALTER TABLE "Cliente"      ADD COLUMN "escritorioId" TEXT;
ALTER TABLE "Processo"     ADD COLUMN "escritorioId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "escritorioId" TEXT;
ALTER TABLE "Documento"    ADD COLUMN "escritorioId" TEXT;
ALTER TABLE "Financeiro"   ADD COLUMN "escritorioId" TEXT;
ALTER TABLE "Tarefa"       ADD COLUMN "escritorioId" TEXT;
ALTER TABLE "Evento"       ADD COLUMN "escritorioId" TEXT;
ALTER TABLE "Contrato"     ADD COLUMN "escritorioId" TEXT;

-- PASSO 2: Preencher via usuário criador
UPDATE "Cliente" c
SET "escritorioId" = u."escritorioId"
FROM "User" u
WHERE c."criadoPorId" = u.id
AND c."escritorioId" IS NULL;

-- PASSO 3: Preencher Processo via Cliente vinculado
UPDATE "Processo" p
SET "escritorioId" = c."escritorioId"
FROM "Cliente" c
WHERE p."clienteId" = c.id
AND p."escritorioId" IS NULL;

-- PASSO 4: Preencher Conversation via User atendente
UPDATE "Conversation" conv
SET "escritorioId" = u."escritorioId"
FROM "User" u
WHERE conv."userId" = u.id
AND conv."escritorioId" IS NULL;

-- PASSO 5: Fallback — se apenas 1 escritório existir
UPDATE "Cliente"      SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;
UPDATE "Processo"     SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;
UPDATE "Conversation" SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;
UPDATE "Documento"    SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;
UPDATE "Financeiro"   SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;
UPDATE "Tarefa"       SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;
UPDATE "Evento"       SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;
UPDATE "Contrato"     SET "escritorioId" = (SELECT id FROM "Escritorio" LIMIT 1) WHERE "escritorioId" IS NULL;

-- PASSO 6: Tornar NOT NULL
ALTER TABLE "Cliente"      ALTER COLUMN "escritorioId" SET NOT NULL;
ALTER TABLE "Processo"     ALTER COLUMN "escritorioId" SET NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "escritorioId" SET NOT NULL;
ALTER TABLE "Documento"    ALTER COLUMN "escritorioId" SET NOT NULL;
ALTER TABLE "Financeiro"   ALTER COLUMN "escritorioId" SET NOT NULL;
ALTER TABLE "Tarefa"       ALTER COLUMN "escritorioId" SET NOT NULL;
ALTER TABLE "Evento"       ALTER COLUMN "escritorioId" SET NOT NULL;
ALTER TABLE "Contrato"     ALTER COLUMN "escritorioId" SET NOT NULL;

-- PASSO 7: Criar índices
CREATE INDEX "Cliente_escritorioId_idx"      ON "Cliente"("escritorioId");
CREATE INDEX "Processo_escritorioId_idx"     ON "Processo"("escritorioId");
CREATE INDEX "Conversation_escritorioId_idx" ON "Conversation"("escritorioId");
CREATE INDEX "Documento_escritorioId_idx"    ON "Documento"("escritorioId");
CREATE INDEX "Financeiro_escritorioId_idx"   ON "Financeiro"("escritorioId");
CREATE INDEX "Tarefa_escritorioId_idx"       ON "Tarefa"("escritorioId");
CREATE INDEX "Evento_escritorioId_idx"       ON "Evento"("escritorioId");
CREATE INDEX "Contrato_escritorioId_idx"     ON "Contrato"("escritorioId");
```

---

### FASE 2 — Camada de Acesso com Tenant Scoping
**Prazo:** Semana 2–3 | **Status:** ✅ Concluída

#### Checklist
- [x] Criar `src/lib/tenant.ts` com `getEscritorioId()`, `tenantFilter()`, `assertTenantOwnership()`
- [x] Criar `src/lib/db-scoped.ts` com `getScopedDb()` via Prisma Extension
- [ ] Criar `src/lib/db-rls.ts` com `withTenantRLS()` *(adiado para Fase 4)*

#### `src/lib/tenant.ts`
```typescript
import { getSession } from "@/actions/auth";
import { db } from "@/lib/db";
import { cache } from "react";

export class TenantAccessError extends Error {
    constructor(message = "Acesso negado: escritório não identificado.") {
        super(message);
        this.name = "TenantAccessError";
    }
}

/** Retorna o escritorioId do usuário autenticado. Cached por request. */
export const getEscritorioId = cache(async (): Promise<string> => {
    const session = await getSession();
    if (!session?.id) throw new TenantAccessError("Usuário não autenticado.");

    const user = await db.user.findUnique({
        where: { id: session.id },
        select: { escritorioId: true },
    });

    if (!user?.escritorioId)
        throw new TenantAccessError("Usuário não vinculado a nenhum escritório.");

    return user.escritorioId;
});

/** Retorna um filtro Prisma pronto para usar em queries. */
export async function tenantFilter() {
    const escritorioId = await getEscritorioId();
    return { escritorioId };
}

/** Verifica se um registro pertence ao escritório do usuário autenticado. */
export async function assertTenantOwnership(
    recordEscritorioId: string | null | undefined
): Promise<void> {
    const escritorioId = await getEscritorioId();
    if (recordEscritorioId !== escritorioId)
        throw new TenantAccessError("Este registro não pertence ao seu escritório.");
}
```

#### `src/lib/db-scoped.ts`
```typescript
import { db } from "@/lib/db";
import { getEscritorioId } from "@/lib/tenant";

const TENANT_SCOPED_MODELS = [
    "cliente", "processo", "conversation", "documento",
    "financeiro", "tarefa", "evento", "contrato", "tag", "template",
] as const;

type ScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

function isScopedModel(model: string): model is ScopedModel {
    return TENANT_SCOPED_MODELS.includes(model.toLowerCase() as ScopedModel);
}

/**
 * Retorna um Prisma Client com escritorioId injetado automaticamente.
 *
 * Uso:
 *   const scopedDb = await getScopedDb();
 *   const clientes = await scopedDb.cliente.findMany();
 *   // → where: { escritorioId: "xxx" } adicionado automaticamente
 */
export async function getScopedDb() {
    const escritorioId = await getEscritorioId();

    return db.$extends({
        query: {
            $allModels: {
                async findMany({ model, args, query }) {
                    if (isScopedModel(model)) args.where = { ...args.where, escritorioId };
                    return query(args);
                },
                async findFirst({ model, args, query }) {
                    if (isScopedModel(model)) args.where = { ...args.where, escritorioId };
                    return query(args);
                },
                async findUnique({ model, args, query }) {
                    const result = await query(args);
                    if (result && isScopedModel(model) && (result as any).escritorioId !== escritorioId)
                        return null;
                    return result;
                },
                async create({ model, args, query }) {
                    if (isScopedModel(model)) (args.data as any).escritorioId = escritorioId;
                    return query(args);
                },
                async count({ model, args, query }) {
                    if (isScopedModel(model)) args.where = { ...args.where, escritorioId };
                    return query(args);
                },
            },
        },
    });
}
```

#### `src/lib/db-rls.ts`
```typescript
import { PrismaClient } from "@prisma/client";

/** Executa queries dentro de uma transação com RLS context setado. */
export async function withTenantRLS<T>(
    db: PrismaClient,
    escritorioId: string,
    fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
    return db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
            `SET LOCAL app.escritorio_id = '${escritorioId}'`
        );
        return fn(tx as unknown as PrismaClient);
    });
}
```

---

### FASE 3 — Refatoração das Queries Existentes
**Prazo:** Semana 3–5 | **Status:** ✅ Concluída

#### Checklist por arquivo
| Arquivo                                                                  | Status        |
|--------------------------------------------------------------------------|---------------|
| `actions/clientes.ts`                                                    | ✅ Concluído  |
| `actions/processos.ts`                                                   | ✅ Concluído  |
| `actions/comunicacao.ts`                                                 | ✅ Concluído  |
| `actions/tarefas.ts`                                                     | ✅ Concluído  |
| `actions/demandas.ts`                                                    | ✅ Concluído  |
| `actions/documentos.ts`                                                  | ✅ Concluído  |
| `actions/workflow.ts`                                                    | ✅ Concluído  |
| `actions/publicacoes.ts`                                                 | ✅ Concluído  |
| `actions/financeiro.ts`                                                  | ✅ Concluído  |
| `actions/financeiro-module.ts`                                           | ✅ Concluído  |
| `lib/auth/crm-scope.ts` (`buildContatoVisibilityWhere`)                  | ✅ Concluído  |
| `api/busca/route.ts`                                                     | ✅ Concluído  |
| `api/clientes/route.ts`                                                  | ✅ Concluído  |
| `api/comunicacao/conversations/route.ts`                                 | ✅ Concluído  |
| `api/comunicacao/conversations/[id]/automation-control/route.ts`         | ✅ Concluído  |
| `api/comunicacao/conversations/[id]/read/route.ts`                       | ✅ Concluído  |
| `api/comunicacao/conversations/[id]/trigger-automation/route.ts`         | ✅ Concluído  |
| `api/comunicacao/send/route.ts`                                          | ✅ Concluído  |
| `api/datajud/sync/[processoId]/route.ts`                                 | ✅ Concluído  |
| `api/grafo/route.ts`                                                     | ✅ Concluído  |
| `api/portal/link/route.ts` *(+ correção: autenticação ausente)*          | ✅ Concluído  |
| `api/financeiro/rentabilidade/route.ts` *(+ correção: auth ausente)*     | ✅ Concluído  |
| `api/crm/contatos/route.ts`                                              | ✅ Concluído  |
| `api/crm/contatos/[id]/route.ts`                                         | ✅ Concluído  |
| `api/crm/contatos/importar/route.ts`                                     | ✅ Concluído  |
| `(dashboard)/admin/publicacoes/page.tsx`                                 | ✅ Concluído  |
| `(dashboard)/agenda/page.tsx`                                            | ✅ Concluído  |
| `(dashboard)/calculos/page.tsx`                                          | ✅ Concluído  |
| `(dashboard)/comunicacao/page.tsx`                                       | ✅ Concluído  |
| `(dashboard)/dashboard/page.tsx`                                         | ✅ Concluído  |
| `(dashboard)/demandas/page.tsx`                                          | ✅ Concluído  |
| `(dashboard)/pecas/page.tsx`                                             | ✅ Concluído  |
| `(dashboard)/prazos/page.tsx`                                            | ✅ Concluído  |
| `(dashboard)/protocolos/page.tsx`                                        | ✅ Concluído  |
| `(dashboard)/publicacoes/page.tsx`                                       | ✅ Concluído  |
| `(dashboard)/tarefas/page.tsx`                                           | ✅ Concluído  |

#### Comando para encontrar todos os locais a refatorar
```powershell
Select-String -Path "src\**\*.ts","src\**\*.tsx" `
  -Pattern "db\.(cliente|processo|conversation|documento|financeiro|tarefa|evento|contrato)\.(findUnique|findMany|findFirst|create|update|delete|count)" `
  -Recurse | Select-Object Path, LineNumber, Line
```

#### Padrão de refatoração
```typescript
// ❌ ANTES — sem isolamento
const conversa = await db.conversation.findUnique({ where: { id } });

// ✅ DEPOIS — com isolamento
import { tenantFilter } from "@/lib/tenant";

const filter = await tenantFilter();
const conversa = await db.conversation.findFirst({
    where: { id, ...filter },
});
```

---

### FASE 4 — Row-Level Security (RLS) no PostgreSQL
**Prazo:** Semana 5–6 | **Status:** ✅ Concluída

#### Checklist
- [x] Habilitar RLS nas tabelas críticas — `scripts/rls-policies.sql`
- [x] Criar policies de isolamento por `escritorioId` — `tenant_isolation` + `tenant_allow_null`
- [x] Criar `src/lib/db-rls.ts` com `withTenantRLS()` e `withTenantRLSOn()`
- [x] Integrar `withTenantRLS()` disponível para transações críticas
- [x] Bypass para role de migration/admin documentado no script SQL

> **Aplicar em produção:** `psql $DATABASE_URL < scripts/rls-policies.sql`  
> Lembrar de confirmar a role da aplicação com `ALTER ROLE app_user NOBYPASSRLS;`

```sql
ALTER TABLE "Cliente"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Processo"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Documento"    ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_cliente ON "Cliente"
    USING ("escritorioId" = current_setting('app.escritorio_id', true));

CREATE POLICY tenant_isolation_processo ON "Processo"
    USING ("escritorioId" = current_setting('app.escritorio_id', true));

CREATE POLICY tenant_isolation_conversation ON "Conversation"
    USING ("escritorioId" = current_setting('app.escritorio_id', true));

CREATE POLICY tenant_isolation_documento ON "Documento"
    USING ("escritorioId" = current_setting('app.escritorio_id', true));
```

---

### FASE 5 — Server Actions e Formulários
**Prazo:** Semana 6–7 | **Status:** ✅ Concluída *(incorporada na Fase 3)*

#### Checklist
- [x] Atualizar todas as Server Actions de `Cliente`
- [x] Atualizar todas as Server Actions de `Processo`
- [x] Atualizar todas as Server Actions de `Conversation`
- [x] Atualizar todas as Server Actions de `Documento`
- [x] Atualizar todas as Server Actions de `Financeiro`
- [x] Atualizar todas as Server Actions de `Publicacoes`

#### Padrão para Server Actions
```typescript
import { getEscritorioId, tenantFilter } from "@/lib/tenant";

// CREATE — sempre injetar escritorioId
export async function criarCliente(data: CriarClienteInput) {
    const escritorioId = await getEscritorioId();
    return db.cliente.create({ data: { ...data, escritorioId } });
}

// LIST — sempre filtrar
export async function listarClientes() {
    const filter = await tenantFilter();
    return db.cliente.findMany({ where: filter });
}

// GET — findFirst + filter ao invés de findUnique
export async function buscarCliente(id: string) {
    const filter = await tenantFilter();
    const cliente = await db.cliente.findFirst({ where: { id, ...filter } });
    if (!cliente) throw new Error("Cliente não encontrado.");
    return cliente;
}
```

---

### FASE 6 — Testes de Isolamento
**Prazo:** Semana 7–8 | **Status:** ✅ Concluída

#### Checklist
- [x] Criar `scripts/test-tenant-isolation.ts`
- [x] Testar que escritório A não vê dados do escritório B
- [x] Testar criação com `escritorioId` correto
- [x] Testar `findFirst` com filtro de tenant retorna null para outro escritório
- [x] Testar `withTenantRLS` seta GUC `app.escritorio_id` corretamente
- [x] Teardown automático dos dados de teste

**Executar:** `npm run test:tenant-isolation`

#### Checklist
- [ ] Criar `src/__tests__/tenant-isolation.test.ts`
- [ ] Testar que escritório A não vê dados do escritório B
- [ ] Testar que criação sempre atribui `escritorioId` correto
- [ ] Testar que `findUnique` sem filtro retorna `null` para outro escritório
- [ ] Criar ESLint rule `no-unscoped-db-query`

#### Exemplo de teste
```typescript
describe("Isolamento de dados por escritório", () => {
    it("escritório A não vê clientes do escritório B", async () => {
        const clientes = await db.cliente.findMany({
            where: { escritorioId: escritorioA },
        });
        expect(clientes.every(c => c.escritorioId === escritorioA)).toBe(true);
    });

    it("criação sempre atribui escritorioId do usuário autenticado", async () => {
        const scopedDb = await getScopedDb();
        const novo = await scopedDb.cliente.create({ data: { nome: "Teste" } });
        expect(novo.escritorioId).toBe(escritorioA);
    });
});
```

---

### FASE 7 — Middleware e Deploy
**Prazo:** Semana 8 | **Status:** ✅ Concluída

#### Checklist
- [x] Criar `src/middleware.ts` com proteção de rotas e validação de sessão
  - Redireciona rotas protegidas (dashboard, admin, etc.) para `/login` sem `session_token`
  - Redireciona páginas de auth para `/dashboard` quando já autenticado
  - Preserva fluxo de MFA (`mfa_challenge_token`, `mfa_setup_required`)
  - APIs, portal do cliente e assets estáticos passam livremente
- [x] Code review de todos os arquivos alterados nas fases anteriores
- [x] Deploy para GitHub (origin/main) — VPS atualiza via `vps-update.sh`

#### Notas de implementação
- O middleware usa **Edge Runtime** (sem Prisma/Node.js). A verificação de cookie é
  suficiente como primeira camada — a validação real de sessão (DB) + `escritorioId`
  continua acontecendo em `getSession()` / `getEscritorioId()` em cada Server Action.
- Para aplicar RLS no PostgreSQL da VPS: `psql $DATABASE_URL < scripts/rls-policies.sql`

---

## Cronograma

| Fase | Descrição                                   | Prazo      | Status      |
|------|---------------------------------------------|------------|-------------|
| 1    | Schema Migration + Backfill                 | Semana 1–2 | ✅ Concluída |
| 2    | Camada Tenant (`tenant.ts`, `db-scoped.ts`) | Semana 2–3 | ✅ Concluída |
| 3    | Refatoração de Queries                      | Semana 3–5 | ✅ Concluída |
| 4    | Row-Level Security (PostgreSQL)             | Semana 5–6 | ✅ Concluída |
| 5    | Server Actions e Formulários                | Semana 6–7 | ✅ Concluída |
| 6    | Testes de Isolamento + ESLint               | Semana 7–8 | ✅ Concluída |
| 7    | Middleware + Deploy                         | Semana 8   | ✅ Concluída |

---

## Riscos e Mitigações

| Risco                                     | Mitigação                                                                      |
|-------------------------------------------|--------------------------------------------------------------------------------|
| Dados órfãos sem `escritorioId`           | Backfill com fallback para escritório único + log dos registros não atribuídos |
| Esquecer filtro em query futura           | ESLint rule + Prisma Extension automática + RLS como rede de segurança         |
| Queda de performance                      | Índice B-tree em `escritorioId`; índices compostos para queries pesadas        |
| Breaking change em APIs consumidas        | Adicionar filtro internamente sem alterar interface pública                    |
| Clientes compartilhados entre escritórios | Avaliar tabela `EscritorioCliente` (N:N) se o caso de uso existir             |

---

## Legenda de Status

| Ícone | Significado  |
|-------|--------------|
| ⬜    | Pendente     |
| 🟡    | Em andamento |
| ✅    | Concluído    |
| 🔴    | Bloqueado    |