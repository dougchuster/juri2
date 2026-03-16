import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

export const PUBLICACOES_CONFIG_KEY = "PUBLICACOES_CONFIG";
export const PUBLICACOES_JOB_STATE_KEY = "PUBLICACOES_JOB_STATE";

export interface PublicacoesConfig {
    autoCaptureEnabled: boolean;
    autoCaptureHour: number;
    autoCaptureLookbackDays: number;
    limitePorConsulta: number;
    maxPaginasPorConsulta: number;
    timeoutMs: number;
    requestIntervalMs: number;
    autoCreateProcessEnabled: boolean;
    autoCreateProcessClientePadraoId: string;
    autoCreateProcessMaxPerRun: number;
    tribunaisCsv: string;
    sourceUrlTemplate: string;
    sourceAuthHeader: string;
    sourceAuthToken: string;
    secondarySourceEnabled: boolean;
    secondarySourceTryWhenEmpty: boolean;
    secondarySourceUrlTemplate: string;
    secondarySourceAuthHeader: string;
    secondarySourceAuthToken: string;
    hardBlockEnabled: boolean;
    hardBlockAllowPreferredByOab: boolean;
    hardBlockMaxPrazosAtrasados: number;
    hardBlockMaxCargaScore: number;
    hardBlockMaxPublicacoesPendentes: number;
}

export interface PublicacoesJobState {
    lastRunAt: string | null;
    lastStatus: "SUCCESS" | "SKIPPED" | "ERROR" | null;
    lastMessage: string | null;
    lastCaptureWindowStart: string | null;
    lastCaptureWindowEnd: string | null;
    lastResult: {
        capturadas: number;
        importadas: number;
        duplicadas: number;
        errosPersistencia: number;
        errosConsulta: number;
        distribuidas: number;
        processosCriados?: number;
        publicacoesVinculadas?: number;
        prazosCriados?: number;
        publicacoesAvaliadasPrazo?: number;
        publicacoesSemProcesso?: number;
        publicacoesSemPrazoIdentificado?: number;
    } | null;
}

export const DEFAULT_PUBLICACOES_CONFIG: PublicacoesConfig = {
    autoCaptureEnabled: true,
    autoCaptureHour: 7,
    autoCaptureLookbackDays: 1,
    limitePorConsulta: 40,
    maxPaginasPorConsulta: 5,
    timeoutMs: 20_000,
    // The DJEN/PJe communication API is rate limited; keep a safer default.
    requestIntervalMs: 1250,
    // Auto-create processes from publications (requires CNJ in text and a fallback client).
    autoCreateProcessEnabled: true,
    autoCreateProcessClientePadraoId: "",
    autoCreateProcessMaxPerRun: 200,
    tribunaisCsv: "",
    sourceUrlTemplate: "",
    sourceAuthHeader: "Authorization",
    sourceAuthToken: "",
    secondarySourceEnabled: false,
    secondarySourceTryWhenEmpty: false,
    secondarySourceUrlTemplate: "",
    secondarySourceAuthHeader: "Authorization",
    secondarySourceAuthToken: "",
    hardBlockEnabled: true,
    hardBlockAllowPreferredByOab: false,
    hardBlockMaxPrazosAtrasados: 6,
    hardBlockMaxCargaScore: 55,
    hardBlockMaxPublicacoesPendentes: 80,
};

