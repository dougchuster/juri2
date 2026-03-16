# 🏗️ Arquitetura Técnica — Sistema Jurídico

> **Projeto:** Sistema de Gestão para Escritório de Advocacia
> **Referência:** Padrão AdvBox + Next.js Fullstack Template 2026
> **Versão:** 1.0
> **Data:** 2026-02-12

---

## 1. Decisão Arquitetural

### Tipo: Monólito Modular (Next.js Full-Stack)

```yaml
Requisitos:
  - 20-50 usuários simultâneos
  - Equipe pequena (1-2 devs)
  - 11 módulos integrados
  - Single-tenant (1 escritório)
  - Time-to-market: ágil por fases

Decisão:
  Estrutura: Monólito Modular
  Justificativa: Simples, rápido, todos módulos compartilham dados
  Futuro: Se necessário, extrair módulos em microservices

Trade-offs Aceitos:
  - Monólito → Não escala independentemente (20-50 users não justifica)
  - Single-tenant → Sem SaaS na v1.0 (pode migrar depois)
  - Server Actions → Substituem API Routes tradicionais (mais simples)
```

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão | Justificativa |
|--------|------------|--------|---------------|
| **Framework** | Next.js | v16+ (App Router + Turbopack) | Full-stack, SSR/SSG, Server Actions |
| **Linguagem** | TypeScript | v5+ (Strict Mode) | Tipagem forte, menos bugs |
| **Banco de Dados** | PostgreSQL | v16+ | ACID, relacional, perfeito para dados jurídicos |
| **ORM** | Prisma | v6+ | Type-safe, migrations, seed |
| **Estilização** | Tailwind CSS | v4.0 (CSS-first) | Utility-first, tema dark nativo |
| **Autenticação** | Better Auth | - | Self-hosted, RBAC nativo, LGPD-friendly |
| **Validação** | Zod | v3+ | Schema validation (API & Forms) |
| **UI Components** | shadcn/ui | Latest | Componentes acessíveis, customizáveis |
| **Gráficos** | Recharts | v2+ | React-native charts para Dashboard/BI |
| **Editor Texto** | TipTap | v2+ | Editor rich-text para documentos jurídicos |
| **PDF** | @react-pdf/renderer | - | Geração de PDF para documentos e relatórios |
| **E-mail** | Nodemailer + React Email | - | Envio de notificações e cobranças |
| **Calendar** | FullCalendar | v6+ | Visão de agenda integrada |
| **DnD (Kanban)** | @dnd-kit | - | Drag-and-drop para quadros Kanban |
| **Estado** | Zustand | v5+ | State management leve para client-side |
| **Testes** | Vitest + Playwright | - | Unit + E2E |
| **Deploy** | Docker + VPS | - | Controle total, custo baixo |

---

## 3. Estrutura de Diretórios

