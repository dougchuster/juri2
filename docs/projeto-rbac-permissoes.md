# Projeto: Sistema de Controle de Acesso Granular (RBAC)

> **Status:** Planejamento
> **Data:** 2026-03-23
> **Autor:** Equipe de Desenvolvimento
> **Versao:** 1.1 (com melhorias de seguranca, performance e clareza arquitetural)

---

## 1. Resumo Executivo

O sistema atual possui 7 roles (ADMIN, SOCIO, ADVOGADO, CONTROLADOR, ASSISTENTE, FINANCEIRO, SECRETARIA) como enum no Prisma, porem **nao existe controle granular de permissoes**. Todos os usuarios veem todos os itens do menu, nao ha middleware de protecao de rotas, e os checks de role estao espalhados inconsistentemente pelo codigo.

### Objetivo

Criar um sistema RBAC flexivel onde o administrador possa:

- Definir **templates de permissao por role** (o que cada perfil pode fazer por padrao)
- **Personalizar permissoes por usuario** (conceder ou revogar permissoes individuais)
- Controlar **visualizacao vs edicao** (um usuario pode ver mas nao editar)
- **Proteger rotas** tanto no frontend (sidebar) quanto no backend (middleware + server actions)

### Escopo e Limites

> **IMPORTANTE:** Este projeto trata EXCLUSIVAMENTE do controle de acesso para **usuarios de escritorio** (roles: ADMIN, SOCIO, ADVOGADO, CONTROLADOR, ASSISTENTE, FINANCEIRO, SECRETARIA). O **Super Admin (root)** e um sistema completamente separado — ver Secao 2.4.

> **Nota sobre escopo de dados:** O RBAC controla **acesso funcional** (o que o usuario pode ou nao fazer). O **escopo de dados** (quais registros o usuario pode ver — por exemplo, advogado ve apenas seus processos) e tratado separadamente pelo RLS (Row Level Security) existente no PostgreSQL e pelo filtro de `escritorioId` em cada query. Os dois sistemas sao complementares e independentes.

### Problemas Atuais

| Problema | Impacto |
|----------|---------|
| Sidebar mostra TODOS os itens para TODOS os usuarios | Secretaria ve modulos financeiros e admin |
| Nao existe `middleware.ts` | Qualquer usuario pode acessar qualquer rota via URL |
| Checks de role espalhados e inconsistentes | Alguns actions verificam role, outros nao |
| Sem granularidade (so role enum) | Impossivel dar acesso parcial a um modulo |
| Admin items visiveis para todos | Qualquer usuario ve o painel administrativo |

---

## 2. Arquitetura do Sistema de Permissoes

### 2.1 Convencao de Chaves

Cada permissao e identificada por uma chave no formato:

```
modulo:recurso:acao
```

**Exemplos:**
- `clientes:lista:ver` — pode visualizar a lista de clientes
- `clientes:detalhe:editar` — pode editar detalhes de um cliente
- `financeiro:contas-pagar:criar` — pode criar contas a pagar
- `admin:permissoes:gerenciar` — pode gerenciar permissoes (implica todas as acoes)

### 2.2 Acoes Disponiveis

| Acao | Descricao | Codigo |
|------|-----------|--------|
| Visualizar | Pode ver/acessar o recurso | `ver` |
| Criar | Pode criar novos registros | `criar` |
| Editar | Pode modificar registros existentes | `editar` |
| Excluir | Pode remover registros | `excluir` |
| Exportar | Pode exportar dados (PDF, Excel, etc.) | `exportar` |
| Gerenciar | Acesso total ao recurso (implica todas as acoes acima) | `gerenciar` |

> **Regra:** Se um usuario tem `modulo:recurso:gerenciar`, automaticamente possui `ver`, `criar`, `editar`, `excluir` e `exportar` para aquele recurso.

### 2.3 Hierarquia de Resolucao

```
1. Template Global da Role (seed padrao)
        |
        v
2. Template da Role no Escritorio (customizado pelo admin do escritorio)
        |
        v
3. Override Individual do Usuario (conceder ou revogar permissoes especificas)
        |
        v
4. Permissoes Efetivas do Usuario (resultado final)
```

**Regras de resolucao:**
- Templates do escritorio sobrescrevem templates globais
- Overrides individuais sobrescrevem tudo (granted=true adiciona, granted=false remove)
- A acao `gerenciar` expande apenas para as acoes que **realmente existem** no banco para aquele `modulo:recurso` (ver Secao 6.3)

### 2.4 Super Admin (Root) vs ADMIN do Escritorio

> **REGRA FUNDAMENTAL:** O Super Admin (root) e o ADMIN de um escritorio sao entidades **completamente independentes** e **nunca se misturam**.

O sistema possui dois mecanismos de autenticacao **separados e paralelos**:

| Aspecto | Super Admin (Root) | ADMIN do Escritorio |
|---------|-------------------|---------------------|
| **Model no banco** | `SuperAdmin` (tabela `super_admins`) | `User` com `role = ADMIN` |
| **Sessao** | `SuperAdminSession` | `Session` |
| **Login** | `/admin-login` (rota exclusiva) | `/login` (rota normal) |
| **Cookie** | `super_admin_session` | `session_token` |
| **Funcao de sessao** | `getSuperAdminSession()` | `getSession()` |
| **Escopo** | Cross-tenant (todos os escritorios) | Scoped a 1 escritorio |
| **Afetado pelo RBAC?** | **NAO** — bypassa completamente | **SIM** — segue templates e overrides |
| **Pode gerenciar permissoes?** | Sim (acesso total a tudo) | Sim, via `admin:permissoes:gerenciar` |
| **Pode ser bloqueado por RBAC?** | **NUNCA** | Sim (overrides podem revogar) |

**Cenario real:** O dono do sistema (root) pode ter o mesmo email em ambos os models (como `SuperAdmin` e como `User` de um escritorio de teste). Isso e aceitavel porque:
- O login em `/admin-login` autentica contra a tabela `super_admins`
- O login em `/login` autentica contra a tabela `users`
- As sessoes sao cookies diferentes, nao interferem entre si
- O RBAC **so se aplica** ao contexto de `User` do escritorio

**Regras inviolaveis do Super Admin:**
1. O Super Admin **nunca** e resolvido pelo motor RBAC (`resolveUserPermissions`)
2. O Super Admin **nunca** aparece na listagem de usuarios da pagina `/admin/permissoes`
3. O acesso root e controlado **apenas** por `getSuperAdminSession()` e pelo flag `ativo` na tabela `super_admins`
4. Nenhuma interface do escritorio pode conceder ou revogar poderes do root
5. O Super Admin acessa o painel admin via `/admin-login`, que e uma rota **publica** protegida apenas por credenciais proprias (email + senha + MFA opcional)

```typescript
// Exemplo: verificacao em server action do painel root
async function requireRootAdmin() {
  const rootSession = await getSuperAdminSession();
  if (!rootSession) throw new Error("Acesso root negado");
  return rootSession;
}

// Exemplo: verificacao em server action do escritorio
async function requireEscritorioAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Nao autenticado");
  await requirePermission("admin:painel:ver"); // RBAC!
  return session;
}
```

> **NUNCA** misture `getSuperAdminSession()` com `getSession()` na mesma verificacao. Sao contextos completamente diferentes.

---

## 3. Mapa Completo de Modulos e Permissoes

### 3.1 Modulos Principais (Dashboard)

