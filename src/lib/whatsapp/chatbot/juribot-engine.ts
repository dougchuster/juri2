import { db } from "@/lib/db";
import { hydrateMovimentacaoTranslations } from "@/lib/services/andamento-tradutor";
import { normalizeMojibake } from "@/lib/text-normalization";
import { formatCNJ } from "@/lib/utils";

if (typeof window !== "undefined") {
    throw new Error("juribot-engine is server-only");
}

const JURIBOT_FEATURE = "JURIBOT_MVP";
const HUMAN_HANDOFF_PAUSE_HOURS = 6;
const PROCESS_LIST_LIMIT = 8;

type JuribotIntent = "menu" | "processos" | "andamentos" | "agenda" | "humano" | "selecionar" | "desconhecido";

type JuribotRunArgs = {
    conversationId: string;
    clienteId: string;
    incomingText: string;
    connectionId?: string | null;
    dispatchReply?: boolean;
};

type JuribotRunResult = {
    enabled: boolean;
    handled: boolean;
    intent: JuribotIntent | null;
    reply?: string;
    selectedProcessoId?: string | null;
    reason?: string;
};

type ConversationContext = {
    id: string;
    clienteId: string;
    escritorioId: string | null;
    processoId: string | null;
    autoAtendimentoPausado: boolean;
    iaDesabilitada: boolean;
    pausadoAte: Date | null;
    cliente: {
        id: string;
        nome: string;
        escritorioId: string | null;
    };
};

type ClientProcessSummary = {
    id: string;
    numeroCnj: string | null;
    status: string;
    tipo: string;
    objeto: string | null;
    tribunal: string | null;
    vara: string | null;
    dataUltimaMovimentacao: Date | null;
    updatedAt: Date;
    tipoAcao: { nome: string } | null;
};

