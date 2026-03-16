import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export const OPERACOES_CONFIG_KEY = "OPERACOES_CONFIG";

export type DistributionMode = "GLOBAL" | "EQUIPE";

export interface OperacoesConfig {
    slaWhatsappMinutes: number;
    slaEmailMinutes: number;
    slaAtendimentoNoReturnHours: number;
    autoDistributionEnabled: boolean;
    autoDistributionHour: number;
    autoDistributionOnlyOverloaded: boolean;
    autoDistributionMode: DistributionMode;
    autoDistributionFallbackGlobal: boolean;
}

export const DEFAULT_OPERACOES_CONFIG: OperacoesConfig = {
    slaWhatsappMinutes: 30,
    slaEmailMinutes: 120,
    slaAtendimentoNoReturnHours: 24,
    autoDistributionEnabled: true,
    autoDistributionHour: 7,
    autoDistributionOnlyOverloaded: true,
    autoDistributionMode: "GLOBAL",
    autoDistributionFallbackGlobal: true,
};

function toNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < min) return min;
    if (parsed > max) return max;
    return Math.round(parsed);
}

function toBoolean(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
}

function toDistributionMode(value: unknown, fallback: DistributionMode): DistributionMode {
    if (value === "GLOBAL" || value === "EQUIPE") return value;
    if (typeof value === "string") {
        const normalized = value.toUpperCase();
        if (normalized === "GLOBAL" || normalized === "EQUIPE") return normalized;
    }
    return fallback;
}

export function normalizeOperacoesConfig(value: unknown): OperacoesConfig {
    const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
        slaWhatsappMinutes: toNumber(
            payload.slaWhatsappMinutes,
            DEFAULT_OPERACOES_CONFIG.slaWhatsappMinutes,
            5,
            720
        ),
        slaEmailMinutes: toNumber(
            payload.slaEmailMinutes,
            DEFAULT_OPERACOES_CONFIG.slaEmailMinutes,
            10,
            1440
        ),
        slaAtendimentoNoReturnHours: toNumber(
            payload.slaAtendimentoNoReturnHours,
            DEFAULT_OPERACOES_CONFIG.slaAtendimentoNoReturnHours,
            1,
            240
        ),
        autoDistributionEnabled: toBoolean(
            payload.autoDistributionEnabled,
            DEFAULT_OPERACOES_CONFIG.autoDistributionEnabled
        ),
        autoDistributionHour: toNumber(
            payload.autoDistributionHour,
            DEFAULT_OPERACOES_CONFIG.autoDistributionHour,
            0,
            23
        ),
        autoDistributionOnlyOverloaded: toBoolean(
            payload.autoDistributionOnlyOverloaded,
            DEFAULT_OPERACOES_CONFIG.autoDistributionOnlyOverloaded
        ),
        autoDistributionMode: toDistributionMode(
            payload.autoDistributionMode,
            DEFAULT_OPERACOES_CONFIG.autoDistributionMode
        ),
        autoDistributionFallbackGlobal: toBoolean(
            payload.autoDistributionFallbackGlobal,
            DEFAULT_OPERACOES_CONFIG.autoDistributionFallbackGlobal
        ),
    };
}

export async function getOperacoesConfig(): Promise<OperacoesConfig> {
    try {
        const setting = await db.appSetting.findUnique({
            where: { key: OPERACOES_CONFIG_KEY },
            select: { value: true },
        });
        if (!setting) return DEFAULT_OPERACOES_CONFIG;
        return normalizeOperacoesConfig(setting.value);
    } catch (error) {
        console.warn("[OperacoesConfig] Falling back to defaults:", error);
        return DEFAULT_OPERACOES_CONFIG;
    }
}

export async function saveOperacoesConfig(
    partial: Partial<OperacoesConfig>
): Promise<OperacoesConfig> {
    const current = await getOperacoesConfig();
    const merged = normalizeOperacoesConfig({ ...current, ...partial });

    try {
        await db.appSetting.upsert({
            where: { key: OPERACOES_CONFIG_KEY },
            update: { value: merged as unknown as Prisma.InputJsonValue },
            create: { key: OPERACOES_CONFIG_KEY, value: merged as unknown as Prisma.InputJsonValue },
        });
    } catch (error) {
        console.warn("[OperacoesConfig] Could not persist config:", error);
    }

    return merged;
}