```
sistema-juridico/
├── prisma/
│   ├── schema.prisma              # Schema do banco de dados
│   ├── seed.ts                     # Dados iniciais (feriados, tipos de ação, etc.)
│   └── migrations/                 # Histórico de migrações
│
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Rotas públicas de autenticação
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/            # Rotas protegidas (requerem login)
│   │   │   ├── layout.tsx          # Layout com Sidebar + Header
│   │   │   │
│   │   │   ├── page.tsx            # Dashboard principal (KPIs)
│   │   │   │
│   │   │   ├── clientes/           # Módulo CRM Jurídico
│   │   │   │   ├── page.tsx        # Lista de clientes
│   │   │   │   ├── novo/
│   │   │   │   │   └── page.tsx    # Cadastro de cliente
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Detalhe do cliente
│   │   │   │       └── editar/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── processos/          # Módulo Processos
│   │   │   │   ├── page.tsx        # Lista / Kanban de processos
│   │   │   │   ├── novo/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Detalhe do processo (tabs)
│   │   │   │       ├── documentos/
│   │   │   │       ├── financeiro/
│   │   │   │       ├── tarefas/
│   │   │   │       └── movimentacoes/
│   │   │   │
│   │   │   ├── prazos/             # Módulo Prazos & Intimações
│   │   │   │   ├── page.tsx        # Calendário / Lista de prazos
│   │   │   │   └── novo/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── tarefas/            # Módulo Tarefas & Taskscore
│   │   │   │   ├── page.tsx        # Kanban de tarefas
│   │   │   │   ├── meu-score/
│   │   │   │   │   └── page.tsx    # Taskscore pessoal
│   │   │   │   └── equipe/
│   │   │   │       └── page.tsx    # Produtividade da equipe
│   │   │   │
│   │   │   ├── atendimentos/       # Módulo Atendimentos
│   │   │   │   ├── page.tsx        # Pipeline de atendimento
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── financeiro/         # Módulo Financeiro
│   │   │   │   ├── page.tsx        # Visão geral financeiro
│   │   │   │   ├── contas-receber/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── contas-pagar/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── fluxo-caixa/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── relatorios/
│   │   │   │       └── page.tsx    # DRE / DFC
│   │   │   │
│   │   │   ├── documentos/         # Módulo Editor de Documentos
│   │   │   │   ├── page.tsx        # Biblioteca de modelos
│   │   │   │   ├── modelos/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── editor/
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── controladoria/      # Módulo Controladoria Jurídica
│   │   │   │   ├── page.tsx        # Painel de controladoria
│   │   │   │   ├── estoque/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── safras/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── relatorios/         # Relatórios & BI
│   │   │   │   ├── page.tsx        # Hub de relatórios
│   │   │   │   ├── produtividade/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── processos/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── financeiro/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── agenda/             # Calendário unificado
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── admin/              # Módulo Administração
│   │   │       ├── page.tsx        # Painel admin
│   │   │       ├── usuarios/
│   │   │       │   └── page.tsx
│   │   │       ├── permissoes/
│   │   │       │   └── page.tsx
│   │   │       ├── escritorio/
│   │   │       │   └── page.tsx    # Dados do escritório, feriados
│   │   │       ├── feriados/
│   │   │       │   └── page.tsx
│   │   │       └── logs/
│   │   │           └── page.tsx    # Log de auditoria
│   │   │
│   │   ├── api/                    # Route Handlers (webhooks, integrações)
│   │   │   ├── webhooks/
│   │   │   │   └── payment/
│   │   │   │       └── route.ts    # Webhook gateway de pagamento
│   │   │   └── calendar/
│   │   │       └── sync/
│   │   │           └── route.ts    # Sync com Google Calendar
│   │   │
│   │   ├── layout.tsx              # Root Layout
│   │   ├── page.tsx                # Landing / Redirect
│   │   └── globals.css             # Tailwind v4 theme
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── kanban-board.tsx
│   │   │   └── ...
│   │   ├── layout/                 # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── forms/                  # Formulários (Client Components)
│   │   │   ├── cliente-form.tsx
│   │   │   ├── processo-form.tsx
│   │   │   ├── tarefa-form.tsx
│   │   │   ├── prazo-form.tsx
│   │   │   └── financeiro-form.tsx
│   │   ├── charts/                 # Componentes de gráficos
│   │   │   ├── kpi-card.tsx
│   │   │   ├── bar-chart.tsx
│   │   │   ├── line-chart.tsx
│   │   │   ├── pie-chart.tsx
│   │   │   └── taskscore-gauge.tsx
│   │   └── modules/                # Componentes específicos de módulo
│   │       ├── processo-timeline.tsx
│   │       ├── prazo-alert.tsx
│   │       ├── pipeline-stage.tsx
│   │       └── documento-editor.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                   # Prisma singleton client
│   │   ├── dal.ts                  # Data Access Layer (server-only)
│   │   ├── utils.ts                # Funções utilitárias
│   │   ├── constants.ts            # Constantes do sistema
│   │   ├── auth.ts                 # Configuração Better Auth
│   │   ├── email.ts                # Configuração Nodemailer
│   │   ├── pdf.ts                  # Gerador de PDF
│   │   ├── prazo-utils.ts          # Cálculos de prazos (dias úteis, feriados)
│   │   ├── taskscore.ts            # Lógica de cálculo Taskscore
│   │   └── validators/             # Schemas Zod compartilhados
│   │       ├── cliente.ts
│   │       ├── processo.ts
│   │       ├── tarefa.ts
│   │       ├── prazo.ts
│   │       └── financeiro.ts
│   │
│   ├── actions/                    # Server Actions (mutações)
│   │   ├── clientes.ts
│   │   ├── processos.ts
│   │   ├── tarefas.ts
│   │   ├── prazos.ts
│   │   ├── atendimentos.ts
│   │   ├── financeiro.ts
│   │   ├── documentos.ts
│   │   ├── equipe.ts
│   │   └── admin.ts
│   │
│   ├── queries/                    # Server-only data queries
│   │   ├── clientes.ts
│   │   ├── processos.ts
│   │   ├── tarefas.ts
│   │   ├── prazos.ts
│   │   ├── financeiro.ts
│   │   ├── dashboard.ts
│   │   ├── controladoria.ts
│   │   └── relatorios.ts
│   │
│   ├── hooks/                      # React hooks customizados
│   │   ├── use-taskscore.ts
│   │   ├── use-prazos.ts
│   │   └── use-filters.ts
│   │
│   ├── types/                      # TypeScript types globais
│   │   ├── index.ts
│   │   ├── processo.ts
│   │   ├── cliente.ts
│   │   └── financeiro.ts
│   │
│   └── middleware.ts               # Auth middleware (proteger rotas)
│
├── public/
│   ├── logo.svg
│   └── assets/
│
├── docker-compose.yml              # PostgreSQL + App
├── Dockerfile                      # Imagem de produção
├── .env.example                    # Variáveis de ambiente
├── next.config.ts                  # Configuração Next.js
├── tailwind.config.ts              # (Tailwind v4 usa CSS, mas compat)
├── tsconfig.json
├── package.json
└── README.md
```

