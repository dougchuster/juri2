import "server-only";

import { Prisma, CRMInterestLevel, Role } from "@/generated/prisma";
import { db } from "@/lib/db";

export const CRM_CONFIG_KEY = "CRM_CONFIG";
const CRM_ASSIGNMENT_STATE_KEY = "CRM_ASSIGNMENT_STATE";

export type CRMScoreCriterionCode =
    | "HAS_EMAIL"
    | "HAS_PHONE"
    | "HAS_WHATSAPP"
    | "HAS_CONSENT"
    | "INTEREST_MEDIO"
    | "INTEREST_ALTO";

export type CRMScoreCriterion = {
    code: CRMScoreCriterionCode;
    label: string;
    points: number;
    active: boolean;
};

export type CRMAssignmentStrategy =
    | "MANUAL"
    | "ROUND_ROBIN"
    | "BY_AREA"
    | "BY_ORIGEM"
    | "BY_AREA_ORIGEM";

export type CRMAreaAssignmentRule = {
    areaDireito: string;
    ownerUserIds: string[];
};

export type CRMOrigemAssignmentRule = {
    origem: string;
    ownerUserIds: string[];
};

export type CRMConfig = {
    firstContactSlaHours: number;
    autoCreateFirstContactActivity: boolean;
    scoreCriteria: CRMScoreCriterion[];
    scoreOrigemWeights: Record<string, number>;
    scoreAreaWeights: Record<string, number>;
    assignmentStrategy: CRMAssignmentStrategy;
    defaultOwnerUserIds: string[];
    assignmentByArea: CRMAreaAssignmentRule[];
    assignmentByOrigem: CRMOrigemAssignmentRule[];
    areasDireito: string[];
    subareasByArea: Record<string, string[]>;
};

type CRMAssignmentState = {
    poolCursor: Record<string, number>;
};

const DEFAULT_AREAS = [
    "PENAL",
    "CIVEL",
    "TRABALHISTA",
    "PREVIDENCIARIO",
    "TRIBUTARIO",
    "EMPRESARIAL_SOCIETARIO",
    "ADMINISTRATIVO",
    "FAMILIA_SUCESSOES",
    "CONSUMIDOR",
    "IMOBILIARIO",
    "ELEITORAL",
    "AMBIENTAL",
    "PROPRIEDADE_INTELECTUAL",
    "ARBITRAGEM_MEDIACAO",
    "OUTROS",
];

const DEFAULT_CRM_CONFIG: CRMConfig = {
    firstContactSlaHours: 4,
    autoCreateFirstContactActivity: true,
    scoreCriteria: [
        { code: "HAS_EMAIL", label: "Contato com e-mail", points: 10, active: true },
        { code: "HAS_PHONE", label: "Contato com telefone/celular", points: 15, active: true },
        { code: "HAS_WHATSAPP", label: "Contato com WhatsApp", points: 20, active: true },
        { code: "HAS_CONSENT", label: "Consentimento LGPD de marketing", points: 10, active: true },
        { code: "INTEREST_MEDIO", label: "Interesse medio", points: 15, active: true },
        { code: "INTEREST_ALTO", label: "Interesse alto", points: 30, active: true },
    ],
    scoreOrigemWeights: {},
    scoreAreaWeights: {},
    assignmentStrategy: "ROUND_ROBIN",
    defaultOwnerUserIds: [],
    assignmentByArea: [],
    assignmentByOrigem: [],
    areasDireito: DEFAULT_AREAS,
    subareasByArea: {},
};

const ALLOWED_OWNER_ROLES = new Set<Role>([
    "ADMIN",
    "SOCIO",
    "ADVOGADO",
    "ASSISTENTE",
    "SECRETARIA",
]);

function toString(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
}

function toNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < min) return min;
    if (parsed > max) return max;
    return Math.round(parsed);
}

function toStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => toString(item))
        .filter((item) => item.length > 0);
}

