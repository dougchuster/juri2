export interface UserItem {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
    isActive: boolean;
    advogado: { id: string; oab: string; seccional: string; ativo: boolean } | null;
}

export interface LogItem {
    id: string;
    acao: string;
    entidade: string;
    entidadeId: string;
    createdAt: string;
    user: { name: string | null; email: string };
    dadosAntes?: unknown;
    dadosDepois?: unknown;
}

export interface EscritorioData {
    id: string;
    nome: string;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
}

export interface FeriadoItem {
    id: string;
    nome: string;
    data: string;
    abrangencia: string;
    recorrente: boolean;
}

export interface AdminFeedbackState {
    variant: "success" | "error" | "info";
    title?: string;
    message: string;
}

export type TabId = "usuarios" | "logs" | "escritorio" | "feriados";

export const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Administrador",
    SOCIO: "Sócio",
    ADVOGADO: "Advogado",
    CONTROLADOR: "Controlador",
    ASSISTENTE: "Assistente",
    FINANCEIRO: "Financeiro",
    SECRETARIA: "Secretaria",
};
