import type { CRMLGPDActionType, LgpdRequestStatus, LgpdRequestType } from "@/generated/prisma";

const REQUEST_TYPE_LABELS: Record<LgpdRequestType, string> = {
    ACESSO: "Acesso",
    CORRECAO: "Correcao",
    ANONIMIZACAO: "Anonimizacao",
    EXCLUSAO: "Exclusao",
    REVOGACAO_CONSENTIMENTO: "Revogacao de consentimento",
    OUTRO: "Outro",
};

const REQUEST_STATUS_LABELS: Record<LgpdRequestStatus, string> = {
    ABERTA: "Aberta",
    EM_ANALISE: "Em analise",
    EM_ATENDIMENTO: "Em atendimento",
    CONCLUIDA: "Concluida",
    CANCELADA: "Cancelada",
};

const CONSENT_ACTION_LABELS: Record<CRMLGPDActionType, string> = {
    CONSENTIMENTO: "Consentimento",
    REVOGACAO_CONSENTIMENTO: "Revogacao",
    ANONIMIZACAO: "Anonimizacao",
    ELIMINACAO: "Eliminacao",
    CONSULTA_DADOS: "Consulta de dados",
};

export function formatLgpdRequestTypeLabel(type: LgpdRequestType) {
    return REQUEST_TYPE_LABELS[type];
}

export function formatLgpdRequestStatusLabel(status: LgpdRequestStatus) {
    return REQUEST_STATUS_LABELS[status];
}

export function formatLgpdConsentActionLabel(actionType: CRMLGPDActionType) {
    return CONSENT_ACTION_LABELS[actionType];
}

export function getLgpdAllowedNextStatuses(status: LgpdRequestStatus): LgpdRequestStatus[] {
    switch (status) {
        case "ABERTA":
            return ["EM_ANALISE", "CANCELADA"];
        case "EM_ANALISE":
            return ["EM_ATENDIMENTO", "CANCELADA"];
        case "EM_ATENDIMENTO":
            return ["CONCLUIDA", "CANCELADA"];
        default:
            return [];
    }
}

export function summarizeLgpdRequests<T extends { status: LgpdRequestStatus }>(items: T[]) {
    return items.reduce(
        (acc, item) => {
            acc.total += 1;

            if (item.status === "ABERTA") acc.abertas += 1;
            if (item.status === "EM_ANALISE") acc.emAnalise += 1;
            if (item.status === "EM_ATENDIMENTO") acc.emAtendimento += 1;
            if (item.status === "CONCLUIDA") acc.concluidas += 1;
            if (item.status === "CANCELADA") acc.canceladas += 1;

            return acc;
        },
        {
            total: 0,
            abertas: 0,
            emAnalise: 0,
            emAtendimento: 0,
            concluidas: 0,
            canceladas: 0,
        }
    );
}
