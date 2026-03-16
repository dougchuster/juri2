-- CreateIndex
CREATE INDEX "clientes_email_idx" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "clientes_origemId_idx" ON "clientes"("origemId");

-- CreateIndex
CREATE INDEX "clientes_createdAt_idx" ON "clientes"("createdAt");

-- CreateIndex
CREATE INDEX "clientes_lastContactAt_idx" ON "clientes"("lastContactAt");

-- CreateIndex
CREATE INDEX "clientes_crmScore_idx" ON "clientes"("crmScore");

-- CreateIndex
CREATE INDEX "clientes_status_crmScore_idx" ON "clientes"("status", "crmScore");

-- CreateIndex
CREATE INDEX "clientes_crmRelationship_status_idx" ON "clientes"("crmRelationship", "status");

-- CreateIndex
CREATE INDEX "movimentacoes_processoId_data_idx" ON "movimentacoes"("processoId", "data");

-- CreateIndex
CREATE INDEX "processos_createdAt_idx" ON "processos"("createdAt");

-- CreateIndex
CREATE INDEX "processos_status_advogadoId_idx" ON "processos"("status", "advogadoId");

-- CreateIndex
CREATE INDEX "processos_status_clienteId_idx" ON "processos"("status", "clienteId");

-- CreateIndex
CREATE INDEX "processos_tribunal_vara_idx" ON "processos"("tribunal", "vara");
