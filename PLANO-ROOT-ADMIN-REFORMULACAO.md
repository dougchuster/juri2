# Plano de Reformulacao - Painel Root Admin (/root-admin)

## Diagnostico Atual

### O que funciona:
- Login/logout com rate limiting e sessoes
- Dashboard com 4 metricas basicas (orgs totais, ativas, usuarios, trials expirando)
- Listagem de organizacoes com busca/filtro/paginacao
- Listagem de usuarios com busca/filtro/paginacao
- Criacao de organizacoes (com slug e trial automatico)
- Criacao de usuarios (com hash bcrypt)
- Soft delete de usuarios e organizacoes
- Logging de acoes admin (SuperAdminLog)
- Sidebar com navegacao completa

### Bugs Criticos:
1. **Contagem de usuarios por org quebrada** — `GET /api/organizacoes/[id]` usa `db.advogado.count()` SEM filtro `where: { escritorioId }`, retorna contagem GLOBAL
2. **Modelo inconsistente de contagem** — Pagina de orgs conta `funcionarioFinanceiro`, API conta `advogado` — resultados diferentes
3. **Delete nao limpa sessoes** — Soft delete de usuario marca `isActive: false` mas sessoes ativas continuam funcionando
4. **Password reset sem validacao de erro** — Chama `requestPasswordReset(email)` sem tratar falha silenciosa

### Paginas Stub (6 de 9 paginas sao placeholder "Em desenvolvimento"):
- `/root-admin/configuracoes` — Configuracoes
- `/root-admin/sistema` — Sistema
- `/root-admin/financeiro` — Financeiro
- `/root-admin/relatorios` — Relatorios
- `/root-admin/integracoes` — Integracoes
- `/root-admin/suporte` — Suporte

### Funcionalidades Incompletas:
- Org Detail: aba "Usuarios" mostra "em construcao"
- Org Detail: sem botoes de acao (editar, suspender, reativar, deletar)
- User Detail: sem opcao de redefinir senha inline
- Sem busca global / filtros avancados
- Sem export de dados (CSV/Excel)

---

## Plano de Implementacao

### FASE 1 — Correcao de Bugs Criticos (Prioridade Maxima)

#### 1.1 Fix: Contagem de usuarios por organizacao
- **Arquivo**: `src/app/root-admin/api/organizacoes/[id]/route.ts`
- **Acao**: Adicionar `where: { user: { escritorioId: id } }` no `db.advogado.count()`
- **Arquivo**: `src/app/root-admin/api/organizacoes/[id]/stats/route.ts`
- **Acao**: Verificar e corrigir mesma query

#### 1.2 Fix: Padronizar modelo de contagem de usuarios
- **Acao**: Usar `db.user.count({ where: { escritorioId } })` como padrao em TODAS as queries
- **Arquivos afetados**: route.ts de organizacoes, org-table, dashboard

#### 1.3 Fix: Delete de usuario deve invalidar sessoes
- **Arquivo**: `src/app/root-admin/api/usuarios/[id]/route.ts`
- **Acao**: Na transacao de delete, adicionar `db.session.deleteMany({ where: { userId } })` e `db.account.deleteMany({ where: { userId } })` para invalidar todas as sessoes

#### 1.4 Fix: Password reset com tratamento de erro
- **Arquivo**: `src/app/root-admin/api/usuarios/[id]/route.ts`
- **Acao**: Wrap `requestPasswordReset` em try/catch, retornar erro especifico se falhar

---

### FASE 2 — CRUD Completo e Funcional

#### 2.1 Organizacoes - CRUD Completo
- **Editar organizacao**: Form modal/inline para editar nome, email, CNPJ, endereco, limites
  - Arquivo: criar `src/components/root-admin/organizacoes/org-edit-form.tsx`
  - API: melhorar PATCH em `/api/organizacoes/[id]` para aceitar todos os campos editaveis
- **Suspender/Reativar**: Botao de toggle de status na org-detail e org-table
  - API: ja existe `/api/organizacoes/[id]/status` — conectar ao UI
- **Deletar organizacao**: Confirmar com dialog, soft delete com cascade (desativar todos usuarios)
  - Melhorar DELETE em `/api/organizacoes/[id]` para cascade
- **Alterar plano/assinatura**: Dropdown para mudar plano, atualizar limites
  - API: criar PATCH `/api/organizacoes/[id]/assinatura`

#### 2.2 Usuarios - CRUD Completo
- **Editar usuario**: Form para editar nome, email, role, organizacao vinculada
  - Melhorar componente de user detail
- **Redefinir senha**: Botao "Redefinir Senha" que envia email OU gera senha temporaria
  - API: criar POST `/api/usuarios/[id]/reset-password`
  - UI: botao no user-table e user detail
- **Ativar/Desativar**: Toggle de status com confirmacao
- **Deletar permanente (hard delete)**: Opcao avancada com confirmacao dupla
  - API: adicionar query param `?hard=true` no DELETE
- **Impersonar usuario**: Botao "Logar como" para debug (cria sessao temporaria)
  - API: criar POST `/api/usuarios/[id]/impersonate`

---

### FASE 3 — Paginas de Gestao do Sistema

#### 3.1 Pagina Sistema (`/root-admin/sistema`)
- Versao do sistema (package.json version)
- Status do banco de dados (conexao, contagem de registros por tabela)
- Status de servicos externos (email, storage, APIs)
- Informacoes do servidor (uptime, memoria, Node version)
- Ultimo deploy / commit
- **API**: criar GET `/api/sistema/health`
- **Componente**: `src/components/root-admin/sistema/system-info.tsx`

