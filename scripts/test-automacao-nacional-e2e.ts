import "dotenv/config";

import { ensureCatalogoTribunaisNacional } from "../src/lib/services/automacao-tribunais";
import {
  iniciarAutomacaoBuscaNacional,
  executarAutomacaoNacionalJob,
  getAutomacaoJobStatus,
} from "../src/lib/services/automacao-nacional";
import { db } from "../src/lib/db";

async function main() {
  // Keep the test fast by limiting DataJud tribunals.
  process.env.AUTOMACAO_NACIONAL_MAX_TRIBUNAIS =
    process.env.AUTOMACAO_NACIONAL_MAX_TRIBUNAIS || "2";
  process.env.AUTOMACAO_NACIONAL_DATAJUD_CONCURRENCY =
    process.env.AUTOMACAO_NACIONAL_DATAJUD_CONCURRENCY || "3";
  process.env.AUTOMACAO_NACIONAL_SKIP_CAPTURE =
    process.env.AUTOMACAO_NACIONAL_SKIP_CAPTURE || "true";

  await ensureCatalogoTribunaisNacional(false);

  const lookbackDays = Math.max(0, Math.min(30, Number(process.env.AUTOMACAO_NACIONAL_LOOKBACK_DAYS || "1") || 1));

  const oabNumero = (process.env.AUTOMACAO_NACIONAL_TEST_OAB_NUMERO || "").trim();
  const oabUf = (process.env.AUTOMACAO_NACIONAL_TEST_OAB_UF || "").trim().toUpperCase();
  const advogadoByOab =
    oabNumero && oabUf
      ? await db.advogado.findFirst({
          where: { oab: oabNumero, seccional: oabUf, ativo: true, user: { isActive: true } },
          select: { id: true },
        })
      : null;

  const job = await iniciarAutomacaoBuscaNacional({
    advogadoId: advogadoByOab?.id,
    lookbackDays,
    runNow: false, // run inline below (no queue required)
    forceCatalogSync: false,
    allowInlineFallback: true,
  });

  const result = await executarAutomacaoNacionalJob(job.id);
  const status = await getAutomacaoJobStatus(job.id);

  console.log(
    JSON.stringify(
      {
        jobId: job.id,
        result,
        resumo: status?.resumo,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[test-automacao-nacional-e2e] error:", error);
  process.exitCode = 1;
});
