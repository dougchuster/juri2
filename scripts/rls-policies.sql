-- =============================================================================
-- Row-Level Security (RLS) — Isolamento de Dados por Escritório
-- =============================================================================
-- Executar como superuser ou owner das tabelas.
-- O app deve setar `SET LOCAL "app.escritorio_id" = '<id>'` antes de cada query
-- em contexto multi-tenant (implementado em src/lib/db-rls.ts via withTenantRLS).
--
-- Para a role de aplicação (`app_user`) é necessário que ela NÃO seja BYPASSRLS.
-- A role de migrate/seed deve ter BYPASSRLS para não ser afetada pelas policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Habilitar RLS nas tabelas críticas
-- -----------------------------------------------------------------------------
ALTER TABLE "Cliente"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Processo"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Documento"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tarefa"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Financeiro"   ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Remover policies anteriores (idempotente)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_isolation ON "Cliente";
DROP POLICY IF EXISTS tenant_isolation ON "Processo";
DROP POLICY IF EXISTS tenant_isolation ON "Conversation";
DROP POLICY IF EXISTS tenant_isolation ON "Documento";
DROP POLICY IF EXISTS tenant_isolation ON "Tarefa";
DROP POLICY IF EXISTS tenant_isolation ON "Financeiro";

-- Policy especial para permitir NULLs (dados legados sem escritorioId)
DROP POLICY IF EXISTS tenant_allow_null ON "Cliente";
DROP POLICY IF EXISTS tenant_allow_null ON "Processo";
DROP POLICY IF EXISTS tenant_allow_null ON "Conversation";
DROP POLICY IF EXISTS tenant_allow_null ON "Documento";
DROP POLICY IF EXISTS tenant_allow_null ON "Tarefa";
DROP POLICY IF EXISTS tenant_allow_null ON "Financeiro";

-- -----------------------------------------------------------------------------
-- 3. Criar policies de isolamento
--    current_setting('app.escritorio_id', true) → 2º arg true = não lança erro
--    se o GUC não estiver setado (retorna NULL).
--    Quando NULL, só registros sem escritorioId passam (dados globais).
-- -----------------------------------------------------------------------------
CREATE POLICY tenant_isolation ON "Cliente"
    USING (
        "escritorioId" = current_setting('app.escritorio_id', TRUE)
    );

CREATE POLICY tenant_allow_null ON "Cliente"
    USING (
        "escritorioId" IS NULL
        AND current_setting('app.escritorio_id', TRUE) IS NULL
    );

-- ---

CREATE POLICY tenant_isolation ON "Processo"
    USING (
        "escritorioId" = current_setting('app.escritorio_id', TRUE)
    );

CREATE POLICY tenant_allow_null ON "Processo"
    USING (
        "escritorioId" IS NULL
        AND current_setting('app.escritorio_id', TRUE) IS NULL
    );

-- ---

CREATE POLICY tenant_isolation ON "Conversation"
    USING (
        "escritorioId" = current_setting('app.escritorio_id', TRUE)
    );

CREATE POLICY tenant_allow_null ON "Conversation"
    USING (
        "escritorioId" IS NULL
        AND current_setting('app.escritorio_id', TRUE) IS NULL
    );

-- ---

CREATE POLICY tenant_isolation ON "Documento"
    USING (
        "escritorioId" = current_setting('app.escritorio_id', TRUE)
    );

CREATE POLICY tenant_allow_null ON "Documento"
    USING (
        "escritorioId" IS NULL
        AND current_setting('app.escritorio_id', TRUE) IS NULL
    );

-- ---

CREATE POLICY tenant_isolation ON "Tarefa"
    USING (
        "escritorioId" = current_setting('app.escritorio_id', TRUE)
    );

CREATE POLICY tenant_allow_null ON "Tarefa"
    USING (
        "escritorioId" IS NULL
        AND current_setting('app.escritorio_id', TRUE) IS NULL
    );

-- ---

CREATE POLICY tenant_isolation ON "Financeiro"
    USING (
        "escritorioId" = current_setting('app.escritorio_id', TRUE)
    );

CREATE POLICY tenant_allow_null ON "Financeiro"
    USING (
        "escritorioId" IS NULL
        AND current_setting('app.escritorio_id', TRUE) IS NULL
    );

-- -----------------------------------------------------------------------------
-- 4. Garantir que a role da aplicação NÃO bypasse RLS
--    (substitua 'app_user' pela role real usada no DATABASE_URL)
-- -----------------------------------------------------------------------------
-- ALTER ROLE app_user NOBYPASSRLS;

-- -----------------------------------------------------------------------------
-- 5. A role usada em migrations/seeds deve bypassar RLS
--    (substitua 'prisma_migrate' pela role do prisma migrate)
-- -----------------------------------------------------------------------------
-- ALTER ROLE prisma_migrate BYPASSRLS;

-- =============================================================================
-- Para reverter (desabilitar RLS):
-- =============================================================================
-- ALTER TABLE "Cliente"      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Processo"     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Documento"    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Tarefa"       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Financeiro"   DISABLE ROW LEVEL SECURITY;
