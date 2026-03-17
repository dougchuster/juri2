# Painel Root Admin — Sistema Juridico ADV

## Visão Geral

Criar um **painel administrativo root** completamente separado do sistema principal (Sistema Juridico ADV). Este painel é destinado exclusivamente ao **super admin da plataforma** (owner/founder) para gerenciar todas as organizações, usuários, assinaturas, finanças e operações sem necessidade de acessar código-fonte, banco de dados ou VPS diretamente.

O objetivo final é **escalar o sistema como SaaS multi-tenant**, onde múltiplos escritórios de advocacia usam a plataforma de forma independente, e o painel root oferece controle total sobre todas as instâncias.

---

## Contexto do Sistema Existente

### Stack Atual
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- **Backend:** Next.js API Routes + Server Actions
- **Database:** PostgreSQL + Prisma 7
- **Auth:** Better Auth (session-based) + MFA (TOTP)
- **Queue:** BullMQ + Redis
- **Real-time:** Socket.io
- **Deploy:** Docker + PM2 + Nginx + Certbot (VPS)

### Modelo Atual de Tenancy
- **Single-tenant:** Todos os dados pertencem a um único `Escritorio`
- **Roles existentes:** ADMIN, SOCIO, ADVOGADO, CONTROLADOR, ASSISTENTE, FINANCEIRO, SECRETARIA
- **128 models no Prisma schema** incluindo: casos, clientes, financeiro, CRM, documentos, chat, publicações, automações, BI, LGPD

### Integrações Existentes
- DataJud/DJEN (tribunais), Google Calendar, Outlook, Asaas (pagamentos), ClickSign (assinatura digital), WhatsApp (Baileys/Evolution), Gemini AI, SMTP

---

## Arquitetura do Painel Root

### Decisão Arquitetural

O painel root deve ser implementado como **rotas separadas dentro do mesmo projeto Next.js**, mas com:

1. **Route group dedicado:** `/(root-admin)/` com layout, auth e middleware próprios
2. **Tabela separada de super admins:** `SuperAdmin` model no Prisma (não usa a tabela `User`)
3. **Middleware de proteção:** Verifica `super_admin_session` cookie separado
4. **Domínio/subdomínio próprio:** Acessível via `admin.seudominio.com.br` (configurado no Nginx)
5. **Sem dependência do sistema principal:** O painel root não compartilha sessão, layout ou componentes do dashboard do escritório

### Por que dentro do mesmo projeto?
- Acesso direto ao Prisma client e ao banco de dados
- Sem necessidade de manter dois projetos separados
- Shared database = visão real-time de todos os dados
- Deploy único (simplifica CI/CD)
- Isolamento garantido via route groups e middleware

---

## Estrutura de Rotas

```
src/app/(root-admin)/
├── layout.tsx                          # Layout root com sidebar própria
├── login/page.tsx                      # Login do super admin (separado)
├── page.tsx                            # Dashboard principal (overview)
│
├── organizacoes/                       # Gestão de Organizações
│   ├── page.tsx                        # Lista de todos os escritórios
│   ├── nova/page.tsx                   # Criar nova organização
│   └── [id]/
│       ├── page.tsx                    # Detalhe da organização
│       ├── usuarios/page.tsx           # Usuários da organização
│       ├── configuracoes/page.tsx      # Config da organização
│       ├── financeiro/page.tsx         # Financeiro da organização
│       ├── uso/page.tsx               # Métricas de uso
│       └── logs/page.tsx              # Logs de auditoria
│
├── usuarios/                           # Gestão Global de Usuários
│   ├── page.tsx                        # Lista global de usuários
│   └── [id]/page.tsx                   # Detalhe do usuário
│
├── financeiro/                         # Financeiro da Plataforma
│   ├── page.tsx                        # Dashboard financeiro
│   ├── assinaturas/page.tsx            # Gestão de planos/assinaturas
│   ├── faturas/page.tsx                # Faturas da plataforma
│   ├── receita/page.tsx                # Revenue analytics
│   ├── planos/page.tsx                 # Configuração de planos
│   └── stripe/page.tsx                 # Painel Stripe (webhooks, payouts)
│
├── sistema/                            # Saúde do Sistema
│   ├── page.tsx                        # Status geral
│   ├── jobs/page.tsx                   # Monitor de jobs (BullMQ)
│   ├── filas/page.tsx                  # Status das filas Redis
│   ├── banco/page.tsx                  # Health do banco de dados
│   ├── logs/page.tsx                   # Logs do sistema
│   ├── cache/page.tsx                  # Gestão de cache Redis
│   └── deploy/page.tsx                # Info de deploy/versão
│
├── integracoes/                        # Integrações Globais
│   ├── page.tsx                        # Status de todas integrações
│   ├── whatsapp/page.tsx               # Instâncias WhatsApp
│   ├── datajud/page.tsx                # Status DataJud/DJEN
│   ├── email/page.tsx                  # SMTP/Email status
│   └── pagamentos/page.tsx             # Gateway de pagamento
│
├── suporte/                            # Ferramentas de Suporte
│   ├── page.tsx                        # Tickets/chamados
│   ├── impersonar/page.tsx             # Login como qualquer usuário
│   └── comunicados/page.tsx            # Enviar comunicados para orgs
│
├── configuracoes/                      # Config do Painel Root
│   ├── page.tsx                        # Configurações gerais
│   ├── super-admins/page.tsx           # Gerenciar super admins
│   ├── seguranca/page.tsx              # Políticas de segurança
│   └── feature-flags/page.tsx          # Feature flags por org
│
└── relatorios/                         # Relatórios & Analytics
    ├── page.tsx                        # Hub de relatórios
    ├── crescimento/page.tsx            # Métricas de crescimento
    ├── retencao/page.tsx               # Retenção/churn
    └── uso/page.tsx                    # Uso por feature
```