| Modulo | Recursos | Rota | Permissao de Acesso |
|--------|----------|------|---------------------|
| Dashboard | painel | `/dashboard` | `dashboard:painel:ver` |
| Publicacoes | lista, detalhe | `/publicacoes` | `publicacoes:lista:ver` |
| Prazos | lista | `/prazos` | `prazos:lista:ver` |
| Atendimentos | lista, detalhe | `/atendimentos` | `atendimentos:lista:ver` |
| Comunicacao | lista | `/comunicacao` | `comunicacao:lista:ver` |
| Chat Interno | mensagens | `/chat` | `chat:mensagens:ver` |
| Clientes | lista, detalhe | `/clientes` | `clientes:lista:ver` |
| Processos | lista, detalhe | `/processos` | `processos:lista:ver` |
| Andamentos | lista | `/andamentos` | `andamentos:lista:ver` |
| Tarefas | lista | `/tarefas` | `tarefas:lista:ver` |
| Agenda | eventos | `/agenda` | `agenda:eventos:ver` |
| Distribuicao | painel | `/distribuicao` | `distribuicao:painel:ver` |
| Demandas | lista | `/demandas` | `demandas:lista:ver` |
| Documentos | lista, detalhe | `/documentos` | `documentos:lista:ver` |
| Controladoria | painel | `/controladoria` | `controladoria:painel:ver` |
| Calculos Juridicos | painel | `/calculos` | `calculos:painel:ver` |
| Protocolos | lista | `/protocolos` | `protocolos:lista:ver` |
| Pecas com IA | gerador | `/pecas` | `pecas:gerador:ver` |
| Produtividade | painel | `/produtividade` | `produtividade:painel:ver` |
| Relatorios | painel | `/relatorios` | `relatorios:painel:ver` |
| Agentes Juridicos | painel | `/agentes-juridicos` | `agentes:painel:ver` |
| Grafo | painel | `/grafo` | `grafo:painel:ver` |

### 3.2 Modulo CRM (9 sub-paginas)

| Recurso | Rota | Permissao de Acesso |
|---------|------|---------------------|
| Contatos | `/crm/contatos` | `crm:contatos:ver` |
| Listas e Categorias | `/crm/listas` | `crm:listas:ver` |
| Segmentos | `/crm/segmentos` | `crm:segmentos:ver` |
| Pipeline | `/crm/pipeline` | `crm:pipeline:ver` |
| Atividades | `/crm/atividades` | `crm:atividades:ver` |
| Campanhas | `/crm/campanhas` | `crm:campanhas:ver` |
| Automacoes/Fluxos | `/crm/fluxos` | `crm:fluxos:ver` |
| Analytics CRM | `/crm/analytics` | `crm:analytics:ver` |
| Configuracoes CRM | `/crm/configuracoes` | `crm:configuracoes:ver` |

**Acoes por recurso CRM:** `ver`, `criar`, `editar`, `excluir`, `exportar`, `gerenciar`

### 3.3 Modulo Financeiro (12 sub-paginas)

| Recurso | Rota | Permissao de Acesso |
|---------|------|---------------------|
| Dashboard Financeiro | `/financeiro` | `financeiro:dashboard:ver` |
| Financeiro do Escritorio | `/financeiro/escritorio` | `financeiro:escritorio:ver` |
| Casos e Advogados | `/financeiro/casos` | `financeiro:casos:ver` |
| Funcionarios | `/financeiro/funcionarios` | `financeiro:funcionarios:ver` |
| Contas a Pagar | `/financeiro/contas-pagar` | `financeiro:contas-pagar:ver` |
| Contas a Receber | `/financeiro/contas-receber` | `financeiro:contas-receber:ver` |
| Rateios e Repasses | `/financeiro/repasses` | `financeiro:repasses:ver` |
| Fluxo de Caixa | `/financeiro/fluxo-caixa` | `financeiro:fluxo-caixa:ver` |
| Rentabilidade | `/financeiro/rentabilidade` | `financeiro:rentabilidade:ver` |
| Relatorios Financeiros | `/financeiro/relatorios` | `financeiro:relatorios:ver` |
| Conciliacao Bancaria | `/financeiro/conciliacao` | `financeiro:conciliacao:ver` |
| Configuracoes Financeiras | `/financeiro/configuracoes` | `financeiro:configuracoes:ver` |

**Acoes por recurso Financeiro:** `ver`, `criar`, `editar`, `excluir`, `exportar`, `gerenciar`

### 3.4 Modulo Admin (13 sub-paginas)

| Recurso | Rota | Permissao de Acesso |
|---------|------|---------------------|
| Painel Admin | `/admin` | `admin:painel:ver` |
| Equipe Juridica | `/admin/equipe-juridica` | `admin:equipe:ver` |
| Operacoes Juridicas | `/admin/operacoes-juridicas` | `admin:operacoes:ver` |
| Central de Jobs | `/admin/jobs` | `admin:jobs:ver` |
| BI Interno | `/admin/bi` | `admin:bi:ver` |
| LGPD | `/admin/lgpd` | `admin:lgpd:ver` |
| Publicacoes Admin | `/admin/publicacoes` | `admin:publicacoes:ver` |
| Demandas Admin | `/admin/demandas` | `admin:demandas:ver` |
| API Docs | `/admin/api-docs` | `admin:api-docs:ver` |
| Workflows | `/admin/workflows` | `admin:workflows:ver` |
| Integracoes | `/admin/integracoes` | `admin:integracoes:ver` |
| Chatbot Triagem | `/admin/chatbot-triagem` | `admin:chatbot:ver` |
| Permissoes | `/admin/permissoes` | `admin:permissoes:gerenciar` |

**Acoes por recurso Admin:** `ver`, `editar`, `gerenciar`

### 3.5 Contagem Total de Permissoes

> **Nota:** Nem todos os recursos possuem as 6 acoes. A contagem real considera apenas as keys que existem no Apendice A.

| Categoria | Recursos | Acoes (media) | Total Real de Chaves |
|-----------|----------|---------------|----------------------|
| Modulos principais | 22 recursos (32 sub-recursos) | variavel (2-6) | ~132 |
| CRM | 9 | variavel (3-6) | ~47 |
| Financeiro | 12 | variavel (2-6) | ~62 |
| Admin | 13 | variavel (1-3) | ~37 |
| **Total** | **56** | — | **~278** |

> A contagem exata deve ser verificada contando cada key no Apendice A. Ao adicionar novos modulos, atualizar ambos os locais.

---

## 4. Templates Padrao por Role

### 4.1 ADMIN (do Escritorio) — Acesso Total ao Escritorio

> **ATENCAO:** Este e o ADMIN **do escritorio**, NAO o Super Admin (root). Ver Secao 2.4 para a distincao.

```
Tudo: gerenciar (todas as permissoes do sistema, incluindo admin:*)
```

> O ADMIN do escritorio e o unico perfil que tem acesso a `admin:permissoes:gerenciar` por padrao. Esta permissao nao pode ser removida via interface para garantir que sempre exista alguem que possa gerenciar permissoes dentro do escritorio.
>
> **Importante:** O ADMIN do escritorio so ge permissoes de usuarios **do seu proprio escritorio**. Ele nao tem visibilidade sobre outros escritorios, nem sobre o Super Admin (root).

### 4.2 SOCIO — Quase Tudo (sem gestao tecnica)

| Modulo | Acesso |
|--------|--------|
| Dashboard, Publicacoes, Prazos | gerenciar |
| Atendimentos, Comunicacao, Chat | gerenciar |
| Clientes, Processos, Andamentos | gerenciar |
| Tarefas, Agenda | gerenciar |
| CRM (todos os recursos) | gerenciar |
| Distribuicao, Demandas | gerenciar |
| Financeiro (todos os recursos) | gerenciar |
| Documentos, Protocolos | gerenciar |
| Controladoria, Produtividade | gerenciar |
| Calculos, Pecas, Relatorios | gerenciar |
| Agentes, Grafo | gerenciar |
| Admin: painel, equipe, bi | ver |
| Admin: demais recursos | **sem acesso** |

### 4.3 ADVOGADO — Sistema Juridico Completo (sem Admin)

