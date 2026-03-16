import "dotenv/config";

import { db } from "@/lib/db";

async function main() {
  const [processos, processosComCnj, publicacoes, publicacoesComProcesso, prazos] = await Promise.all([
    db.processo.count(),
    db.processo.count({ where: { numeroCnj: { not: null } } }),
    db.publicacao.count(),
    db.publicacao.count({ where: { processoId: { not: null } } }),
    db.prazo.count(),
  ]);

  console.log({
    processos,
    processosComCnj,
    publicacoes,
    publicacoesComProcesso,
    prazos,
  });
}

main()
  .catch((err) => {
    console.error("[db-stats] error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect().catch(() => null);
  });