---

## Models Prisma (Novos)

### SuperAdmin & Auth
```prisma
model SuperAdmin {
  id            String   @id @default(cuid())
  email         String   @unique
  nome          String
  senhaHash     String
  ativo         Boolean  @default(true)
  mfaEnabled    Boolean  @default(false)
  mfaSecret     String?
  ultimoLogin   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  sessions      SuperAdminSession[]
  logs          SuperAdminLog[]
}

model SuperAdminSession {
  id            String   @id @default(cuid())
  token         String   @unique
  superAdminId  String
  expiresAt     DateTime
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  superAdmin    SuperAdmin @relation(fields: [superAdminId], references: [id])
}

model SuperAdminLog {
  id            String   @id @default(cuid())
  superAdminId  String
  acao          String
  detalhes      Json?
  ipAddress     String?
  createdAt     DateTime @default(now())

  superAdmin    SuperAdmin @relation(fields: [superAdminId], references: [id])
}
```

### Multi-Tenancy (Evolução do Escritorio)
```prisma
model Plano {
  id                String   @id @default(cuid())
  nome              String                    // "Starter", "Pro", "Enterprise"
  slug              String   @unique
  precoMensal       Decimal  @db.Decimal(10,2)
  precoAnual        Decimal? @db.Decimal(10,2)
  maxUsuarios       Int
  maxProcessos      Int?                      // null = ilimitado
  maxArmazenamentoMB Int
  features          Json                      // { crm: true, bi: true, whatsapp: true, ... }
  ativo             Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  assinaturas       Assinatura[]
}

model Assinatura {
  id                String   @id @default(cuid())
  escritorioId      String
  planoId           String
  status            StatusAssinatura @default(TRIAL)
  stripeCustomerId  String?
  stripeSubId       String?
  inicioTrial       DateTime?
  fimTrial          DateTime?
  dataInicio        DateTime
  dataRenovacao     DateTime?
  canceladoEm       DateTime?
  motivoCancelamento String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  escritorio        Escritorio @relation(fields: [escritorioId], references: [id])
  plano             Plano      @relation(fields: [planoId], references: [id])
  faturas           FaturaPlataforma[]
}

enum StatusAssinatura {
  TRIAL
  ATIVA
  INADIMPLENTE
  SUSPENSA
  CANCELADA
  EXPIRADA
}

model FaturaPlataforma {
  id                String   @id @default(cuid())
  assinaturaId      String
  stripeInvoiceId   String?
  valor             Decimal  @db.Decimal(10,2)
  status            StatusFaturaPlataforma @default(PENDENTE)
  dataVencimento    DateTime
  dataPagamento     DateTime?
  urlBoleto         String?
  urlNotaFiscal     String?
  createdAt         DateTime @default(now())

  assinatura        Assinatura @relation(fields: [assinaturaId], references: [id])
}

enum StatusFaturaPlataforma {
  PENDENTE
  PAGA
  ATRASADA
  CANCELADA
  REEMBOLSADA
}

model FeatureFlag {
  id                String   @id @default(cuid())
  escritorioId      String?               // null = global
  feature           String
  habilitado        Boolean  @default(false)
  config            Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  escritorio        Escritorio? @relation(fields: [escritorioId], references: [id])

  @@unique([escritorioId, feature])
}

model ComunicadoPlataforma {
  id                String   @id @default(cuid())
  titulo            String
  conteudo          String   @db.Text
  tipo              TipoComunicado
  destinatario      DestinatarioComunicado
  escritorioIds     String[]              // vazio = todos
  publicadoEm       DateTime?
  expiraEm          DateTime?
  superAdminId      String
  createdAt         DateTime @default(now())
}

enum TipoComunicado {
  INFO
  ALERTA
  MANUTENCAO
  ATUALIZACAO
  URGENTE
}

enum DestinatarioComunicado {
  TODOS
  ADMINS
  ESCRITORIOS_ESPECIFICOS
}
```

