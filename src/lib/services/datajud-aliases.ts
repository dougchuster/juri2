import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { resolveDataJudEndpointsUrl } from "@/lib/services/datajud/access";

export const DATAJUD_ALIASES_STATE_KEY = "DATAJUD_ALIASES_STATE";

export interface DataJudAliasesState {
  lastRunAt: string | null;
  lastStatus: "SUCCESS" | "ERROR" | "SKIPPED" | null;
  sourceUrl: string;
  sourceHttpStatus: number | null;
  aliasesExtraidos: number;
  tribunaisAtualizados: number;
  lastError: string | null;
}

export interface UpdateDataJudAliasesResult {
  success: boolean;
  skipped: boolean;
  sourceUrl: string;
  sourceHttpStatus: number | null;
  aliasesExtraidos: number;
  tribunaisAtualizados: number;
  updated: Array<{ sigla: string; before: string | null; after: string }>;
  state: DataJudAliasesState;
  error?: string;
}

function defaultState(url: string): DataJudAliasesState {
  return {
    lastRunAt: null,
    lastStatus: null,
    sourceUrl: url,
    sourceHttpStatus: null,
    aliasesExtraidos: 0,
    tribunaisAtualizados: 0,
    lastError: null,
  };
}

export async function getDataJudAliasesState(): Promise<DataJudAliasesState> {
  const url = resolveDataJudEndpointsUrl();
  try {
    const row = await db.appSetting.findUnique({
      where: { key: DATAJUD_ALIASES_STATE_KEY },
      select: { value: true },
    });
    if (!row) return defaultState(url);
    const payload = row.value && typeof row.value === "object" ? (row.value as Record<string, unknown>) : {};
    return {
      lastRunAt: typeof payload.lastRunAt === "string" ? payload.lastRunAt : null,
      lastStatus:
        payload.lastStatus === "SUCCESS" || payload.lastStatus === "ERROR" || payload.lastStatus === "SKIPPED"
          ? payload.lastStatus
          : null,
      sourceUrl: typeof payload.sourceUrl === "string" ? payload.sourceUrl : url,
      sourceHttpStatus:
        payload.sourceHttpStatus === null || payload.sourceHttpStatus === undefined ? null : Number(payload.sourceHttpStatus),
      aliasesExtraidos: Number(payload.aliasesExtraidos || 0) || 0,
      tribunaisAtualizados: Number(payload.tribunaisAtualizados || 0) || 0,
      lastError: typeof payload.lastError === "string" ? payload.lastError : null,
    };
  } catch (error) {
    console.warn("[DataJudAliases] Falha ao ler estado:", error);
    return defaultState(url);
  }
}

async function saveState(state: DataJudAliasesState) {
  try {
    await db.appSetting.upsert({
      where: { key: DATAJUD_ALIASES_STATE_KEY },
      update: { value: state as unknown as Prisma.InputJsonValue },
      create: { key: DATAJUD_ALIASES_STATE_KEY, value: state as unknown as Prisma.InputJsonValue },
    });
  } catch (error) {
    console.warn("[DataJudAliases] Falha ao persistir estado:", error);
  }
}

function normalizeSigla(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function siglaFromAlias(aliasRaw: string) {
  const alias = String(aliasRaw || "").trim();
  if (!alias) return null;

  const clean = alias.startsWith("api_publica_") ? alias.slice("api_publica_".length) : alias;
  if (!clean) return null;

  // TRE aliases appear as "tre-uf" (ex: tre-ac). DF commonly appears as "tre-dft" on CNJ wiki.
  if (clean.startsWith("tre-")) {
    const suffix = clean.slice(4).replace(/[^a-z0-9]/g, "");
    if (!suffix) return null;
    if (suffix === "dft") return "TREDF";
    return normalizeSigla(`TRE${suffix}`);
  }

  // General case: remove separators and uppercase.
  const normalized = clean.replace(/[^a-z0-9]/g, "");
  return normalizeSigla(normalized);
}

function extractAliases(html: string) {
  const result = new Map<string, string>();
  const endpointRegex = /api-publica\.datajud\.cnj\.jus\.br\/([^"'<>\s]+)\/_search/gi;

  let match: RegExpExecArray | null;
  while ((match = endpointRegex.exec(html)) !== null) {
    const alias = String(match[1] || "").trim();
    if (!alias) continue;
    const sigla = siglaFromAlias(alias);
    if (!sigla) continue;

    if (!result.has(sigla)) {
      result.set(sigla, alias);
    }
  }

  return result;
}

export async function updateDataJudAliases(options?: {
  force?: boolean;
  sourceUrl?: string;
}): Promise<UpdateDataJudAliasesResult> {
  const force = options?.force === true;
  const sourceUrl = options?.sourceUrl || resolveDataJudEndpointsUrl();
  const prev = await getDataJudAliasesState();

  if (process.env.DATAJUD_ALIASES_ENABLED === "false" && !force) {
    const state: DataJudAliasesState = {
      ...prev,
      lastRunAt: new Date().toISOString(),
      lastStatus: "SKIPPED",
      sourceUrl,
      lastError: null,
      sourceHttpStatus: null,
    };
    await saveState(state);
    return {
      success: true,
      skipped: true,
      sourceUrl,
      sourceHttpStatus: null,
      aliasesExtraidos: 0,
      tribunaisAtualizados: 0,
      updated: [],
      state,
    };
  }

  const nowIso = new Date().toISOString();
  try {
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao baixar fonte de aliases DataJud (${sourceUrl}).`);
    }
    const html = await res.text();
    const aliases = extractAliases(html);

    const tribunais = await db.tribunal.findMany({
      select: {
        sigla: true,
        sources: {
          where: { sourceType: "DATAJUD" },
          select: { id: true, alias: true },
          take: 1,
        },
      },
    });

    const updated: Array<{ sigla: string; before: string | null; after: string }> = [];
    for (const tribunal of tribunais) {
      const sigla = normalizeSigla(tribunal.sigla);
      const aliasNovo = aliases.get(sigla);
      if (!aliasNovo) continue;
      const source = tribunal.sources[0];
      if (!source) continue;
      const before = source.alias || null;
      if (before === aliasNovo) continue;

      await db.tribunalSource.update({
        where: { id: source.id },
        data: {
          alias: aliasNovo,
          enabled: true,
          notes: "Alias atualizado automaticamente via job DataJud.",
        },
      });
      updated.push({ sigla: tribunal.sigla, before, after: aliasNovo });
    }

    const state: DataJudAliasesState = {
      lastRunAt: nowIso,
      lastStatus: "SUCCESS",
      sourceUrl,
      sourceHttpStatus: res.status,
      aliasesExtraidos: aliases.size,
      tribunaisAtualizados: updated.length,
      lastError: null,
    };
    await saveState(state);

    return {
      success: true,
      skipped: false,
      sourceUrl,
      sourceHttpStatus: res.status,
      aliasesExtraidos: aliases.size,
      tribunaisAtualizados: updated.length,
      updated,
      state,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao atualizar aliases DataJud.";
    const state: DataJudAliasesState = {
      ...prev,
      lastRunAt: nowIso,
      lastStatus: "ERROR",
      sourceUrl,
      sourceHttpStatus: null,
      lastError: message,
    };
    await saveState(state);
    return {
      success: false,
      skipped: false,
      sourceUrl,
      sourceHttpStatus: null,
      aliasesExtraidos: 0,
      tribunaisAtualizados: 0,
      updated: [],
      state,
      error: message,
    };
  }
}
