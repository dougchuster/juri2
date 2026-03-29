# Sistema Juridico ADV

Plataforma SaaS de operacao juridica para escritorios de advocacia brasileiros. O projeto concentra gestao processual, CRM, financeiro, publicacoes, comunicacao omnichannel, automacoes operacionais e recursos assistidos por IA em uma unica base.

O sistema foi estruturado para rodar com Next.js no App Router, PostgreSQL via Prisma, Redis + BullMQ para processamento assincrono e deploy principal em VPS com Docker Compose. O repositorio tambem contem suporte operacional para cron em Vercel e workers dedicados quando necessario.

## Visao Geral

O produto cobre o ciclo completo de operacao de um escritorio:

- captacao e qualificacao comercial
- cadastro de clientes, processos, prazos e audiencias
- monitoramento de publicacoes e automacoes juridicas
- controle financeiro, cobranca, conciliacao e repasses
- comunicacao interna e integracoes com WhatsApp
- administracao multi-tenant com RBAC, MFA e rotinas LGPD

## Principais Modulos

### Operacao juridica

- `Dashboard`: KPIs operacionais, agenda, tarefas e visao executiva do escritorio
- `Processos`: pipeline completo com lista, detalhe, timeline e kanban por status
- `Prazos`: controle processual com alertas, urgencia e acompanhamento
- `Publicacoes`: captura via DataJud e automacoes nacionais com painel operacional
- `Andamentos`: apoio a leitura e traducao operacional de movimentacoes
- `Jurimetria`: indicadores basicos de carteira, tribunais, tipos e status
- `Protocolos`: rastreio de entregas e historico de protocolacao
- `Documentos` e `Pecas`: repositorio, versionamento e apoio de IA

### Comercial e relacionamento

- `Clientes`: base central de contatos e historico
- `CRM`: pipeline, listas, segmentos, campanhas e fluxos automatizados
- `Atendimentos`: triagem, qualificacao e acompanhamento comercial
- `Portal do cliente`: acesso compartilhado via token para acompanhamento e documentos

### Financeiro

- `Contas a pagar e receber`
- `Casos financeiros e honorarios`
- `Repasses e rentabilidade`
- `Regua de cobranca`
- `Conciliacao bancaria com importacao CSV/OFX`
- `NFS-e local vinculada a faturas pagas`
- `Timesheet juridico`

### Comunicacao e automacao

- `Chat interno` em tempo real
- `WhatsApp` via Evolution API ou runtime stateful
- `Workflows` e jobs recorrentes
- `BullMQ worker` para processamento assincrono

### Administracao e seguranca

- `Multi-tenant` por escritorio
- `RBAC` por perfil e overrides granulares
- `MFA`
- `LGPD`: exportacao, retencao e trilhas operacionais
- `Root Admin`: gestao multi-organizacao

## Stack Tecnologica

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, Lucide, Motion, Recharts |
| Backend web | Next.js App Router + custom server em `server.ts` |
| Banco de dados | PostgreSQL |
| ORM | Prisma 7 |
| Filas e jobs | Redis + BullMQ |
| Tempo real | Socket.io |
| Autenticacao | Better Auth |
| Validacao | Zod |
| IA e integracoes | Gemini, DataJud, Evolution API, Meta, Google, Microsoft, Asaas, ClickSign |
| Deploy principal | Docker Compose em VPS |
| Suporte complementar | Vercel cron / workers dedicados |

## Arquitetura do Repositorio

