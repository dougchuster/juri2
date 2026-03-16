
import { datajudPost } from "@/lib/services/datajud/client";
import { qMovimentosJanela, qNumeroProcesso } from "@/lib/services/datajud/queries";

export type MovimentoDataJud = {
  dataHora: string;
  codigo: string;
  nome: string;
};

export type ProcessoSyncDataJud = {
  numeroProcesso: string;
  tribunal?: string;
  movimentos: MovimentoDataJud[];
};

function toMovimentos(input: unknown): MovimentoDataJud[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const src = item as Record<string, unknown>;
      const dataHora = typeof src.dataHora === "string" ? src.dataHora : "";
      const codigo = src.codigo != null ? String(src.codigo) : "";
      const nome = typeof src.nome === "string" ? src.nome : "";
      if (!dataHora && !codigo && !nome) return null;
      return {
        dataHora,
        codigo,
        nome,
      };
    })
    .filter((item): item is MovimentoDataJud => Boolean(item));
}

function parseHit(hit: unknown): ProcessoSyncDataJud | null {
  if (!hit || typeof hit !== "object") return null;
  const source = (hit as { _source?: unknown })._source;
  if (!source || typeof source !== "object") return null;
  const src = source as Record<string, unknown>;
  const numeroProcesso = typeof src.numeroProcesso === "string" ? src.numeroProcesso : "";
  if (!numeroProcesso) return null;
  return {
    numeroProcesso,
    tribunal: typeof src.tribunal === "string" ? src.tribunal : undefined,
    movimentos: toMovimentos(src.movimentos),
  };
}

function getHits(json: unknown): unknown[] {
  if (!json || typeof json !== "object") return [];
  const hitsContainer = (json as { hits?: unknown }).hits;
  if (!hitsContainer || typeof hitsContainer !== "object") return [];
  const hits = (hitsContainer as { hits?: unknown }).hits;
  return Array.isArray(hits) ? hits : [];
}

export const DataJudConnector = {
  id: "DATAJUD",

  async buscarPorNumero(alias: string, numeroProcesso: string, baseUrl?: string | null) {
    const json = await datajudPost<unknown>(alias, qNumeroProcesso(numeroProcesso), { baseUrl });
    const hit = getHits(json)[0];
    return parseHit(hit);
  },

  async buscarMovimentosJanela(
    alias: string,
    dataInicio: string,
    dataFim: string,
    baseUrl?: string | null
  ) {
    const json = await datajudPost<unknown>(alias, qMovimentosJanela(dataInicio, dataFim), { baseUrl });
    const hits = getHits(json);

    return hits
      .map((item: unknown) => parseHit(item))
      .filter((item: ProcessoSyncDataJud | null): item is ProcessoSyncDataJud => Boolean(item));
  },
};