### Atualização do Model Escritorio Existente
```prisma
// Adicionar ao model Escritorio existente:
model Escritorio {
  // ... campos existentes ...

  // Novos campos para multi-tenancy
  slug              String?  @unique          // "silva-advogados"
  status            StatusEscritorio @default(ATIVO)
  origemCadastro    String?                   // "organic", "referral", "ad_campaign"
  limiteUsuarios    Int      @default(10)
  limiteArmazenamento Int    @default(5120)   // MB
  armazenamentoUsado Int     @default(0)      // MB
  ultimaAtividade   DateTime?
  observacoesAdmin  String?  @db.Text         // Notas do super admin

  assinaturas       Assinatura[]
  featureFlags      FeatureFlag[]
}

enum StatusEscritorio {
  ATIVO
  SUSPENSO
  BLOQUEADO
  TRIAL
  INATIVO
}
```

---

## Funcionalidades Detalhadas por Módulo

### 1. Dashboard Principal (`/`)

**Métricas em tempo real:**
- Total de organizações (ativas, trial, suspensas, canceladas)
- Total de usuários na plataforma
- MRR (Monthly Recurring Revenue) e ARR
- Churn rate do mês
- Novos cadastros nos últimos 7/30 dias
- Jobs em execução / falhos
- Armazenamento total utilizado
- Uso de API (DataJud, WhatsApp, etc.)

**Gráficos:**
- Crescimento de organizações (linha, últimos 12 meses)
- Revenue por mês (barras)
- Distribuição por plano (pizza)
- Mapa de calor de atividade (heatmap semanal)

**Alertas:**
- Organizações com trial expirando em < 3 dias
- Faturas vencidas
- Jobs falhando repetidamente
- Armazenamento próximo do limite
- Integrações com erro

---

### 2. Gestão de Organizações (`/organizacoes`)

**Lista com filtros:**
- Status (ativa, trial, suspensa, etc.)
- Plano atual
- Data de criação
- Último acesso
- Quantidade de usuários
- Volume de processos

**Ações em cada organização:**
- Visualizar detalhes completos
- Alterar plano/assinatura
- Suspender/reativar conta
- Resetar senha do admin
- Impersonar (login como admin da org)
- Enviar comunicado específico
- Ver logs de auditoria
- Exportar dados (LGPD)
- Deletar organização (soft delete com confirmação)
- Ajustar limites (usuários, armazenamento, features)
- Adicionar notas/observações internas

**Criar nova organização:**
- Formulário com: nome, CNPJ, email admin, plano, telefone
- Auto-provisioning: cria Escritorio + User admin + seed data
- Email de boas-vindas automático

**Detalhe da organização:**
- Overview com métricas (processos, clientes, docs, armazenamento)
- Lista de usuários com último acesso
- Histórico de assinatura/pagamentos
- Uso de features (quais módulos usam)
- Logs de auditoria filtrados
- Timeline de eventos importantes

---

### 3. Gestão de Usuários (`/usuarios`)

**Lista global:**
- Busca por nome, email, organização
- Filtro por role, status, último acesso
- Ordenação por data de criação, último login

**Ações por usuário:**
- Ver perfil completo
- Resetar senha
- Forçar logout (invalidar sessões)
- Bloquear/desbloquear
- Resetar MFA
- Ver histórico de ações (audit log)
- Impersonar (login como o usuário)
- Transferir para outra organização

**Métricas de usuários:**
- Distribuição por role
- Usuários ativos vs inativos (30 dias)
- Horários de pico de uso
- Dispositivos/browsers mais usados

---

### 4. Painel Financeiro (`/financeiro`)

**Dashboard financeiro:**
- MRR / ARR / LTV médio / CAC
- Revenue por plano
- Revenue acumulado vs meta
- Previsão de receita (próximos 3 meses)
- Churn rate e lost revenue

