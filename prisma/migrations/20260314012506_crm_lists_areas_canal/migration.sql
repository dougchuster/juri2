-- CreateEnum
CREATE TYPE "CanalPreferido" AS ENUM ('EMAIL', 'WHATSAPP', 'AMBOS');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "areasJuridicas" TEXT[],
ADD COLUMN     "canalPreferido" "CanalPreferido";

-- CreateTable
CREATE TABLE "crm_list_folders" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_list_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_lists" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_list_members" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,

    CONSTRAINT "crm_list_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_list_folders_escritorioId_name_key" ON "crm_list_folders"("escritorioId", "name");

-- CreateIndex
CREATE INDEX "crm_lists_escritorioId_idx" ON "crm_lists"("escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lists_escritorioId_name_key" ON "crm_lists"("escritorioId", "name");

-- CreateIndex
CREATE INDEX "crm_list_members_listId_idx" ON "crm_list_members"("listId");

-- CreateIndex
CREATE INDEX "crm_list_members_clienteId_idx" ON "crm_list_members"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_list_members_listId_clienteId_key" ON "crm_list_members"("listId", "clienteId");

-- AddForeignKey
ALTER TABLE "crm_list_folders" ADD CONSTRAINT "crm_list_folders_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lists" ADD CONSTRAINT "crm_lists_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lists" ADD CONSTRAINT "crm_lists_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "crm_list_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_list_members" ADD CONSTRAINT "crm_list_members_listId_fkey" FOREIGN KEY ("listId") REFERENCES "crm_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_list_members" ADD CONSTRAINT "crm_list_members_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
