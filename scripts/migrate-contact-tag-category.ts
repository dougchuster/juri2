import "dotenv/config";
import { db } from "@/lib/db";
import type { ContactTagCategory } from "@/generated/prisma";

function normalizeTagText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCategoryFromExplicitHint(name: string, description?: string | null): ContactTagCategory | null {
  const source = `${name || ""} ${description || ""}`;
  const normalized = normalizeTagText(source);

  const explicitMatch = normalized.match(/\b(?:categoria|category)\s*[:=-]\s*([a-z_]+)/i);
  if (explicitMatch?.[1]) {
    const raw = explicitMatch[1];
    if (raw.startsWith("process")) return "PROCESSOS";
    if (raw.startsWith("prazo")) return "PRAZOS";
    if (raw.startsWith("cobranc") || raw.startsWith("inadimpl")) return "COBRANCAS";
    if (raw.startsWith("atend")) return "ATENDIMENTO";
    if (raw.startsWith("outro")) return "OUTROS";
  }

  const prefix = normalizeTagText(name).split(":")[0]?.trim();
  if (prefix) {
    if (prefix.startsWith("process")) return "PROCESSOS";
    if (prefix.startsWith("prazo")) return "PRAZOS";
    if (prefix.startsWith("cobranc") || prefix.startsWith("inadimpl")) return "COBRANCAS";
    if (prefix.startsWith("atend")) return "ATENDIMENTO";
  }

  return null;
}

function inferCategory(name: string, description?: string | null): ContactTagCategory {
  const explicit = getCategoryFromExplicitHint(name, description);
  if (explicit) return explicit;

  const normalized = normalizeTagText(`${name || ""} ${description || ""}`);

  const processoHints = [
    "process", "cnj", "audiencia", "vara", "tribunal", "peticao",
    "recurso", "execucao", "sentenca", "juridico",
  ];
  if (processoHints.some((hint) => normalized.includes(hint))) return "PROCESSOS";

  const prazoHints = ["prazo", "venc", "urgente", "d+", "deadline", "intimacao"];
  if (prazoHints.some((hint) => normalized.includes(hint))) return "PRAZOS";

  const cobrancaHints = ["cobranc", "inadimpl", "financeir", "fatura", "honorario", "pagamento", "boleto", "pix"];
  if (cobrancaHints.some((hint) => normalized.includes(hint))) return "COBRANCAS";

  const atendimentoHints = [
    "atendimento", "lead", "prospect", "follow up", "followup", "consulta",
    "contato", "whatsapp", "email", "telefone", "previdenciario", "trabalhista",
    "civil", "empresarial", "familia", "consumidor",
  ];
  if (atendimentoHints.some((hint) => normalized.includes(hint))) return "ATENDIMENTO";

  return "ATENDIMENTO";
}

async function run() {
  console.log("[migrate-tag-category] Iniciando backfill de categoria para contact_tags...");

  const tags = await db.contactTag.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
    },
  });

  if (tags.length === 0) {
    console.log("[migrate-tag-category] Nenhuma tag encontrada.");
    return;
  }

  let changed = 0;
  const counter: Record<ContactTagCategory, number> = {
    PROCESSOS: 0,
    PRAZOS: 0,
    COBRANCAS: 0,
    ATENDIMENTO: 0,
    OUTROS: 0,
  };

  for (const tag of tags) {
    const inferred = inferCategory(tag.name, tag.description);
    counter[inferred] += 1;

    if (tag.category !== inferred) {
      await db.contactTag.update({
        where: { id: tag.id },
        data: { category: inferred },
      });
      changed += 1;
    }
  }

  console.log(`[migrate-tag-category] Tags analisadas: ${tags.length}`);
  console.log(`[migrate-tag-category] Tags alteradas: ${changed}`);
  console.log("[migrate-tag-category] Distribuicao final:", counter);
  console.log("[migrate-tag-category] Concluido.");
}

run()
  .catch((error) => {
    console.error("[migrate-tag-category] ERROR", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