**Gestão de Planos:**
- CRUD de planos (nome, preço, limites, features)
- Comparativo entre planos
- A/B testing de preços (feature flag)
- Planos customizados por organização

**Gestão de Assinaturas:**
- Lista de todas assinaturas ativas
- Filtros: status, plano, data de renovação
- Histórico de upgrades/downgrades
- Cancelamentos com motivo

**Faturas da Plataforma:**
- Lista de todas as faturas emitidas
- Status: pendente, paga, atrasada
- Geração manual de faturas
- Reembolsos
- Link para Stripe dashboard

**Preparação para Stripe:**
- Configuração de Stripe keys (test/live)
- Webhook endpoint (`/api/webhooks/stripe`)
- Sync de customers/subscriptions
- Checkout session para upgrade de plano
- Portal do cliente Stripe (billing)
- Gestão de payment methods
- Tratamento de falhas de cobrança (dunning)
- Cupons e promoções

---

### 5. Saúde do Sistema (`/sistema`)

**Status geral:**
- Uptime do servidor
- Latência do banco de dados
- Status Redis (memória, conexões)
- Uso de CPU/memória do container
- Versão atual do sistema + último deploy

**Monitor de Jobs:**
- Lista de todos os jobs BullMQ (ativos, aguardando, falhados, completados)
- Retry manual de jobs falhados
- Cancelar jobs em execução
- Histórico de execução com tempo médio
- Alertas de jobs falhando repetidamente

**Logs do sistema:**
- Aggregated logs (busca por texto, nível, data)
- Filtros: ERROR, WARN, INFO
- Logs por organização
- Export de logs

**Banco de dados:**
- Tamanho do banco
- Tabelas maiores (por rows e storage)
- Queries lentas (se pg_stat_statements ativo)
- Conexões ativas
- Último backup

**Cache Redis:**
- Memória utilizada
- Keys por namespace
- Flush seletivo de cache
- Status das filas BullMQ

---

### 6. Integrações (`/integracoes`)

**Painel de status:**
- DataJud: status da API, última sync, erros
- WhatsApp: instâncias conectadas por organização, status
- SMTP: status de envio, taxa de bounce
- Asaas: status da integração, transações
- Google/Outlook Calendar: tokens válidos/expirados

**Ações:**
- Reconectar integração com falha
- Ver logs de erro por integração
- Configurar credenciais globais
- Rate limit monitoring

---

### 7. Suporte (`/suporte`)

**Impersonar:**
- Selecionar organização e usuário
- Gerar link de acesso temporário (expira em 1h)
- Audit log de toda impersonação
- Banner visível "Você está impersonando [user]"

**Comunicados:**
- Editor rich text para comunicados
- Destinatário: todos, admins, orgs específicas
- Agendamento de publicação
- Tipos: info, alerta, manutenção, atualização, urgente
- Histórico de comunicados enviados

---

### 8. Configurações (`/configuracoes`)

**Super Admins:**
- CRUD de super admins
- MFA obrigatório
- Log de acesso

**Feature Flags:**
- Toggle global por feature
- Override por organização
- Histórico de mudanças

**Segurança:**
- Política de senhas
- Rate limiting configs
- IP whitelist para painel root
- Sessão timeout

---

### 9. Relatórios & Analytics (`/relatorios`)

**Crescimento:**
- Novas orgs por período
- Conversão trial → pago
- Tempo médio de trial
- Funil de onboarding

**Retenção:**
- Cohort analysis
- Churn por plano/período
- Net Revenue Retention
- Feature usage vs churn correlation

**Uso:**
- Features mais usadas
- Módulos menos usados
- Horários de pico
- Usuários power users vs casual

---

## Implementação Técnica

### Middleware de Autenticação

```typescript
// src/middleware/root-admin.ts
// Verificar cookie super_admin_session
// Validar token contra SuperAdminSession
// Redirecionar para /root-admin/login se não autenticado
// Rate limiting rigoroso (5 tentativas/15min)
// IP whitelist opcional
// Logging de todo acesso
```

### API Routes do Root Admin