function normalizeArea(value: unknown) {
    return toString(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .toUpperCase();
}

function normalizeOrigem(value: unknown) {
    return toString(value).toLowerCase();
}

function normalizeScoreCriteria(value: unknown): CRMScoreCriterion[] {
    const defaultsByCode = new Map(DEFAULT_CRM_CONFIG.scoreCriteria.map((item) => [item.code, item]));
    const parsed = Array.isArray(value) ? value : [];
    const mapped: CRMScoreCriterion[] = [];

    for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const payload = item as Record<string, unknown>;
        const code = toString(payload.code) as CRMScoreCriterionCode;
        if (!defaultsByCode.has(code)) continue;
        const fallback = defaultsByCode.get(code)!;
        mapped.push({
            code,
            label: toString(payload.label, fallback.label),
            points: toNumber(payload.points, fallback.points, -100, 100),
            active: toBoolean(payload.active, fallback.active),
        });
    }

    for (const fallback of DEFAULT_CRM_CONFIG.scoreCriteria) {
        if (!mapped.some((item) => item.code === fallback.code)) {
            mapped.push(fallback);
        }
    }

    return mapped;
}

function normalizeWeights(value: unknown) {
    const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const normalized: Record<string, number> = {};
    for (const [key, raw] of Object.entries(source)) {
        const itemKey = normalizeArea(key) || normalizeOrigem(key);
        if (!itemKey) continue;
        normalized[itemKey] = toNumber(raw, 0, -100, 100);
    }
    return normalized;
}

function normalizeAssignmentStrategy(value: unknown): CRMAssignmentStrategy {
    const raw = toString(value, "ROUND_ROBIN").toUpperCase();
    if (raw === "MANUAL" || raw === "ROUND_ROBIN" || raw === "BY_AREA" || raw === "BY_ORIGEM" || raw === "BY_AREA_ORIGEM") {
        return raw;
    }
    return "ROUND_ROBIN";
}

function normalizeAssignmentByArea(value: unknown): CRMAreaAssignmentRule[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const payload = item as Record<string, unknown>;
            const areaDireito = normalizeArea(payload.areaDireito);
            if (!areaDireito) return null;
            return {
                areaDireito,
                ownerUserIds: toStringArray(payload.ownerUserIds),
            } as CRMAreaAssignmentRule;
        })
        .filter((item): item is CRMAreaAssignmentRule => item !== null);
}

function normalizeAssignmentByOrigem(value: unknown): CRMOrigemAssignmentRule[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const payload = item as Record<string, unknown>;
            const origem = normalizeOrigem(payload.origem);
            if (!origem) return null;
            return {
                origem,
                ownerUserIds: toStringArray(payload.ownerUserIds),
            } as CRMOrigemAssignmentRule;
        })
        .filter((item): item is CRMOrigemAssignmentRule => item !== null);
}

function normalizeSubareas(value: unknown) {
    const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const normalized: Record<string, string[]> = {};
    for (const [key, raw] of Object.entries(source)) {
        const area = normalizeArea(key);
        if (!area) continue;
        normalized[area] = toStringArray(raw).map((item) => item.trim()).filter((item) => item.length > 0);
    }
    return normalized;
}

export function normalizeCRMConfig(value: unknown): CRMConfig {
    const payload = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

    const areas = toStringArray(payload.areasDireito).map((item) => normalizeArea(item)).filter((item) => item.length > 0);

    return {
        firstContactSlaHours: toNumber(
            payload.firstContactSlaHours,
            DEFAULT_CRM_CONFIG.firstContactSlaHours,
            1,
            240
        ),
        autoCreateFirstContactActivity: toBoolean(
            payload.autoCreateFirstContactActivity,
            DEFAULT_CRM_CONFIG.autoCreateFirstContactActivity
        ),
        scoreCriteria: normalizeScoreCriteria(payload.scoreCriteria),
        scoreOrigemWeights: normalizeWeights(payload.scoreOrigemWeights),
        scoreAreaWeights: normalizeWeights(payload.scoreAreaWeights),
        assignmentStrategy: normalizeAssignmentStrategy(payload.assignmentStrategy),
        defaultOwnerUserIds: toStringArray(payload.defaultOwnerUserIds),
        assignmentByArea: normalizeAssignmentByArea(payload.assignmentByArea),
        assignmentByOrigem: normalizeAssignmentByOrigem(payload.assignmentByOrigem),
        areasDireito: areas.length > 0 ? areas : DEFAULT_CRM_CONFIG.areasDireito,
        subareasByArea: normalizeSubareas(payload.subareasByArea),
    };
}

