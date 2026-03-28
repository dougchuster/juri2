# Mapeamento Completo — Sistema Jurídico ADV

> Varredura realizada em 2026-03-28
> Objetivo: Inventário total de funcionalidades, módulos, integrações e logística do sistema

---

## 1. Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| **Framework** | Next.js 16.1.6 (App Router) + TypeScript |
| **Frontend** | React 19, TailwindCSS 4, Zustand 5, Recharts, Three.js, Motion |
| **Backend** | Node.js + Custom Server (ts-node) + Socket.io 4.8 |
| **Banco de Dados** | PostgreSQL 16 (via Prisma 7.5) |
| **Cache/Filas** | Redis 7 + BullMQ 5.69 |
| **Autenticação** | Better-Auth 1.4 + OAuth (Google/Microsoft) + MFA (TOTP) |
| **IA** | Google Gemini 3.1 Flash-Lite (principal), Kimi/Moonshot (legado) |
| **WhatsApp** | Evolution API v2.2.3 / Baileys (embedded) / Meta Cloud API |
| **Pagamentos** | Asaas (PIX, Boleto, Cartão) |
| **Assinatura Digital** | ClickSign |
| **Email** | Nodemailer (SMTP/Gmail) |
| **Calendário** | Google Calendar API + Microsoft Outlook/Graph |
| **Deploy** | Docker Compose + Nginx + PM2 + VPS Hostinger |
| **Testes** | Playwright 1.58 (E2E) + scripts de teste unitário |
| **Ícones** | Phosphor Icons + Lucide React |
| **Drag & Drop** | @hello-pangea/dnd |
| **Documentos** | xlsx, pdf-parse, mammoth (Word) |

---

## 2. Arquitetura Geral