#### 3.2 Pagina Configuracoes (`/root-admin/configuracoes`)
- Gerenciar super admins (criar, editar, desativar outros admins)
- Configurar email SMTP (templates, remetente)
- Configurar limites padrao para novas organizacoes
- Gerenciar planos disponiveis (CRUD de Plano)
- **API**: criar rotas `/api/configuracoes/*`
- **Componentes**: forms para cada secao

#### 3.3 Pagina Financeiro (`/root-admin/financeiro`)
- Visao geral de assinaturas ativas, trials, canceladas
- Receita mensal estimada (soma dos planos ativos)
- Lista de organizacoes com assinatura expirando
- Historico de mudancas de plano
- **API**: criar GET `/api/financeiro/overview`
- **Componentes**: tabelas e graficos com recharts

#### 3.4 Pagina Relatorios (`/root-admin/relatorios`)
- Crescimento de organizacoes (grafico por mes)
- Crescimento de usuarios (grafico por mes)
- Taxa de conversao trial -> pago
- Organizacoes mais ativas (por processos, documentos, logins)
- Export para CSV
- **API**: criar GET `/api/relatorios/crescimento`, `/api/relatorios/atividade`

#### 3.5 Pagina Logs/Auditoria (NOVA — substituir Suporte)
- Renomear "Suporte" para "Logs & Auditoria" na sidebar
- Tabela de SuperAdminLog com filtros (acao, admin, data)
- Timeline visual de acoes
- **API**: ja existe GET `/api/logs` — melhorar com filtros

#### 3.6 Pagina Integracoes (`/root-admin/integracoes`)
- Status de integracoes (Google Auth, Meta Social, etc)
- Configurar API keys
- Webhooks configurados
- **API**: criar GET `/api/integracoes/status`

---

### FASE 4 — Melhorias de UX/UI

#### 4.1 Dashboard Melhorado
- Adicionar graficos de tendencia (ultimos 30 dias) com recharts
- Cards clicaveis que levam para a pagina correspondente
- Ultimas acoes do admin (mini-log)
- Alertas: trials expirando, orgs sem atividade, erros do sistema

#### 4.2 Org Detail Completo
- Tab "Usuarios": listar usuarios da org com acoes (editar, desativar, remover)
- Tab "Assinatura": editar plano, ver historico
- Tab "Atividade": log de acoes na org
- Botoes de acao no header: Editar, Suspender, Reativar, Deletar

#### 4.3 Busca Global
- Barra de busca no header que busca orgs + usuarios simultaneamente
- Atalho Ctrl+K para abrir

#### 4.4 Acoes em Lote
- Checkbox na tabela de orgs e usuarios
- Acoes: ativar/desativar em lote, enviar email em lote

---

## Ordem de Execucao Recomendada

```
FASE 1 (Bugs)     → Executar PRIMEIRO — 1-2 horas
FASE 2 (CRUD)     → Executar SEGUNDO — 3-4 horas
FASE 3 (Paginas)  → Executar TERCEIRO — 4-6 horas
FASE 4 (UX)       → Executar POR ULTIMO — 2-3 horas
```

## Arquivos Chave Existentes

```
# Pages
src/app/root-admin/page.tsx                          # Dashboard
src/app/root-admin/layout.tsx                        # Auth guard
src/app/root-admin/usuarios/page.tsx                 # User list
src/app/root-admin/usuarios/[id]/page.tsx            # User detail
src/app/root-admin/organizacoes/page.tsx             # Org list
src/app/root-admin/organizacoes/nova/page.tsx        # Create org
src/app/root-admin/organizacoes/[id]/page.tsx        # Org detail

# API Routes
src/app/root-admin/api/auth/login/route.ts
src/app/root-admin/api/auth/logout/route.ts
src/app/root-admin/api/usuarios/route.ts             # GET list, POST create
src/app/root-admin/api/usuarios/[id]/route.ts        # GET, PATCH, DELETE
src/app/root-admin/api/organizacoes/route.ts         # GET list, POST create
src/app/root-admin/api/organizacoes/[id]/route.ts    # GET, PATCH, DELETE
src/app/root-admin/api/organizacoes/[id]/stats/route.ts
src/app/root-admin/api/organizacoes/[id]/status/route.ts
src/app/root-admin/api/logs/route.ts

# Components
src/components/root-admin/layout/root-admin-shell.tsx
src/components/root-admin/layout/root-sidebar.tsx
src/components/root-admin/layout/root-header.tsx
src/components/root-admin/dashboard/root-dashboard.tsx
src/components/root-admin/dashboard/metric-card.tsx
src/components/root-admin/shared/data-table.tsx
src/components/root-admin/shared/status-badge.tsx
src/components/root-admin/shared/confirm-dialog.tsx
src/components/root-admin/organizacoes/org-table.tsx
src/components/root-admin/organizacoes/org-detail.tsx
src/components/root-admin/organizacoes/org-create-form.tsx
src/components/root-admin/usuarios/user-table.tsx

# Auth
src/actions/root-admin-auth.ts
src/lib/root-admin/api-auth.ts

# Schema
prisma/schema.prisma (models: SuperAdmin, SuperAdminSession, SuperAdminLog, Escritorio, Advogado, User, Plano, Assinatura)
```

## Regras para Implementacao

1. Manter o design system atual: bg `#1a1a24`, borders `rgba(255,255,255,0.08)`, accent `#6366f1` (indigo)
2. Todas as acoes destrutivas devem usar o `confirm-dialog.tsx` existente
3. Toda acao admin deve criar um `SuperAdminLog`
4. Usar o `requireSuperAdminApi()` em TODA nova rota de API
5. Manter paginacao consistente (20/50/100 por pagina)
6. Queries Prisma devem usar `select` para nao vazar dados sensiveis (senhaHash, tokens)
7. Soft delete como padrao, hard delete apenas com confirmacao dupla
8. Todas as datas em formato pt-BR