| Modulo | Acesso |
|--------|--------|
| Dashboard | ver |
| Publicacoes, Prazos | gerenciar |
| Atendimentos | ver, criar, editar |
| Comunicacao, Chat | gerenciar |
| Clientes | ver, criar, editar |
| Processos, Andamentos | gerenciar |
| Tarefas, Agenda | gerenciar |
| CRM: contatos, pipeline, atividades | ver, criar, editar |
| CRM: campanhas, fluxos, analytics, config | ver |
| Distribuicao | ver |
| Demandas | ver, criar |
| Financeiro: dashboard, casos | ver |
| Financeiro: demais recursos | **sem acesso** |
| Documentos, Protocolos | gerenciar |
| Calculos, Pecas | gerenciar |
| Produtividade | ver |
| Relatorios | ver, exportar |
| Agentes, Grafo | ver |
| Admin (todos) | **sem acesso** |

### 4.4 CONTROLADOR — Controle e Financeiro (read-heavy)

| Modulo | Acesso |
|--------|--------|
| Dashboard | ver |
| Controladoria | gerenciar |
| Financeiro (todos os recursos) | ver, exportar |
| Financeiro: relatorios | gerenciar |
| Produtividade | gerenciar |
| Relatorios | gerenciar |
| Processos, Clientes | ver |
| Distribuicao, Demandas | ver |
| Admin: bi | ver |
| Demais modulos | **sem acesso** |

### 4.5 FINANCEIRO — Modulo Financeiro Completo

| Modulo | Acesso |
|--------|--------|
| Dashboard | ver |
| Financeiro (todos os recursos) | gerenciar |
| Controladoria | ver |
| Relatorios | ver, exportar |
| Clientes | ver |
| Processos | ver |
| Demais modulos | **sem acesso** |

### 4.6 ASSISTENTE — Suporte Juridico (acesso limitado)

| Modulo | Acesso |
|--------|--------|
| Dashboard | ver |
| Publicacoes | ver |
| Prazos | ver, criar, editar |
| Atendimentos | ver, criar |
| Comunicacao, Chat | ver |
| Clientes | ver, criar, editar |
| Processos | ver, criar |
| Andamentos | ver, criar, editar |
| Tarefas | ver, criar, editar |
| Agenda | ver, criar, editar |
| Documentos | ver, criar, editar |
| Protocolos | ver, criar |
| Calculos | ver |
| Demais modulos | **sem acesso** |

### 4.7 SECRETARIA — Atendimento e CRM

| Modulo | Acesso |
|--------|--------|
| Dashboard | ver |
| Atendimentos | gerenciar |
| Comunicacao, Chat | gerenciar |
| Clientes | ver, criar, editar |
| CRM (todos os recursos) | gerenciar |
| Agenda | gerenciar |
| Publicacoes | ver |
| Prazos | ver |
| Processos | ver |
| Documentos | ver |
| Protocolos | ver, criar |
| Demais modulos | **sem acesso** |

---

## 5. Schema do Banco de Dados

### 5.1 Novos Modelos Prisma

```prisma
// ============================================================
// SISTEMA DE PERMISSOES RBAC
// ============================================================

/// Permissao atomica do sistema. Cada registro representa uma acao
/// especifica em um recurso de um modulo.
/// Exemplo: key="clientes:lista:ver", module="clientes", resource="lista", action="ver"
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique
  module      String
  resource    String
  action      String
  description String?

  rolePermissions RolePermission[]
  userOverrides   UserPermissionOverride[]

  @@index([module])
  @@map("permissions")
}

/// Associacao entre Role e Permission. Define o template padrao de cada role.
/// Se escritorioId for NULL, e o template global (seed).
/// Se escritorioId estiver preenchido, e uma customizacao do escritorio.
model RolePermission {
  id           String      @id @default(cuid())
  role         Role
  permissionId String
  permission   Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  escritorioId String?
  escritorio   Escritorio? @relation(fields: [escritorioId], references: [id], onDelete: Cascade)

  @@unique([role, permissionId, escritorioId])
  @@index([role, escritorioId])  // indice composto para query de resolucao
  @@map("role_permissions")
}

/// Override individual de permissao para um usuario especifico.
/// granted=true concede a permissao (mesmo que o template da role nao tenha).
/// granted=false revoga a permissao (mesmo que o template da role tenha).
model UserPermissionOverride {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  granted      Boolean
  grantedBy    String?
  grantedByUser User?     @relation("PermissionGranter", fields: [grantedBy], references: [id], onDelete: SetNull)
  reason       String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([userId, permissionId])
  @@index([userId])
  @@map("user_permission_overrides")
}
```

### 5.2 Alteracoes em Models Existentes

```prisma
// Adicionar ao model User:
model User {
  // ... campos existentes ...
  permissionOverrides  UserPermissionOverride[]
  permissionsGranted   UserPermissionOverride[] @relation("PermissionGranter")
}

// Adicionar ao model Escritorio:
model Escritorio {
  // ... campos existentes ...
  rolePermissions RolePermission[]
}
```

> **Nota:** O model `SuperAdmin` (tabela `super_admins`) NAO recebe nenhuma relacao com o sistema RBAC. O root admin opera em um plano completamente separado.

### 5.3 Diagrama de Relacionamentos

```
┌──────────────┐     ┌──────────────────┐     ┌────────────┐
│  Permission   │────<│  RolePermission   │>────│ Escritorio │
│              │     │                  │     │            │
│ key (unique) │     │ role (enum)      │     │            │
│ module       │     │ permissionId (FK)│     │            │
│ resource     │     │ escritorioId (FK)│     │            │
│ action       │     └──────────────────┘     └────────────┘
│ description  │
│              │     ┌───────────────────────┐  ┌──────────┐
│              │────<│ UserPermissionOverride │>─│   User   │
│              │     │                       │  │          │
│              │     │ userId (FK)           │  │ role     │
│              │     │ permissionId (FK)     │  │ ...      │
│              │     │ granted (bool)        │  └──────────┘
│              │     │ grantedBy (FK → User) │       │
│              │     │ reason                │       │
│              │     └───────────────────────┘       │
│              │              │                      │
└──────────────┘              └── grantedByUser ─────┘
                                  (quem concedeu)

  ┌────────────────┐
  │  SuperAdmin     │  ← COMPLETAMENTE SEPARADO
  │                │     Nao tem relacao com Permission,
  │ email (unique) │     RolePermission, nem Override.
  │ senhaHash      │     Acesso root via getSuperAdminSession()
  │ ativo          │
  │ mfaEnabled     │
  └────────────────┘
```

---

## 6. Arquitetura Tecnica

### 6.1 Novas Variaveis de Ambiente

```env
# Habilita/desabilita o sistema RBAC (feature flag para rollback seguro)
RBAC_ENABLED=true

# Secret para assinar o cookie perm_cache (HMAC-SHA256)
# Gerar com: openssl rand -hex 32
PERM_CACHE_SECRET=<hex-string-de-64-caracteres>
```

### 6.2 Novos Arquivos a Criar

```
src/
├── lib/
│   └── rbac/
│       ├── types.ts                    # Tipos TypeScript do RBAC
│       ├── permissions.ts              # Mapa completo de permission keys
│       ├── resolve-permissions.ts      # Motor de resolucao de permissoes
│       ├── check-permission.ts         # Funcoes de verificacao server-side
│       ├── route-guard.ts              # Guard para page.tsx
│       └── permission-context.tsx      # Provider e hook client-side
├── middleware.ts                        # Middleware Next.js
├── actions/
│   └── permissoes.ts                   # Server Actions de gerenciamento
├── app/
│   └── (dashboard)/
│       └── admin/
│           └── permissoes/
│               └── page.tsx            # Pagina admin de permissoes
└── components/
    └── admin/
        └── permissoes/
            ├── permissoes-manager.tsx   # Componente principal (tabs)
            ├── role-template-editor.tsx # Editor de templates por role
            ├── user-override-editor.tsx # Editor de overrides por usuario
            └── permission-matrix.tsx   # Componente de matriz de checkboxes

prisma/
└── seeds/
    └── seed-permissions.ts             # Seed de permissoes e templates
```

