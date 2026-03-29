# Sistema Jurídico ADV

Plataforma SaaS de operação jurídica para escritórios de advocacia brasileiros. O projeto concentra gestão processual, CRM, financeiro, publicações, comunicação omnichannel, automações operacionais e recursos assistidos por IA em uma única base.

O sistema foi estruturado para rodar com Next.js no App Router, PostgreSQL via Prisma, Redis + BullMQ para processamento assíncrono e deploy principal em VPS com Docker Compose. O repositório também contém suporte operacional para cron em Vercel e workers dedicados quando necessário.

## Visão Geral

O produto cobre o ciclo completo de operação de um escritório:

- captação e qualificação comercial
- cadastro de clientes, processos, prazos e audiências
- monitoramento de publicações e automações jurídicas
- controle financeiro, cobrança, conciliação e repasses
- comunicação interna e integrações com WhatsApp
- administração multi-tenant com RBAC, MFA e rotinas LGPD

## Principais Módulos

### Operação jurídica

- `Dashboard`: KPIs operacionais, agenda, tarefas e visão executiva do escritório
- `Processos`: pipeline completo com lista, detalhe, timeline e kanban por status
- `Prazos`: controle processual com alertas, urgência e acompanhamento
- `Publicações`: captura via DataJud e automações nacionais com painel operacional
- `Andamentos`: apoio à leitura e tradução operacional de movimentações
- `Jurimetria`: indicadores básicos de carteira, tribunais, tipos e status
- `Protocolos`: rastreio de entregas e histórico de protocolação
- `Documentos` e `Peças`: repositório, versionamento e apoio de IA

### Comercial e relacionamento

- `Clientes`: base central de contatos e histórico
- `CRM`: pipeline, listas, segmentos, campanhas e fluxos automatizados
- `Atendimentos`: triagem, qualificação e acompanhamento comercial
- `Portal do cliente`: acesso compartilhado via token para acompanhamento e documentos

### Financeiro

- `Contas a pagar e receber`
- `Casos financeiros e honorários`
- `Repasses e rentabilidade`
- `Régua de cobrança`
- `Conciliação bancária com importação CSV/OFX`
- `NFS-e local vinculada a faturas pagas`
- `Timesheet jurídico`

### Comunicação e automação

- `Chat interno` em tempo real
- `WhatsApp` via Evolution API ou runtime stateful
- `Workflows` e jobs recorrentes
- `BullMQ worker` para processamento assíncrono

### Administração e segurança

- `Multi-tenant` por escritório
- `RBAC` por perfil e overrides granulares
- `MFA`
- `LGPD`: exportação, retenção e trilhas operacionais
- `Root Admin`: gestão multi-organização

## Stack Tecnológica

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, Lucide, Motion, Recharts |
| Backend web | Next.js App Router + custom server em `server.ts` |
| Banco de dados | PostgreSQL |
| ORM | Prisma 7 |
| Filas e jobs | Redis + BullMQ |
| Tempo real | Socket.io |
| Autenticação | Better Auth |
| Validação | Zod |
| IA e integrações | Gemini, DataJud, Evolution API, Meta, Google, Microsoft, Asaas, ClickSign |
| Deploy principal | Docker Compose em VPS |
| Suporte complementar | Vercel cron / workers dedicados |

## Arquitetura do Repositório

```text
.
|-- docs/                       # Documentação funcional, técnica e planejamento
|-- nginx/                      # Configurações do proxy reverso
|-- prisma/
|   |-- migrations/             # Histórico de migrations
|   |-- schema.prisma           # Modelo principal de dados
|   |-- seed.ts                 # Seed principal
|   \-- seed-*.ts               # Seeds auxiliares
|-- public/                     # Arquivos estáticos
|-- scripts/                    # Smokes, seeds e utilitários operacionais
|-- src/
|   |-- actions/                # Server Actions e mutações
|   |-- app/                    # Rotas App Router e API routes
|   |-- components/             # UI e componentes de domínio
|   |-- generated/              # Client Prisma gerado
|   |-- lib/
|   |   |-- dal/                # Data Access Layer
|   |   |-- queue/              # Configuração de filas
|   |   |-- services/           # Regras de negócio e serviços de domínio
|   |   |-- validators/         # Schemas de entrada e validação
|   |   \-- ...                 # Integrações, auth, utilitários, runtime
|   \-- worker/                 # Worker BullMQ
|-- tests/                      # Suites E2E
|-- Dockerfile                  # Imagem da aplicação web
|-- Dockerfile.worker           # Imagem do worker
|-- docker-compose.prod.yml     # Topologia de produção
|-- redeploy.sh                 # Script de redeploy remoto
|-- server.ts                   # Bootstrap do custom server + Socket.io
\-- vercel.json                 # Crons para ambiente Vercel
```