---

## 4. Camadas da Aplicação

```mermaid
graph TB
    subgraph Cliente["🖥️ Browser (Client)"]
        UI["React Components<br/>shadcn/ui + Tailwind"]
        Forms["Client Forms<br/>useActionState + Zod"]
        Charts["Dashboard Charts<br/>Recharts"]
        Kanban["Kanban Boards<br/>@dnd-kit"]
        Editor["Editor Docs<br/>TipTap"]
    end

    subgraph Server["⚙️ Next.js Server"]
        Pages["Server Components<br/>Data Fetching direto"]
        Actions["Server Actions<br/>Mutações + Validação"]
        Queries["Queries Layer<br/>Consultas otimizadas"]
        API["API Routes<br/>Webhooks only"]
        Middleware["Auth Middleware<br/>RBAC + Session"]
        CRON["Cron Jobs<br/>Alertas de prazo"]
    end

    subgraph Data["🗄️ Data Layer"]
        Prisma["Prisma ORM<br/>Type-safe queries"]
        PG["PostgreSQL<br/>Dados jurídicos"]
        S3["Armazenamento<br/>Documentos/Uploads"]
    end

    subgraph External["🔗 Integrações"]
        Email["Nodemailer<br/>SMTP"]
        Calendar["Google Calendar<br/>API"]
        Payment["Gateway Pagamento<br/>Asaas/Stripe"]
    end

    UI --> Pages
    Forms --> Actions
    Charts --> Queries
    Pages --> Queries
    Actions --> Prisma
    Queries --> Prisma
    API --> Prisma
    Prisma --> PG
    Actions --> S3
    CRON --> Email
    Actions --> Email
    API --> Payment
    Pages --> Calendar

    style Cliente fill:#1a1a2e,stroke:#00d4ff,color:#fff
    style Server fill:#16213e,stroke:#00d4ff,color:#fff
    style Data fill:#0f3460,stroke:#00d4ff,color:#fff
    style External fill:#533483,stroke:#00d4ff,color:#fff
```

