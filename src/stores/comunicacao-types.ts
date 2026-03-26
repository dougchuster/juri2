/**
 * Tipos compartilhados entre os stores e componentes do módulo de comunicação.
 * Fonte única da verdade — importar daqui ao invés de redefinir localmente.
 */

import type { StatusCliente } from "@/generated/prisma";

export type CanalTipo = "WHATSAPP" | "EMAIL" | "FACEBOOK_MESSENGER" | "INSTAGRAM_DM";
export type ChannelFilter = "all" | CanalTipo;
export type FocusFilter = "all" | "unread" | "paused" | "assigned" | "unassigned";

export interface ConversationItem {
    id: string;
    clienteId: string;
    canal: CanalTipo;
    status: string;
    subject: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    iaDesabilitada: boolean;
    iaDesabilitadaEm: string | null;
    iaDesabilitadaPor: string | null;
    autoAtendimentoPausado: boolean;
    pausadoAte: string | null;
    motivoPausa: string | null;
    cliente: {
        id: string;
        nome: string;
        email: string | null;
        celular: string | null;
        whatsapp: string | null;
    };
    processo: { id: string; numeroCnj: string | null } | null;
    assignedTo: { id: string; name: string } | null;
    messages: {
        content: string;
        direction: string;
        createdAt: string;
        status: string;
        canal: string;
    }[];
}

export interface MessageItem {
    id: string;
    direction: "INBOUND" | "OUTBOUND";
    canal: CanalTipo;
    content: string;
    contentHtml: string | null;
    templateVars?: Record<string, unknown> | null;
    status: string;
    errorMessage?: string | null;
    senderName: string | null;
    senderPhone: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    receivedAt: string | null;
    createdAt: string;
    attachments: {
        id: string;
        fileName: string;
        mimeType: string;
        fileUrl: string;
        fileSize?: number | null;
    }[];
}

export interface WorkspaceData {
    conversation: {
        id: string;
        canal: CanalTipo;
        status: string;
        subject: string | null;
        processoId: string | null;
        lastMessageAt: string | null;
        unreadCount: number;
        iaDesabilitada: boolean;
        iaDesabilitadaEm: string | null;
        iaDesabilitadaPor: string | null;
        autoAtendimentoPausado: boolean;
        pausadoAte: string | null;
        motivoPausa: string | null;
        assignedTo: { id: string; name: string; role: string } | null;
        cliente: {
            id: string;
            nome: string;
            email: string | null;
            celular: string | null;
            whatsapp: string | null;
            status: StatusCliente;
            inadimplente: boolean;
            observacoes: string | null;
            origem: { nome: string } | null;
            crmRelationship: string | null;
            crmInterestLevel: string | null;
            crmScore: number | null;
        };
        processo: { id: string; numeroCnj: string | null; objeto: string | null; status: string } | null;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientProfile: Record<string, any> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    atendimento: Record<string, any> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    advogados: Record<string, any>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users: Record<string, any>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processos: Record<string, any>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: unknown;
}

export interface ClientForm {
    nome: string;
    email: string;
    celular: string;
    whatsapp: string;
    status: StatusCliente;
    observacoes: string;
    inadimplente: boolean;
}

export interface OpsForm {
    assignedToId: string;
    advogadoId: string;
    processoId: string;
    tipoRegistro: string;
    cicloVida: string;
    statusOperacional: string;
    prioridade: string;
    areaJuridica: string;
    subareaJuridica: string;
    origemAtendimento: string;
    proximaAcao: string;
    proximaAcaoAt: string;
    situacaoDocumental: string;
    chanceFechamento: string;
    motivoPerda: string;
    dataReuniao: string;
    statusReuniao: string;
    observacoesReuniao: string;
    assunto: string;
    resumo: string;
}
