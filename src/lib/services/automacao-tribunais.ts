
import { db } from "@/lib/db";
import type { TribunalSourceType } from "@/generated/prisma";

export interface TribunalSeedItem {
  sigla: string;
  nome: string;
  ramo: "SUPERIOR" | "FEDERAL" | "ESTADUAL" | "TRABALHISTA" | "ELEITORAL" | "MILITAR";
  uf?: string;
}

const SUPERIORES: TribunalSeedItem[] = [
  { sigla: "STF", nome: "Supremo Tribunal Federal", ramo: "SUPERIOR" },
  { sigla: "STJ", nome: "Superior Tribunal de Justica", ramo: "SUPERIOR" },
  { sigla: "TST", nome: "Tribunal Superior do Trabalho", ramo: "SUPERIOR" },
  { sigla: "TSE", nome: "Tribunal Superior Eleitoral", ramo: "SUPERIOR" },
  { sigla: "STM", nome: "Superior Tribunal Militar", ramo: "SUPERIOR" },
];

const FEDERAIS: TribunalSeedItem[] = [
  { sigla: "TRF1", nome: "Tribunal Regional Federal da 1a Regiao", ramo: "FEDERAL" },
  { sigla: "TRF2", nome: "Tribunal Regional Federal da 2a Regiao", ramo: "FEDERAL" },
  { sigla: "TRF3", nome: "Tribunal Regional Federal da 3a Regiao", ramo: "FEDERAL" },
  { sigla: "TRF4", nome: "Tribunal Regional Federal da 4a Regiao", ramo: "FEDERAL" },
  { sigla: "TRF5", nome: "Tribunal Regional Federal da 5a Regiao", ramo: "FEDERAL" },
  { sigla: "TRF6", nome: "Tribunal Regional Federal da 6a Regiao", ramo: "FEDERAL" },
];

const ESTADUAIS: TribunalSeedItem[] = [
  { sigla: "TJAC", nome: "Tribunal de Justica do Acre", ramo: "ESTADUAL", uf: "AC" },
  { sigla: "TJAL", nome: "Tribunal de Justica de Alagoas", ramo: "ESTADUAL", uf: "AL" },
  { sigla: "TJAP", nome: "Tribunal de Justica do Amapa", ramo: "ESTADUAL", uf: "AP" },
  { sigla: "TJAM", nome: "Tribunal de Justica do Amazonas", ramo: "ESTADUAL", uf: "AM" },
  { sigla: "TJBA", nome: "Tribunal de Justica da Bahia", ramo: "ESTADUAL", uf: "BA" },
  { sigla: "TJCE", nome: "Tribunal de Justica do Ceara", ramo: "ESTADUAL", uf: "CE" },
  { sigla: "TJDFT", nome: "Tribunal de Justica do Distrito Federal e Territorios", ramo: "ESTADUAL", uf: "DF" },
  { sigla: "TJES", nome: "Tribunal de Justica do Espirito Santo", ramo: "ESTADUAL", uf: "ES" },
  { sigla: "TJGO", nome: "Tribunal de Justica de Goias", ramo: "ESTADUAL", uf: "GO" },
  { sigla: "TJMA", nome: "Tribunal de Justica do Maranhao", ramo: "ESTADUAL", uf: "MA" },
  { sigla: "TJMT", nome: "Tribunal de Justica de Mato Grosso", ramo: "ESTADUAL", uf: "MT" },
  { sigla: "TJMS", nome: "Tribunal de Justica de Mato Grosso do Sul", ramo: "ESTADUAL", uf: "MS" },
  { sigla: "TJMG", nome: "Tribunal de Justica de Minas Gerais", ramo: "ESTADUAL", uf: "MG" },
  { sigla: "TJPA", nome: "Tribunal de Justica do Para", ramo: "ESTADUAL", uf: "PA" },
  { sigla: "TJPB", nome: "Tribunal de Justica da Paraiba", ramo: "ESTADUAL", uf: "PB" },
  { sigla: "TJPR", nome: "Tribunal de Justica do Parana", ramo: "ESTADUAL", uf: "PR" },
  { sigla: "TJPE", nome: "Tribunal de Justica de Pernambuco", ramo: "ESTADUAL", uf: "PE" },
  { sigla: "TJPI", nome: "Tribunal de Justica do Piaui", ramo: "ESTADUAL", uf: "PI" },
  { sigla: "TJRJ", nome: "Tribunal de Justica do Rio de Janeiro", ramo: "ESTADUAL", uf: "RJ" },
  { sigla: "TJRN", nome: "Tribunal de Justica do Rio Grande do Norte", ramo: "ESTADUAL", uf: "RN" },
  { sigla: "TJRS", nome: "Tribunal de Justica do Rio Grande do Sul", ramo: "ESTADUAL", uf: "RS" },
  { sigla: "TJRO", nome: "Tribunal de Justica de Rondonia", ramo: "ESTADUAL", uf: "RO" },
  { sigla: "TJRR", nome: "Tribunal de Justica de Roraima", ramo: "ESTADUAL", uf: "RR" },
  { sigla: "TJSC", nome: "Tribunal de Justica de Santa Catarina", ramo: "ESTADUAL", uf: "SC" },
  { sigla: "TJSP", nome: "Tribunal de Justica de Sao Paulo", ramo: "ESTADUAL", uf: "SP" },
  { sigla: "TJSE", nome: "Tribunal de Justica de Sergipe", ramo: "ESTADUAL", uf: "SE" },
  { sigla: "TJTO", nome: "Tribunal de Justica do Tocantins", ramo: "ESTADUAL", uf: "TO" },
];