export const DEFAULT_PUBLICACOES_JOB_STATE: PublicacoesJobState = {
    lastRunAt: null,
    lastStatus: null,
    lastMessage: null,
    lastCaptureWindowStart: null,
    lastCaptureWindowEnd: null,
    lastResult: null,
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

function toString(value: unknown, fallback = "") {
    if (typeof value !== "string") return fallback;
    return value.trim();
}

function normalizeLastResult(value: unknown): PublicacoesJobState["lastResult"] {
    if (!value || typeof value !== "object") return null;
    const payload = value as Record<string, unknown>;
    return {
        capturadas: toNumber(payload.capturadas, 0, 0, 999999),
        importadas: toNumber(payload.importadas, 0, 0, 999999),
        duplicadas: toNumber(payload.duplicadas, 0, 0, 999999),
        errosPersistencia: toNumber(payload.errosPersistencia, 0, 0, 999999),
        errosConsulta: toNumber(payload.errosConsulta, 0, 0, 999999),
        distribuidas: toNumber(payload.distribuidas, 0, 0, 999999),
        processosCriados: toNumber(payload.processosCriados, 0, 0, 999999),
        publicacoesVinculadas: toNumber(payload.publicacoesVinculadas, 0, 0, 999999),
        prazosCriados: toNumber(payload.prazosCriados, 0, 0, 999999),
        publicacoesAvaliadasPrazo: toNumber(payload.publicacoesAvaliadasPrazo, 0, 0, 999999),
        publicacoesSemProcesso: toNumber(payload.publicacoesSemProcesso, 0, 0, 999999),
        publicacoesSemPrazoIdentificado: toNumber(payload.publicacoesSemPrazoIdentificado, 0, 0, 999999),
    };
}

export function normalizePublicacoesConfig(value: unknown): PublicacoesConfig {
    const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return {
        autoCaptureEnabled: toBoolean(
            payload.autoCaptureEnabled,
            DEFAULT_PUBLICACOES_CONFIG.autoCaptureEnabled
        ),
        autoCaptureHour: toNumber(
            payload.autoCaptureHour,
            DEFAULT_PUBLICACOES_CONFIG.autoCaptureHour,
            0,
            23
        ),
        autoCaptureLookbackDays: toNumber(
            payload.autoCaptureLookbackDays,
            DEFAULT_PUBLICACOES_CONFIG.autoCaptureLookbackDays,
            0,
            30
        ),
        limitePorConsulta: toNumber(
            payload.limitePorConsulta,
            DEFAULT_PUBLICACOES_CONFIG.limitePorConsulta,
            1,
            200
        ),
        maxPaginasPorConsulta: toNumber(
            payload.maxPaginasPorConsulta,
            DEFAULT_PUBLICACOES_CONFIG.maxPaginasPorConsulta,
            1,
            50
        ),
        timeoutMs: toNumber(
            payload.timeoutMs,
            DEFAULT_PUBLICACOES_CONFIG.timeoutMs,
            3_000,
            120_000
        ),
        requestIntervalMs: toNumber(
            payload.requestIntervalMs,
            DEFAULT_PUBLICACOES_CONFIG.requestIntervalMs,
            0,
            5_000
        ),
        autoCreateProcessEnabled: toBoolean(
            payload.autoCreateProcessEnabled,
            DEFAULT_PUBLICACOES_CONFIG.autoCreateProcessEnabled
        ),
        autoCreateProcessClientePadraoId: toString(
            payload.autoCreateProcessClientePadraoId,
            DEFAULT_PUBLICACOES_CONFIG.autoCreateProcessClientePadraoId
        ),
        autoCreateProcessMaxPerRun: toNumber(
            payload.autoCreateProcessMaxPerRun,
            DEFAULT_PUBLICACOES_CONFIG.autoCreateProcessMaxPerRun,
            0,
            1000
        ),
        tribunaisCsv: toString(payload.tribunaisCsv, DEFAULT_PUBLICACOES_CONFIG.tribunaisCsv),
        sourceUrlTemplate: toString(
            payload.sourceUrlTemplate,
            DEFAULT_PUBLICACOES_CONFIG.sourceUrlTemplate
        ),
        sourceAuthHeader: toString(payload.sourceAuthHeader, DEFAULT_PUBLICACOES_CONFIG.sourceAuthHeader),
        sourceAuthToken: toString(payload.sourceAuthToken, DEFAULT_PUBLICACOES_CONFIG.sourceAuthToken),
        secondarySourceEnabled: toBoolean(
            payload.secondarySourceEnabled,
            DEFAULT_PUBLICACOES_CONFIG.secondarySourceEnabled
        ),
        secondarySourceTryWhenEmpty: toBoolean(
            payload.secondarySourceTryWhenEmpty,
            DEFAULT_PUBLICACOES_CONFIG.secondarySourceTryWhenEmpty
        ),
        secondarySourceUrlTemplate: toString(
            payload.secondarySourceUrlTemplate,
            DEFAULT_PUBLICACOES_CONFIG.secondarySourceUrlTemplate
        ),
        secondarySourceAuthHeader: toString(
            payload.secondarySourceAuthHeader,
            DEFAULT_PUBLICACOES_CONFIG.secondarySourceAuthHeader
        ),
        secondarySourceAuthToken: toString(
            payload.secondarySourceAuthToken,
            DEFAULT_PUBLICACOES_CONFIG.secondarySourceAuthToken
        ),
        hardBlockEnabled: toBoolean(
            payload.hardBlockEnabled,
            DEFAULT_PUBLICACOES_CONFIG.hardBlockEnabled
        ),
        hardBlockAllowPreferredByOab: toBoolean(
            payload.hardBlockAllowPreferredByOab,
            DEFAULT_PUBLICACOES_CONFIG.hardBlockAllowPreferredByOab
        ),
        hardBlockMaxPrazosAtrasados: toNumber(
            payload.hardBlockMaxPrazosAtrasados,
            DEFAULT_PUBLICACOES_CONFIG.hardBlockMaxPrazosAtrasados,
            0,
            999
        ),
        hardBlockMaxCargaScore: toNumber(
            payload.hardBlockMaxCargaScore,
            DEFAULT_PUBLICACOES_CONFIG.hardBlockMaxCargaScore,
            0,
            999
        ),
        hardBlockMaxPublicacoesPendentes: toNumber(
            payload.hardBlockMaxPublicacoesPendentes,
            DEFAULT_PUBLICACOES_CONFIG.hardBlockMaxPublicacoesPendentes,
            0,
            999
        ),
    };
}

export function normalizePublicacoesJobState(value: unknown): PublicacoesJobState {
    const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const statusRaw = payload.lastStatus;
    const status =
        statusRaw === "SUCCESS" || statusRaw === "SKIPPED" || statusRaw === "ERROR"
            ? statusRaw
            : null;

    return {
        lastRunAt: typeof payload.lastRunAt === "string" ? payload.lastRunAt : null,
        lastStatus: status,
        lastMessage: typeof payload.lastMessage === "string" ? payload.lastMessage : null,
        lastCaptureWindowStart:
            typeof payload.lastCaptureWindowStart === "string" ? payload.lastCaptureWindowStart : null,
        lastCaptureWindowEnd:
            typeof payload.lastCaptureWindowEnd === "string" ? payload.lastCaptureWindowEnd : null,
        lastResult: normalizeLastResult(payload.lastResult),
    };
}

export async function getPublicacoesConfig(): Promise<PublicacoesConfig> {
    try {
        const setting = await db.appSetting.findUnique({
            where: { key: PUBLICACOES_CONFIG_KEY },
            select: { value: true },
        });
        if (!setting) return DEFAULT_PUBLICACOES_CONFIG;
        return normalizePublicacoesConfig(setting.value);
    } catch (error) {
        console.warn("[PublicacoesConfig] Falling back to defaults:", error);
        return DEFAULT_PUBLICACOES_CONFIG;
    }
}

export async function savePublicacoesConfig(
    partial: Partial<PublicacoesConfig>
): Promise<PublicacoesConfig> {
    const current = await getPublicacoesConfig();
    const merged = normalizePublicacoesConfig({ ...current, ...partial });

    try {
        await db.appSetting.upsert({
            where: { key: PUBLICACOES_CONFIG_KEY },
            update: { value: merged as unknown as Prisma.InputJsonValue },
            create: {
                key: PUBLICACOES_CONFIG_KEY,
                value: merged as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[PublicacoesConfig] Could not persist config:", error);
    }

    return merged;
}

export async function getPublicacoesJobState(): Promise<PublicacoesJobState> {
    try {
        const setting = await db.appSetting.findUnique({
            where: { key: PUBLICACOES_JOB_STATE_KEY },
            select: { value: true },
        });
        if (!setting) return DEFAULT_PUBLICACOES_JOB_STATE;
        return normalizePublicacoesJobState(setting.value);
    } catch (error) {
        console.warn("[PublicacoesConfig] Could not read job state:", error);
        return DEFAULT_PUBLICACOES_JOB_STATE;
    }
}

export async function savePublicacoesJobState(
    partial: Partial<PublicacoesJobState>
): Promise<PublicacoesJobState> {
    const current = await getPublicacoesJobState();
    const merged = normalizePublicacoesJobState({ ...current, ...partial });

    try {
        await db.appSetting.upsert({
            where: { key: PUBLICACOES_JOB_STATE_KEY },
            update: { value: merged as unknown as Prisma.InputJsonValue },
            create: {
                key: PUBLICACOES_JOB_STATE_KEY,
                value: merged as unknown as Prisma.InputJsonValue,
            },
        });
    } catch (error) {
        console.warn("[PublicacoesConfig] Could not persist job state:", error);
    }

    return merged;
}