---

## 5. Padrão de Desenvolvimento

### 5.1 Fluxo de Dados (Server Components + Server Actions)

```
┌─────────────────────────────────────────────────────────────┐
│                     LEITURA (Data Fetching)                  │
│                                                              │
│  Page (Server Component)                                     │
│    → import { getProcessos } from "@/queries/processos"      │
│    → const data = await getProcessos(filters)                │
│    → return <ProcessosList data={data} />                    │
│                                                              │
│  ✅ Sem useEffect · Sem loading state · Sem API fetch        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     ESCRITA (Mutations)                       │
│                                                              │
│  Form (Client Component)                                     │
│    → const [state, action] = useActionState(criarProcesso)   │
│    → <form action={action}>                                  │
│    →   <input name="numero_cnj" />                           │
│    →   <SubmitButton />                                      │
│    → </form>                                                 │
│                                                              │
│  Server Action (src/actions/processos.ts)                    │
│    → "use server"                                            │
│    → Zod validation → Prisma mutation → revalidatePath       │
│                                                              │
│  ✅ Sem fetch manual · Sem API route · Type-safe E2E         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Autenticação e RBAC

```typescript
// Perfis de acesso (roles)
enum Role {
  ADMIN = "ADMIN",             // Acesso total
  SOCIO = "SOCIO",             // Acesso total + BI
  ADVOGADO = "ADVOGADO",       // Processos atribuídos + tarefas
  CONTROLADOR = "CONTROLADOR", // Controladoria + relatórios
  ASSISTENTE = "ASSISTENTE",   // Tarefas + documentos (read-only processos)
  FINANCEIRO = "FINANCEIRO",   // Módulo financeiro completo
  SECRETARIA = "SECRETARIA",   // CRM + agenda + atendimentos
}

// Permissões por módulo
type Permission = {
  module: string;
  actions: ("create" | "read" | "update" | "delete")[];
};
```

| Role | Dashboard | CRM | Processos | Prazos | Tarefas | Financeiro | Controladoria | Admin |
|------|-----------|-----|-----------|--------|---------|------------|---------------|-------|
| ADMIN | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| SOCIO | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ❌ |
| ADVOGADO | ✅ Próprio | ✅ Read | ✅ Próprios | ✅ Próprios | ✅ Próprias | ✅ Read próprio | ❌ | ❌ |
| CONTROLADOR | ✅ Full | ✅ Read | ✅ Read | ✅ Full | ✅ Read | ✅ Read | ✅ Full | ❌ |
| FINANCEIRO | ✅ Financeiro | ✅ Read | ❌ | ❌ | ❌ | ✅ Full | ❌ | ❌ |
| ASSISTENTE | ✅ Próprio | ✅ Read | ✅ Read | ✅ Read | ✅ Próprias | ❌ | ❌ | ❌ |
| SECRETARIA | ✅ Atend. | ✅ Full | ❌ | ✅ Read | ❌ | ❌ | ❌ | ❌ |

---

## 6. Variáveis de Ambiente

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sistema_juridico"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Sistema Jurídico"

# Auth (Better Auth)
BETTER_AUTH_SECRET="your-secret-key-here"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="alerts@escritorio.com"
SMTP_PASS="app-password"
EMAIL_FROM="Sistema Jurídico <alerts@escritorio.com>"

# Storage (S3 ou local)
STORAGE_TYPE="local"  # "local" | "s3"
STORAGE_PATH="./uploads"
# S3_BUCKET=
# S3_REGION=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=

# Gateway de pagamento (Asaas)
PAYMENT_GATEWAY_API_KEY=""
PAYMENT_GATEWAY_WEBHOOK_SECRET=""

# Google Calendar (OAuth)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cron Jobs
CRON_PRAZO_ALERT_SCHEDULE="0 8 * * *"  # 8h diariamente
```

---

## 7. Modelo de Deploy

### 7.1 Docker Compose (Desenvolvimento + Produção)