const TRABALHISTAS: TribunalSeedItem[] = [
  { sigla: "TRT1", nome: "Tribunal Regional do Trabalho da 1a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT2", nome: "Tribunal Regional do Trabalho da 2a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT3", nome: "Tribunal Regional do Trabalho da 3a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT4", nome: "Tribunal Regional do Trabalho da 4a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT5", nome: "Tribunal Regional do Trabalho da 5a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT6", nome: "Tribunal Regional do Trabalho da 6a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT7", nome: "Tribunal Regional do Trabalho da 7a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT8", nome: "Tribunal Regional do Trabalho da 8a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT9", nome: "Tribunal Regional do Trabalho da 9a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT10", nome: "Tribunal Regional do Trabalho da 10a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT11", nome: "Tribunal Regional do Trabalho da 11a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT12", nome: "Tribunal Regional do Trabalho da 12a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT13", nome: "Tribunal Regional do Trabalho da 13a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT14", nome: "Tribunal Regional do Trabalho da 14a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT15", nome: "Tribunal Regional do Trabalho da 15a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT16", nome: "Tribunal Regional do Trabalho da 16a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT17", nome: "Tribunal Regional do Trabalho da 17a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT18", nome: "Tribunal Regional do Trabalho da 18a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT19", nome: "Tribunal Regional do Trabalho da 19a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT20", nome: "Tribunal Regional do Trabalho da 20a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT21", nome: "Tribunal Regional do Trabalho da 21a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT22", nome: "Tribunal Regional do Trabalho da 22a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT23", nome: "Tribunal Regional do Trabalho da 23a Regiao", ramo: "TRABALHISTA" },
  { sigla: "TRT24", nome: "Tribunal Regional do Trabalho da 24a Regiao", ramo: "TRABALHISTA" },
];

