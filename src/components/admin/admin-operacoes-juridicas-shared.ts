import { CalendarClock, Handshake, MessageCircle, Scale, Users } from "lucide-react";

export interface OperacoesMetrics {
    clientesAtivos: number;
    processosAtivos: number;
    prazosPendentes: number;
    prazosVencidos: number;
    atendimentosAbertos: number;
    conversasAbertas: number;
    faturasAtrasadas: number;
    contasPendentes: number;
    slaConversasPendentes: number;
    slaAtendimentosPendentes: number;
}

export interface OperacoesConfig {
    slaWhatsappMinutes: number;
    slaEmailMinutes: number;
    slaAtendimentoNoReturnHours: number;
    autoDistributionEnabled: boolean;
    autoDistributionHour: number;
    autoDistributionOnlyOverloaded: boolean;
    autoDistributionMode: "GLOBAL" | "EQUIPE";
    autoDistributionFallbackGlobal: boolean;
}

export interface AdvogadoCargaItem {
    id: string;
    nome: string;
    email: string;
    oab: string;
    seccional: string;
    especialidades: string | null;
    equipes: Array<{ id: string; nome: string; cor: string | null }>;
    processosAtivos: number;
    prazosVencidos: number;
    tarefasAbertas: number;
}

export interface ProcessoDistribuicaoItem {
    id: string;
    numeroCnj: string | null;
    objeto: string | null;
    status: string;
    updatedAt: string;
    advogadoId: string;
    tipoAcao: { nome: string } | null;
    advogado: { user: { name: string } };
    cliente: { nome: string };
    sugestaoAdvogadoId: string | null;
    sugestaoAdvogadoNome: string | null;
    sugestaoScore: number | null;
    sugestaoMatchEspecialidade: boolean;
    sugestaoOrigem: string | null;
}

export interface SlaConversaItem {
    conversationId: string;
    canal: string;
    clienteNome: string;
    atendente: string;
    lastInboundAt: string;
    ageMinutes: number;
    thresholdMinutes: number;
    preview: string;
}

export interface SlaAtendimentoItem {
    atendimentoId: string;
    status: string;
    assunto: string;
    clienteNome: string;
    advogadoNome: string;
    createdAt: string;
    dataRetorno: string | null;
    motivo: string;
}

export interface AtribuicaoRecenteItem {
    id: string;
    processoId: string;
    automatico: boolean;
    modoDistribuicao: string | null;
    mesmaEquipe: boolean;
    motivo: string | null;
    createdAt: string;
    processo: { numeroCnj: string | null };
    fromAdvogado: { id: string; user: { name: string } } | null;
    toAdvogado: { id: string; user: { name: string } };
}

export interface AdminOperacoesJuridicasProps {
    metrics: OperacoesMetrics;
    advogados: AdvogadoCargaItem[];
    processos: ProcessoDistribuicaoItem[];
    slaConversas: SlaConversaItem[];
    slaAtendimentos: SlaAtendimentoItem[];
    atribuicoesRecentes: AtribuicaoRecenteItem[];
    config: OperacoesConfig;
}

export interface OperacoesAuditoriaAnalytics {
    total: number;
    automaticas: number;
    manuais: number;
    fallbackGlobal: number;
    mesmaEquipe: number;
    topDestinos: Array<[string, number]>;
    topOrigens: Array<[string, number]>;
    serieDiaria: Array<{ label: string; count: number }>;
    serieMax: number;
}

export const quickActions = [
    { label: "Novo cliente", href: "/clientes", icon: Users, hint: "Cadastro rapido de cliente" },
    { label: "Novo processo", href: "/processos", icon: Scale, hint: "Abrir caso e vincular responsavel" },
    { label: "Novo agendamento", href: "/agenda", icon: CalendarClock, hint: "Compromisso, prazo ou audiencia" },
    { label: "Novo atendimento", href: "/atendimentos", icon: Handshake, hint: "Registrar triagem comercial/juridica" },
    { label: "Nova conversa", href: "/comunicacao", icon: MessageCircle, hint: "Atendimento por WhatsApp e e-mail" },
];