function toBooleanFlag(value: string | undefined) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function normalizeText(value: string) {
    return normalizeMojibake(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function onlyDigits(value: string | null | undefined) {
    return String(value || "").replace(/\D/g, "");
}

function getFirstName(nome: string) {
    const first = normalizeMojibake(nome).trim().split(/\s+/)[0];
    return first || "cliente";
}

function formatDateBR(value: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(value);
}

function formatDateTimeBR(value: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

function summarize(value: string | null | undefined, max = 72) {
    const normalized = normalizeMojibake(String(value || "")).replace(/\s+/g, " ").trim();
    if (!normalized) return "Sem detalhes adicionais";
    if (normalized.length <= max) return normalized;
    const truncated = normalized.slice(0, max);
    const lastSpace = truncated.lastIndexOf(" ");
    return `${(lastSpace > 32 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
}

function formatStatus(status: string) {
    const labels: Record<string, string> = {
        PROSPECCAO: "Prospeccao",
        CONSULTORIA: "Consultoria",
        AJUIZADO: "Ajuizado",
        EM_ANDAMENTO: "Em andamento",
        AUDIENCIA_MARCADA: "Audiencia marcada",
        SENTENCA: "Sentenca",
        RECURSO: "Recurso",
        TRANSITO_JULGADO: "Transito julgado",
        EXECUCAO: "Execucao",
        ENCERRADO: "Encerrado",
        ARQUIVADO: "Arquivado",
        PENDENTE: "Pendente",
        CONCLUIDO: "Concluido",
        VENCIDO: "Vencido",
    };

    return labels[status] || status.replace(/_/g, " ");
}

function formatTipoAudiencia(tipo: string) {
    const labels: Record<string, string> = {
        CONCILIACAO: "Conciliacao",
        INSTRUCAO: "Instrucao",
        JULGAMENTO: "Julgamento",
        UNA: "Una",
        OUTRA: "Outra",
    };

    return labels[tipo] || tipo.replace(/_/g, " ");
}

function processDisplayLabel(processo: ClientProcessSummary) {
    const numero = processo.numeroCnj ? formatCNJ(processo.numeroCnj) : `Processo ${processo.id.slice(-6)}`;
    const assunto = processo.tipoAcao?.nome || processo.objeto || processo.tipo;
    return `${numero} | ${formatStatus(processo.status)} | ${summarize(assunto, 48)}`;
}

function buildMenuReply(params: {
    nome: string;
    processos: ClientProcessSummary[];
    processoAtual: ClientProcessSummary | null;
    preface?: string;
}) {
    const lines = [
        params.preface || `Oi, ${params.nome}. Sou o JuriBot e posso te ajudar a consultar seu caso pelo WhatsApp.`,
        "",
        "Responda com:",
        "1 para ver seus processos",
        "2 para ver os ultimos andamentos",
        "3 para ver o proximo prazo ou audiencia",
        "4 para falar com atendimento humano",
    ];

    if (params.processoAtual) {
        lines.push("", `Processo atual: ${processDisplayLabel(params.processoAtual)}`);
    } else if (params.processos.length > 1) {
        lines.push("", "Se quiser selecionar um processo especifico, responda com P1, P2, P3...");
    }

    if (params.processos.length === 0) {
        lines.push("", "Nao encontrei processo vinculado ao seu cadastro neste momento.");
    }

    return lines.join("\n");
}

async function isJuribotEnabled(escritorioId: string | null) {
    if (toBooleanFlag(process.env.JURIBOT_MVP_ENABLED)) return true;

    if (escritorioId) {
        const officeFlag = await db.featureFlag.findFirst({
            where: {
                escritorioId,
                feature: JURIBOT_FEATURE,
            },
            select: { habilitado: true },
        });

        if (officeFlag) return officeFlag.habilitado;
    }

    const globalFlag = await db.featureFlag.findFirst({
        where: {
            escritorioId: null,
            feature: JURIBOT_FEATURE,
        },
        select: { habilitado: true },
    });

    return globalFlag?.habilitado ?? false;
}

async function getConversationContext(conversationId: string, clienteId: string): Promise<ConversationContext | null> {
    return db.conversation.findFirst({
        where: {
            id: conversationId,
            clienteId,
        },
        select: {
            id: true,
            clienteId: true,
            escritorioId: true,
            processoId: true,
            autoAtendimentoPausado: true,
            iaDesabilitada: true,
            pausadoAte: true,
            cliente: {
                select: {
                    id: true,
                    nome: true,
                    escritorioId: true,
                },
            },
        },
    });
}

async function listClientProcesses(clienteId: string) {
    const processos = await db.processo.findMany({
        where: { clienteId },
        select: {
            id: true,
            numeroCnj: true,
            status: true,
            tipo: true,
            objeto: true,
            tribunal: true,
            vara: true,
            dataUltimaMovimentacao: true,
            updatedAt: true,
            tipoAcao: {
                select: {
                    nome: true,
                },
            },
        },
        orderBy: [
            { dataUltimaMovimentacao: { sort: "desc", nulls: "last" } },
            { updatedAt: "desc" },
        ],
        take: 20,
    });

    return processos as ClientProcessSummary[];
}

async function syncCurrentProcess(
    conversationId: string,
    currentProcessoId: string | null,
    processos: ClientProcessSummary[]
) {
    let selected = processos.find((processo) => processo.id === currentProcessoId) || null;
    let nextProcessoId = currentProcessoId;

    if (!selected && processos.length === 1) {
        selected = processos[0] || null;
        nextProcessoId = selected?.id || null;
    }

    if (!selected && currentProcessoId) {
        nextProcessoId = null;
    }

    if ((nextProcessoId || null) !== (currentProcessoId || null)) {
        await db.conversation.update({
            where: { id: conversationId },
            data: { processoId: nextProcessoId || null },
        });
    }

    return selected;
}

function detectIntent(normalized: string): JuribotIntent {
    if (!normalized) return "menu";

    if (/^(4|humano|atendente|advogado|pessoa|equipe|suporte)$/.test(normalized)) {
        return "humano";
    }

    if (/(^|\b)(p|proc|processo)\s*\d{1,2}(\b|$)/.test(normalized)) {
        return "selecionar";
    }

    if (/(^|\b)(menu|ajuda|opcoes|opcao|inicio|voltar|oi|ola|bom dia|boa tarde|boa noite)(\b|$)/.test(normalized)) {
        return "menu";
    }

    if (normalized === "1" || /\b(processo|processos|meus processos|casos)\b/.test(normalized)) {
        return "processos";
    }

    if (normalized === "2" || /\b(andamento|andamentos|movimentacao|movimentacoes|ultima movimentacao|ultimos andamentos)\b/.test(normalized)) {
        return "andamentos";
    }

    if (normalized === "3" || /\b(prazo|prazos|audiencia|audiencias|agenda|compromisso|compromissos)\b/.test(normalized)) {
        return "agenda";
    }

    const digits = onlyDigits(normalized);
    if (digits.length >= 7) {
        return "selecionar";
    }

    return "desconhecido";
}

function resolveProcessSelection(normalized: string, processos: ClientProcessSummary[]) {
    const indexedMatch = normalized.match(/(?:^|\b)(?:p|proc|processo)\s*(\d{1,2})(?:\b|$)/);
    if (indexedMatch) {
        const index = Number(indexedMatch[1]);
        if (Number.isInteger(index) && index >= 1 && index <= processos.length) {
            return processos[index - 1] || null;
        }
    }

    const digits = onlyDigits(normalized);
    if (digits.length >= 7) {
        return (
            processos.find((processo) => {
                const cnjDigits = onlyDigits(processo.numeroCnj);
                return Boolean(cnjDigits) && (cnjDigits === digits || cnjDigits.includes(digits) || digits.includes(cnjDigits));
            }) || null
        );
    }

    return null;
}

function buildProcessListReply(processos: ClientProcessSummary[], processoAtualId: string | null) {
    if (processos.length === 0) {
        return [
            "Nao encontrei processos vinculados ao seu cadastro.",
            "",
            "Se preferir, responda 4 para falar com atendimento humano.",
        ].join("\n");
    }

    const visible = processos.slice(0, PROCESS_LIST_LIMIT);
    const lines = [
        `Encontrei ${processos.length} processo(s) no seu cadastro:`,
        "",
        ...visible.map((processo, index) => {
            const selected = processo.id === processoAtualId ? " (atual)" : "";
            return `P${index + 1}. ${processDisplayLabel(processo)}${selected}`;
        }),
        "",
        "Responda com P1, P2, P3... para selecionar um processo.",
    ];

    if (processos.length > visible.length) {
        lines.push(`Mostrando os ${visible.length} mais recentes.`);
    }

    return lines.join("\n");
}

function buildNeedProcessSelectionReply(processos: ClientProcessSummary[]) {
    const listReply = buildProcessListReply(processos, null);
    return [
        "Eu preciso que voce selecione um processo antes de continuar.",
        "",
        listReply,
    ].join("\n");
}

async function buildAndamentosReply(processo: ClientProcessSummary) {
    const movimentacoes = await db.movimentacao.findMany({
        where: {
            processoId: processo.id,
            privado: false,
        },
        select: {
            id: true,
            data: true,
            descricao: true,
            fonte: true,
            metadata: true,
        },
        orderBy: [{ data: "desc" }, { createdAt: "desc" }],
        take: 3,
    });

    if (movimentacoes.length === 0) {
        return [
            `Nao encontrei andamentos recentes para ${processDisplayLabel(processo)}.`,
            "",
            "Se quiser, responda 1 para ver seus processos ou 4 para falar com atendimento humano.",
        ].join("\n");
    }

    const traduzidas = await hydrateMovimentacaoTranslations(
        movimentacoes.map((movimentacao) => ({
            ...movimentacao,
            entidadeTabela: "movimentacao",
            entidadeId: movimentacao.id,
        })),
        { aiLimit: 3, persistLimit: 3 }
    );

    return [
        `Ultimos andamentos de ${processDisplayLabel(processo)}:`,
        "",
        ...traduzidas.map((movimentacao, index) => {
            const resumo = movimentacao.traducao?.resumoSimplificado || movimentacao.descricao;
            return `${index + 1}. ${formatDateBR(movimentacao.data)} - ${summarize(resumo, 220)}`;
        }),
        "",
        "Se quiser, responda 3 para ver o proximo prazo ou audiencia.",
    ].join("\n");
}

async function buildAgendaReply(processo: ClientProcessSummary) {
    const agora = new Date();
    const inicioHoje = new Date(agora);
    inicioHoje.setHours(0, 0, 0, 0);

    const [prazo, audiencia] = await Promise.all([
        db.prazo.findFirst({
            where: {
                processoId: processo.id,
                status: {
                    in: ["PENDENTE", "VENCIDO"],
                },
            },
            select: {
                descricao: true,
                dataFatal: true,
                status: true,
                observacoes: true,
            },
            orderBy: { dataFatal: "asc" },
        }),
        db.audiencia.findFirst({
            where: {
                processoId: processo.id,
                realizada: false,
                data: { gte: inicioHoje },
            },
            select: {
                tipo: true,
                data: true,
                local: true,
                sala: true,
                observacoes: true,
            },
            orderBy: { data: "asc" },
        }),
    ]);

    if (!prazo && !audiencia) {
        return [
            `Nao encontrei prazo pendente nem audiencia futura para ${processDisplayLabel(processo)}.`,
            "",
            "Se quiser, responda 2 para ver os ultimos andamentos.",
        ].join("\n");
    }

    const lines = [`Resumo de agenda para ${processDisplayLabel(processo)}:`, ""];

    if (prazo) {
        const statusLabel = prazo.status === "VENCIDO" ? "Prazo vencido" : "Proximo prazo";
        lines.push(`${statusLabel}: ${formatDateBR(prazo.dataFatal)} - ${summarize(prazo.descricao, 120)}`);
        if (prazo.observacoes) {
            lines.push(`Observacao: ${summarize(prazo.observacoes, 120)}`);
        }
        lines.push("");
    }

    if (audiencia) {
        const local = [audiencia.local, audiencia.sala].filter(Boolean).join(" | ");
        lines.push(`Proxima audiencia: ${formatDateTimeBR(audiencia.data)} - ${formatTipoAudiencia(audiencia.tipo)}`);
        if (local) {
            lines.push(`Local: ${summarize(local, 120)}`);
        }
        if (audiencia.observacoes) {
            lines.push(`Observacao: ${summarize(audiencia.observacoes, 120)}`);
        }
        lines.push("");
    }

    lines.push("Se quiser, responda 2 para ver os ultimos andamentos.");
    return lines.join("\n");
}

async function pauseForHumanHandoff(conversationId: string) {
    const pausadoAte = new Date(Date.now() + HUMAN_HANDOFF_PAUSE_HOURS * 60 * 60 * 1000);

    await db.conversation.update({
        where: { id: conversationId },
        data: {
            autoAtendimentoPausado: true,
            motivoPausa: "Solicitado atendimento humano via JuriBot",
            pausadoAte,
        },
    });

    return pausadoAte;
}

export async function runJuribotForInboundMessage(args: JuribotRunArgs): Promise<JuribotRunResult> {
    const incomingText = normalizeMojibake(args.incomingText || "").trim();
    if (!incomingText) {
        return {
            enabled: false,
            handled: false,
            intent: null,
            reason: "Mensagem sem texto para o JuriBot",
        };
    }

    const conversation = await getConversationContext(args.conversationId, args.clienteId);
    if (!conversation) {
        return {
            enabled: false,
            handled: false,
            intent: null,
            reason: "Conversa nao encontrada",
        };
    }

    const escritorioId = conversation.escritorioId || conversation.cliente.escritorioId || null;
    const enabled = await isJuribotEnabled(escritorioId);
    if (!enabled) {
        return {
            enabled: false,
            handled: false,
            intent: null,
            reason: "Feature flag desabilitada",
        };
    }

    const automationPaused =
        Boolean(conversation.iaDesabilitada) ||
        Boolean(
            conversation.autoAtendimentoPausado &&
            (!conversation.pausadoAte || conversation.pausadoAte.getTime() > Date.now())
        );

    if (automationPaused) {
        return {
            enabled: true,
            handled: false,
            intent: null,
            reason: "Conversa pausada para atendimento humano",
        };
    }

    const processos = await listClientProcesses(conversation.clienteId);
    let processoAtual = await syncCurrentProcess(conversation.id, conversation.processoId, processos);
    const normalized = normalizeText(incomingText);
    const intent = detectIntent(normalized);
    let reply = "";
    let selectedProcessoId = processoAtual?.id || null;

    if (intent === "humano") {
        const pausadoAte = await pauseForHumanHandoff(conversation.id);
        reply = [
            "Perfeito. Vou encaminhar seu atendimento para uma pessoa da equipe.",
            "",
            `O atendimento automatico ficou pausado ate ${formatDateTimeBR(pausadoAte)}.`,
            "Se precisar complementar, pode enviar a mensagem por aqui que o historico fica registrado.",
        ].join("\n");
    } else if (intent === "selecionar") {
        const processoSelecionado = resolveProcessSelection(normalized, processos);
        if (!processoSelecionado) {
            reply = buildNeedProcessSelectionReply(processos);
        } else {
            await db.conversation.update({
                where: { id: conversation.id },
                data: { processoId: processoSelecionado.id },
            });
            processoAtual = processoSelecionado;
            selectedProcessoId = processoSelecionado.id;
            reply = [
                `Processo selecionado com sucesso: ${processDisplayLabel(processoSelecionado)}`,
                "",
                "Agora voce pode responder:",
                "2 para ver os ultimos andamentos",
                "3 para ver o proximo prazo ou audiencia",
                "4 para falar com atendimento humano",
            ].join("\n");
        }
    } else if (intent === "processos") {
        reply = buildProcessListReply(processos, processoAtual?.id || null);
    } else if (intent === "andamentos") {
        if (!processoAtual) {
            reply = buildNeedProcessSelectionReply(processos);
        } else {
            reply = await buildAndamentosReply(processoAtual);
        }
    } else if (intent === "agenda") {
        if (!processoAtual) {
            reply = buildNeedProcessSelectionReply(processos);
        } else {
            reply = await buildAgendaReply(processoAtual);
        }
    } else {
        reply = buildMenuReply({
            nome: getFirstName(conversation.cliente.nome),
            processos,
            processoAtual,
            preface:
                intent === "desconhecido"
                    ? "Nao entendi totalmente sua mensagem, mas posso te ajudar por aqui."
                    : undefined,
        });
    }

    if (!reply.trim()) {
        return {
            enabled: true,
            handled: false,
            intent,
            reason: "Resposta vazia",
        };
    }

    if (args.dispatchReply !== false) {
        const { sendWhatsappTextMessage } = await import("@/lib/whatsapp/application/message-service");
        const sendResult = await sendWhatsappTextMessage({
            clienteId: conversation.clienteId,
            content: reply,
            conversationId: conversation.id,
            connectionId: args.connectionId || null,
            processoId: selectedProcessoId,
        });

        if (!sendResult.ok) {
            return {
                enabled: true,
                handled: false,
                intent,
                reply,
                selectedProcessoId,
                reason: sendResult.error || "Falha ao enviar resposta do JuriBot",
            };
        }
    }

    return {
        enabled: true,
        handled: true,
        intent,
        reply,
        selectedProcessoId,
    };
}