const ELEITORAIS: TribunalSeedItem[] = [
  { sigla: "TREAC", nome: "Tribunal Regional Eleitoral do Acre", ramo: "ELEITORAL", uf: "AC" },
  { sigla: "TREAL", nome: "Tribunal Regional Eleitoral de Alagoas", ramo: "ELEITORAL", uf: "AL" },
  { sigla: "TREAP", nome: "Tribunal Regional Eleitoral do Amapa", ramo: "ELEITORAL", uf: "AP" },
  { sigla: "TREAM", nome: "Tribunal Regional Eleitoral do Amazonas", ramo: "ELEITORAL", uf: "AM" },
  { sigla: "TREBA", nome: "Tribunal Regional Eleitoral da Bahia", ramo: "ELEITORAL", uf: "BA" },
  { sigla: "TRECE", nome: "Tribunal Regional Eleitoral do Ceara", ramo: "ELEITORAL", uf: "CE" },
  { sigla: "TREDF", nome: "Tribunal Regional Eleitoral do Distrito Federal", ramo: "ELEITORAL", uf: "DF" },
  { sigla: "TREES", nome: "Tribunal Regional Eleitoral do Espirito Santo", ramo: "ELEITORAL", uf: "ES" },
  { sigla: "TREGO", nome: "Tribunal Regional Eleitoral de Goias", ramo: "ELEITORAL", uf: "GO" },
  { sigla: "TREMA", nome: "Tribunal Regional Eleitoral do Maranhao", ramo: "ELEITORAL", uf: "MA" },
  { sigla: "TREMT", nome: "Tribunal Regional Eleitoral de Mato Grosso", ramo: "ELEITORAL", uf: "MT" },
  { sigla: "TREMS", nome: "Tribunal Regional Eleitoral de Mato Grosso do Sul", ramo: "ELEITORAL", uf: "MS" },
  { sigla: "TREMG", nome: "Tribunal Regional Eleitoral de Minas Gerais", ramo: "ELEITORAL", uf: "MG" },
  { sigla: "TREPA", nome: "Tribunal Regional Eleitoral do Para", ramo: "ELEITORAL", uf: "PA" },
  { sigla: "TREPB", nome: "Tribunal Regional Eleitoral da Paraiba", ramo: "ELEITORAL", uf: "PB" },
  { sigla: "TREPR", nome: "Tribunal Regional Eleitoral do Parana", ramo: "ELEITORAL", uf: "PR" },
  { sigla: "TREPE", nome: "Tribunal Regional Eleitoral de Pernambuco", ramo: "ELEITORAL", uf: "PE" },
  { sigla: "TREPI", nome: "Tribunal Regional Eleitoral do Piaui", ramo: "ELEITORAL", uf: "PI" },
  { sigla: "TRERJ", nome: "Tribunal Regional Eleitoral do Rio de Janeiro", ramo: "ELEITORAL", uf: "RJ" },
  { sigla: "TRERN", nome: "Tribunal Regional Eleitoral do Rio Grande do Norte", ramo: "ELEITORAL", uf: "RN" },
  { sigla: "TRERS", nome: "Tribunal Regional Eleitoral do Rio Grande do Sul", ramo: "ELEITORAL", uf: "RS" },
  { sigla: "TRERO", nome: "Tribunal Regional Eleitoral de Rondonia", ramo: "ELEITORAL", uf: "RO" },
  { sigla: "TRERR", nome: "Tribunal Regional Eleitoral de Roraima", ramo: "ELEITORAL", uf: "RR" },
  { sigla: "TRESC", nome: "Tribunal Regional Eleitoral de Santa Catarina", ramo: "ELEITORAL", uf: "SC" },
  { sigla: "TRESP", nome: "Tribunal Regional Eleitoral de Sao Paulo", ramo: "ELEITORAL", uf: "SP" },
  { sigla: "TRESE", nome: "Tribunal Regional Eleitoral de Sergipe", ramo: "ELEITORAL", uf: "SE" },
  { sigla: "TRETO", nome: "Tribunal Regional Eleitoral do Tocantins", ramo: "ELEITORAL", uf: "TO" },
];

const MILITARES: TribunalSeedItem[] = [
  { sigla: "TJMMG", nome: "Tribunal de Justica Militar de Minas Gerais", ramo: "MILITAR", uf: "MG" },
  { sigla: "TJMRS", nome: "Tribunal de Justica Militar do Rio Grande do Sul", ramo: "MILITAR", uf: "RS" },
  { sigla: "TJMSP", nome: "Tribunal de Justica Militar de Sao Paulo", ramo: "MILITAR", uf: "SP" },
];

export const TRIBUNAIS_92_CATALOGO: TribunalSeedItem[] = [
  ...SUPERIORES,
  ...FEDERAIS,
  ...ESTADUAIS,
  ...TRABALHISTAS,
  ...ELEITORAIS,
  ...MILITARES,
];

const BASES_BY_SOURCE: Partial<Record<TribunalSourceType, string>> = {
  DATAJUD: "https://api-publica.datajud.cnj.jus.br",
  DJEN: "https://comunicaapi.pje.jus.br/api/v1/comunicacao",
};

export function defaultDataJudAlias(sigla: string) {
  const normalized = sigla.trim().toLowerCase();
  if (!normalized) return "api_publica";
  return normalized.startsWith("api_publica_") ? normalized : `api_publica_${normalized}`;
}

