# Revisão do Projeto — Sistema Jurídico ADV

**Data da revisão:** 2026  
**Escopo:** estrutura, stack, documentação, alinhamento playbook/gestão e pontos de atenção.

---

## 1. Visão geral

| Aspecto | Situação |
|--------|----------|
| **Nome** | Sistema Jurídico (sistema-juridico) |
| **Stack** | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Prisma 7, PostgreSQL, better-auth |
| **Objetivo** | Sistema de gestão para escritório de advocacia: processos, clientes, prazos, publicações, demandas, comunicação (WhatsApp/e-mail), financeiro, atendimentos |

O projeto está **bem estruturado**, com documentação (playbook nacional, design system, gestão de demandas) e código organizado em camadas (DAL, actions, services, componentes).

---

## 2. Estrutura do código

### 2.1 Frontend (App Router)

- **Rotas principais:** `(dashboard)/` (dashboard, clientes, processos, agenda, prazos, tarefas, publicações, distribuição, demandas, comunicacao, financeiro, controladoria, atendimentos, documentos) e `(admin)/` (configurações, equipe jurídica, integrações, workflows, operações, publicações, demandas, comunicação).
- **Layout:** sidebar fixa, header com notificações, tema escuro/claro (design system aplicado em `globals.css`).
- **Componentes:** UI reutilizáveis (`button`, `badge`, `modal`, `form-fields`), módulos por domínio (processos, clientes, demandas, publicações, etc.).

### 2.2 Backend / dados

- **Prisma:** schema único em `prisma/schema.prisma`, client gerado em `src/generated/prisma`. Uso de **Prisma + adapter PG** (`@prisma/adapter-pg`, `pg`).
- **Ações (Server Actions):** `src/actions/` (auth, demandas, admin, etc.) com validação Zod.
- **DAL:** `src/lib/dal/` (processos, clientes, tarefas, publicacoes, demandas, agenda, financeiro, comunicação, etc.).
- **Serviços:** `src/lib/services/` (Kimi/IA, publicações, distribuição, demandas-config, event-triggers, communication-engine).
- **Integrações:** calendário (Google/Outlook), WhatsApp (Baileys, Evolution API), e-mail.

### 2.3 Documentação

- **PLAYBOOK_AUTOMACAO_NACIONAL_92.md:** visão “1 clique” para 92 tribunais (DataJud, diários, intimações), infra (Postgres + Redis + Worker), schema sugerido, variáveis, BullMQ.
- **design-system.md:** paleta, tipografia, componentes, wireframes.
- **gestao-demandas.md:** personas, requisitos de gestão/delegação, IA (Kimi), integração com entidades existentes.

---

## 3. Alinhamento documentação ↔ implementação

### 3.1 O que está alinhado

- **Modelo de dados:** Prisma cobre clientes, processos, prazos, tarefas, publicações, distribuição, comunicação, financeiro, atendimentos, workflows, notificações, auditoria — compatível com o escopo do playbook e da gestão de demandas.
- **Design system:** `globals.css` usa variáveis e temas (light/dark) coerentes com `design-system.md` (bg-primary/secondary, accent, semantic colors, font-sans/display/mono).
- **Funcionalidades de gestão:** Módulo de demandas (planejamento, redistribuição, IA, planos) e ações em `demandas.ts` refletem requisitos de gestão e delegação (priorização, redistribuição, Kimi).
- **Publicações e IA:** Serviços de captura, triagem, prazos com IA (Kimi), distribuição e OAB existem em `lib/services/` e são usados na UI.

### 3.2 Gaps em relação ao playbook (produção nacional)