```text
.
|-- docs/                       # Documentacao funcional, tecnica e planejamento
|-- nginx/                      # Configuracoes do proxy reverso
|-- prisma/
|   |-- migrations/             # Historico de migrations
|   |-- schema.prisma           # Modelo principal de dados
|   |-- seed.ts                 # Seed principal
|   \-- seed-*.ts               # Seeds auxiliares
|-- public/                     # Arquivos estaticos
|-- scripts/                    # Smokes, seeds e utilitarios operacionais
|-- src/
|   |-- actions/                # Server Actions e mutacoes
|   |-- app/                    # Rotas App Router e API routes
|   |-- components/             # UI e componentes de dominio
|   |-- generated/              # Client Prisma gerado
|   |-- lib/
|   |   |-- dal/                # Data Access Layer
|   |   |-- queue/              # Configuracao de filas
|   |   |-- services/           # Regras de negocio e servicos de dominio
|   |   |-- validators/         # Schemas de entrada e validacao
|   |   \-- ...                 # Integracoes, auth, utilitarios, runtime
|   \-- worker/                 # Worker BullMQ
|-- tests/                      # Suites E2E
|-- Dockerfile                  # Imagem da aplicacao web
|-- Dockerfile.worker           # Imagem do worker
|-- docker-compose.prod.yml     # Topologia de producao
|-- redeploy.sh                 # Script de redeploy remoto
|-- server.ts                   # Bootstrap do custom server + Socket.io
\-- vercel.json                 # Crons para ambiente Vercel
```

## Arquitetura de Execucao

O projeto opera com dois processos principais:

- `app`: servidor Next.js com custom bootstrap em `server.ts`
- `worker`: processo BullMQ em `src/worker/index.ts`

No ambiente principal de producao, o `docker-compose.prod.yml` sobe:

- `postgres`
- `redis`
- `app`
- `worker`
- `evolution-api`
- `nginx`
- `certbot`

## Pre-requisitos

Para desenvolvimento local:

- Node.js 20+
- npm 10+
- PostgreSQL 15+ ou 16+
- Redis 7+

Para deploy em VPS:

- Docker
- Docker Compose
- acesso SSH ao servidor
- dominio configurado para o Nginx/SSL

## Getting Started

### 1. Clonar o repositorio

```bash
git clone https://github.com/dougchuster/juri2.git
cd juri2
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variaveis de ambiente

Crie um `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Variaveis minimas para subir localmente:

| Variavel | Obrigatoria | Descricao |
| --- | --- | --- |
| `DATABASE_URL` | Sim | conexao com PostgreSQL local |
| `REDIS_URL` | Sim | conexao com Redis |
| `NEXT_PUBLIC_APP_URL` | Sim | URL publica local, ex. `http://localhost:3000` |
| `INTERNAL_APP_URL` | Recomendado | URL interna usada por jobs locais |
| `BETTER_AUTH_SECRET` | Sim | segredo da autenticacao |
| `BETTER_AUTH_URL` | Sim | URL base da autenticacao |

Integracoes opcionais podem ser ativadas por ambiente:

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

Para desenvolvimento puro, se voce estiver criando novas migrations:

```bash
npm run db:migrate
```

### 6. Popular base inicial

```bash
npm run db:seed
```

### 7. Subir a aplicacao

Em um terminal:

```bash
npm run dev
```

Em outro terminal:

```bash
npm run worker:start
```

Aplicacao local:

- App: `http://localhost:3000`
- Worker: executa em processo separado, sem porta HTTP publica

## Fluxo de Desenvolvimento

Padroes principais do projeto:

- leitura de dados via `src/lib/dal`
- mutacoes via `src/actions`
- validacao com Zod em `src/lib/validators`
- regras de negocio em `src/lib/services`
- filas e jobs em `src/lib/queue` e `src/worker`
- pages server-side com client components apenas onde ha interacao

Fluxo recomendado:

1. ajustar schema ou regra de negocio
2. executar `npx prisma generate` quando houver alteracao de Prisma
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

O diretorio `scripts/` tambem contem testes focados em modulos especificos, como:

- export engine
- workflow runtime
- timesheet
- RAG juridico
- portal do cliente
- calculos
- andamento tradutor

## Ambiente e Arquivos de Configuracao

O projeto usa varios arquivos de exemplo para separar responsabilidades:

- `.env.example`: desenvolvimento local principal
- `.env.production.example`: producao em Docker/VPS
- `.env.worker.example`: worker dedicado ou ambiente de jobs
- `.env.vercel.example`: ambiente Vercel com cron e runtime stateless

Arquivos importantes:

