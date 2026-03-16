import "server-only";

import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

export const FINANCEIRO_CONFIG_KEY = "FINANCEIRO_CONFIG";

export interface FinanceiroConfig {
    percentualPadraoHonorario: number;
    regraPadraoRateio: "MANUAL" | "IGUALITARIO" | "PERCENTUAL" | "RETENCAO_ADMINISTRATIVA" | "PAPEL_NO_CASO";
    retencaoAdministrativaPadrao: number;
    categoriasPrincipais: string[];
    centrosCusto: string[];
    tiposVinculoFuncionarios: string[];
    formasPagamento: string[];
    statusFinanceiros: string[];
    recorrenciasAutomaticas: boolean;
    permissaoExclusao: string[];
    aprovacaoRepasses: boolean;
    modoRateioDisponiveis: string[];
}

export const DEFAULT_FINANCEIRO_CONFIG: FinanceiroConfig = {
    percentualPadraoHonorario: 30,
    regraPadraoRateio: "PERCENTUAL",
    retencaoAdministrativaPadrao: 20,
    categoriasPrincipais: ["Gasto Operacional", "Receita"],
    centrosCusto: [
        "Administrativo",
        "Operacional Juridico",
        "Marketing",
        "Tecnologia",
        "Financeiro",
        "RH",
        "Estrutura fisica",
        "Custas processuais",
    ],
    tiposVinculoFuncionarios: ["CLT", "ESTAGIO", "PJ", "AUTONOMO"],
    formasPagamento: ["PIX", "BOLETO", "TRANSFERENCIA", "DINHEIRO", "CARTAO", "DEBITO_AUTOMATICO"],
    statusFinanceiros: ["PENDENTE", "PAGO", "PARCIAL", "CANCELADO", "RECEBIDO"],
    recorrenciasAutomaticas: true,
    permissaoExclusao: ["ADMIN", "SOCIO"],
    aprovacaoRepasses: true,
    modoRateioDisponiveis: ["MANUAL", "IGUALITARIO", "PERCENTUAL", "RETENCAO_ADMINISTRATIVA", "PAPEL_NO_CASO"],
};

function toNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

function toBoolean(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
}

function toStringArray(value: unknown, fallback: string[]) {
    if (!Array.isArray(value)) return fallback;
    return value.map((item) => String(item).trim()).filter(Boolean);
}

function toRateioMode(value: unknown, fallback: FinanceiroConfig["regraPadraoRateio"]) {
    if (
        value === "MANUAL" ||
        value === "IGUALITARIO" ||
        value === "PERCENTUAL" ||
        value === "RETENCAO_ADMINISTRATIVA" ||
        value === "PAPEL_NO_CASO"
    ) {
        return value;
    }
    return fallback;
}

export function normalizeFinanceiroConfig(value: unknown): FinanceiroConfig {
    const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
        percentualPadraoHonorario: toNumber(payload.percentualPadraoHonorario, DEFAULT_FINANCEIRO_CONFIG.percentualPadraoHonorario, 0, 100),
        regraPadraoRateio: toRateioMode(payload.regraPadraoRateio, DEFAULT_FINANCEIRO_CONFIG.regraPadraoRateio),
        retencaoAdministrativaPadrao: toNumber(payload.retencaoAdministrativaPadrao, DEFAULT_FINANCEIRO_CONFIG.retencaoAdministrativaPadrao, 0, 100),
        categoriasPrincipais: toStringArray(payload.categoriasPrincipais, DEFAULT_FINANCEIRO_CONFIG.categoriasPrincipais),
        centrosCusto: toStringArray(payload.centrosCusto, DEFAULT_FINANCEIRO_CONFIG.centrosCusto),
        tiposVinculoFuncionarios: toStringArray(payload.tiposVinculoFuncionarios, DEFAULT_FINANCEIRO_CONFIG.tiposVinculoFuncionarios),
        formasPagamento: toStringArray(payload.formasPagamento, DEFAULT_FINANCEIRO_CONFIG.formasPagamento),
        statusFinanceiros: toStringArray(payload.statusFinanceiros, DEFAULT_FINANCEIRO_CONFIG.statusFinanceiros),
        recorrenciasAutomaticas: toBoolean(payload.recorrenciasAutomaticas, DEFAULT_FINANCEIRO_CONFIG.recorrenciasAutomaticas),
        permissaoExclusao: toStringArray(payload.permissaoExclusao, DEFAULT_FINANCEIRO_CONFIG.permissaoExclusao),
        aprovacaoRepasses: toBoolean(payload.aprovacaoRepasses, DEFAULT_FINANCEIRO_CONFIG.aprovacaoRepasses),
        modoRateioDisponiveis: toStringArray(payload.modoRateioDisponiveis, DEFAULT_FINANCEIRO_CONFIG.modoRateioDisponiveis),
    };
}

export async function getFinanceiroConfig(): Promise<FinanceiroConfig> {
    try {
        const setting = await db.appSetting.findUnique({
            where: { key: FINANCEIRO_CONFIG_KEY },
            select: { value: true },
        });
        if (!setting) return DEFAULT_FINANCEIRO_CONFIG;
        return normalizeFinanceiroConfig(setting.value);
    } catch (error) {
        console.warn("[FinanceiroConfig] Falling back to defaults:", error);
        return DEFAULT_FINANCEIRO_CONFIG;
    }
}

export async function saveFinanceiroConfig(partial: Partial<FinanceiroConfig>) {
    const current = await getFinanceiroConfig();
    const next = normalizeFinanceiroConfig({ ...current, ...partial });

    await db.appSetting.upsert({
        where: { key: FINANCEIRO_CONFIG_KEY },
        update: { value: next as unknown as Prisma.InputJsonValue },
        create: { key: FINANCEIRO_CONFIG_KEY, value: next as unknown as Prisma.InputJsonValue },
    });

    return next;
}