### 6.3 Arquivos Existentes a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `prisma/schema.prisma` | Adicionar 3 models (Permission, RolePermission, UserPermissionOverride) + relations |
| `src/lib/constants.ts` | Adicionar `permissionKey` ao tipo `MenuItem` e a cada item da sidebar |
| `src/components/layout/sidebar.tsx` | Filtrar itens por permissoes do usuario |
| `src/app/(dashboard)/layout.tsx` | Resolver permissoes apos getSession(), passar para shell |
| `src/components/layout/dashboard-shell.tsx` | Receber/repassar permissoes para Sidebar e PermissionProvider |
| `src/actions/admin.ts` | Migrar checks de role para novo sistema |
| `src/actions/financeiro-module.ts` | Migrar MANAGE_ROLES para novo sistema |
| `src/actions/tarefas.ts` | Migrar check de role |
| `src/actions/agendamento.ts` | Migrar check de role |
| `src/actions/demandas.ts` | Migrar checks de role |
| `src/lib/auth/crm-auth.ts` | Migrar `getCRMAuthUser()` para usar `hasPermission("crm:*:ver")` |
| + ~28 action files restantes | Adicionar `requirePermission()` gradualmente |
| + ~91 page.tsx files | Adicionar `guardPage()` gradualmente |

### 6.4 Motor de Resolucao de Permissoes

```typescript
// src/lib/rbac/resolve-permissions.ts (pseudocodigo)

// Cache global de all permission keys (raramente muda, load once)
let allPermissionKeys: Set<string> | null = null;

async function getAllPermissionKeys(): Promise<Set<string>> {
  if (!allPermissionKeys) {
    const perms = await db.permission.findMany({ select: { key: true } });
    allPermissionKeys = new Set(perms.map(p => p.key));
  }
  return allPermissionKeys;
}

async function resolveUserPermissions(
  userId: string,
  role: Role,
  escritorioId: string
): Promise<Set<string>> {

  // 1. Query unica: buscar templates global + escritorio com prioridade
  const templates = await db.rolePermission.findMany({
    where: {
      role,
      OR: [{ escritorioId }, { escritorioId: null }]
    },
    include: { permission: { select: { key: true } } }
  });

  // 2. Agrupar por permission key: escritorio tem prioridade sobre global
  const templateMap = new Map<string, string | null>(); // key -> escritorioId
  for (const t of templates) {
    const existing = templateMap.get(t.permission.key);
    // Se ja tem um do escritorio, nao sobrescrever com global
    if (existing === escritorioId) continue;
    templateMap.set(t.permission.key, t.escritorioId);
  }

  // 3. Montar set base (se tem template escritorio, ignorar global para aquele key)
  const hasEscritorioTemplates = templates.some(t => t.escritorioId === escritorioId);
  const permissions = new Set<string>();
  for (const [key, eid] of templateMap) {
    if (hasEscritorioTemplates && eid === null) continue; // ignorar global se escritorio customizou
    permissions.add(key);
  }

  // 4. Buscar overrides do usuario
  const overrides = await db.userPermissionOverride.findMany({
    where: { userId },
    include: { permission: { select: { key: true } } }
  });

  // 5. Aplicar overrides
  for (const override of overrides) {
    if (override.granted) {
      permissions.add(override.permission.key);
    } else {
      permissions.delete(override.permission.key);
    }
  }

  // 6. Expandir "gerenciar" usando APENAS keys que existem no banco
  const allKeys = await getAllPermissionKeys();
  expandGerenciarPermissions(permissions, allKeys);

  return permissions;
}

/**
 * Expande permissoes do tipo `modulo:recurso:gerenciar` para as acoes
 * que REALMENTE existem na tabela Permission para aquele modulo:recurso.
 * Nao cria keys fantasma.
 */
function expandGerenciarPermissions(
  permissions: Set<string>,
  allKeys: Set<string>
): void {
  for (const key of [...permissions]) {
    if (!key.endsWith(":gerenciar")) continue;
    const prefix = key.slice(0, -":gerenciar".length); // "modulo:recurso"
    for (const action of ["ver", "criar", "editar", "excluir", "exportar"]) {
      const candidate = `${prefix}:${action}`;
      if (allKeys.has(candidate)) {
        permissions.add(candidate);
      }
    }
  }
}
```

> **Nota:** A resolucao faz **2 queries** por request (1 para templates + 1 para overrides) em vez das 3 originais. Ambas usam o indice composto `[role, escritorioId]` e `[userId]`.

### 6.5 Funcoes de Verificacao

```typescript
// src/lib/rbac/check-permission.ts (pseudocodigo)

// Cache per-request (mesmo padrao do getSession())
const getPermissions = cache(async (): Promise<Set<string>> => {
  const session = await getSession();
  if (!session) return new Set();
  return resolveUserPermissions(session.id, session.role, session.escritorioId);
});

async function hasPermission(key: string): Promise<boolean> {
  const perms = await getPermissions();
  return perms.has(key);
}

// Para server actions: retorna erro amigavel em vez de throw
async function requirePermission(key: string): Promise<{ error?: string }> {
  if (!(await hasPermission(key))) {
    return { error: "Voce nao tem permissao para esta acao" };
  }
  return {};
}

// Para pages/guards: lanca redirect (comportamento esperado)
async function requirePermissionOrRedirect(key: string): Promise<void> {
  if (!(await hasPermission(key))) {
    redirect("/dashboard?erro=sem-permissao");
  }
}

async function hasAnyPermission(keys: string[]): Promise<boolean> {
  const perms = await getPermissions();
  return keys.some(k => perms.has(k));
}
```

### 6.6 Guard para Pages

```typescript
// src/lib/rbac/route-guard.ts (pseudocodigo)

async function guardPage(requiredPermission: string): Promise<void> {
  // Feature flag: se RBAC desabilitado, nao bloqueia
  if (process.env.RBAC_ENABLED !== "true") return;

  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermissionOrRedirect(requiredPermission);
}

// Uso em page.tsx:
export default async function FinanceiroPage() {
  await guardPage("financeiro:dashboard:ver");
  // ... render page
}
```

### 6.7 Contexto Client-Side

```typescript
// src/lib/rbac/permission-context.tsx (pseudocodigo)

const PermissionContext = createContext<PermissionContextValue>(null);

function PermissionProvider({ permissions, children }) {
  // Recebe apenas keys de navegacao (*:ver) — ~30 strings, nao o set completo
  const permSet = useMemo(() => new Set(permissions), [permissions]);

  const value = useMemo(() => ({
    has: (key: string) => permSet.has(key),
    hasAny: (keys: string[]) => keys.some(k => permSet.has(k)),
    hasAll: (keys: string[]) => keys.every(k => permSet.has(k)),
  }), [permSet]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

function usePermissions() {
  return useContext(PermissionContext);
}

// Componente utilitario para esconder elementos sem permissao:
function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { has } = usePermissions();
  if (!has(permission)) return fallback;
  return <>{children}</>;
}

// Uso em componentes:
function BotaoExcluirCliente({ clienteId }) {
  const { has } = usePermissions();
  if (!has("clientes:detalhe:excluir")) return null;
  return <Button onClick={() => excluirCliente(clienteId)}>Excluir</Button>;
}
```

> **Nota:** O PermissionProvider recebe apenas permissoes de **navegacao** (`*:ver`). Permissoes de acao (`criar`, `editar`, `excluir`) sao verificadas **apenas server-side** nos server actions via `requirePermission()`. Isso reduz o payload de hidratacao de ~5-8KB para ~1KB.