## Arquitetura de Execução

O projeto opera com dois processos principais:

- `app`: servidor Next.js com custom bootstrap em `server.ts`
- `worker`: processo BullMQ em `src/worker/index.ts`

No ambiente principal de produção, o `docker-compose.prod.yml` sobe:

- `postgres`
- `redis`
- `app`
- `worker`
- `evolution-api`
- `nginx`
- `certbot`

## Pré-requisitos

Para desenvolvimento local:

- Node.js 20+
- npm 10+
- PostgreSQL 15+ ou 16+
- Redis 7+

Para deploy em VPS:

- Docker
- Docker Compose
- acesso SSH ao servidor
- domínio configurado para o Nginx/SSL

## Getting Started

### 1. Clonar o repositório

```bash
git clone https://github.com/dougchuster/juri2.git
cd juri2
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie um `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Variáveis mínimas para subir localmente:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | conexão com PostgreSQL local |
| `REDIS_URL` | Sim | conexão com Redis |
| `NEXT_PUBLIC_APP_URL` | Sim | URL pública local, ex. `http://localhost:3000` |
| `INTERNAL_APP_URL` | Recomendado | URL interna usada por jobs locais |
| `BETTER_AUTH_SECRET` | Sim | segredo da autenticação |
| `BETTER_AUTH_URL` | Sim | URL base da autenticação |

Integrações opcionais podem ser ativadas por ambiente:

- `GEMINI_API_KEY`
- `DATAJUD_API_KEY`
- `EVOLUTION_API_*`
- `META_*`
- `GOOGLE_*`
- `MICROSOFT_*`
- `ASAAS_*`
- `CLICKSIGN_*`

### 4. Gerar Prisma Client

```bash
npm run db:generate
```

### 5. Aplicar migrations

```bash
npx prisma migrate deploy
```

Para desenvolvimento puro, se você estiver criando novas migrations:

```bash
npm run db:migrate
```

### 6. Popular base inicial

```bash
npm run db:seed
```

### 7. Subir a aplicação

Em um terminal:

```bash
npm run dev
```

Em outro terminal:

```bash
npm run worker:start
```

Aplicação local:

- App: `http://localhost:3000`
- Worker: executa em processo separado, sem porta HTTP pública

## Fluxo de Desenvolvimento

Padrões principais do projeto:

- leitura de dados via `src/lib/dal`
- mutações via `src/actions`
- validação com Zod em `src/lib/validators`
- regras de negócio em `src/lib/services`
- filas e jobs em `src/lib/queue` e `src/worker`
- pages server-side com client components apenas onde há interação

Fluxo recomendado:

1. ajustar schema ou regra de negócio
2. executar `npx prisma generate` quando houver alteração de Prisma
3. validar com `npx tsc --noEmit`
4. rodar smokes relevantes em `scripts/`
5. validar `npm run build` antes de entregar

## Scripts Importantes

### Core

```bash
npm run dev
npm run build
npm run start
npm run worker:start
npm run lint
```