export async function getCRMConfig() {
    try {
        const setting = await db.appSetting.findUnique({
            where: { key: CRM_CONFIG_KEY },
            select: { value: true },
        });
        if (!setting) return DEFAULT_CRM_CONFIG;
        return normalizeCRMConfig(setting.value);
    } catch (error) {
        console.warn("[CRM_CONFIG] Falling back to defaults", error);
        return DEFAULT_CRM_CONFIG;
    }
}

export async function saveCRMConfig(partial: Partial<CRMConfig>) {
    const current = await getCRMConfig();
    const merged = normalizeCRMConfig({ ...current, ...partial });

    await db.appSetting.upsert({
        where: { key: CRM_CONFIG_KEY },
        update: { value: merged as unknown as Prisma.InputJsonValue },
        create: {
            key: CRM_CONFIG_KEY,
            value: merged as unknown as Prisma.InputJsonValue,
        },
    });

    return merged;
}

type LeadScoreInput = {
    email?: string | null;
    telefone?: string | null;
    celular?: string | null;
    whatsapp?: string | null;
    marketingConsent?: boolean | null;
    crmInterestLevel?: CRMInterestLevel | null;
    origem?: string | null;
    areaDireito?: string | null;
};

export function computeLeadScore(input: LeadScoreInput, config: CRMConfig) {
    let score = 0;
    const criteria = new Map(config.scoreCriteria.map((item) => [item.code, item]));

    const hasEmail = !!toString(input.email);
    const hasPhone = !!toString(input.telefone) || !!toString(input.celular);
    const hasWhatsapp = !!toString(input.whatsapp);
    const hasConsent = input.marketingConsent === true;
    const interest = input.crmInterestLevel || null;
    const origem = normalizeOrigem(input.origem || "");
    const area = normalizeArea(input.areaDireito || "");

    const apply = (code: CRMScoreCriterionCode, condition: boolean) => {
        const criterion = criteria.get(code);
        if (!criterion || !criterion.active || !condition) return;
        score += criterion.points;
    };

    apply("HAS_EMAIL", hasEmail);
    apply("HAS_PHONE", hasPhone);
    apply("HAS_WHATSAPP", hasWhatsapp);
    apply("HAS_CONSENT", hasConsent);
    apply("INTEREST_MEDIO", interest === "MEDIO");
    apply("INTEREST_ALTO", interest === "ALTO");

    if (origem && config.scoreOrigemWeights[origem] !== undefined) {
        score += config.scoreOrigemWeights[origem];
    }
    if (area && config.scoreAreaWeights[area] !== undefined) {
        score += config.scoreAreaWeights[area];
    }

    if (score < 0) return 0;
    if (score > 100) return 100;
    return Math.round(score);
}

async function getAssignmentState() {
    const setting = await db.appSetting.findUnique({
        where: { key: CRM_ASSIGNMENT_STATE_KEY },
        select: { value: true },
    });
    if (!setting || !setting.value || typeof setting.value !== "object") {
        return { poolCursor: {} } as CRMAssignmentState;
    }

    const payload = setting.value as Record<string, unknown>;
    const cursorRaw = payload.poolCursor && typeof payload.poolCursor === "object"
        ? (payload.poolCursor as Record<string, unknown>)
        : {};

    const poolCursor: Record<string, number> = {};
    for (const [key, value] of Object.entries(cursorRaw)) {
        poolCursor[key] = toNumber(value, 0, 0, 1000000);
    }

    return { poolCursor } as CRMAssignmentState;
}

async function saveAssignmentState(state: CRMAssignmentState) {
    await db.appSetting.upsert({
        where: { key: CRM_ASSIGNMENT_STATE_KEY },
        update: { value: state as unknown as Prisma.InputJsonValue },
        create: { key: CRM_ASSIGNMENT_STATE_KEY, value: state as unknown as Prisma.InputJsonValue },
    });
}

