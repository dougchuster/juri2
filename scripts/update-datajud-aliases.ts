import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const CANDIDATE_URLS = [
  process.env.DATAJUD_ALIASES_URL,
  process.env.DATAJUD_ENDPOINTS_URL,
  "https://datajud-wiki.cnj.jus.br/api-publica/endpoints/",
].filter((item): item is string => Boolean(item && item.trim()));

function normalizeSigla(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function mapSiglaFromContext(ctx: string) {
  const candidates = ctx.match(/\b(?:STF|STJ|TST|TSE|STM|TRF\d|TRT\d{1,2}|TJ[A-Z]{2,3}|TRE[A-Z]{2}|TJM[A-Z]{2})\b/g);
  if (!candidates || candidates.length === 0) return null;
  return normalizeSigla(candidates[candidates.length - 1]);
}

function extractAliases(html: string) {
  const result = new Map<string, string>();
  const endpointRegex = /api-publica\.datajud\.cnj\.jus\.br\/([^"'<>\s]+)\/_search/gi;

  let match: RegExpExecArray | null;
  while ((match = endpointRegex.exec(html)) !== null) {
    const alias = String(match[1] || "").trim();
    if (!alias) continue;

    const start = Math.max(0, match.index - 250);
    const context = html.slice(start, match.index + 20).toUpperCase();
    const sigla = mapSiglaFromContext(context);
    if (!sigla) continue;

    if (!result.has(sigla)) {
      result.set(sigla, alias);
    }
  }

  return result;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  let html = "";
  let sourceUrlUsada = "";

  for (const url of CANDIDATE_URLS) {
    console.log(`[DataJud] Tentando baixar aliases de: ${url}`);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`[DataJud] Fonte indisponivel (${response.status}): ${url}`);
      continue;
    }

    const payload = await response.text();
    if (!payload || payload.length < 1000) {
      console.warn(`[DataJud] Conteudo insuficiente recebido de ${url}`);
      continue;
    }

    html = payload;
    sourceUrlUsada = url;
    break;
  }

  if (!html) {
    throw new Error(
      "Nao foi possivel baixar uma fonte valida de aliases DataJud. Defina DATAJUD_ALIASES_URL com uma URL acessivel."
    );
  }

  console.log(`[DataJud] Fonte utilizada: ${sourceUrlUsada}`);
  const aliases = extractAliases(html);
  console.log(`[DataJud] Aliases extraidos: ${aliases.size}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
  const prisma = new PrismaClient({ adapter });

  try {
    const tribunais = await prisma.tribunal.findMany({
      select: {
        id: true,
        sigla: true,
        sources: {
          where: { sourceType: "DATAJUD" },
          select: { id: true, alias: true },
          take: 1,
        },
      },
    });

    let atualizados = 0;

    for (const tribunal of tribunais) {
      const sigla = normalizeSigla(tribunal.sigla);
      const alias = aliases.get(sigla);
      if (!alias) continue;

      const source = tribunal.sources[0];
      if (!source) continue;
      if (source.alias === alias) continue;

      await prisma.tribunalSource.update({
        where: { id: source.id },
        data: {
          alias,
          enabled: true,
          notes: "Alias atualizado automaticamente via script DataJud.",
        },
      });
      atualizados += 1;
      console.log(`[DataJud] ${tribunal.sigla}: ${source.alias || "(vazio)"} -> ${alias}`);
    }

    console.log(`[DataJud] Atualizacao concluida. ${atualizados} tribunal(is) atualizados.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[DataJud] Erro ao atualizar aliases:", error);
  process.exitCode = 1;
});