### Banco

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:studio
```

### Suites e smokes relevantes

```bash
npm run test:tenant-isolation
npm run test:crm:funcional
npm run test:crm:hardening
npm run test:mfa-core
npm run test:lgpd-core
npm run test:automacao:nacional
npm run test:publicacoes:ingrid
npm run test:e2e:crud
```

O diretório `scripts/` também contém testes focados em módulos específicos, como:

- export engine
- workflow runtime
- timesheet
- RAG jurídico
- portal do cliente
- cálculos
- andamento tradutor

## Ambiente e Arquivos de Configuração

O projeto usa vários arquivos de exemplo para separar responsabilidades:

- `.env.example`: desenvolvimento local principal
- `.env.production.example`: produção em Docker/VPS
- `.env.worker.example`: worker dedicado ou ambiente de jobs
- `.env.vercel.example`: ambiente Vercel com cron e runtime stateless

Arquivos importantes:

- `prisma.config.ts`: configuração do Prisma 7
- `next.config.ts`: configuração do Next.js e externalização de pacotes server-only
- `vercel.json`: definição de jobs recorrentes em Vercel
- `ecosystem.config.js`: apoio para gerenciamento de processo

## Banco de Dados e Migrations

O schema principal está em `prisma/schema.prisma`.

Boas práticas operacionais deste repositório:

- em produção, use `npx prisma migrate deploy`
- em desenvolvimento, use `npm run db:migrate` para criar/aplicar novas migrations
- sempre execute `npx prisma generate` depois de alterar schema
- não use reset de banco em ambiente produtivo

## Deploy em VPS

O caminho principal de deploy é Docker Compose em VPS.

### Build e subida manual

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build --parallel app worker
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --entrypoint "" app sh -lc 'npx prisma migrate deploy'
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate --no-deps app worker evolution-api nginx
```

### Redeploy automatizado

O script `redeploy.sh` conecta por SSH, atualiza o repositório remoto, rebuilda `app` e `worker`, aplica migrations e sobe os serviços principais.

Execução:

```bash
bash redeploy.sh
```

Hoje o script aponta para:

- usuário SSH: `root`
- diretório remoto: `/var/www/adv`
- compose de produção: `docker-compose.prod.yml`

### Serviços esperados em produção

| Serviço | Papel |
| --- | --- |
| `juridico-db` | PostgreSQL principal |
| `juridico-redis` | cache, filas e eventos |
| `juridico-app` | aplicação Next.js |
| `juridico-worker` | jobs BullMQ |
| `juridico-evolution` | backend de WhatsApp |
| `juridico-nginx` | proxy reverso |
| `juridico-certbot` | renovação SSL |

## Operação em Vercel

O repositório também contém `vercel.json` com crons para:

- processamento de jobs
- scheduler operacional
- automação nacional
- monitor do DataJud
- atualização de aliases

Para esse modo:

- use `.env.vercel.example`
- mantenha `ENABLE_WHATSAPP_RUNTIME=false`
- mantenha `CRON_ENABLED=false`
- forneça um worker/stateful runtime separado quando necessário

## Segurança

Capacidades já presentes no projeto:

- autenticação com Better Auth
- MFA
- RBAC por perfil e overrides
- multi-tenancy por escritório
- trilhas e rotinas LGPD
- isolamento de dados por escritório
- suporte a segredos distintos por ambiente

Recomendações operacionais:

- nunca commitar `.env`, `.env.production` ou chaves reais
- prefira rotação periódica de segredos sensíveis
- mantenha `BETTER_AUTH_SECRET`, `PORTAL_TOKEN_SECRET` e `PERM_CACHE_SECRET` fortes e exclusivos por ambiente
- aplique `npx prisma migrate deploy` antes de restartar a aplicação em produção

## Troubleshooting

### App sobe, mas jobs não processam

Verifique:

- `REDIS_URL`
- container/processo `worker`
- logs do BullMQ

### Build passa local, mas produção falha

Verifique:

- `npm run build`
- `npx prisma generate`
- variáveis de ambiente obrigatórias em `.env.production`
- se `app` e `worker` foram rebuildados

### Migration pendente

Antes de redeploy:

```bash
npx prisma migrate status
```

No servidor:

```bash
npx prisma migrate deploy
```

### WhatsApp não conecta

Verifique:

- `WHATSAPP_BACKEND`
- `ENABLE_WHATSAPP_RUNTIME`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- runtime stateful ou service `evolution-api`

## Documentação Complementar

Materiais adicionais vivem em `docs/`, com destaque para:

- planejamento de fases
- isolamento multi-tenant
- mapeamento do sistema atual
- relatórios técnicos e de produto

## Status do Projeto

O repositório está em operação ativa, com entregas recentes cobrindo:

- dashboard personalizável
- kanban de processos
- painel operacional de publicações
- NFS-e local e conciliação OFX
- jurimetria básica
- PWA

## Licença

Este repositório não expõe uma licença pública no momento. Se houver distribuição externa ou onboarding de terceiros, vale formalizar uma política de uso.