| Item | Playbook | Projeto atual |
|------|----------|----------------|
| **Redis + BullMQ** | Obrigatório para filas (jobs nacionais, workers) | Não implementado (sem BullMQ/ioredis no `package.json`). Apenas menção a “Redis” em comentário (outlook-calendar). |
| **Worker separado** | App Next + Worker Node para processar filas | Tudo no mesmo app Next (sem `apps/worker`). |
| **Estrutura monorepo** | `apps/web`, `apps/worker`, `packages/db`, `packages/queue`, `packages/connectors`, etc. | Monólito: single app em `src/`, Prisma na raiz. |
| **docker-compose** | Postgres + Redis | Apenas Postgres. |
| **Variáveis de ambiente** | `REDIS_URL`, `DATAJUD_API_KEY`, `KIMI_*`, `ENCRYPTION_KEY_BASE64` | `.env.example` tem DATABASE_URL, Better Auth, SMTP, KIMI_*; faltam REDIS_URL, DATAJUD (e encryption se usado). |
| **Modelo Tribunal / captura nacional** | Schema com Tribunal, Jobs, etc. | Schema atual focado em escritório (sem modelo Tribunal dedicado; publicações têm `tribunal` como string). |

Nenhum desses gaps invalida o que já existe: o sistema está coerente para **escopo escritório**. Para evoluir ao “orquestrador 92 tribunais” do playbook, será preciso acrescentar Redis/BullMQ, worker e, se desejado, estrutura de monorepo e modelo Tribunal.

---

## 4. Pontos de atenção técnicos

### 4.1 Schema Prisma

- **TarefaComentario:** tem `userId` mas **sem relação `User`** no schema. Para integridade e joins (ex.: exibir nome de quem comentou), considerar adicionar `user User @relation(...)` em `TarefaComentario` e `tarefaComentarios TarefaComentario[]` em `User`.
- **Escritório:** modelo `Escritorio` existe e é referenciado por Feriado, TipoAcao, FaseProcessual, etc. Verificar se há **multi-tenancy** (por exemplo, filtro por `escritorioId` em todas as queries que precisem de isolamento). No schema não há `escritorioId` em User/Advogado/Cliente/Processo — pode ser intencional (single-tenant por instalação).

### 4.2 Autenticação e sessão

- **better-auth** em uso; variáveis `BETTER_AUTH_*` no `.env.example`.
- Layout do dashboard usa `getSession()` e redireciona para `/login` se não houver usuário — fluxo consistente.

### 4.3 Dependências

- **package.json:** Next 16, React 19, Prisma 7, Tailwind 4, Zustand, Zod, date-fns, better-auth, Baileys, googleapis, nodemailer, xlsx, etc. Nenhuma versão obviamente quebrada detectada.
- Scripts úteis: `db:generate`, `db:push`, `db:migrate`, `db:seed`, `db:studio`, `equipe:setup`, testes de distribuição e publicações.

### 4.4 Segurança e ambiente

- `.env` não deve ser versionado; `.env.example` está adequado como modelo.
- Chaves de API (Kimi, SMTP, etc.) devem ficar apenas em ambiente; não há hardcode de segredos nos arquivos vistos.

---

## 5. Recomendações resumidas

1. **Curto prazo (manter e melhorar o atual)**  
   - Opcional: adicionar relação `User` em `TarefaComentario` no Prisma e migração.  
   - Manter documentação (playbook, design-system, gestao-demandas) atualizada quando surgirem novas telas ou fluxos.

2. **Se o objetivo for “automação nacional 92 tribunais”**  
   - Introduzir Redis e BullMQ; adicionar `REDIS_URL` ao `.env.example` e ao `docker-compose` (serviço Redis).  
   - Implementar workers (em processo separado ou, depois, em `apps/worker`) para jobs de captura/sync.  
   - Alinhar schema ao playbook (ex.: modelo Tribunal, jobs, filas) e variáveis (DATAJUD_API_KEY, etc.).  

3. **Operação**  
   - Usar `docker-compose` atual para Postgres em dev; quando houver filas, subir Redis no mesmo compose.  
   - Manter seeds e scripts de teste (`test:distribuicao`, `test:publicacoes:*`) para validar regras de negócio após mudanças.

---

## 6. Conclusão

O **Sistema Jurídico ADV** está consistente com a documentação de produto (design system, gestão de demandas) e com um escopo focado em escritório: processos, clientes, prazos, tarefas, publicações, distribuição, demandas com IA, comunicação e financeiro. A revisão não encontrou inconsistências graves; os principais gaps são em relação ao **playbook de automação nacional** (Redis/BullMQ, worker, monorepo, Tribunal), que representa uma evolução futura. Recomenda-se tratar o playbook como roteiro de expansão e manter a base atual estável e documentada.