```
src/app/api/root-admin/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── mfa/route.ts
├── organizacoes/
│   ├── route.ts                    # GET (list), POST (create)
│   ├── [id]/route.ts               # GET, PUT, DELETE
│   ├── [id]/usuarios/route.ts
│   ├── [id]/impersonar/route.ts
│   └── [id]/stats/route.ts
├── usuarios/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── [id]/reset-password/route.ts
│   ├── [id]/reset-mfa/route.ts
│   └── [id]/sessions/route.ts
├── financeiro/
│   ├── dashboard/route.ts
│   ├── planos/route.ts
│   ├── assinaturas/route.ts
│   ├── faturas/route.ts
│   └── stripe/webhook/route.ts
├── sistema/
│   ├── health/route.ts
│   ├── jobs/route.ts
│   ├── logs/route.ts
│   ├── redis/route.ts
│   └── database/route.ts
├── integracoes/
│   ├── status/route.ts
│   └── [provider]/route.ts
├── feature-flags/
│   └── route.ts
├── comunicados/
│   └── route.ts
└── relatorios/
    ├── crescimento/route.ts
    ├── retencao/route.ts
    └── uso/route.ts
```

### Componentes UI do Root Admin

```
src/components/root-admin/
├── layout/
│   ├── RootSidebar.tsx
│   ├── RootHeader.tsx
│   ├── RootBreadcrumb.tsx
│   └── ImpersonationBanner.tsx
├── dashboard/
│   ├── MetricCard.tsx
│   ├── RevenueChart.tsx
│   ├── OrgsGrowthChart.tsx
│   ├── AlertsPanel.tsx
│   └── QuickActions.tsx
├── organizacoes/
│   ├── OrgTable.tsx
│   ├── OrgDetail.tsx
│   ├── OrgCreateForm.tsx
│   ├── OrgStatusBadge.tsx
│   └── OrgUsageMetrics.tsx
├── usuarios/
│   ├── UserTable.tsx
│   ├── UserDetail.tsx
│   └── UserActions.tsx
├── financeiro/
│   ├── RevenueMetrics.tsx
│   ├── PlanEditor.tsx
│   ├── SubscriptionTable.tsx
│   ├── InvoiceTable.tsx
│   └── StripePanel.tsx
├── sistema/
│   ├── SystemHealth.tsx
│   ├── JobMonitor.tsx
│   ├── LogViewer.tsx
│   ├── RedisStatus.tsx
│   └── DatabaseInfo.tsx
└── shared/
    ├── DataTable.tsx
    ├── StatCard.tsx
    ├── StatusIndicator.tsx
    ├── DateRangePicker.tsx
    └── ConfirmDialog.tsx
```

---

## Segurança

### Requisitos Obrigatórios

1. **Autenticação separada** — Não usa o mesmo sistema de auth do app principal
2. **MFA obrigatório** — Todo super admin precisa de TOTP ativo
3. **IP Whitelist** — Opcional mas recomendado (config no .env)
4. **Rate Limiting agressivo** — 5 tentativas de login / 15 min
5. **Audit Log completo** — Toda ação do super admin é logada com IP, user agent, timestamp
6. **Sessões curtas** — Expira em 2h de inatividade (vs 30min do app)
7. **HTTPS obrigatório** — Redirect HTTP → HTTPS
8. **CORS restrito** — Apenas domínio do admin
9. **CSP headers** — Content Security Policy rigoroso
10. **Impersonação auditada** — Log + banner + expiração automática

### Proteção contra ataques

- Brute force: Rate limiting + account lockout
- Session hijacking: Bind session ao IP + User Agent
- CSRF: CSRF token em todas as mutations
- XSS: CSP headers + sanitização de inputs
- SQL Injection: Prisma ORM (parameterized queries)

---

## Configuração Nginx

```nginx
# admin.seudominio.com.br → root admin panel
server {
    listen 443 ssl;
    server_name admin.seudominio.com.br;

    # SSL certificates (certbot)
    ssl_certificate /etc/letsencrypt/live/admin.seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.seudominio.com.br/privkey.pem;

    # IP Whitelist (opcional)
    # allow 177.xx.xx.xx;
    # deny all;

    location / {
        proxy_pass http://localhost:3000/root-admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Preparação Stripe (Financeiro Futuro)

### Webhook Events para Tratar

```typescript
// Eventos Stripe que o root admin precisa processar:
const STRIPE_EVENTS = [
  'checkout.session.completed',      // Nova assinatura
  'invoice.paid',                    // Pagamento recebido
  'invoice.payment_failed',         // Falha de pagamento
  'customer.subscription.updated',  // Upgrade/downgrade
  'customer.subscription.deleted',  // Cancelamento
  'customer.subscription.trial_will_end', // Trial expirando
  'charge.refunded',               // Reembolso
  'payment_method.attached',       // Novo cartão
]
```

### Fluxo de Assinatura

```
1. Org se cadastra → Trial de 14 dias (automático)
2. Trial expirando (3 dias antes) → Email + banner no app
3. Trial expirado → Bloqueia acesso, mostra tela de upgrade
4. Org escolhe plano → Stripe Checkout Session
5. Pagamento confirmado → Webhook ativa assinatura
6. Renovação mensal/anual → Stripe auto-charge
7. Falha de pagamento → 3 retentativas, depois suspende
8. Cancelamento → Acesso até fim do período pago
```

### Env Vars para Stripe

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
```

