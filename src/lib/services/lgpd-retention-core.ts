export type RetentionPolicyEntity = "LGPD_DATA_EXPORT" | "CLIENTE_ARQUIVADO";
export type RetentionActionType = "DELETE" | "ANONYMIZE";
export type RetentionExecutionStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "DRY_RUN";
export type RetentionExecutionMode = "MANUAL" | "AUTO";

export const LGPD_RETENTION_DEFAULTS: Record<
    RetentionPolicyEntity,
    { actionType: RetentionActionType; retentionDays: number; label: string; description: string }
> = {
    LGPD_DATA_EXPORT: {
        actionType: "DELETE",
        retentionDays: 0,
        label: "Pacotes LGPD expirados",
        description: "Remove arquivos exportados ja expirados e marca o pacote como purgado.",
    },
    CLIENTE_ARQUIVADO: {
        actionType: "ANONYMIZE",
        retentionDays: 180,
        label: "Clientes arquivados",
        description: "Anonimiza titulares arquivados e sem processo ativo apos a janela de retencao.",
    },
};

const EXECUTION_STATUS_LABELS: Record<RetentionExecutionStatus, string> = {
    SUCCESS: "Sucesso",
    PARTIAL: "Parcial",
    FAILED: "Falha",
    DRY_RUN: "Simulacao",
};

const ACTION_LABELS: Record<RetentionActionType, string> = {
    DELETE: "Excluir",
    ANONYMIZE: "Anonimizar",
};

export function formatRetentionEntityLabel(entityName: RetentionPolicyEntity) {
    return LGPD_RETENTION_DEFAULTS[entityName].label;
}

export function formatRetentionActionLabel(actionType: RetentionActionType) {
    return ACTION_LABELS[actionType];
}

export function formatRetentionExecutionStatusLabel(status: RetentionExecutionStatus) {
    return EXECUTION_STATUS_LABELS[status];
}

export function calculateRetentionCutoff(retentionDays: number, now = new Date()) {
    return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

export function summarizeRetentionExecution(input: {
    processedCount: number;
    errorCount: number;
    skippedCount: number;
    dryRun?: boolean;
}): RetentionExecutionStatus {
    if (input.dryRun) return "DRY_RUN";
    if (input.errorCount > 0 && input.processedCount > 0) return "PARTIAL";
    if (input.errorCount > 0 && input.processedCount === 0) return "FAILED";
    return "SUCCESS";
}