### 6.8 Middleware

```typescript
// src/middleware.ts (pseudocodigo)
import { createHmac } from "crypto";

const PUBLIC_PATHS = [
  "/login", "/esqueci-senha", "/redefinir-senha",
  "/admin-login", "/portal"
];

// Cookie perm_cache assinado com HMAC para evitar forjamento
function verifyPermCacheCookie(value: string): string[] | null {
  // Formato: base64(json).signature
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const secret = process.env.PERM_CACHE_SECRET;
  if (!secret) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (signature !== expected) return null; // cookie forjado!

  try {
    return JSON.parse(Buffer.from(payload, "base64").toString());
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rotas publicas passam direto (inclui /admin-login do Super Admin)
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. Verificar session_token
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Para rotas /admin/*, verificar cookie perm_cache ASSINADO
  if (pathname.startsWith("/admin")) {
    const permCacheRaw = request.cookies.get("perm_cache")?.value;
    if (!permCacheRaw) {
      // Sem cache: deixar passar, o guardPage() vai bloquear server-side
      return NextResponse.next();
    }

    const perms = verifyPermCacheCookie(permCacheRaw);
    if (!perms) {
      // Cookie invalido/forjado: limpar e redirecionar
      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      response.cookies.delete("perm_cache");
      return response;
    }

    if (!perms.includes("admin:painel:ver")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 4. Para rotas /financeiro/*, verificar acesso basico
  if (pathname.startsWith("/financeiro")) {
    const permCacheRaw = request.cookies.get("perm_cache")?.value;
    if (permCacheRaw) {
      const perms = verifyPermCacheCookie(permCacheRaw);
      if (perms && !perms.includes("financeiro:dashboard:ver")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

> **IMPORTANTE:** O middleware e apenas uma **primeira barreira rapida**. A verificacao real e autoritativa acontece nos server actions via `requirePermission()` e nos pages via `guardPage()`. Se o cookie nao existir ou estiver invalido, o middleware deixa passar e a verificacao server-side bloqueia.

### 6.9 Filtragem da Sidebar

```typescript
// Em src/lib/constants.ts - adicionar permissionKey a cada item:

export type MenuItem = {
  label: string;
  href?: string;
  icon: string;
  permissionKey?: string;  // NOVO
  subItems?: { label: string; href: string; permissionKey?: string }[];  // NOVO
};

export const SIDEBAR_ITEMS: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard",
    permissionKey: "dashboard:painel:ver" },
  { label: "Publicacoes", href: "/publicacoes", icon: "Newspaper",
    permissionKey: "publicacoes:lista:ver" },
  { label: "Clientes", href: "/clientes", icon: "Users",
    permissionKey: "clientes:lista:ver" },
  // ... etc
  {
    label: "Financeiro",
    icon: "DollarSign",
    permissionKey: "financeiro:dashboard:ver",
    subItems: [
      { label: "Contas a Pagar", href: "/financeiro/contas-pagar",
        permissionKey: "financeiro:contas-pagar:ver" },
      // ... etc
    ],
  },
];

// Em sidebar.tsx - filtrar antes de renderizar:
const visibleItems = useMemo(() =>
  SIDEBAR_ITEMS.filter(item =>
    !item.permissionKey || permissions.includes(item.permissionKey)
  ).map(item => ({
    ...item,
    subItems: item.subItems?.filter(sub =>
      !sub.permissionKey || permissions.includes(sub.permissionKey)
    ),
  })),
  [permissions]
);
```

---

## 7. UI de Gerenciamento (/admin/permissoes)

### 7.1 Layout da Pagina

A pagina tera 2 abas principais:

**Aba 1: Templates por Role**

```
┌─────────────────────────────────────────────────────────────────┐
│  Templates de Permissao                                         │
│                                                                 │
│  Role: [SECRETARIA ▼]                                          │
│                                                                 │
│  ┌──────────────┬─────┬──────┬───────┬────────┬────────┬──────┐│
│  │ Modulo       │ Ver │Criar │Editar │Excluir │Exportar│Geren.││
│  ├──────────────┼─────┼──────┼───────┼────────┼────────┼──────┤│
│  │ Dashboard    │ [x] │  -   │   -   │   -    │   -    │  [ ] ││
│  │ Clientes     │ [x] │ [x]  │  [x]  │  [ ]   │  [ ]   │  [ ] ││
│  │ Processos    │ [x] │ [ ]  │  [ ]  │  [ ]   │  [ ]   │  [ ] ││
│  │ CRM          │ [x] │ [x]  │  [x]  │  [x]   │  [x]   │  [x] ││
│  │  └ Contatos  │ [x] │ [x]  │  [x]  │  [x]   │  [x]   │  [x] ││
│  │  └ Pipeline  │ [x] │ [x]  │  [x]  │  [x]   │  [x]   │  [x] ││
│  │  └ Campanhas │ [x] │ [x]  │  [x]  │  [x]   │  [x]   │  [x] ││
│  │ Financeiro   │ [ ] │ [ ]  │  [ ]  │  [ ]   │  [ ]   │  [ ] ││
│  │ Admin        │ [ ] │  -   │  [ ]  │   -    │   -    │  [ ] ││
│  └──────────────┴─────┴──────┴───────┴────────┴────────┴──────┘│
│                                                                 │
│  [Restaurar Padrao]                          [Salvar Template]  │
└─────────────────────────────────────────────────────────────────┘
```

**Aba 2: Permissoes por Usuario**

```
┌─────────────────────────────────────────────────────────────────┐
│  Permissoes do Usuario                                          │
│                                                                 │
│  Usuario: [Buscar usuario...                    ▼]              │
│                                                                 │
│  Maria Silva (SECRETARIA)                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Permissoes Efetivas:                                      │   │
│  │                                                          │   │
│  │ ● CRM (todas as acoes) .............. via Template Role  │   │
│  │ ● Atendimentos (gerenciar) .......... via Template Role  │   │
│  │ ● Clientes (ver, criar, editar) ..... via Template Role  │   │
│  │ ● Financeiro: Dashboard (ver) ....... Override [Revogar] │   │
│  │ ○ Processos (editar) ................ Revogado [Conceder]│   │
│  │                                                          │   │
│  │ [+ Adicionar Permissao]                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Historico de Alteracoes:                                       │
│  • 2026-03-20 - Admin concedeu financeiro:dashboard:ver         │
│  • 2026-03-15 - Admin revogou processos:detalhe:editar          │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Server Actions

```typescript
// src/actions/permissoes.ts

// NOTA: Todas as actions abaixo exigem `admin:permissoes:gerenciar`.
// O Super Admin (root) NAO usa estas actions — ele tem seu proprio painel.

// Atualizar template de uma role para o escritorio
updateRoleTemplate(role: Role, permissionKeys: string[]): Promise<void>

// Conceder/revogar permissao individual de um usuario
setUserPermissionOverride(
  userId: string,
  permissionKey: string,
  granted: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }>  // retorna erro amigavel, nao throw

// Remover override (voltar ao template da role)
removeUserPermissionOverride(
  userId: string,
  permissionKey: string
): Promise<{ success: boolean; error?: string }>

// Obter permissoes efetivas de um usuario (para exibicao)
getUserEffectivePermissions(userId: string): Promise<{
  permissions: Array<{
    key: string;
    source: "role_template" | "escritorio_template" | "user_override";
    granted: boolean;
  }>;
}>

// Obter template de uma role
getRoleTemplatePermissions(role: Role): Promise<string[]>

// Listar usuarios do escritorio com suas roles
// NUNCA retorna o Super Admin (root), apenas users do escritorio
listUsersForPermissions(): Promise<Array<{
  id: string;
  name: string;
  email: string;
  role: Role;
  overrideCount: number;
}>>
```