```
┌──────────────────────────────────────────────────────────────┐
│                    NGINX (SSL/Let's Encrypt)                  │
│                    HSTS + Security Headers                    │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              CUSTOM SERVER (ts-node + Socket.io)              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Next.js 16  │  │  Socket.io   │  │  BullMQ Worker      │ │
│  │  App Router  │  │  Real-time   │  │  Background Jobs    │ │
│  │  SSR + API   │  │  Chat/Notify │  │  Queues             │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼──────────────────────┼────────────┘
          │                │                      │
┌─────────▼────────────────▼──────────────────────▼────────────┐
│                     PRISMA ORM 7.5                            │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │ PostgreSQL 16 │  │   Redis 7    │                          │
│  │  50+ tabelas  │  │ Cache/Queue  │                          │
│  └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────────────────────┐
│                   INTEGRAÇÕES EXTERNAS                        │
│  DataJud │ Evolution │ Gemini │ Asaas │ ClickSign │ Meta     │
│   (CNJ)  │(WhatsApp) │  (IA)  │($$)   │  (Docs)   │(Pixel)  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Módulos e Funcionalidades — Inventário Completo

### 3.1 AUTENTICAÇÃO & SEGURANÇA

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Login com email/senha | ✅ | Better-Auth + bcrypt |
| OAuth Google | ✅ | `/api/auth/google/login` + callback |
| OAuth Microsoft | ✅ | `/api/auth/microsoft/login` + callback |
| MFA/2FA (TOTP) | ✅ | Recovery codes + trusted devices |
| RBAC granular | ✅ | Roles + permissions matrix + cache |
| Matriz de permissões visual | ✅ | `/admin/permissoes` com editor de templates por role |
| Audit log | ✅ | Registro de todas as ações |
| Rate limiting | ✅ | Middleware + Nginx |
| LGPD compliance | ✅ | Exports, retenção, anonimização |
| Multi-tenant (por escritório) | ✅ | `escritorioId` isolando dados |
| Root Admin | ✅ | Painel separado (`/root-admin`) com gestão de orgs e usuários |
| Página "sem acesso" | ✅ | Redirect para `/sem-acesso` quando sem permissão |
| Onboarding | ✅ | Fluxo guiado em `/onboarding` |
| Perfil do usuário | ✅ | `/perfil` com dados e preferências |

---

### 3.2 GESTÃO DE PROCESSOS JURÍDICOS

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Cadastro de processos | ✅ | Form completo (`processo-form.tsx`) |
| Edição de processos | ✅ | Modal de edição (`processo-edit-modal.tsx`) |
| Detalhe do processo | ✅ | Página `/processos/[id]` com header detalhado |
| Lista de processos | ✅ | `/processos` com filtros e busca |
| Andamentos processuais | ✅ | Página dedicada `/andamentos` |
| Captura automática de andamentos | ✅ | Via DataJud (CNJ) com monitoramento contínuo |
| Busca nacional de processos | ✅ | `automacao-nacional.ts` — múltiplos tribunais |
| Monitoramento DataJud | ✅ | Job contínuo com aliases e cache |
| Partes processuais | ✅ | Modelo no Prisma |
| Fases processuais | ✅ | Configurável por área de atuação |
| Tipos de ação | ✅ | Cadastro configurável |
| Áreas de atuação | ✅ | Configurável (`areas-atuacao.ts`) |
| Distribuição de processos | ✅ | Motor de distribuição (`distribution-engine.ts`) + página `/distribuicao` |
| Prazos processuais | ✅ | Página `/prazos` com alertas |
| Publicações (DJE) | ✅ | Captura automática + avaliação de prazo + página `/publicacoes` |
| Protocolos | ✅ | Página `/protocolos` |
| Demandas | ✅ | Gestão de demandas com config (`/demandas`, `/admin/demandas`) |
| Visualização em grafo | ✅ | `/grafo` — relações entre processos (Three.js) |

---

### 3.3 DOCUMENTOS

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Gestão de documentos | ✅ | CRUD em `/documentos` |
| Detalhe do documento | ✅ | `/documentos/[id]` |
| Versionamento | ✅ | `documento-versioning.ts` + `documento-versioning-core.ts` |
| Upload de arquivos | ✅ | Até 50MB (Nginx limit) |
| Suporte PDF | ✅ | `pdf-parse` |
| Suporte Word (.docx) | ✅ | `mammoth` |
| Suporte Excel (.xlsx) | ✅ | `xlsx` |
| Assinatura digital | ✅ | ClickSign (sandbox + produção) |

---

### 3.4 PEÇAS JURÍDICAS & IA

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Geração de peças com IA | ✅ | Google Gemini 3.1 Flash-Lite |
| Página de peças | ✅ | `/pecas` |
| Agente IA — Cível | ✅ | `juridico-agents/agents/civil.ts` |
| Agente IA — Criminal | ✅ | `juridico-agents/agents/criminal.ts` |
| Agente IA — Trabalhista | ✅ | `juridico-agents/agents/trabalhista.ts` |
| Agente IA — Previdenciário | ✅ | `juridico-agents/agents/previdenciario.ts` |
| Agentes jurídicos (página) | ✅ | `/agentes-juridicos` |
| Chatbot de triagem | ✅ | `/admin/chatbot-triagem` com config admin |
| Cálculos jurídicos | ✅ | `/calculos` — monetária, trabalhista, previdenciária |

---

### 3.5 AGENDA & ATENDIMENTO

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Calendário/Agenda | ✅ | `/agenda` com dashboard (`agenda-dashboard.tsx`) |
| Agendamentos CRUD | ✅ | Modal de criação + drawer de detalhes |
| Conclusão de agendamentos | ✅ | Modal dedicado (`agendamento-concluir-modal.tsx`) |
| Recorrência | ✅ | Modelo de recorrência no Prisma |
| Compartilhamento de agenda | ✅ | Modelo de compartilhamento |
| Observadores | ✅ | Modelo de observadores no evento |
| Painel agenda no dashboard | ✅ | `dashboard-agenda-panel.tsx` |
| Sync Google Calendar | ✅ | OAuth + `google-calendar-service.ts` |
| Sync Microsoft Outlook | ✅ | OAuth + `outlook-calendar-service.ts` |
| Legacy sync | ✅ | `agendamento-legacy-sync.ts` |
| Gestão de atendimentos | ✅ | `/atendimentos` |
| Atendimento via email | ✅ | `/atendimento/email` |
| Atendimento via social | ✅ | `/atendimento/social` |
| Automação de atendimento | ✅ | `attendance-automation.ts` + config + core + queue |
| Automação de reuniões | ✅ | `meeting-automation.ts` + `meeting-automation-service.ts` |

---

### 3.6 CRM (Customer Relationship Management)

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Contatos CRUD | ✅ | `/crm/contatos` + `/crm/contatos/[id]` |
| Importação de contatos | ✅ | `/crm/contatos/importar` |
| Edição de contatos (modal) | ✅ | `contact-edit-modal.tsx` |
| Detalhe de contato (sheet) | ✅ | `card-detail-sheet.tsx` |
| Pipeline/Funil de vendas | ✅ | `/crm/pipeline` |
| Campanhas | ✅ | `/crm/campanhas` + CRUD + motor (`campaign-engine.ts`) |
| Listas de contatos | ✅ | `/crm/listas` + `/crm/listas/[id]` |
| Segmentação | ✅ | `/crm/segmentos` + builder modal |
| Fluxos de automação | ✅ | `/crm/fluxos` + `/crm/fluxos/[id]` |
| Templates de mensagem | ✅ | `/crm/templates` |
| Analytics CRM | ✅ | `/crm/analytics` |
| Atividades | ✅ | `/crm/atividades` |
| Configurações CRM | ✅ | `/crm/configuracoes` |
| Scoring de contatos | ✅ | API scoring endpoints |
| Motor de conflitos CRM | ✅ | `crm-conflict-engine.ts` |
| Auth CRM com scopes | ✅ | `crm-auth.ts` + `crm-scope.ts` |
| Card CRM modal | ✅ | `crm-card-modal.tsx` |
| Fila de campanhas | ✅ | `campaign-queue.ts` |

---

### 3.7 COMUNICAÇÃO & CHAT

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Chat interno | ✅ | `/chat` + `internal-chat-page.tsx` |
| Real-time (Socket.io) | ✅ | `socket-server.ts` com Redis adapter |
| Presença online | ✅ | `presence.ts` + `presence-status.ts` + Zustand store |
| Envio de mensagens texto | ✅ | API `/api/chat/conversations/[id]/messages` |
| Envio de áudio | ✅ | API `/api/chat/conversations/[id]/messages/audio` |
| Envio de arquivos | ✅ | API `/api/chat/conversations/[id]/messages/file` |
| Attachments upload | ✅ | API `/api/chat/attachments/upload` |
| Reactions | ✅ | Modelo Reaction no Prisma |
| Read receipts | ✅ | API `/api/chat/conversations/[id]/read` |
| Conversas diretas | ✅ | API `/api/chat/conversations/direct` |
| Mensagem global (modal) | ✅ | `global-message-modal.tsx` |
| Página de comunicação | ✅ | `/comunicacao` |
| Admin comunicação | ✅ | `/admin/comunicacao` + auto-mensagens |
| Motor de comunicação | ✅ | `communication-engine.ts` |
| Triggers de eventos | ✅ | `event-triggers.ts` |

---

### 3.8 WHATSAPP

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Evolution API (principal) | ✅ | v2.2.3 via Docker |
| Baileys embedded (fallback) | ✅ | `@whiskeysockets/baileys 7.0` |
| Meta Cloud API (terceiro) | ✅ | `META_PHONE_NUMBER_ID` + token |
| Múltiplas conexões | ✅ | Admin gerencia N conexões |
| QR Code para autenticar | ✅ | `/api/admin/whatsapp/connections/[id]/qr` |
| Health check | ✅ | `/api/admin/whatsapp/connections/[id]/health` |
| Connect/Disconnect | ✅ | APIs dedicadas |
| Set primary connection | ✅ | Definir conexão principal |
| Validação de conexão | ✅ | `/api/admin/whatsapp/connections/[id]/validate` |
| Webhook de mensagens | ✅ | `/api/webhooks/evolution/messages` |
| Webhook de status | ✅ | `/api/webhooks/evolution/status` |
| Webhook Meta | ✅ | `/api/webhooks/whatsapp/meta` |
| Envio de mensagens | ✅ | Via providers (Evolution/Baileys/Meta) |
| Provider capabilities | ✅ | `provider-capabilities.ts` — abstração multi-provider |
| Config admin WhatsApp | ✅ | `/api/admin/whatsapp/config` |
| Teste de envio | ✅ | `/api/admin/whatsapp/test` |

---

### 3.9 FINANCEIRO

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Dashboard financeiro | ✅ | `/financeiro` + `financeiro-page.tsx` |
| Gráficos financeiros | ✅ | `financeiro-charts.tsx` (Recharts) |
| Contas a pagar | ✅ | `/financeiro/contas-pagar` |
| Contas a receber | ✅ | `/financeiro/contas-receber` |
| Fluxo de caixa | ✅ | `/financeiro/fluxo-caixa` |
| Previsão de caixa | ✅ | `/financeiro/previsao-caixa` |
| Conciliação bancária | ✅ | `/financeiro/conciliacao` |
| Relatórios financeiros | ✅ | `/financeiro/relatorios` |
| Rentabilidade | ✅ | `/financeiro/rentabilidade` + API admin |
| Casos financeiros | ✅ | `/financeiro/casos` |
| Repasses | ✅ | `/financeiro/repasses` |
| Gestão de funcionários | ✅ | `/financeiro/funcionarios` |
| Dados do escritório | ✅ | `/financeiro/escritorio` |
| Configurações financeiras | ✅ | `/financeiro/configuracoes` |
| Pagamentos via Asaas | ✅ | PIX, Boleto, Cartão (sandbox + prod) |
| Faturamento | ✅ | `asaas-billing.ts` |
| Gráfico financeiro (modelo) | ✅ | Modelo GraficoFinanceiro no Prisma |
| Meta Pixel (conversions) | ✅ | Facebook Conversions API server-side |

---

### 3.10 AUTOMAÇÃO & WORKFLOWS

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Motor de automação | ✅ | `automation-engine.ts` |
| Workflows personalizáveis | ✅ | `/admin/workflows` |
| Templates de workflow | ✅ | Modelo WorkflowTemplate no Prisma |
| Execução de workflows | ✅ | Modelo WorkflowExecution |
| Regras de automação | ✅ | Modelo AutomationRule |
| Triggers de eventos | ✅ | `event-triggers.ts` |
| Automação de atendimento | ✅ | Engine + config + core + queue |
| Automação de reuniões | ✅ | `meeting-automation.ts` |
| Distribuição automática | ✅ | `distribution-engine.ts` |
| Auto-mensagens | ✅ | `/admin/comunicacao/auto-mensagens` |

---

### 3.11 JOBS & AGENDAMENTO

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Job Center | ✅ | `job-center.ts` + `job-center-core.ts` + tabela admin |
| Cron Scheduler | ✅ | `scheduler.ts` (12KB) — suporte Vercel Cron + node-cron |
| Filas BullMQ | ✅ | `attendance-queue`, `automacao-queue`, `campaign-queue` |
| Worker dedicado | ✅ | `Dockerfile.worker` + `docker-compose.worker.yml` |
| Job attempts/retries | ✅ | `job-attempts.ts` + modelo JobAttempt |
| Job logs | ✅ | Modelo JobLog |
| Auth para jobs | ✅ | `job-auth.ts` com JOBS_SECRET_KEY |
| Admin job detail | ✅ | `/admin/jobs/[sourceType]/[id]` |

**Jobs registrados:**
1. `automacao-nacional` — Busca nacional de processos
2. `bi-refresh` — Refresh dados BI
3. `datajud-aliases` — Sincronização aliases DataJud
4. `datajud-monitor` — Monitoramento contínuo
5. `demandas` — Processamento de demandas
6. `lgpd-retention` — Política de retenção LGPD
7. `operacoes` — Operações gerais
8. `process` — Processamento geral
9. `publicacoes` — Captura de publicações DJE

---

### 3.12 BI & ANALYTICS

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Business Intelligence | ✅ | `/admin/bi` + `bi-core.ts` + `bi-refresh.ts` |
| Export de dados BI | ✅ | `/api/admin/bi/export` |
| Dashboard principal | ✅ | `/dashboard` |
| Produtividade | ✅ | `/produtividade` |
| Controladoria | ✅ | `/controladoria` |
| Relatórios gerais | ✅ | `/relatorios` |
| Operações jurídicas | ✅ | `/admin/operacoes-juridicas` com report sections |
| Dimensões e fatos (Star Schema) | ✅ | Modelos Dimensão/Fato no Prisma |
| Root admin dashboard | ✅ | `/root-admin` com visão global |

---

### 3.13 PORTAL DO CLIENTE

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Acesso via token único | ✅ | `/portal/[token]` |
| Token secret | ✅ | `PORTAL_TOKEN_SECRET` |
| Página de acesso negado | ✅ | `/portal/acesso-negado` |

---

### 3.14 LANDING PAGE & MARKETING

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Landing page | ✅ | `legal-landing-page.tsx` |
| Meta Pixel server-side | ✅ | Facebook Conversions API por escritório |

---

## 4. Banco de Dados — 50+ Tabelas

### Categorias de Modelos Prisma:

| Categoria | Modelos |
|---|---|
| **Autenticação** | User, Session, MFA configs, Recovery codes |
| **Estrutura Jurídica** | Escritório, TiposAcao, FasesProcessuais, AreasAtuacao |
| **Processos** | Processo, Andamentos, Documentos, Partes, Prazos |
| **Agenda** | Agendamentos, Compartilhamento, Observadores, Recorrências |
| **CRM** | Cliente, Contato, CRMList, Campaign, CampaignMember |
| **Comunicação** | Conversation, Message, MessageAttachment, Reaction |
| **Documentos** | Documento, DocumentoVersao, Templates |
| **Automação** | WorkflowTemplate, WorkflowExecution, AutomationRule |
| **Financeiro** | Fatura, Despesa, GraficoFinanceiro |
| **Integrações** | WhatsApp, Google Calendar, Outlook, ClickSign, Asaas |
| **BI/Analytics** | Dimensões, Fatos (Star Schema) |
| **Auditoria** | AuditLog, PermissaoUsuario, RolePermissao |
| **Jobs** | JobAttempt, JobLog |

---

## 5. API — 135+ Endpoints

### Distribuição por domínio:

| Domínio | Qtd Aprox. | Exemplos |
|---|---|---|
| Admin | ~20 | BI export, chatbot, WhatsApp mgmt, LGPD, integrações |
| Auth | 4 | Google/Microsoft OAuth login + callbacks |
| Automação | 2 | Busca nacional, job detail |
| Chat | 11 | Conversations, messages, audio, file, attachments |
| CRM | 12 | Campaigns, contacts, scoring, workflows, listas |
| Comunicação | 6 | Conversations, messages, send, triggers |
| Demandas | 2 | List, reactivate |
| Documentos | 3 | CRUD, versioning, history |
| Financeiro | ~5 | Rentabilidade, configurações |
| Integrações | 2 | Google Calendar, Outlook |
| Jobs | 9 | Cron, scheduled tasks |
| Publicações | ~3 | Captura, avaliação |
| Webhooks | 3 | Evolution messages, status, Meta |
| Busca | 1 | Busca global |
| Gráficos | ~2 | Grafos de relações |

---

## 6. Server Actions — 36 Módulos

Comunicação frontend → backend via Next.js Server Actions:

`admin` · `agenda` · `agendamento` · `atendimentos` · `attendance-automation` · `auth` · `bi` · `calculos` · `clientes` · `comunicacao` · `conciliacao` · `crm-analytics` · `crm-audiencia` · `crm-segmentos` · `demandas` · `documentos` · `financeiro` · `financeiro-module` · `integrations` · `job-center` · `juridico-agents` · `lgpd` · `meta-pixel` · `mfa` · `notificacoes` · `onboarding` · `password-reset` · `pecas` · `permissoes` · `processos` · `profile` · `protocolos` · `publicacoes` · `root-admin-auth` · `tarefas` · `workflow`

---

## 7. Integrações Externas — Mapa Completo

```
┌────────────────────────────────────────────────────────────────────┐
│                      SISTEMA JURÍDICO ADV                          │
├────────────┬──────────────┬──────────────┬────────────┬────────────┤
│ JUDICIÁRIO │  COMUNICAÇÃO │  FINANCEIRO  │ DOCUMENTOS │    IA      │
│            │              │              │            │            │
│ DataJud    │ Evolution API│ Asaas        │ ClickSign  │ Gemini 3.1 │
│ (CNJ)      │ Baileys      │ (PIX/Boleto/ │ (Assinatura│ Flash-Lite │
│            │ Meta Cloud   │  Cartão)     │  Digital)  │            │
│ Busca em   │              │              │            │ 4 Agentes: │
│ múltiplos  │ SMTP/Gmail   │ Meta Pixel   │ pdf-parse  │ - Cível    │
│ tribunais  │ (Nodemailer) │ (Conversions │ mammoth    │ - Criminal │
│            │              │  API)        │ xlsx       │ - Trabalh. │
│ Publicações│ Socket.io    │              │            │ - Previd.  │
│ (DJE)      │ (Real-time)  │              │            │            │
│            │              │              │            │ Kimi       │
│            │ Google Cal.  │              │            │ (Legado)   │
│            │ MS Outlook   │              │            │            │
└────────────┴──────────────┴──────────────┴────────────┴────────────┘
```

---

## 8. Estrutura de Navegação

```
SIDEBAR PRINCIPAL
├── Dashboard
├── Jurídico
│   ├── Processos
│   ├── Andamentos
│   ├── Prazos
│   ├── Publicações
│   ├── Peças
│   ├── Protocolos
│   ├── Demandas
│   ├── Documentos
│   ├── Cálculos
│   ├── Agentes Jurídicos (IA)
│   └── Grafo (visualização)
├── Agenda
│   ├── Calendário
│   └── Atendimentos
├── CRM
│   ├── Pipeline
│   ├── Contatos
│   ├── Campanhas
│   ├── Listas
│   ├── Segmentos
│   ├── Fluxos de automação
│   ├── Templates
│   ├── Analytics
│   ├── Atividades
│   └── Configurações
├── Comunicação
│   ├── Chat interno
│   ├── Email
│   └── Social
├── Financeiro
│   ├── Dashboard
│   ├── Contas a pagar
│   ├── Contas a receber
│   ├── Fluxo de caixa
│   ├── Previsão de caixa
│   ├── Conciliação
│   ├── Relatórios
│   ├── Rentabilidade
│   ├── Casos
│   ├── Repasses
│   ├── Funcionários
│   ├── Escritório
│   └── Configurações
├── Produtividade
├── Controladoria
├── Distribuição
├── Relatórios
├── Admin
│   ├── Painel
│   ├── API Docs
│   ├── BI
│   ├── Chatbot Triagem
│   ├── Comunicação + Auto-mensagens
│   ├── Demandas Config
│   ├── Equipe Jurídica
│   ├── Integrações
│   ├── Jobs
│   ├── LGPD
│   ├── Operações Jurídicas
│   ├── Permissões (RBAC)
│   ├── Publicações
│   └── Workflows
└── Perfil