async function listAssignableUsers() {
    const users = await db.user.findMany({
        where: {
            isActive: true,
            role: { in: Array.from(ALLOWED_OWNER_ROLES) },
        },
        select: {
            id: true,
            name: true,
            role: true,
            advogado: { select: { id: true } },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return users;
}

function uniqueIds(values: string[]) {
    return Array.from(new Set(values.filter((item) => item.length > 0)));
}

function chooseByRoundRobin(pool: string[], cursor: number) {
    if (pool.length === 0) return null;
    const index = cursor % pool.length;
    return pool[index] || null;
}

export async function resolveAutomaticAssignment(input: {
    areaDireito?: string | null;
    origem?: string | null;
    ownerId?: string | null;
    responsavelAdvogadoId?: string | null;
}) {
    const config = await getCRMConfig();
    if (config.assignmentStrategy === "MANUAL") {
        return {
            ownerId: input.ownerId || null,
            responsavelAdvogadoId: input.responsavelAdvogadoId || null,
        };
    }

    const users = await listAssignableUsers();
    const usersById = new Map(users.map((user) => [user.id, user]));
    const allUserIds = users.map((user) => user.id);

    const normalizePool = (ids: string[]) => uniqueIds(ids.filter((id) => usersById.has(id)));
    const defaultPool = normalizePool(config.defaultOwnerUserIds);

    const area = normalizeArea(input.areaDireito || "");
    const origem = normalizeOrigem(input.origem || "");

    let pool: string[] = [];
    let poolKey = "default";

    if (config.assignmentStrategy === "BY_AREA" || config.assignmentStrategy === "BY_AREA_ORIGEM") {
        const areaRule = config.assignmentByArea.find((item) => item.areaDireito === area);
        if (areaRule) {
            pool = normalizePool(areaRule.ownerUserIds);
            poolKey = `area:${area}`;
        }
    }

    if (config.assignmentStrategy === "BY_ORIGEM" || config.assignmentStrategy === "BY_AREA_ORIGEM") {
        const origemRule = config.assignmentByOrigem.find((item) => item.origem === origem);
        if (origemRule) {
            const origemPool = normalizePool(origemRule.ownerUserIds);
            if (config.assignmentStrategy === "BY_AREA_ORIGEM" && pool.length > 0) {
                const intersection = pool.filter((id) => origemPool.includes(id));
                if (intersection.length > 0) {
                    pool = intersection;
                    poolKey = `area-origem:${area}:${origem}`;
                } else if (origemPool.length > 0) {
                    pool = origemPool;
                    poolKey = `origem:${origem}`;
                }
            } else if (origemPool.length > 0) {
                pool = origemPool;
                poolKey = `origem:${origem}`;
            }
        }
    }

    if (config.assignmentStrategy === "ROUND_ROBIN" && pool.length === 0) {
        pool = defaultPool;
        poolKey = "round-robin:default";
    }

    if (pool.length === 0 && defaultPool.length > 0) {
        pool = defaultPool;
        poolKey = "fallback:default";
    }

    if (pool.length === 0) {
        pool = allUserIds;
        poolKey = "fallback:all";
    }

    if (pool.length === 0) {
        return {
            ownerId: input.ownerId || null,
            responsavelAdvogadoId: input.responsavelAdvogadoId || null,
        };
    }

    const state = await getAssignmentState();
    const currentCursor = state.poolCursor[poolKey] || 0;
    const ownerId = chooseByRoundRobin(pool, currentCursor);

    if (!ownerId) {
        return {
            ownerId: input.ownerId || null,
            responsavelAdvogadoId: input.responsavelAdvogadoId || null,
        };
    }

    state.poolCursor[poolKey] = currentCursor + 1;
    await saveAssignmentState(state);

    const owner = usersById.get(ownerId);
    return {
        ownerId,
        responsavelAdvogadoId: owner?.advogado?.id || input.responsavelAdvogadoId || null,
    };
}
