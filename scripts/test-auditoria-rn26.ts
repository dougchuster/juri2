import "dotenv/config";
import assert from "node:assert/strict";

import { db } from "@/lib/db";
import { registrarLogAuditoria } from "@/lib/services/audit-log";

async function run() {
    console.log("[test-auditoria-rn26] Iniciando teste de auditoria...");

    const user = await db.user.findFirst({ select: { id: true } });
    assert.ok(user?.id, "Nenhum usuario encontrado para auditoria.");

    const entidadeId = `selftest:${Date.now()}`;

    const saved = await registrarLogAuditoria({
        actorUserId: user.id,
        acao: "RN26_AUDITORIA_TESTE",
        entidade: "HealthcheckAuditoria",
        entidadeId,
        dadosDepois: { ok: true },
    });

    assert.equal(saved, true, "Falha ao registrar log de auditoria.");

    const log = await db.logAuditoria.findFirst({
        where: { entidade: "HealthcheckAuditoria", entidadeId },
        select: { id: true, acao: true, userId: true },
    });

    assert.ok(log?.id, "Log de auditoria nao encontrado apos insercao.");
    assert.equal(log.acao, "RN26_AUDITORIA_TESTE", "Acao de auditoria divergente.");
    assert.equal(log.userId, user.id, "Usuario de auditoria divergente.");

    console.log("[test-auditoria-rn26] OK");
}

run()
    .catch((error) => {
        console.error("[test-auditoria-rn26] ERROR", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.$disconnect();
    });