export async function ensureCatalogoTribunaisNacional(force = false) {
  const existentes = await db.tribunal.count();
  if (existentes >= TRIBUNAIS_92_CATALOGO.length && !force) {
    return { seeded: false, total: existentes };
  }

  for (const item of TRIBUNAIS_92_CATALOGO) {
    const tribunal = await db.tribunal.upsert({
      where: { sigla: item.sigla },
      update: {
        nome: item.nome,
        ramo: item.ramo,
        uf: item.uf ?? null,
        ativo: true,
      },
      create: {
        nome: item.nome,
        sigla: item.sigla,
        ramo: item.ramo,
        uf: item.uf ?? null,
        ativo: true,
      },
      select: { id: true, sigla: true },
    });

    const existingDatajud = await db.tribunalSource.findUnique({
      where: {
        tribunalId_sourceType: {
          tribunalId: tribunal.id,
          sourceType: "DATAJUD",
        },
      },
      select: { alias: true },
    });

    const desiredAlias = defaultDataJudAlias(item.sigla);
    const existingAlias = existingDatajud?.alias?.trim() || "";
    const shouldReplaceAlias =
      !existingAlias ||
      existingAlias === item.sigla.trim().toLowerCase() ||
      !existingAlias.startsWith("api_publica_");

    await Promise.all([
      db.tribunalSource.upsert({
        where: {
          tribunalId_sourceType: {
            tribunalId: tribunal.id,
            sourceType: "DATAJUD",
          },
        },
        update: {
          baseUrl: BASES_BY_SOURCE.DATAJUD,
          enabled: true,
          ...(shouldReplaceAlias ? { alias: desiredAlias } : {}),
          ...(shouldReplaceAlias
            ? { notes: "Alias normalizado automaticamente para o padrao api_publica_*." }
            : {}),
        },
        create: {
          tribunalId: tribunal.id,
          sourceType: "DATAJUD",
          baseUrl: BASES_BY_SOURCE.DATAJUD,
          alias: desiredAlias,
          enabled: true,
          requiresCert: false,
          notes: "Alias inicial. Ajuste automatico recomendado via script de update DataJud.",
        },
      }),
      db.tribunalSource.upsert({
        where: {
          tribunalId_sourceType: {
            tribunalId: tribunal.id,
            sourceType: "DJEN",
          },
        },
        update: {
          baseUrl: BASES_BY_SOURCE.DJEN,
          enabled: true,
        },
        create: {
          tribunalId: tribunal.id,
          sourceType: "DJEN",
          baseUrl: BASES_BY_SOURCE.DJEN,
          enabled: true,
          requiresCert: false,
        },
      }),
      db.tribunalSource.upsert({
        where: {
          tribunalId_sourceType: {
            tribunalId: tribunal.id,
            sourceType: "DIARIO",
          },
        },
        update: { enabled: false },
        create: {
          tribunalId: tribunal.id,
          sourceType: "DIARIO",
          enabled: false,
          requiresCert: false,
        },
      }),
      db.tribunalSource.upsert({
        where: {
          tribunalId_sourceType: {
            tribunalId: tribunal.id,
            sourceType: "PORTAL",
          },
        },
        update: { enabled: false },
        create: {
          tribunalId: tribunal.id,
          sourceType: "PORTAL",
          enabled: false,
          requiresCert: true,
        },
      }),
    ]);
  }

  return { seeded: true, total: TRIBUNAIS_92_CATALOGO.length };
}

export async function listarTribunaisDataJudAtivos() {
  return db.tribunal.findMany({
    where: {
      ativo: true,
      sources: {
        some: {
          sourceType: "DATAJUD",
          enabled: true,
        },
      },
    },
    select: {
      id: true,
      sigla: true,
      nome: true,
      ramo: true,
      uf: true,
      sources: {
        where: { sourceType: "DATAJUD", enabled: true },
        select: {
          id: true,
          alias: true,
          baseUrl: true,
          enabled: true,
          sourceType: true,
        },
      },
    },
    orderBy: [{ ramo: "asc" }, { sigla: "asc" }],
  });
}

export async function getAutomacaoNacionalResumoCatalogo() {
  const [tribunais, ativosDataJud, ativosDjen] = await Promise.all([
    db.tribunal.count(),
    db.tribunalSource.count({ where: { sourceType: "DATAJUD", enabled: true } }),
    db.tribunalSource.count({ where: { sourceType: "DJEN", enabled: true } }),
  ]);

  return {
    tribunais,
    ativosDataJud,
    ativosDjen,
  };
}
