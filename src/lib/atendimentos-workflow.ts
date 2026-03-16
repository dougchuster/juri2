import type {
    CicloVidaAtendimento,
    StatusAtendimento,
    StatusOperacionalAtendimento,
    TipoRegistroAtendimento,
} from "@/generated/prisma";

export const ATENDIMENTO_STATUS_LABELS: Record<StatusOperacionalAtendimento, string> = {
    NOVO: "Novo",
    TRIAGEM: "Triagem",
    AGUARDANDO_CLIENTE: "Aguardando cliente",
    AGUARDANDO_EQUIPE_INTERNA: "Aguardando equipe interna",
    EM_ANALISE_JURIDICA: "Em analise juridica",
    AGUARDANDO_DOCUMENTOS: "Aguardando documentos",
    REUNIAO_AGENDADA: "Reuniao agendada",
    REUNIAO_CONFIRMADA: "Reuniao confirmada",
    PROPOSTA_ENVIADA: "Proposta enviada",
    EM_NEGOCIACAO: "Em negociacao",
    CONTRATADO: "Contratado",
    NAO_CONTRATADO: "Nao contratado",
    ENCERRADO: "Encerrado",
};

export const ATENDIMENTO_KANBAN_COLUMNS = [
    {
        id: "entrada",
        label: "Entrada",
        description: "Primeiro contato recebido e ainda nao qualificado.",
        tone: "stone",
        statuses: ["NOVO"],
    },
    {
        id: "qualificacao",
        label: "Qualificacao",
        description: "Triagem inicial, area do direito e viabilidade do caso.",
        tone: "sky",
        statuses: ["TRIAGEM"],
    },
    {
        id: "analise_juridica",
        label: "Analise juridica",
        description: "Parecer preliminar, estrategia e apoio interno.",
        tone: "blue",
        statuses: ["AGUARDANDO_EQUIPE_INTERNA", "EM_ANALISE_JURIDICA"],
    },
    {
        id: "proposta_honorarios",
        label: "Proposta / honorarios",
        description: "Reuniao, proposta comercial e negociacao do contrato.",
        tone: "amber",
        statuses: ["REUNIAO_AGENDADA", "REUNIAO_CONFIRMADA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
    },
    {
        id: "aguardando_cliente",
        label: "Aguardando cliente",
        description: "Dependencia de resposta, assinatura ou documentos do cliente.",
        tone: "orange",
        statuses: ["AGUARDANDO_CLIENTE", "AGUARDANDO_DOCUMENTOS"],
    },
    {
        id: "contratado",
        label: "Contratado",
        description: "Contrato assinado e pronto para virar processo ativo.",
        tone: "emerald",
        statuses: ["CONTRATADO"],
    },
    {
        id: "nao_convertido",
        label: "Nao convertido",
        description: "Atendimento perdido, recusado ou inviavel.",
        tone: "rose",
        statuses: ["NAO_CONTRATADO"],
    },
    {
        id: "arquivado",
        label: "Arquivado",
        description: "Registro encerrado para consulta futura e historico.",
        tone: "zinc",
        statuses: ["ENCERRADO"],
    },
] as const satisfies ReadonlyArray<{
    id: string;
    label: string;
    description: string;
    tone: string;
    statuses: readonly StatusOperacionalAtendimento[];
}>;

export type AtendimentoKanbanColumnId = (typeof ATENDIMENTO_KANBAN_COLUMNS)[number]["id"];

export const DEFAULT_ATENDIMENTO_STATUS_OPERACIONAL: StatusOperacionalAtendimento = "NOVO";

export function getNextOperationalStatus(status: StatusOperacionalAtendimento): StatusOperacionalAtendimento | null {
    switch (status) {
        case "NOVO":
            return "TRIAGEM";
        case "TRIAGEM":
            return "AGUARDANDO_CLIENTE";
        case "AGUARDANDO_CLIENTE":
        case "AGUARDANDO_DOCUMENTOS":
        case "AGUARDANDO_EQUIPE_INTERNA":
            return "EM_ANALISE_JURIDICA";
        case "EM_ANALISE_JURIDICA":
            return "REUNIAO_AGENDADA";
        case "REUNIAO_AGENDADA":
        case "REUNIAO_CONFIRMADA":
            return "PROPOSTA_ENVIADA";
        case "PROPOSTA_ENVIADA":
            return "EM_NEGOCIACAO";
        case "EM_NEGOCIACAO":
            return "CONTRATADO";
        case "CONTRATADO":
        case "NAO_CONTRATADO":
            return "ENCERRADO";
        case "ENCERRADO":
            return null;
        default:
            return null;
    }
}

export function mapOperationalToLegacyFields(
    statusOperacional: StatusOperacionalAtendimento,
    previous?: {
        status?: StatusAtendimento | null;
        tipoRegistro?: TipoRegistroAtendimento | null;
    },
): {
    status: StatusAtendimento;
    tipoRegistro: TipoRegistroAtendimento;
    cicloVida: CicloVidaAtendimento;
} {
    switch (statusOperacional) {
        case "NOVO":
            return { status: "LEAD", tipoRegistro: "LEAD", cicloVida: "NOVO_CONTATO" };
        case "TRIAGEM":
            return { status: "QUALIFICACAO", tipoRegistro: "LEAD", cicloVida: "LEAD" };
        case "AGUARDANDO_CLIENTE":
        case "AGUARDANDO_EQUIPE_INTERNA":
        case "EM_ANALISE_JURIDICA":
        case "AGUARDANDO_DOCUMENTOS":
            return { status: "QUALIFICACAO", tipoRegistro: "LEAD", cicloVida: "LEAD_QUALIFICADO" };
        case "REUNIAO_AGENDADA":
        case "REUNIAO_CONFIRMADA":
        case "PROPOSTA_ENVIADA":
            return { status: "PROPOSTA", tipoRegistro: "LEAD", cicloVida: "PROPOSTA_ENVIADA" };
        case "EM_NEGOCIACAO":
            return { status: "PROPOSTA", tipoRegistro: "LEAD", cicloVida: "EM_NEGOCIACAO" };
        case "CONTRATADO":
            return { status: "CONVERTIDO", tipoRegistro: "CLIENTE", cicloVida: "CLIENTE_ATIVO" };
        case "NAO_CONTRATADO":
            return { status: "PERDIDO", tipoRegistro: "LEAD", cicloVida: "PERDIDO" };
        case "ENCERRADO":
            return {
                status: previous?.status === "CONVERTIDO" ? "CONVERTIDO" : "PERDIDO",
                tipoRegistro: previous?.tipoRegistro === "CLIENTE" || previous?.status === "CONVERTIDO" ? "CLIENTE" : "LEAD",
                cicloVida: "ENCERRADO",
            };
        default:
            return { status: "LEAD", tipoRegistro: "LEAD", cicloVida: "LEAD" };
    }
}
