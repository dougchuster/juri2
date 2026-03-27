import { Badge } from "@/components/ui/badge";
import type { JobCenterSourceType, JobCenterStatus } from "@/lib/services/job-center";

export function formatJobCenterDate(value?: Date | string | null) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
}

export function formatJobCenterStatusLabel(status: JobCenterStatus) {
    switch (status) {
        case "QUEUED":
            return "Na fila";
        case "RUNNING":
            return "Em execução";
        case "COMPLETED":
            return "Concluído";
        case "FAILED":
            return "Falhou";
        case "CANCELLED":
            return "Cancelado";
    }
}

export function formatJobCenterSourceTypeLabel(sourceType: JobCenterSourceType) {
    return sourceType === "AUTOMACAO_NACIONAL_JOB" ? "Automação nacional" : "Flow execution";
}

export function getJobCenterStatusVariant(status: JobCenterStatus) {
    switch (status) {
        case "QUEUED":
            return "warning" as const;
        case "RUNNING":
            return "info" as const;
        case "COMPLETED":
            return "success" as const;
        case "FAILED":
            return "danger" as const;
        case "CANCELLED":
            return "muted" as const;
    }
}

export function JobCenterStatusBadge({ status }: { status: JobCenterStatus }) {
    return (
        <Badge variant={getJobCenterStatusVariant(status)} dot>
            {formatJobCenterStatusLabel(status)}
        </Badge>
    );
}