PORTAL DO CLIENTE (separado)
└── /portal/[token]

ROOT ADMIN (separado)
├── Dashboard global
├── Organizações
└── Usuários globais
```

---

## 9. Testes Existentes

| Categoria | Scripts |
|---|---|
| E2E | `test:e2e:crud` (Playwright) |
| Funcionários | `test:funcionarios:demo` |
| Distribuição | `test:distribuicao` |
| Chat | `test:chat-interno` |
| Meeting | `test:meeting-automation*` |
| DataJud | `test:automacao:nacional` |
| Multi-tenant | `test:tenant-isolation` |
| CRM | `test:crm:*` (hardening + funcional) |
| Autorização | `test:autorizacao:rn25` |
| Auditoria | `test:auditoria:rn26` |
| Job Center | `test:job-center*` |
| Documentos | `test:documento-versioning` |
| MFA | `test:mfa-*` |
| LGPD | `test:lgpd-*` |
| BI | `test:bi-*` |
| Atendimento | `test:attendance-automation-*` |
| Publicações | `test:publicacoes:*` |

---

## 10. Deploy & Infraestrutura

| Item | Detalhes |
|---|---|
| **Docker** | `Dockerfile` (multi-stage), `Dockerfile.worker`, `docker-compose.yml` (dev), `docker-compose.prod.yml`, `docker-compose.worker.yml` |
| **Nginx** | Reverse proxy com SSL (Let's Encrypt), HSTS, security headers, WebSocket proxy |
| **PM2** | `ecosystem.config.js` para gerenciamento de processos |
| **Deploy** | `deploy.sh` — git pull → npm install → prisma migrate → build → pm2 restart |
| **Storage** | Volume Docker `uploads_data` (até 50MB por arquivo) |
| **Vercel** | Suporte via `.env.vercel.example` (alternativo ao VPS) |
| **VPS** | Hostinger |

---

## 11. Resumo Quantitativo

| Métrica | Valor |
|---|---|
| **Páginas/Rotas** | 80+ |
| **Endpoints API** | 135+ |
| **Server Actions** | 36 módulos |
| **Modelos de banco** | 50+ tabelas |
| **Serviços backend** | 60+ arquivos |
| **Componentes React** | 100+ |
| **Zustand stores** | 5+ |
| **Jobs agendados** | 9 |
| **Integrações externas** | 8+ (DataJud, Evolution, Baileys, Meta, Gemini, Asaas, ClickSign, Calendários) |
| **Agentes IA** | 4 especializados (cível, criminal, trabalhista, previdenciário) |
| **Scripts de teste** | 20+ |
| **Providers WhatsApp** | 3 (Evolution, Baileys, Meta Cloud) |