> **Tratamento de erros:** As actions retornam `{ success, error? }` em vez de lancar `throw`. Isso permite que o client exiba um toast amigavel sem causar erro 500 ou quebrar a UI.

---

## 8. Estrategia de Migracao

### 8.1 Principio: Zero Downtime com Feature Flag

A migracao sera feita de forma incremental usando:
1. Um **feature flag** `RBAC_ENABLED` para ligar/desligar o sistema inteiro
2. Um **modo dual** que verifica ambos os sistemas (role enum antigo + permissoes novas) durante a transicao

```typescript
// Feature flag global
const RBAC_ENABLED = process.env.RBAC_ENABLED === "true";

// Na sidebar: se desabilitado, mostra tudo como antes
const visibleItems = RBAC_ENABLED
  ? filterByPermissions(SIDEBAR_ITEMS, permissions)
  : SIDEBAR_ITEMS;

// No middleware: se desabilitado, nao faz verificacao de permissao
if (!RBAC_ENABLED) return NextResponse.next();
```

> O feature flag permite reverter instantaneamente para o comportamento anterior em caso de problemas, sem precisar fazer deploy.

### 8.2 Funcao de Transicao

```typescript
// Modo dual: verifica role OU permissao
async function hasRoleOrPermission(
  allowedRoles: Role[],
  permissionKey: string
): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  // Verificar role antigo (fallback)
  if (allowedRoles.includes(session.role)) return true;

  // Verificar permissao nova
  return hasPermission(permissionKey);
}
```

### 8.3 Ordem de Migracao

| Prioridade | Arquivo | Tipo de Check Atual | Complexidade |
|-----------|---------|---------------------|--------------|
| 1 | `src/actions/admin.ts` | Multiplos `role === "ADMIN"` | Alta |
| 2 | `src/actions/financeiro-module.ts` | `MANAGE_ROLES: Role[]` | Media |
| 3 | `src/actions/tarefas.ts` | `role !== "ADVOGADO"` | Baixa |
| 4 | `src/actions/agendamento.ts` | `role !== "ADMIN"` | Baixa |
| 5 | `src/actions/demandas.ts` | Role-in-array | Media |
| 6 | Restante (~28 files) | Variado | Media |
| 7 | Pages (~91 files) | Sem check | Media (volume) |

### 8.4 Integracao com Auth CRM Existente

O codebase ja possui modulos de autorizacao especificos para CRM (`src/lib/auth/crm-scope.ts` e `src/lib/auth/crm-auth.ts`) que controlam scoping por areas e times. A migracao deve integrar esses modulos:

| Modulo Existente | Funcao Atual | Migracao para RBAC |
|-----------------|-------------|-------------------|
| `crm-auth.ts` | `getCRMAuthUser()` — whitelist de roles com acesso ao CRM | Substituir por `hasPermission("crm:contatos:ver")` (ou similar) |
| `crm-scope.ts` | Scoping por areas/times dentro do CRM | **Manter** — e escopo de dados, nao funcional. Complementar ao RBAC |
| `job-auth.ts` | Auth para jobs/cron via Bearer token | **Nao afetado** — nao e usuario interativo |

> **Importante:** O RBAC substitui apenas a verificacao de **acesso funcional** (pode/nao pode acessar o CRM). O **escopo de dados** (quais contatos/areas o usuario ve dentro do CRM) continua sendo controlado pelo `crm-scope.ts` e pelo RLS. Os dois sistemas sao complementares.

### 8.5 Fases de Deployment

```
Semana 1: Fase 1 + Fase 2
  - Deploy do schema (migration)
  - Rodar seed de permissoes
  - Deploy do motor de resolucao
  - Nenhuma mudanca visivel ao usuario

Semana 2: Fase 3 + Fase 4
  - Deploy do middleware
  - Deploy da sidebar filtrada
  - Usuarios comecam a ver apenas seus modulos
  - Guards em pages criticos

Semana 3: Fase 5
  - Deploy da pagina /admin/permissoes
  - Admin pode customizar templates e overrides

Semana 4+: Fase 6 + Fase 7
  - Migracao gradual dos action files
  - Guards em todas as pages
  - Remocao do modo dual (apos 100% migrado)
```

---

## 9. Seguranca

### 9.1 Regras Inviolaveis

1. **O Super Admin (root) NAO e afetado pelo RBAC.** O root opera via `SuperAdmin` + `SuperAdminSession`, nunca via `User` + `Session`. O RBAC nao pode bloquear, revogar, nem modificar o acesso root. (Ver Secao 2.4)
2. **ADMIN do escritorio nao perde acesso a permissoes:** A permissao `admin:permissoes:gerenciar` nao pode ser removida da role ADMIN via interface, garantindo que sempre exista alguem que possa gerenciar permissoes dentro do escritorio
3. **Tenant isolation:** Todas as queries de permissao sao scopadas por `escritorioId`. Um ADMIN so ve/edita usuarios do seu escritorio
4. **Server-side first:** O middleware e a sidebar sao conveniencia; a verificacao real e autoritativa acontece nos server actions via `requirePermission()` e nos pages via `guardPage()`
5. **Audit trail:** Toda alteracao de override registra `grantedBy` (FK para User), `reason` e timestamp

### 9.2 Cookie perm_cache (Assinado)

- Contem apenas ~30 keys de acesso a modulos (permissoes de navegacao `*:ver`), NAO o set completo de ~278
- **Assinado com HMAC-SHA256** usando `PERM_CACHE_SECRET` (variavel de ambiente server-side)
- Formato do cookie: `base64(json).hmac_signature`
- O middleware **rejeita** cookies sem assinatura valida ou com assinatura incorreta
- Cookie e atualizado no layout do dashboard apos resolver permissoes
- **Nunca e a fonte da verdade** — sempre verificar server-side
- Se o cookie nao existir, o middleware deixa passar e o `guardPage()` bloqueia

### 9.3 Protecao contra Escalacao de Privilegios

- Um usuario so pode conceder permissoes que ele mesmo possui (verificado server-side)
- Apenas usuarios com `admin:permissoes:gerenciar` podem alterar permissoes de outros
- Overrides sao auditados com: quem fez (`grantedBy` FK), motivo (`reason`), e quando (`createdAt`/`updatedAt`)
- Se o admin que concedeu for deletado, o campo `grantedBy` fica `null` (via `onDelete: SetNull`) mas o override permanece

### 9.4 Separacao Super Admin vs Escritorio

| Acao | Super Admin (Root) | ADMIN Escritorio |
|------|-------------------|------------------|
| Acessar `/admin-login` | Autentica via `super_admins` | Nao tem acesso |
| Acessar `/admin/permissoes` | Nao usa essa rota (acesso root separado) | Via RBAC |
| Ver usuarios de outros escritorios | Cross-tenant | Apenas seu escritorio |
| Alterar permissoes RBAC | Via painel root (se implementado) | Via `/admin/permissoes` |
| Ser bloqueado pelo RBAC | **NUNCA** | Sim, via overrides |
| Aparecer em `listUsersForPermissions()` | **NUNCA** | Sim |

> **Regra de ouro:** Se `getSuperAdminSession()` retorna um usuario, ele tem acesso a TUDO, sem passar pelo RBAC. Se `getSession()` retorna um usuario, ele SEMPRE passa pelo RBAC.

---

## 10. Performance

### 10.1 Estrategia de Cache

| Camada | Mecanismo | Duracao | Invalidacao |
|--------|-----------|---------|-------------|
| Server (per-request) | React `cache()` | 1 request | Automatica |
| Client (sidebar) | PermissionProvider | Ate proximo render | `revalidatePath()` |
| Middleware | Cookie `perm_cache` (assinado) | Ate proximo layout load | Atualizado no layout |
| Permission keys (server) | Variavel em memoria | Ate restart | `invalidatePermissionKeysCache()` |

### 10.2 Invalidacao Ativa de Permissoes

