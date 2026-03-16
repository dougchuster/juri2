import type { ComponentType } from "react";

export interface Template {
    id: string;
    name: string;
    canal: string | null;
    category: string;
    subject: string | null;
    content: string;
    contentHtml: string | null;
    isActive: boolean;
}

export interface Rule {
    id: string;
    name: string;
    eventType: string;
    canal: string | null;
    templateId: string;
    target: string;
    isActive: boolean;
    triggerOffset: number | null;
    sendHourStart: number | null;
    sendHourEnd: number | null;
    workdaysOnly: boolean;
    template: { id: string; name: string; canal: string | null; category: string };
}

export interface Job {
    id: string;
    canal: string;
    status: string;
    content: string;
    recipientPhone: string | null;
    recipientEmail: string | null;
    attempts: number;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    rule: { name: string } | null;
}

export interface MeetingReminderItem {
    id: string;
    kind: string;
    status: string;
    scheduledFor: string;
    processedAt: string | null;
    cancelledAt: string | null;
    compromisso: {
        id: string;
        titulo: string;
        dataInicio: string;
        statusConfirmacao: string;
        cliente: { nome: string } | null;
        advogado: { user: { name: string | null } } | null;
    };
}

export interface MeetingProblemJob extends Job {
    compromisso: {
        id: string;
        titulo: string;
        dataInicio: string;
        cliente: { nome: string } | null;
    } | null;
}

export interface UpcomingMeeting {
    id: string;
    titulo: string;
    dataInicio: string;
    local: string | null;
    statusConfirmacao: string;
    cliente: { nome: string } | null;
    advogado: { user: { name: string | null; email: string | null } } | null;
    atendimento: { id: string; statusReuniao: string; statusOperacional: string } | null;
}

export interface AdminComunicacaoProps {
    templates: Template[];
    rules: Rule[];
    jobStats: { pending: number; processing: number; completed: number; failed: number; total: number };
    recentJobs: Job[];
    meetingDashboard: {
        stats: {
            upcomingMeetings: number;
            dueNext24h: number;
            pendingConfirmation: number;
            confirmedMeetings: number;
            rescheduleRequested: number;
            cancelledMeetings: number;
            remindersPending: number;
            remindersScheduled: number;
            remindersSent: number;
            remindersFailed: number;
            remindersCancelled: number;
            failedMeetingJobs: number;
            staleMeetingJobs: number;
        };
        recentReminders: MeetingReminderItem[];
        recentProblemJobs: MeetingProblemJob[];
        nextMeetings: UpcomingMeeting[];
    };
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
    PRAZO_D5: "Prazo - 5 dias",
    PRAZO_D3: "Prazo - 3 dias",
    PRAZO_D1: "Prazo - 1 dia",
    PRAZO_D0: "Prazo - Hoje",
    PROCESSO_STATUS_CHANGED: "Processo - Status alterado",
    PROCESSO_MOVIMENTACAO: "Processo - Movimentação",
    TAREFA_CRIADA: "Tarefa - Criada",
    TAREFA_VENCIDA: "Tarefa - Vencida",
    TAREFA_CONCLUIDA: "Tarefa - Concluída",
    PIPELINE_ETAPA_CHANGED: "Pipeline - Etapa mudou",
    FATURA_VENCENDO: "Fatura - Vencendo",
    FATURA_VENCIDA: "Fatura - Vencida",
    REUNIAO_CONFIRMACAO_CLIENTE: "Reuniao - Solicitacao de confirmacao",
    REUNIAO_LEMBRETE_CLIENTE_D1: "Reuniao - Cliente D-1",
    REUNIAO_LEMBRETE_CLIENTE_H1: "Reuniao - Cliente H-1",
    REUNIAO_LEMBRETE_RESPONSAVEL_D1: "Reuniao - Responsavel D-1",
    REUNIAO_LEMBRETE_RESPONSAVEL_H1: "Reuniao - Responsavel H-1",
    REUNIAO_CONFIRMADA: "Reuniao - Cliente confirmou",
    REUNIAO_REMARCACAO_SOLICITADA: "Reuniao - Pedido de remarcacao",
    REUNIAO_CANCELADA: "Reuniao - Cancelada",
};

export const MEETING_EVENT_TYPES = new Set([
    "REUNIAO_CONFIRMACAO_CLIENTE",
    "REUNIAO_LEMBRETE_CLIENTE_D1",
    "REUNIAO_LEMBRETE_CLIENTE_H1",
    "REUNIAO_LEMBRETE_RESPONSAVEL_D1",
    "REUNIAO_LEMBRETE_RESPONSAVEL_H1",
    "REUNIAO_CONFIRMADA",
    "REUNIAO_REMARCACAO_SOLICITADA",
    "REUNIAO_CANCELADA",
]);

export const JOB_STATUS_BADGE: Record<
    string,
    { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" }
> = {
    PENDING: { label: "Pendente", variant: "warning" },
    PROCESSING: { label: "Processando", variant: "info" },
    COMPLETED: { label: "Concluído", variant: "success" },
    FAILED: { label: "Falhou", variant: "danger" },
    CANCELLED: { label: "Cancelado", variant: "muted" },
};

export const REMINDER_STATUS_BADGE: Record<
    string,
    { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" }
> = {
    PENDENTE: { label: "Pendente", variant: "warning" },
    AGENDADO: { label: "Agendado", variant: "info" },
    ENVIADO: { label: "Enviado", variant: "success" },
    FALHOU: { label: "Falhou", variant: "danger" },
    CANCELADO: { label: "Cancelado", variant: "muted" },
};

export const MEETING_STATUS_BADGE: Record<
    string,
    { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" }
> = {
    PENDENTE: { label: "Pendente", variant: "warning" },
    CONFIRMADO: { label: "Confirmado", variant: "success" },
    REMARCACAO_SOLICITADA: { label: "Remarcacao", variant: "info" },
    CANCELADO: { label: "Cancelado", variant: "danger" },
};

export function formatDateTime(value: string) {
    return new Date(value).toLocaleString("pt-BR");
}

export type TabIcon = ComponentType<{ size?: number; className?: string }>;
