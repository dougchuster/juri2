# Sistema Jurídico ADV

Plataforma SaaS completa de gestão para escritórios de advocacia brasileiros. Desenvolvida para competir com soluções como Astrea, Integra e Advbox, oferecendo gestão de processos, clientes, financeiro, comunicação via WhatsApp, CRM, documentos com IA e muito mais.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilo | TailwindCSS 4 |
| Banco de Dados | PostgreSQL via Prisma 7 |
| Cache / Filas | Redis + BullMQ |
| Tempo Real | Socket.io |
| Autenticação | Better Auth |
| IA | Google Gemini / Kimi (Moonshot) |
| WhatsApp | Evolution API + Baileys |
| Infraestrutura | Docker + Nginx + Certbot (SSL) |
| Deploy | VPS Hostinger |

---

## Módulos Implementados

### Core Jurídico
- **Dashboard** — KPIs, tarefas, agenda e prazos do escritório
- **Processos** — Gestão completa de processos judiciais
- **Prazos** — Controle de prazos processuais com alertas
- **Publicações** — Monitoramento automático do DJE/DataJud
- **Atendimentos** — Controle de atendimentos e consultas
- **Tarefas** — Gestão de tarefas com sistema de pontuação (Taskscore)
- **Agenda** — Calendário integrado com audiências e compromissos
- **Documentos** — Repositório com versionamento de documentos
- **Peças** — Assistente de IA para criação de peças jurídicas
- **Cálculos** — Calculadoras jurídicas (monetária, trabalhista, previdenciária)
- **Protocolos** — Rastreamento de documentos protocolados com histórico

### Gestão e Operações
- **Clientes** — CRM de clientes com histórico completo
- **CRM** — Pipeline de negócios, campanhas, contatos e automações
- **Distribuição** — Distribuição automática de processos entre advogados
- **Demandas** — Gestão de demandas internas
- **Controladoria** — Controle administrativo do escritório
- **Agentes Jurídicos** — Automações com agentes de IA

### Financeiro
- **Honorários** — Controle de honorários por processo
- **Faturas** — Emissão e controle de faturas
- **Contas a Pagar/Receber** — Fluxo de caixa completo
- **Centro de Custo** — Rateio de despesas
- **Comissões** — Cálculo automático de comissões
- **Repasses** — Controle de repasses entre advogados
- **Relatórios Financeiros** — Dashboard e exportações

### Comunicação
- **Chat Interno** — Mensagens em tempo real entre equipe
- **WhatsApp** — Integração com Evolution API para atendimento
- **Automação de Atendimento** — Regras automáticas de respostas

### Administração
- **RBAC** — Controle de acesso por papéis (admin, advogado, estagiário, secretário, financeiro, cliente)
- **Multi-tenant** — Isolamento completo por organização
- **LGPD** — Exportação e retenção de dados conforme lei
- **MFA** — Autenticação multifator
- **Painel Root Admin** — Gestão de todas as organizações

---

## Arquitetura

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── (dashboard)/        # Rotas autenticadas
│   ├── api/                # API Routes
│   ├── admin/              # Painel administrativo
│   └── root-admin/         # Painel super-admin
├── actions/                # Server Actions (mutations)
├── components/             # Componentes React
│   ├── layout/             # Sidebar, Header, Layout
│   └── ui/                 # Componentes base
├── lib/
│   ├── dal/                # Data Access Layer
│   ├── validators/         # Schemas Zod
│   ├── services/           # Serviços de negócio
│   └── queue/              # Filas BullMQ
├── worker/                 # Worker de processamento assíncrono
└── generated/              # Prisma Client gerado
prisma/
├── schema.prisma           # Schema principal
├── migrations/             # Histórico de migrations
└── seed.ts                 # Seed inicial
```

**Padrão de desenvolvimento:**
1. Página server component → busca dados via DAL (`src/lib/dal/*.ts`)
2. Mutations via server actions (`src/actions/*.ts`) com `revalidatePath`
3. Componentes cliente com `"use client"`, recebem dados serializados via `JSON.parse(JSON.stringify(data))`

---

## Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker e Docker Compose (para produção)

---

## Configuração Local

### 1. Clonar e instalar

```bash
git clone https://github.com/dougchuster/juri2.git
cd juri2
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Editar `.env` com suas credenciais:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/sistema_juridico"
REDIS_URL="redis://localhost:6379"
BETTER_AUTH_SECRET="sua-chave-secreta"
BETTER_AUTH_URL="http://localhost:3000"

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua-senha-app

# IA
GEMINI_API_KEY=sua-chave
KIMI_API_KEY=sua-chave

# Evolution API (WhatsApp)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave
```

### 3. Banco de dados

```bash
# Aplicar migrations
npm run db:migrate

# Gerar client Prisma
npm run db:generate

# Popular com dados iniciais
npm run db:seed
```

### 4. Rodar em desenvolvimento

```bash
# App (terminal 1)
npm run dev

# Worker (terminal 2)
npm run worker:start
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Produção (Docker)

### Deploy

```bash
# Configurar variáveis de produção
cp .env.production.example .env.production
# Editar .env.production com os valores reais

# Executar deploy
bash redeploy.sh
```

### Serviços Docker em produção

| Container | Função |
|-----------|--------|
| `juridico-app` | Next.js (porta 3000 interna) |
| `juridico-worker` | BullMQ worker assíncrono |
| `juridico-db` | PostgreSQL |
| `juridico-redis` | Redis |
| `juridico-nginx` | Proxy reverso (80/443) |
| `juridico-certbot` | SSL automático Let's Encrypt |
| `juridico-evolution` | Evolution API (WhatsApp) |

### Comandos úteis na VPS

```bash
# Status dos containers
docker compose -f docker-compose.prod.yml ps

# Logs em tempo real
docker compose -f docker-compose.prod.yml logs -f app

# Reiniciar app
docker compose -f docker-compose.prod.yml restart app

# Acessar banco de dados
docker exec -it juridico-db psql -U juridico -d sistema_juridico

# Liberar espaço Docker (imagens antigas)
docker system prune -af
```

---

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                    # App + custom server
npm run worker:start           # Worker BullMQ

# Build
npm run build                  # Build produção

# Banco de dados
npm run db:migrate             # Criar/aplicar migrations
npm run db:generate            # Gerar Prisma Client
npm run db:seed                # Seed inicial
npm run db:studio              # Prisma Studio (GUI)
npm run db:stats               # Estatísticas do banco

# Testes
npm run test:crm:funcional     # Testes CRM
npm run test:mfa-core          # Testes MFA
npm run test:lgpd-core         # Testes LGPD
npm run test:tenant-isolation  # Isolamento multi-tenant
npm run test:meeting-automation # Automação de reuniões
npm run test:bi-core           # Business Intelligence
```

---

## Segurança

- Autenticação via Better Auth com suporte a MFA
- RBAC com 6 papéis distintos por organização
- Multi-tenant com isolamento completo por `organizacaoId`
- Fail2ban ativo na VPS (bloqueio de força bruta SSH)
- SSL automático via Certbot / Let's Encrypt
- Acesso SSH via chave pública (senha desabilitada)
- Conformidade LGPD: exportação e exclusão de dados sob demanda

---

## Variáveis de Ambiente

Consulte [.env.example](.env.example) para a lista completa com descrições.

---

## URL de Produção

**https://adv.chuster.com.br**