Quando o admin altera permissoes de um usuario, o cache precisa ser invalidado **ativamente**:

```typescript
// Apos alterar permissao de um usuario:
async function invalidateUserPermissions(userId: string) {
  // 1. Incrementar versao no banco (campo permissionVersion no User)
  await db.user.update({
    where: { id: userId },
    data: { permissionVersion: { increment: 1 } }
  });

  // 2. Revalidar cache do Next.js
  revalidatePath("/", "layout");
}

// No getPermissions(), comparar versao:
const getPermissions = cache(async (): Promise<Set<string>> => {
  const session = await getSession();
  if (!session) return new Set();
  // A versao muda -> React `cache()` retorna resultado fresco no proximo request
  return resolveUserPermissions(session.id, session.role, session.escritorioId);
});
```

> **Nota:** O `permissionVersion` e um campo Int no model User. Quando muda, o cookie `perm_cache` fica desatualizado e sera regenerado no proximo carregamento do layout.

### 10.3 Queries Otimizadas

- A resolucao de permissoes faz **2 queries** (templates + overrides) por request usando uma unica query com `OR` para templates
- Templates usam indice composto `[role, escritorioId]`; overrides usam indice `[userId]`
- O resultado e cacheado por request via React `cache()`, entao multiplos `hasPermission()` no mesmo request nao fazem queries adicionais

### 10.4 Serialização Client-Side Otimizada

O `PermissionProvider` recebe apenas as **permissoes de navegacao** (keys terminadas em `:ver`), nao o set completo:

```typescript
// No layout.tsx:
const allPermissions = await resolveUserPermissions(...);
const navigationPermissions = [...allPermissions].filter(k => k.endsWith(":ver"));
// Envia ~30 strings para o client, nao ~278

// Permissoes de acao (criar, editar, excluir) sao verificadas APENAS server-side
// nos server actions via requirePermission()
```

> Isso reduz o payload de hidratacao de ~5-8KB (ADMIN) para ~1KB.

### 10.5 Tamanho dos Dados

- ~278 permission rows (seed, raramente muda)
- ~1.500-2.000 role_permission rows (7 roles x ~278 permissions, seed)
- ~0-50 user_permission_overrides por escritorio (volume baixo)

---

## 11. Testes e Validacao

### 11.1 Cenarios de Teste

| Cenario | Resultado Esperado |
|---------|-------------------|
| SECRETARIA acessa `/dashboard` | Ve o dashboard |
| SECRETARIA acessa `/financeiro` | Redirecionada para `/dashboard?erro=sem-permissao` |
| SECRETARIA ve sidebar | Apenas: Dashboard, CRM, Atendimentos, Clientes, Agenda, Comunicacao, Chat, Publicacoes, Prazos, Processos (ver), Documentos (ver), Protocolos |
| ADVOGADO acessa `/admin` | Redirecionado para `/dashboard?erro=sem-permissao` |
| ADVOGADO ve sidebar | Tudo juridico, sem secao Admin |
| ADMIN do escritorio acessa `/admin/permissoes` | Acesso normal |
| ADMIN concede `financeiro:dashboard:ver` a SECRETARIA | SECRETARIA passa a ver Dashboard Financeiro |
| ADMIN revoga `crm:contatos:excluir` de SECRETARIA especifica | Aquela SECRETARIA nao pode mais excluir contatos |
| Usuario tenta acessar rota sem session_token | Redirecionado para `/login` |
| Middleware: usuario sem `admin:painel:ver` acessa `/admin/*` | Redirecionado para `/dashboard` |
| **Super Admin acessa `/admin-login`** | **Autentica via tabela `super_admins`, sem RBAC** |
| **Super Admin NAO aparece em `listUsersForPermissions()`** | **Lista retorna apenas users do escritorio** |
| **Super Admin com mesmo email de User do escritorio** | **Cada login funciona independentemente na sua rota** |
| **Cookie `perm_cache` forjado manualmente** | **Middleware rejeita e redireciona para `/dashboard`** |
| **Usuario sem permissao clica em botao de acao (server action)** | **Retorna `{ error: "sem-permissao" }`, UI mostra toast** |
| **RBAC_ENABLED=false (feature flag)** | **Sistema funciona como antes (sem filtragem)** |

### 11.2 Tratamento de Erros na UI

Quando um usuario sem permissao tenta executar uma acao:

| Contexto | Comportamento |
|----------|--------------|
| **Server Action** | Retorna `{ error: "sem-permissao", message: "Voce nao tem permissao para esta acao" }` (NAO lanca throw, que causaria erro 500) |
| **Client (botao/formulario)** | Componente `<PermissionGate>` esconde botoes sem permissao; se a acao falhar server-side, mostra toast de erro |
| **Page (guardPage)** | Redireciona para `/dashboard?erro=sem-permissao`, onde o layout exibe um toast informativo |
| **Middleware** | Redireciona silenciosamente para `/dashboard` (sem expor detalhes de permissao) |

```typescript
// Componente utilitario PermissionGate:
function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { has } = usePermissions();
  if (!has(permission)) return fallback;
  return <>{children}</>;
}

// Uso:
<PermissionGate permission="clientes:detalhe:excluir">
  <Button onClick={() => excluirCliente(id)}>Excluir</Button>
</PermissionGate>
```

### 11.3 Checklist de Validacao

- [ ] Migration roda sem erros
- [ ] Seed popula todas as ~278 permissoes
- [ ] Seed cria templates para todas as 7 roles
- [ ] `resolveUserPermissions()` retorna set correto para cada role
- [ ] `gerenciar` expande apenas para acoes que existem no banco (nao cria keys fantasma)
- [ ] Overrides de usuario funcionam (grant e revoke)
- [ ] Template do escritorio sobrescreve template global
- [ ] Sidebar filtra itens corretamente por role
- [ ] Sidebar atualiza apos mudanca de permissao (invalidacao ativa)
- [ ] Middleware bloqueia rotas admin para nao-admins
- [ ] Middleware rejeita cookie `perm_cache` forjado (sem assinatura HMAC valida)
- [ ] Middleware redireciona para login sem session_token
- [ ] `guardPage()` bloqueia paginas sem permissao
- [ ] `requirePermission()` bloqueia actions sem permissao (retorna erro, nao throw)
- [ ] Pagina `/admin/permissoes` funciona para ADMIN do escritorio
- [ ] Pagina `/admin/permissoes` bloqueada para nao-ADMIN
- [ ] Super Admin (root) NAO aparece na listagem de usuarios
- [ ] Super Admin (root) NAO e afetado pelo RBAC
- [ ] `getSuperAdminSession()` e `getSession()` nunca se misturam
- [ ] `grantedBy` registra corretamente quem alterou (FK para User)
- [ ] Audit trail registra quem alterou o que
- [ ] Performance: resolucao em < 50ms
- [ ] Feature flag `RBAC_ENABLED` permite desabilitar sistema
- [ ] Cookie `perm_cache` envia apenas keys de navegacao (`*:ver`)

---

## 12. Estimativa de Esforco

| Fase | Descricao | Estimativa |
|------|-----------|------------|
| Fase 1 | Schema + Tipos + Seed + Feature Flag | 2-3 dias |
| Fase 2 | Motor de Permissoes + Invalidacao | 2 dias |
| Fase 3 | Middleware (assinado) + Route Guards | 1 dia |
| Fase 4 | Filtragem da Sidebar + PermissionGate | 1 dia |
| Fase 5 | UI Admin de Permissoes | 2-3 dias |
| Fase 6 | Migracao de Checks Existentes + CRM auth | 3-5 dias |
| Fase 7 | Cache, Invalidacao Ativa + Testes | 1 dia |
| **Total** | | **~12-16 dias** |

---

## Apendice A: Lista Completa de Permission Keys