export const referenciaModulos = [
    {
        modulo: "Clientes",
        referencia: "Pesquisar cliente, cadastro rapido e relatorio",
        nosso: "Cadastro completo, tags e historico em atendimento",
        href: "/clientes",
    },
    {
        modulo: "Processos",
        referencia: "Pesquisa e acompanhamento processual",
        nosso: "Processos com fases, tarefas, prazos, audiencias e documentos",
        href: "/processos",
    },
    {
        modulo: "Agenda e Controle",
        referencia: "Agenda principal, agenda telefonica e controle da agenda",
        nosso: "Agenda juridica integrada com prazos e tarefas",
        href: "/agenda",
    },
    {
        modulo: "Financeiro",
        referencia: "Contas a pagar/receber, fluxo e custas",
        nosso: "Financeiro com honorarios, faturas, contas e centros de custo",
        href: "/financeiro",
    },
    {
        modulo: "Administracao",
        referencia: "Usuarios, acessos, configuracoes e log de alteracoes",
        nosso: "Admin, equipe juridica, workflows e auditoria",
        href: "/admin",
    },
];

export const recursosJuridicos = [
    "SLA de primeiro atendimento com alerta por prioridade",
    "Matriz de risco por processo com escalonamento automatico",
    "Checklist documental por tipo de acao",
    "Distribuicao inteligente por carga e especialidade",
    "Playbook de atendimento (triagem, proposta, fechamento)",
];

export const playbookFases = [
    "Fase 1: Triagem inicial e validacao documental",
    "Fase 2: Qualificacao juridica e estrategia",
    "Fase 3: Proposta comercial e aceite",
    "Fase 4: Execucao processual com acompanhamento de SLA",
];

export function getActionError(result: unknown, fallback = "Operacao nao concluida.") {
    if (!result || typeof result !== "object") return fallback;
    const payload = result as { error?: unknown };
    if (!payload.error) return null;
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.error === "object") {
        const firstValue = Object.values(payload.error as Record<string, unknown>)[0];
        if (Array.isArray(firstValue)) return firstValue[0] ? String(firstValue[0]) : fallback;
        if (typeof firstValue === "string") return firstValue;
    }
    return fallback;
}

export function formatProcessoStatus(status: string) {
    return status.replaceAll("_", " ").toLowerCase();
}

export function formatModoDistribuicao(value: string | null) {
    if (!value) return "manual";
    return value.toLowerCase().replaceAll("_", " ");
}

export type HistoricoTipoFiltro = "TODOS" | "AUTO" | "MANUAL";
export type HistoricoModoFiltro = "TODOS" | "GLOBAL" | "EQUIPE" | "EQUIPE_FALLBACK_GLOBAL" | "MANUAL";
export type HistoricoPeriodoFiltro = "TODOS" | "24H" | "7D" | "30D";
export type AuditoriaPeriodo = "7D" | "30D" | "90D";

export const HISTORICO_PAGE_SIZE = 8;
export const HISTORICO_TIPO_VALUES = ["TODOS", "AUTO", "MANUAL"] as const;
export const HISTORICO_MODO_VALUES = ["TODOS", "GLOBAL", "EQUIPE", "EQUIPE_FALLBACK_GLOBAL", "MANUAL"] as const;
export const HISTORICO_PERIODO_VALUES = ["TODOS", "24H", "7D", "30D"] as const;

export function normalizeHistoricoParam<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
    if (!value) return fallback;
    const normalized = value.toUpperCase() as T;
    return allowed.includes(normalized) ? normalized : fallback;
}

export function auditoriaPeriodoDias(periodo: AuditoriaPeriodo) {
    if (periodo === "7D") return 7;
    if (periodo === "90D") return 90;
    return 30;
}