---

## Ordem de Implementação

### Fase 1 — Fundação (Prioridade Alta)
1. Models Prisma (SuperAdmin, Plano, Assinatura, FeatureFlag, etc.)
2. Migração do model Escritorio (novos campos multi-tenant)
3. Auth do super admin (login, sessão, MFA)
4. Middleware de proteção das rotas root
5. Layout base (sidebar, header, breadcrumb)
6. Dashboard principal com métricas reais

### Fase 2 — Gestão Core
7. CRUD de organizações (listar, criar, editar, suspender)
8. Gestão de usuários (listar, resetar senha, bloquear)
9. Detalhes da organização (stats, usuários, config)
10. Audit log do super admin

### Fase 3 — Operações
11. Monitor de jobs BullMQ
12. Status de integrações
13. Logs do sistema
14. Status do banco e Redis
15. Impersonação de usuários

### Fase 4 — Financeiro & Stripe
16. CRUD de planos
17. Gestão de assinaturas (manual primeiro)
18. Dashboard financeiro (MRR, ARR, churn)
19. Integração Stripe (checkout, webhooks, portal)
20. Faturas da plataforma
21. Dunning (gestão de inadimplência)

### Fase 5 — Analytics & Suporte
22. Feature flags (global e por org)
23. Comunicados para organizações
24. Relatórios de crescimento/retenção
25. Relatórios de uso por feature
26. Exportação de relatórios (PDF/CSV)

---

## Design & UX

### Princípios
- **Dark theme** como padrão (diferencia visualmente do app principal)
- **Dados primeiro** — métricas visíveis, ações rápidas acessíveis
- **Responsivo** mas otimizado para desktop (admin usa monitor)
- **Feedback imediato** — loading states, toasts, confirmações
- **Keyboard shortcuts** — navegação rápida entre seções

### Paleta Sugerida
- Background: `#0f0f14` (dark navy)
- Surface: `#1a1a24`
- Primary: `#6366f1` (indigo-500)
- Success: `#22c55e`
- Warning: `#f59e0b`
- Danger: `#ef4444`
- Text: `#e2e8f0`
- Muted: `#64748b`

### Componentes Base
- Usar os mesmos componentes `ui/` existentes mas com variante dark
- TanStack Table para todas as listagens
- Recharts para gráficos
- React Hook Form + Zod para formulários
- Sonner para toasts
- Dialog/Sheet do Radix para modais

---

## Variáveis de Ambiente Novas

```env
# Root Admin
ROOT_ADMIN_SECRET=<random-64-chars>        # Secret para sessões do super admin
ROOT_ADMIN_SESSION_EXPIRY=7200             # 2 horas em segundos
ROOT_ADMIN_IP_WHITELIST=                   # IPs permitidos (opcional, comma separated)
ROOT_ADMIN_DOMAIN=admin.seudominio.com.br  # Subdomínio do admin

# Stripe (futuro)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Seed do Super Admin

```typescript
// prisma/seed-root-admin.ts
// Criar super admin inicial com:
// email: admin@seudominio.com.br
// senha: gerada aleatoriamente (exibida no console)
// MFA: desabilitado (forçar ativação no primeiro login)
```

---

## Notas de Implementação

1. **Não quebrar o sistema existente** — Todas as mudanças devem ser backward compatible
2. **Migrations incrementais** — Nunca alterar migrations existentes, sempre criar novas
3. **Lazy loading** — Route group `(root-admin)` não deve afetar bundle size do app principal
4. **Testes** — Criar testes para auth do super admin e operações críticas (impersonação, suspensão de org)
5. **Rate limiting** — Endpoints do root admin devem ter rate limiting mais agressivo
6. **Error boundaries** — Cada seção deve ter seu próprio error boundary
7. **SSR** — Páginas do root admin devem ser server-rendered (segurança + SEO desnecessário)
8. **Cache** — Métricas do dashboard podem ser cached por 5min (Redis)