```
# Dashboard
dashboard:painel:ver
dashboard:painel:gerenciar

# Publicacoes
publicacoes:lista:ver
publicacoes:lista:criar
publicacoes:lista:editar
publicacoes:lista:excluir
publicacoes:lista:exportar
publicacoes:lista:gerenciar
publicacoes:detalhe:ver
publicacoes:detalhe:editar
publicacoes:detalhe:excluir
publicacoes:detalhe:gerenciar

# Prazos
prazos:lista:ver
prazos:lista:criar
prazos:lista:editar
prazos:lista:excluir
prazos:lista:exportar
prazos:lista:gerenciar

# Atendimentos
atendimentos:lista:ver
atendimentos:lista:criar
atendimentos:lista:editar
atendimentos:lista:excluir
atendimentos:lista:exportar
atendimentos:lista:gerenciar
atendimentos:detalhe:ver
atendimentos:detalhe:editar
atendimentos:detalhe:excluir
atendimentos:detalhe:gerenciar

# Comunicacao
comunicacao:lista:ver
comunicacao:lista:criar
comunicacao:lista:editar
comunicacao:lista:excluir
comunicacao:lista:gerenciar

# Chat
chat:mensagens:ver
chat:mensagens:criar
chat:mensagens:editar
chat:mensagens:excluir
chat:mensagens:gerenciar

# Clientes
clientes:lista:ver
clientes:lista:criar
clientes:lista:editar
clientes:lista:excluir
clientes:lista:exportar
clientes:lista:gerenciar
clientes:detalhe:ver
clientes:detalhe:editar
clientes:detalhe:excluir
clientes:detalhe:gerenciar

# Processos
processos:lista:ver
processos:lista:criar
processos:lista:editar
processos:lista:excluir
processos:lista:exportar
processos:lista:gerenciar
processos:detalhe:ver
processos:detalhe:editar
processos:detalhe:excluir
processos:detalhe:gerenciar

# Andamentos
andamentos:lista:ver
andamentos:lista:criar
andamentos:lista:editar
andamentos:lista:excluir
andamentos:lista:exportar
andamentos:lista:gerenciar

# Tarefas
tarefas:lista:ver
tarefas:lista:criar
tarefas:lista:editar
tarefas:lista:excluir
tarefas:lista:exportar
tarefas:lista:gerenciar

# Agenda
agenda:eventos:ver
agenda:eventos:criar
agenda:eventos:editar
agenda:eventos:excluir
agenda:eventos:exportar
agenda:eventos:gerenciar

# CRM
crm:contatos:ver
crm:contatos:criar
crm:contatos:editar
crm:contatos:excluir
crm:contatos:exportar
crm:contatos:gerenciar
crm:listas:ver
crm:listas:criar
crm:listas:editar
crm:listas:excluir
crm:listas:gerenciar
crm:segmentos:ver
crm:segmentos:criar
crm:segmentos:editar
crm:segmentos:excluir
crm:segmentos:gerenciar
crm:pipeline:ver
crm:pipeline:criar
crm:pipeline:editar
crm:pipeline:excluir
crm:pipeline:gerenciar
crm:atividades:ver
crm:atividades:criar
crm:atividades:editar
crm:atividades:excluir
crm:atividades:gerenciar
crm:campanhas:ver
crm:campanhas:criar
crm:campanhas:editar
crm:campanhas:excluir
crm:campanhas:exportar
crm:campanhas:gerenciar
crm:fluxos:ver
crm:fluxos:criar
crm:fluxos:editar
crm:fluxos:excluir
crm:fluxos:gerenciar
crm:analytics:ver
crm:analytics:exportar
crm:analytics:gerenciar
crm:configuracoes:ver
crm:configuracoes:editar
crm:configuracoes:gerenciar

# Distribuicao
distribuicao:painel:ver
distribuicao:painel:editar
distribuicao:painel:gerenciar

# Demandas
demandas:lista:ver
demandas:lista:criar
demandas:lista:editar
demandas:lista:excluir
demandas:lista:exportar
demandas:lista:gerenciar

# Financeiro
financeiro:dashboard:ver
financeiro:dashboard:gerenciar
financeiro:escritorio:ver
financeiro:escritorio:editar
financeiro:escritorio:gerenciar
financeiro:casos:ver
financeiro:casos:editar
financeiro:casos:exportar
financeiro:casos:gerenciar
financeiro:funcionarios:ver
financeiro:funcionarios:criar
financeiro:funcionarios:editar
financeiro:funcionarios:excluir
financeiro:funcionarios:gerenciar
financeiro:contas-pagar:ver
financeiro:contas-pagar:criar
financeiro:contas-pagar:editar
financeiro:contas-pagar:excluir
financeiro:contas-pagar:exportar
financeiro:contas-pagar:gerenciar
financeiro:contas-receber:ver
financeiro:contas-receber:criar
financeiro:contas-receber:editar
financeiro:contas-receber:excluir
financeiro:contas-receber:exportar
financeiro:contas-receber:gerenciar
financeiro:repasses:ver
financeiro:repasses:criar
financeiro:repasses:editar
financeiro:repasses:excluir
financeiro:repasses:gerenciar
financeiro:fluxo-caixa:ver
financeiro:fluxo-caixa:exportar
financeiro:fluxo-caixa:gerenciar
financeiro:rentabilidade:ver
financeiro:rentabilidade:exportar
financeiro:rentabilidade:gerenciar
financeiro:relatorios:ver
financeiro:relatorios:exportar
financeiro:relatorios:gerenciar
financeiro:conciliacao:ver
financeiro:conciliacao:editar
financeiro:conciliacao:gerenciar
financeiro:configuracoes:ver
financeiro:configuracoes:editar
financeiro:configuracoes:gerenciar

# Documentos
documentos:lista:ver
documentos:lista:criar
documentos:lista:editar
documentos:lista:excluir
documentos:lista:exportar
documentos:lista:gerenciar
documentos:detalhe:ver
documentos:detalhe:editar
documentos:detalhe:excluir
documentos:detalhe:gerenciar

# Controladoria
controladoria:painel:ver
controladoria:painel:editar
controladoria:painel:exportar
controladoria:painel:gerenciar

# Calculos
calculos:painel:ver
calculos:painel:gerenciar

# Protocolos
protocolos:lista:ver
protocolos:lista:criar
protocolos:lista:editar
protocolos:lista:excluir
protocolos:lista:gerenciar

# Pecas com IA
pecas:gerador:ver
pecas:gerador:criar
pecas:gerador:gerenciar

# Produtividade
produtividade:painel:ver
produtividade:painel:exportar
produtividade:painel:gerenciar

# Relatorios
relatorios:painel:ver
relatorios:painel:exportar
relatorios:painel:gerenciar

# Agentes Juridicos
agentes:painel:ver
agentes:painel:gerenciar

# Grafo
grafo:painel:ver
grafo:painel:gerenciar

# Admin
admin:painel:ver
admin:painel:gerenciar
admin:equipe:ver
admin:equipe:editar
admin:equipe:gerenciar
admin:operacoes:ver
admin:operacoes:editar
admin:operacoes:gerenciar
admin:jobs:ver
admin:jobs:gerenciar
admin:bi:ver
admin:bi:gerenciar
admin:lgpd:ver
admin:lgpd:editar
admin:lgpd:gerenciar
admin:publicacoes:ver
admin:publicacoes:editar
admin:publicacoes:gerenciar
admin:demandas:ver
admin:demandas:editar
admin:demandas:gerenciar
admin:api-docs:ver
admin:api-docs:gerenciar
admin:workflows:ver
admin:workflows:editar
admin:workflows:gerenciar
admin:integracoes:ver
admin:integracoes:editar
admin:integracoes:gerenciar
admin:chatbot:ver
admin:chatbot:editar
admin:chatbot:gerenciar
admin:permissoes:gerenciar
```
