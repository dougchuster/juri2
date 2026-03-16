-- CreateEnum
CREATE TYPE "TipoEndereco" AS ENUM ('PRINCIPAL', 'COBRANCA', 'CORRESPONDENCIA', 'COMERCIAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoContato" AS ENUM ('EMAIL', 'TELEFONE', 'CELULAR', 'WHATSAPP', 'SITE', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoCampo" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'DATETIME', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'URL', 'EMAIL', 'PHONE', 'CURRENCY');

-- CreateEnum
CREATE TYPE "EntidadeCampo" AS ENUM ('CLIENTE', 'PROCESSO', 'TAREFA', 'ATENDIMENTO', 'DOCUMENTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RecipientStatus" ADD VALUE 'OPENED';
ALTER TYPE "RecipientStatus" ADD VALUE 'CLICKED';

-- AlterTable
ALTER TABLE "campaign_recipients" ADD COLUMN     "abVariant" TEXT,
ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clickedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "abSubjectB" TEXT,
ADD COLUMN     "abVariantPercent" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "listId" TEXT;

-- AlterTable
ALTER TABLE "financeiro_escritorio_lancamentos" ADD COLUMN     "conciliado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extratoItemId" TEXT;

-- AlterTable
ALTER TABLE "processos" ADD COLUMN     "grau" TEXT,
ADD COLUMN     "segredoJustica" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tarefas" ADD COLUMN     "colunaId" TEXT,
ADD COLUMN     "ordemKanban" INTEGER DEFAULT 0,
ADD COLUMN     "quadroId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "extratos_bancarios" (
    "id" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "agencia" TEXT,
    "conta" TEXT,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "saldoInicial" DECIMAL(15,2) NOT NULL,
    "saldoFinal" DECIMAL(15,2) NOT NULL,
    "totalItens" INTEGER NOT NULL DEFAULT 0,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extratos_bancarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extrato_itens" (
    "id" TEXT NOT NULL,
    "extratoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "tipo" TEXT NOT NULL,
    "saldoApos" DECIMAL(15,2),
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extrato_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_saved_views" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculos" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "parametros" JSONB NOT NULL,
    "resultado" JSONB,
    "processoId" TEXT,
    "clienteId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolos" (
    "id" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevistaSaida" TIMESTAMP(3),
    "prazo" INTEGER,
    "tipo" TEXT NOT NULL DEFAULT 'ENVIO',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "codigoBarras" TEXT,
    "remetente" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "localizacao" TEXT,
    "observacoes" TEXT,
    "processoId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocolos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocolo_historico" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observacao" TEXT,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocolo_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pecas_ia" (
    "id" TEXT NOT NULL,
    "tipoPeca" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "fatosInput" TEXT NOT NULL,
    "conteudo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "processoId" TEXT,
    "clienteId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "creditosUsados" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pecas_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enderecos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoEndereco" NOT NULL DEFAULT 'PRINCIPAL',
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" CHAR(2),
    "pais" TEXT DEFAULT 'BR',
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoContato" NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contatos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanban_quadros" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "cor" TEXT DEFAULT '#6366f1',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanban_quadros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanban_colunas" (
    "id" TEXT NOT NULL,
    "quadroId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT,
    "limiteWip" INTEGER,
    "statusMapa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanban_colunas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campos_personalizados" (
    "id" TEXT NOT NULL,
    "entidade" "EntidadeCampo" NOT NULL,
    "nome" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tipo" "TipoCampo" NOT NULL,
    "opcoes" JSONB,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "placeholder" TEXT,
    "ajuda" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campos_personalizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campos_valores" (
    "id" TEXT NOT NULL,
    "campoId" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "valor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campos_valores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extratos_bancarios_dataInicio_dataFim_idx" ON "extratos_bancarios"("dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "extrato_itens_extratoId_data_idx" ON "extrato_itens"("extratoId", "data");

-- CreateIndex
CREATE INDEX "extrato_itens_conciliado_idx" ON "extrato_itens"("conciliado");

-- CreateIndex
CREATE INDEX "crm_saved_views_escritorioId_idx" ON "crm_saved_views"("escritorioId");

-- CreateIndex
CREATE INDEX "crm_saved_views_userId_idx" ON "crm_saved_views"("userId");

-- CreateIndex
CREATE INDEX "calculos_processoId_idx" ON "calculos"("processoId");

-- CreateIndex
CREATE INDEX "calculos_clienteId_idx" ON "calculos"("clienteId");

-- CreateIndex
CREATE INDEX "calculos_criadoPorId_idx" ON "calculos"("criadoPorId");

-- CreateIndex
CREATE INDEX "calculos_tipo_idx" ON "calculos"("tipo");

-- CreateIndex
CREATE INDEX "calculos_createdAt_idx" ON "calculos"("createdAt");

-- CreateIndex
CREATE INDEX "protocolos_processoId_idx" ON "protocolos"("processoId");

-- CreateIndex
CREATE INDEX "protocolos_criadoPorId_idx" ON "protocolos"("criadoPorId");

-- CreateIndex
CREATE INDEX "protocolos_status_idx" ON "protocolos"("status");

-- CreateIndex
CREATE INDEX "protocolos_tipo_idx" ON "protocolos"("tipo");

-- CreateIndex
CREATE INDEX "protocolos_dataEntrada_idx" ON "protocolos"("dataEntrada");

-- CreateIndex
CREATE INDEX "protocolo_historico_protocoloId_idx" ON "protocolo_historico"("protocoloId");

-- CreateIndex
CREATE INDEX "pecas_ia_processoId_idx" ON "pecas_ia"("processoId");

-- CreateIndex
CREATE INDEX "pecas_ia_clienteId_idx" ON "pecas_ia"("clienteId");

-- CreateIndex
CREATE INDEX "pecas_ia_criadoPorId_idx" ON "pecas_ia"("criadoPorId");

-- CreateIndex
CREATE INDEX "pecas_ia_status_idx" ON "pecas_ia"("status");

-- CreateIndex
CREATE INDEX "pecas_ia_tipoPeca_idx" ON "pecas_ia"("tipoPeca");

-- CreateIndex
CREATE INDEX "pecas_ia_createdAt_idx" ON "pecas_ia"("createdAt");

-- CreateIndex
CREATE INDEX "enderecos_clienteId_idx" ON "enderecos"("clienteId");

-- CreateIndex
CREATE INDEX "enderecos_cep_idx" ON "enderecos"("cep");

-- CreateIndex
CREATE INDEX "contatos_cliente_clienteId_idx" ON "contatos_cliente"("clienteId");

-- CreateIndex
CREATE INDEX "contatos_cliente_tipo_idx" ON "contatos_cliente"("tipo");

-- CreateIndex
CREATE INDEX "kanban_colunas_quadroId_idx" ON "kanban_colunas"("quadroId");

-- CreateIndex
CREATE INDEX "kanban_colunas_ordem_idx" ON "kanban_colunas"("ordem");

-- CreateIndex
CREATE INDEX "campos_personalizados_entidade_idx" ON "campos_personalizados"("entidade");

-- CreateIndex
CREATE INDEX "campos_personalizados_ativo_idx" ON "campos_personalizados"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "campos_personalizados_entidade_nome_key" ON "campos_personalizados"("entidade", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "campos_valores_campoId_idx" ON "campos_valores"("campoId");

-- CreateIndex
CREATE INDEX "campos_valores_entidadeId_idx" ON "campos_valores"("entidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "campos_valores_campoId_entidadeId_key" ON "campos_valores"("campoId", "entidadeId");

-- CreateIndex
CREATE INDEX "financeiro_escritorio_lancamentos_conciliado_idx" ON "financeiro_escritorio_lancamentos"("conciliado");

-- CreateIndex
CREATE INDEX "tarefas_quadroId_idx" ON "tarefas"("quadroId");

-- CreateIndex
CREATE INDEX "tarefas_colunaId_idx" ON "tarefas"("colunaId");

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_quadroId_fkey" FOREIGN KEY ("quadroId") REFERENCES "kanban_quadros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_colunaId_fkey" FOREIGN KEY ("colunaId") REFERENCES "kanban_colunas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_escritorio_lancamentos" ADD CONSTRAINT "financeiro_escritorio_lancamentos_extratoItemId_fkey" FOREIGN KEY ("extratoItemId") REFERENCES "extrato_itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extratos_bancarios" ADD CONSTRAINT "extratos_bancarios_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extrato_itens" ADD CONSTRAINT "extrato_itens_extratoId_fkey" FOREIGN KEY ("extratoId") REFERENCES "extratos_bancarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_listId_fkey" FOREIGN KEY ("listId") REFERENCES "crm_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_saved_views" ADD CONSTRAINT "crm_saved_views_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculos" ADD CONSTRAINT "calculos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculos" ADD CONSTRAINT "calculos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculos" ADD CONSTRAINT "calculos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos" ADD CONSTRAINT "protocolos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolos" ADD CONSTRAINT "protocolos_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocolo_historico" ADD CONSTRAINT "protocolo_historico_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "protocolos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_ia" ADD CONSTRAINT "pecas_ia_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_ia" ADD CONSTRAINT "pecas_ia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_ia" ADD CONSTRAINT "pecas_ia_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contatos_cliente" ADD CONSTRAINT "contatos_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanban_colunas" ADD CONSTRAINT "kanban_colunas_quadroId_fkey" FOREIGN KEY ("quadroId") REFERENCES "kanban_quadros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campos_valores" ADD CONSTRAINT "campos_valores_campoId_fkey" FOREIGN KEY ("campoId") REFERENCES "campos_personalizados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