```mermaid
graph LR
    subgraph Docker["🐳 Docker Compose"]
        App["Next.js App<br/>Port 3000"]
        DB["PostgreSQL<br/>Port 5432"]
        Redis["Redis (opcional)<br/>Port 6379"]
    end

    App --> DB
    App --> Redis

    Nginx["Nginx<br/>Reverse Proxy<br/>SSL/HTTPS"] --> App
    Client["🌐 Browser"] --> Nginx

    style Docker fill:#1a1a2e,stroke:#00d4ff,color:#fff
    style Nginx fill:#0f3460,stroke:#00d4ff,color:#fff
```

### 7.2 Estratégia

| Ambiente | Infra | Banco | URL |
|----------|-------|-------|-----|
| **Desenvolvimento** | Docker Compose local | PostgreSQL local | `localhost:3000` |
| **Staging** | VPS + Docker | PostgreSQL container | `staging.escritorio.com` |
| **Produção** | VPS + Docker | PostgreSQL gerenciado | `app.escritorio.com` |

### 7.3 CI/CD Pipeline

```
Push → GitHub Actions → Lint + Type Check + Tests → Build Docker Image → Deploy VPS
```

---

## 8. Cronograma de Jobs (Automações)

| Job | Frequência | Descrição |
|-----|------------|-----------|
| **Alerta de Prazos** | Diário (8h) | Envia e-mail para prazos em D-5, D-3, D-1, D-0 |
| **Verificar Inadimplência** | Diário (9h) | Marca clientes com faturas > 30 dias |
| **Cobrança Recorrente** | Diário (7h) | Gera faturas de cobranças recorrentes no vencimento |
| **Processos Estagnados** | Semanal (Seg 8h) | Alerta sobre processos sem movimentação > 120 dias |
| **Aniversariantes** | Diário (8h) | Notifica equipe sobre aniversariantes do dia |
| **Backup DB** | Diário (3h) | Dump do PostgreSQL para S3/local |

---

## 9. Segurança

| Aspecto | Implementação |
|---------|---------------|
| **Autenticação** | Better Auth com sessions seguras (httpOnly cookies) |
| **Autorização** | RBAC por role + permissões por módulo |
| **Validação** | Zod em Server Actions (nunca confiar no client) |
| **SQL Injection** | Prisma ORM (queries parametrizadas) |
| **XSS** | React escapa por padrão + CSP headers |
| **CSRF** | Server Actions têm proteção CSRF nativa |
| **LGPD** | Consentimento, direito ao esquecimento, exportação de dados |
| **Auditoria** | Log de todas ações CRUD críticas com user_id + timestamp |
| **Sessão** | Expira em 30 min de inatividade |
| **Upload** | Validação de tipo MIME + tamanho máximo (50MB) |

---

## 10. Módulos — Ordem de Implementação

> Implementação incremental, módulo por módulo, com dependências corretas.

```mermaid
gantt
    title Ordem de Implementação por Módulos
    dateFormat  YYYY-MM-DD
    section Fundação
        Setup & Auth & Layout           :a1, 2026-02-15, 5d
        Admin & Configurações           :a2, after a1, 3d
    section Core
        Cadastros Base (Clientes/Equipe):b1, after a2, 5d
        Processos Judiciais             :b2, after b1, 7d
        Prazos & Intimações & Agenda    :b3, after b2, 5d
    section Produtividade
        Tarefas & Taskscore             :c1, after b3, 7d
        Workflow Automático             :c2, after c1, 3d
    section Atendimento
        Atendimentos & Pipeline         :d1, after c2, 4d
    section Financeiro
        Financeiro Completo             :e1, after d1, 7d
        Cobranças & Gateway             :e2, after e1, 3d
    section Documentos
        Editor & Modelos                :f1, after e2, 5d
    section Inteligência
        Dashboard & BI                  :g1, after f1, 5d
        Controladoria Jurídica          :g2, after g1, 4d
        Relatórios & Exportação         :g3, after g2, 3d
    section Integrações
        Google Calendar                 :h1, after g3, 3d
        Cron Jobs (Alertas)             :h2, after h1, 2d
    section Finalização
        Testes E2E & Polish             :i1, after h2, 5d
```