- `prisma.config.ts`: configuracao do Prisma 7
- `next.config.ts`: configuracao do Next.js e externalizacao de pacotes server-only
- `vercel.json`: definicao de jobs recorrentes em Vercel
- `ecosystem.config.js`: apoio para gerenciamento de processo

## Banco de Dados e Migrations

O schema principal esta em `prisma/schema.prisma`.

Boas praticas operacionais deste repositorio:

- em producao, use `npx prisma migrate deploy`
- em desenvolvimento, use `npm run db:migrate` para criar/aplicar novas migrations
- sempre execute `npx prisma generate` depois de alterar schema
- nao use reset de banco em ambiente produtivo

## Deploy em VPS

O caminho principal de deploy e Docker Compose em VPS.

### Build e subida manual

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build --parallel app worker
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --entrypoint "" app sh -lc 'npx prisma migrate deploy'
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate --no-deps app worker evolution-api nginx
```

### Redeploy automatizado

O script `redeploy.sh` conecta por SSH, atualiza o repositorio remoto, rebuilda `app` e `worker`, aplica migrations e sobe os servicos principais.

Execucao:

```bash
bash redeploy.sh
```

Hoje o script aponta para:

- usuario SSH: `root`
- diretorio remoto: `/var/www/adv`
- compose de producao: `docker-compose.prod.yml`

### Servicos esperados em producao

| Servico | Papel |
| --- | --- |
| `juridico-db` | PostgreSQL principal |
| `juridico-redis` | cache, filas e eventos |
| `juridico-app` | aplicacao Next.js |
| `juridico-worker` | jobs BullMQ |
| `juridico-evolution` | backend de WhatsApp |
| `juridico-nginx` | proxy reverso |
| `juridico-certbot` | renovacao SSL |

## Operacao em Vercel

O repositorio tambem contem `vercel.json` com crons para:

- processamento de jobs
- scheduler operacional
- automacao nacional
- monitor do DataJud
- atualizacao de aliases

Para esse modo:

- use `.env.vercel.example`
- mantenha `ENABLE_WHATSAPP_RUNTIME=false`
- mantenha `CRON_ENABLED=false`
- forneca um worker/stateful runtime separado quando necessario

## Seguranca

Capacidades ja presentes no projeto:

- autenticacao com Better Auth
- MFA
- RBAC por perfil e overrides
- multi-tenancy por escritorio
- trilhas e rotinas LGPD
- isolamento de dados por escritorio
- suporte a segredos distintos por ambiente

Recomendacoes operacionais:

- nunca commitar `.env`, `.env.production` ou chaves reais
- prefira rotacao periodica de segredos sensiveis
- mantenha `BETTER_AUTH_SECRET`, `PORTAL_TOKEN_SECRET` e `PERM_CACHE_SECRET` fortes e exclusivos por ambiente
- aplique `npx prisma migrate deploy` antes de restartar a aplicacao em producao

## Troubleshooting

### App sobe, mas jobs nao processam

Verifique:

- `REDIS_URL`
- container/processo `worker`
- logs do BullMQ

### Build passa local, mas producao falha

Verifique:

- `npm run build`
- `npx prisma generate`
- variaveis de ambiente obrigatorias em `.env.production`
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

### WhatsApp nao conecta

Verifique:

- `WHATSAPP_BACKEND`
- `ENABLE_WHATSAPP_RUNTIME`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- runtime stateful ou service `evolution-api`

## Documentacao Complementar

Materiais adicionais vivem em `docs/`, com destaque para:

- planejamento de fases
- isolamento multi-tenant
- mapeamento do sistema atual
- relatorios tecnicos e de produto

## Status do Projeto

O repositorio esta em operacao ativa, com entregas recentes cobrindo:

- dashboard personalizavel
- kanban de processos
- painel operacional de publicacoes
- NFS-e local e conciliacao OFX
- jurimetria basica
- PWA

## Licenca

Este repositorio nao expoe uma licenca publica no momento. Se houver distribuicao externa ou onboarding de terceiros, vale formalizar uma politica de uso.