| Fase | Módulo | Estimativa | Dependências |
|------|--------|------------|--------------|
| 1 | Setup + Auth + Layout | 5 dias | Nenhuma |
| 2 | Admin + Configurações | 3 dias | Fase 1 |
| 3 | Cadastros Base (Clientes/Equipe) | 5 dias | Fase 2 |
| 4 | Processos Judiciais | 7 dias | Fase 3 |
| 5 | Prazos & Intimações & Agenda | 5 dias | Fase 4 |
| 6 | Tarefas & Taskscore | 7 dias | Fase 5 |
| 7 | Workflow Automático | 3 dias | Fase 6 |
| 8 | Atendimentos & Pipeline | 4 dias | Fase 3 |
| 9 | Financeiro Completo | 7 dias | Fase 4 |
| 10 | Cobranças & Gateway | 3 dias | Fase 9 |
| 11 | Editor & Modelos | 5 dias | Fase 4 |
| 12 | Dashboard & BI | 5 dias | Fases 3-9 |
| 13 | Controladoria Jurídica | 4 dias | Fases 4, 9, 12 |
| 14 | Relatórios & Exportação | 3 dias | Fase 12 |
| 15 | Integrações (Calendar, Cron) | 5 dias | Fase 5 |
| 16 | Testes E2E & Polish | 5 dias | Todas |
| | **TOTAL ESTIMADO** | **~76 dias** | |

---

## 11. ADRs (Decisões Arquiteturais Registradas)

### ADR-001: Next.js Monólito vs Backend Separado
- **Decisão:** Next.js full-stack (monólito)
- **Alternativa:** Next.js frontend + FastAPI backend
- **Razão:** 20-50 users, equipe pequena, Server Actions eliminam necessidade de API REST separada. Prisma direto nos Server Components.
- **Migração futura:** Extrair API se necessário (Next.js API Routes já existe como escape hatch)

### ADR-002: Better Auth vs Clerk vs NextAuth
- **Decisão:** Better Auth (self-hosted)
- **Alternativa:** Clerk (hosted), NextAuth
- **Razão:** LGPD requer controle total dos dados de autenticação. Better Auth é self-hosted, RBAC nativo, sem dependência de terceiros.

### ADR-003: Server Actions vs API Routes
- **Decisão:** Server Actions para todas mutações
- **Alternativa:** API Routes tradicionais
- **Razão:** Server Actions são type-safe, reduzem boilerplate, proteção CSRF nativa. API Routes usadas apenas para webhooks e integrações externas.

### ADR-004: Prisma vs Drizzle ORM
- **Decisão:** Prisma
- **Alternativa:** Drizzle ORM
- **Razão:** Schema declarativo, migrations automáticas, melhor DX para equipe pequena. Drizzle é mais performante, mas a escala de 20-50 users não justifica a complexidade extra.

### ADR-005: TipTap vs Quill vs Slate
- **Decisão:** TipTap para editor de documentos
- **Alternativa:** Quill, Slate
- **Razão:** TipTap é extensível, headless (facilita estilização), suporte a colaboração futura, variáveis de template nativas.

---

## 12. Próximos Passos

| Fase | Entrega | Status |
|------|---------|--------|
| ~~PARTE 1~~ | ~~Escopo e Requisitos~~ | ✅ Aprovado |
| ~~**PARTE 2**~~ | ~~**Arquitetura Técnica**~~ | ✅ Este documento |
| **PARTE 3** | Schema do banco de dados (ERD + Prisma) | ⏳ Próximo |
| **PARTE 4** | Design System + Wireframes | ⏳ |
| **PARTE 5** | Implementação por módulos | ⏳ |

---

> **Documento gerado por:** `@orchestrator` + `@project-planner` + `@architecture`
> **Status:** 📝 Aguardando revisão e aprovação
