type NullableDate = string | Date | null | undefined;

export interface PortalProcessoAgendamento {
    id: string;
    tipo: string;
    titulo: string;
    dataInicio: string;
    local: string | null;
}

export interface PortalProcessoMovimentacao {
    data: string;
    fonte: string | null;
    resumoSimplificado: string;
    resumoOriginal: string;
    tom: "positivo" | "negativo" | "neutro";
}

export interface PortalProcessoItem {
    id: string;
    numeroCnj: string | null;
    status: string;
    resultado: string;
    valorCausa: number | null;
    dataDistribuicao: string | null;
    dataEncerramento: string | null;
    objeto: string | null;
    vara: string | null;
    comarca: string | null;
    tribunal: string | null;
    advogado: { oab: string; user: { name: string } };
    tipoAcao: { nome: string } | null;
    agendamentos: PortalProcessoAgendamento[];
    ultimaMovimentacao: PortalProcessoMovimentacao | null;
}

export interface PortalFaturaItem {
    id: string;
    numero: string;
    status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
    valorTotal: number;
    dataEmissao: string;
    dataVencimento: string;
    dataPagamento: string | null;
    descricao: string | null;
    boletoUrl: string | null;
    pixCode: string | null;
    gatewayId: string | null;
}

export interface PortalDocumentSource {
    id: string;
    titulo: string;
    arquivoUrl: string | null;
    arquivoNome: string | null;
    mimeType: string | null;
    statusFluxo: string;
    versao: number;
    updatedAt: string | Date;
    createdAt: string | Date;
    processo?: {
        id: string;
        numeroCnj: string | null;
    } | null;
    categoria?: {
        id: string;
        nome: string;
    } | null;
}

export interface PortalDocumentItem {
    id: string;
    title: string;
    url: string | null;
    fileName: string | null;
    mimeType: string | null;
    status: string;
    statusLabel: string;
    version: number;
    updatedAt: string;
    createdAt: string;
    processoLabel: string | null;
    categoriaLabel: string | null;
    canPreview: boolean;
}

export interface PortalConversationMessageSource {
    id: string;
    content: string;
    direction: string;
    status: string;
    createdAt: string | Date;
}

export interface PortalConversationSource {
    id: string;
    canal: string;
    status: string;
    subject: string | null;
    unreadCount: number;
    lastMessageAt: NullableDate;
    processo?: {
        id: string;
        numeroCnj: string | null;
    } | null;
    assignedTo?: {
        id: string;
        name: string | null;
    } | null;
    messages: PortalConversationMessageSource[];
}

export interface PortalCommunicationMessage {
    id: string;
    content: string;
    direction: "INBOUND" | "OUTBOUND";
    directionLabel: string;
    status: string;
    createdAt: string;
}

export interface PortalCommunicationThread {
    id: string;
    canal: string;
    canalLabel: string;
    status: string;
    statusLabel: string;
    subject: string | null;
    unreadCount: number;
    lastMessageAt: string | null;
    processoLabel: string | null;
    assignedToName: string | null;
    preview: string;
    messages: PortalCommunicationMessage[];
}

export interface PortalCommunicationSummary {
    totalConversas: number;
    conversasNaoLidas: number;
    mensagensNaoLidas: number;
    canais: {
        whatsapp: number;
        email: number;
        outros: number;
    };
    threads: PortalCommunicationThread[];
}

export interface PortalAgendaSource {
    id: string;
    tipo: string;
    status: string;
    titulo: string;
    descricao: string | null;
    dataInicio: string | Date;
    dataFim: string | Date | null;
    local: string | null;
    processo?: {
        id: string;
        numeroCnj: string | null;
    } | null;
    responsavel?: {
        id: string;
        user: {
            name: string | null;
        };
    } | null;
}

export interface PortalAgendaItem {
    id: string;
    tipo: string;
    tipoLabel: string;
    status: string;
    statusLabel: string;
    titulo: string;
    descricao: string | null;
    dataInicio: string;
    dataFim: string | null;
    local: string | null;
    processoLabel: string | null;
    responsavelNome: string | null;
    isPast: boolean;
}

export interface PortalTimelineSourceEvent {
    id: string;
    data: string | Date;
    tipo: string;
    titulo: string;
    descricao: string;
    processoLabel?: string | null;
    traducao?: {
        resumoSimplificado: string;
        resumoOriginal?: string | null;
        tom?: "positivo" | "negativo" | "neutro";
    } | null;
    privado?: boolean;
    entidadeTabela?: string | null;
}

export type PortalNotificationOrigin =
    | "PROCESSO"
    | "DOCUMENTO"
    | "AGENDA"
    | "COMUNICACAO"
    | "FINANCEIRO";

export interface PortalNotificationItem {
    id: string;
    origem: PortalNotificationOrigin;
    data: string;
    titulo: string;
    descricao: string;
    descricaoOriginal: string | null;
    processoLabel: string | null;
    statusLabel: string | null;
    tom: "positivo" | "negativo" | "neutro" | null;
}

export interface PortalExpandedData {
    cliente: {
        id: string;
        nome: string;
        email: string | null;
        telefone: string | null;
    };
    resumo: {
        totalProcessos: number;
        processosAtivos: number;
        processosEncerrados: number;
        totalPago: number;
        totalPendente: number;
        faturasPendentes: number;
        documentosCompartilhados: number;
        proximosCompromissos: number;
        conversasNaoLidas: number;
        notificacoesRecentes: number;
    };
    processos: PortalProcessoItem[];
    faturas: PortalFaturaItem[];
    documentos: PortalDocumentItem[];
    agenda: PortalAgendaItem[];
    comunicacao: PortalCommunicationSummary;
    notificacoes: PortalNotificationItem[];
}

function toDate(value: NullableDate) {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
}

function sortByDateDesc<T>(items: T[], getValue: (item: T) => NullableDate) {
    return [...items].sort((a, b) => {
        const aTime = toDate(getValue(a))?.getTime() ?? 0;
        const bTime = toDate(getValue(b))?.getTime() ?? 0;
        return bTime - aTime;
    });
}

function sortByDateAsc<T>(items: T[], getValue: (item: T) => NullableDate) {
    return [...items].sort((a, b) => {
        const aTime = toDate(getValue(a))?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = toDate(getValue(b))?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
    });
}

function toIsoString(value: NullableDate) {
    return toDate(value)?.toISOString() ?? null;
}

function normalizeTextPreview(value: string | null | undefined, fallback = "Sem detalhes registrados.") {
    const normalized = (value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return fallback;
    if (normalized.length <= 180) return normalized;
    return `${normalized.slice(0, 177)}...`;
}

function isPreviewableFile(mimeType: string | null, fileName: string | null) {
    const normalizedMime = (mimeType || "").toLowerCase();
    const normalizedName = (fileName || "").toLowerCase();
    return (
        normalizedMime.includes("pdf") ||
        normalizedMime.startsWith("image/") ||
        normalizedMime.includes("text/") ||
        normalizedName.endsWith(".pdf") ||
        normalizedName.endsWith(".png") ||
        normalizedName.endsWith(".jpg") ||
        normalizedName.endsWith(".jpeg") ||
        normalizedName.endsWith(".webp")
    );
}

function getDocumentStatusLabel(status: string) {
    switch (status) {
        case "PUBLICADA":
            return "Compartilhado";
        case "APROVADA":
            return "Aprovado";
        case "EM_REVISAO":
            return "Em revisao";
        case "RASCUNHO":
            return "Rascunho";
        default:
            return status;
    }
}

function getConversationChannelLabel(channel: string) {
    switch (channel) {
        case "WHATSAPP":
            return "WhatsApp";
        case "EMAIL":
            return "Email";
        case "FACEBOOK_MESSENGER":
            return "Messenger";
        case "INSTAGRAM_DM":
            return "Instagram";
        default:
            return channel;
    }
}

function getConversationStatusLabel(status: string) {
    switch (status) {
        case "OPEN":
            return "Em andamento";
        case "CLOSED":
            return "Encerrada";
        case "ARCHIVED":
            return "Arquivada";
        default:
            return status;
    }
}

function getAgendaTipoLabel(tipo: string) {
    switch (tipo) {
        case "PRAZO_FATAL":
            return "Prazo fatal";
        case "PRAZO_INTERMEDIARIO":
            return "Prazo intermediario";
        case "AUDIENCIA":
            return "Audiencia";
        case "COMPROMISSO":
            return "Compromisso";
        case "TAREFA":
            return "Tarefa";
        case "REUNIAO":
            return "Reuniao";
        case "RETORNO":
            return "Retorno";
        case "VERIFICACAO":
            return "Verificacao";
        case "DILIGENCIA":
            return "Diligencia";
        case "PRAZO_IA":
            return "Prazo IA";
        default:
            return tipo;
    }
}

function getAgendaStatusLabel(status: string) {
    switch (status) {
        case "PENDENTE":
            return "Pendente";
        case "VISUALIZADO":
            return "Visualizado";
        case "CONCLUIDO":
            return "Concluido";
        case "CONFERIDO":
            return "Conferido";
        case "CANCELADO":
            return "Cancelado";
        case "VENCIDO":
            return "Vencido";
        default:
            return status;
    }
}

function getFinanceiroStatusLabel(status: string) {
    switch (status) {
        case "PAGA":
            return "Pagamento confirmado";
        case "ATRASADA":
            return "Fatura em atraso";
        case "CANCELADA":
            return "Fatura cancelada";
        default:
            return "Fatura pendente";
    }
}

function getTimelineOrigin(event: PortalTimelineSourceEvent): PortalNotificationOrigin {
    if (event.entidadeTabela === "documento" || event.tipo.startsWith("DOCUMENTO")) {
        return "DOCUMENTO";
    }
    if (
        event.entidadeTabela === "agendamento" ||
        event.tipo.startsWith("AUDIENCIA") ||
        event.tipo.startsWith("PRAZO") ||
        event.tipo === "REUNIAO_CLIENTE"
    ) {
        return "AGENDA";
    }
    return "PROCESSO";
}

export function buildPortalDocumentList(documents: PortalDocumentSource[]) {
    return sortByDateDesc(
        documents.filter((document) => Boolean(document.arquivoUrl)),
        (document) => document.updatedAt
    ).map<PortalDocumentItem>((document) => ({
        id: document.id,
        title: document.titulo,
        url: document.arquivoUrl,
        fileName: document.arquivoNome,
        mimeType: document.mimeType,
        status: document.statusFluxo,
        statusLabel: getDocumentStatusLabel(document.statusFluxo),
        version: document.versao,
        updatedAt: toDate(document.updatedAt)?.toISOString() ?? new Date().toISOString(),
        createdAt: toDate(document.createdAt)?.toISOString() ?? new Date().toISOString(),
        processoLabel: document.processo?.numeroCnj ?? null,
        categoriaLabel: document.categoria?.nome ?? null,
        canPreview: isPreviewableFile(document.mimeType, document.arquivoNome),
    }));
}

export function buildPortalCommunicationSummary(conversations: PortalConversationSource[]): PortalCommunicationSummary {
    const threads = sortByDateDesc(conversations, (conversation) => {
        const latestMessageDate = conversation.messages
            .map((message) => toDate(message.createdAt)?.getTime() ?? 0)
            .sort((a, b) => b - a)[0];
        if (latestMessageDate) return new Date(latestMessageDate);
        return conversation.lastMessageAt;
    }).map<PortalCommunicationThread>((conversation) => {
        const sortedMessages: PortalCommunicationMessage[] = sortByDateAsc(
            conversation.messages,
            (message) => message.createdAt
        ).map((message) => {
            const direction: PortalCommunicationMessage["direction"] =
                message.direction === "INBOUND" ? "INBOUND" : "OUTBOUND";

            return {
                id: message.id,
                content: normalizeTextPreview(message.content, "Mensagem sem conteudo."),
                direction,
                directionLabel: direction === "INBOUND" ? "Cliente" : "Escritorio",
                status: message.status,
                createdAt: toDate(message.createdAt)?.toISOString() ?? new Date().toISOString(),
            };
        });
        const latestMessage = sortByDateDesc(conversation.messages, (message) => message.createdAt)[0];

        return {
            id: conversation.id,
            canal: conversation.canal,
            canalLabel: getConversationChannelLabel(conversation.canal),
            status: conversation.status,
            statusLabel: getConversationStatusLabel(conversation.status),
            subject: conversation.subject,
            unreadCount: conversation.unreadCount,
            lastMessageAt:
                toIsoString(conversation.lastMessageAt) ??
                toIsoString(latestMessage?.createdAt) ??
                null,
            processoLabel: conversation.processo?.numeroCnj ?? null,
            assignedToName: conversation.assignedTo?.name ?? null,
            preview: normalizeTextPreview(latestMessage?.content),
            messages: sortedMessages,
        };
    });

    return {
        totalConversas: threads.length,
        conversasNaoLidas: threads.filter((thread) => thread.unreadCount > 0).length,
        mensagensNaoLidas: threads.reduce((total, thread) => total + thread.unreadCount, 0),
        canais: {
            whatsapp: threads.filter((thread) => thread.canal === "WHATSAPP").length,
            email: threads.filter((thread) => thread.canal === "EMAIL").length,
            outros: threads.filter((thread) => !["WHATSAPP", "EMAIL"].includes(thread.canal)).length,
        },
        threads,
    };
}

export function buildPortalAgendaList(items: PortalAgendaSource[]) {
    const now = Date.now();
    return sortByDateAsc(items, (item) => item.dataInicio).map<PortalAgendaItem>((item) => {
        const startAt = toDate(item.dataInicio);
        const endAt = toDate(item.dataFim);
        return {
            id: item.id,
            tipo: item.tipo,
            tipoLabel: getAgendaTipoLabel(item.tipo),
            status: item.status,
            statusLabel: getAgendaStatusLabel(item.status),
            titulo: item.titulo,
            descricao: item.descricao,
            dataInicio: startAt?.toISOString() ?? new Date().toISOString(),
            dataFim: endAt?.toISOString() ?? null,
            local: item.local,
            processoLabel: item.processo?.numeroCnj ?? null,
            responsavelNome: item.responsavel?.user.name ?? null,
            isPast: (startAt?.getTime() ?? now) < now,
        };
    });
}

export function buildPortalNotificationTimeline({
    timeline,
    communicationThreads,
    invoices,
    limit = 20,
    referenceDate,
}: {
    timeline: PortalTimelineSourceEvent[];
    communicationThreads: PortalCommunicationThread[];
    invoices: Array<
        Pick<
            PortalFaturaItem,
            "id" | "numero" | "status" | "valorTotal" | "dataVencimento" | "dataPagamento" | "descricao"
        >
    >;
    limit?: number;
    referenceDate?: string | Date;
}) {
    const timelineItems = timeline
        .filter((event) => !event.privado && event.tipo !== "ANOTACAO_INTERNA")
        .map<PortalNotificationItem>((event) => ({
            id: `timeline:${event.id}`,
            origem: getTimelineOrigin(event),
            data: toDate(event.data)?.toISOString() ?? new Date().toISOString(),
            titulo: event.titulo,
            descricao: event.traducao?.resumoSimplificado || event.descricao,
            descricaoOriginal: event.traducao?.resumoOriginal || event.descricao || null,
            processoLabel: event.processoLabel ?? null,
            statusLabel: null,
            tom: event.traducao?.tom ?? null,
        }));

    const communicationItems = communicationThreads
        .filter((thread) => thread.lastMessageAt && thread.unreadCount > 0)
        .map<PortalNotificationItem>((thread) => ({
            id: `conversation:${thread.id}`,
            origem: "COMUNICACAO",
            data: thread.lastMessageAt || new Date().toISOString(),
            titulo: `${thread.canalLabel}: ${thread.subject || "Historico recente"}`,
            descricao: thread.preview,
            descricaoOriginal: null,
            processoLabel: thread.processoLabel,
            statusLabel: thread.unreadCount > 0 ? `${thread.unreadCount} nova(s)` : thread.statusLabel,
            tom: null,
        }));

    const financeItems = invoices.map<PortalNotificationItem>((invoice) => ({
        id: `fatura:${invoice.id}`,
        origem: "FINANCEIRO",
        data:
            toDate(invoice.dataPagamento)?.toISOString() ??
            toDate(invoice.dataVencimento)?.toISOString() ??
            new Date().toISOString(),
        titulo: invoice.descricao || `Fatura ${invoice.numero}`,
        descricao:
            invoice.status === "PAGA"
                ? `Pagamento identificado para a fatura ${invoice.numero}.`
                : invoice.status === "ATRASADA"
                    ? `A fatura ${invoice.numero} esta em atraso e aguarda regularizacao.`
                    : invoice.status === "CANCELADA"
                        ? `A fatura ${invoice.numero} foi cancelada.`
                        : `A fatura ${invoice.numero} esta disponivel no portal.`,
        descricaoOriginal: null,
        processoLabel: null,
        statusLabel: getFinanceiroStatusLabel(invoice.status),
        tom: null,
    }));

    const referenceTime = toDate(referenceDate)?.getTime() ?? Date.now();

    return [...timelineItems, ...communicationItems, ...financeItems]
        .sort((a, b) => {
            const aTime = toDate(a.data)?.getTime() ?? 0;
            const bTime = toDate(b.data)?.getTime() ?? 0;
            const aIsFuture = aTime > referenceTime;
            const bIsFuture = bTime > referenceTime;

            if (aIsFuture !== bIsFuture) {
                return aIsFuture ? 1 : -1;
            }

            return bTime - aTime;
        })
        .slice(0, limit);
}

export async function getPortalData(clienteId: string): Promise<PortalExpandedData | null> {
    const [{ db }, { getTimelineCliente }, { hydrateMovimentacaoTranslations }] = await Promise.all([
        import("@/lib/db"),
        import("@/lib/dal/timeline"),
        import("@/lib/services/andamento-tradutor"),
    ]);
    const now = new Date();
    const [cliente, documentosRaw, conversasRaw, agendaRaw, timelineRaw] = await Promise.all([
        db.cliente.findUnique({
            where: { id: clienteId },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                celular: true,
                processos: {
                    select: {
                        id: true,
                        numeroCnj: true,
                        status: true,
                        resultado: true,
                        valorCausa: true,
                        dataDistribuicao: true,
                        dataEncerramento: true,
                        objeto: true,
                        vara: true,
                        comarca: true,
                        tribunal: true,
                        advogado: {
                            select: {
                                oab: true,
                                user: { select: { name: true } },
                            },
                        },
                        tipoAcao: { select: { nome: true } },
                        agendamentos: {
                            where: {
                                status: { in: ["PENDENTE", "VISUALIZADO"] },
                                dataInicio: { gte: now },
                            },
                            select: {
                                id: true,
                                tipo: true,
                                titulo: true,
                                dataInicio: true,
                                local: true,
                            },
                            orderBy: { dataInicio: "asc" },
                            take: 5,
                        },
                        movimentacoes: {
                            where: { privado: false },
                            select: {
                                id: true,
                                data: true,
                                descricao: true,
                                fonte: true,
                                metadata: true,
                            },
                            orderBy: [{ data: "desc" }, { createdAt: "desc" }],
                            take: 1,
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                faturas: {
                    select: {
                        id: true,
                        numero: true,
                        status: true,
                        valorTotal: true,
                        dataEmissao: true,
                        dataVencimento: true,
                        dataPagamento: true,
                        descricao: true,
                        boletoUrl: true,
                        pixCode: true,
                        gatewayId: true,
                    },
                    orderBy: { dataVencimento: "desc" },
                    take: 20,
                },
            },
        }),
        db.documento.findMany({
            where: {
                processo: {
                    is: {
                        clienteId,
                    },
                },
            },
            select: {
                id: true,
                titulo: true,
                arquivoUrl: true,
                arquivoNome: true,
                mimeType: true,
                statusFluxo: true,
                versao: true,
                updatedAt: true,
                createdAt: true,
                processo: {
                    select: {
                        id: true,
                        numeroCnj: true,
                    },
                },
                categoria: {
                    select: {
                        id: true,
                        nome: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
            take: 50,
        }),
        db.conversation.findMany({
            where: { clienteId },
            select: {
                id: true,
                canal: true,
                status: true,
                subject: true,
                unreadCount: true,
                lastMessageAt: true,
                processo: {
                    select: {
                        id: true,
                        numeroCnj: true,
                    },
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                messages: {
                    select: {
                        id: true,
                        content: true,
                        direction: true,
                        status: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
            orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
            take: 12,
        }),
        db.agendamento.findMany({
            where: {
                clienteId,
                status: { in: ["PENDENTE", "VISUALIZADO", "CONCLUIDO", "CONFERIDO", "VENCIDO"] },
            },
            select: {
                id: true,
                tipo: true,
                status: true,
                titulo: true,
                descricao: true,
                dataInicio: true,
                dataFim: true,
                local: true,
                processo: {
                    select: {
                        id: true,
                        numeroCnj: true,
                    },
                },
                responsavel: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ dataInicio: "asc" }, { createdAt: "desc" }],
            take: 20,
        }),
        getTimelineCliente(clienteId, { porPagina: 60 }),
    ]);

    if (!cliente) {
        return null;
    }

    const movimentacoesRecentes = await hydrateMovimentacaoTranslations(
        cliente.processos.flatMap((processo) =>
            processo.movimentacoes.map((movimentacao) => ({
                ...movimentacao,
                entidadeTabela: "movimentacao",
                entidadeId: movimentacao.id,
            }))
        ),
        { aiLimit: 4, persistLimit: 4 }
    );
    const movimentacaoMap = new Map(
        movimentacoesRecentes.map((movimentacao) => [movimentacao.id, movimentacao.traducao])
    );

    const processos = cliente.processos.map<PortalProcessoItem>((processo) => {
        const movimentacao = processo.movimentacoes[0];
        const traducao = movimentacao ? movimentacaoMap.get(movimentacao.id) : null;

        return {
            id: processo.id,
            numeroCnj: processo.numeroCnj,
            status: processo.status,
            resultado: processo.resultado,
            valorCausa: processo.valorCausa ? Number(processo.valorCausa) : null,
            dataDistribuicao: processo.dataDistribuicao?.toISOString() ?? null,
            dataEncerramento: processo.dataEncerramento?.toISOString() ?? null,
            objeto: processo.objeto,
            vara: processo.vara,
            comarca: processo.comarca,
            tribunal: processo.tribunal,
            advogado: processo.advogado,
            tipoAcao: processo.tipoAcao,
            agendamentos: processo.agendamentos.map((agendamento) => ({
                id: agendamento.id,
                tipo: agendamento.tipo,
                titulo: agendamento.titulo,
                dataInicio: agendamento.dataInicio.toISOString(),
                local: agendamento.local,
            })),
            ultimaMovimentacao: movimentacao
                ? {
                    data: movimentacao.data.toISOString(),
                    fonte: movimentacao.fonte,
                    resumoSimplificado: traducao?.resumoSimplificado ?? movimentacao.descricao,
                    resumoOriginal: movimentacao.descricao,
                    tom: traducao?.tom ?? "neutro",
                }
                : null,
        };
    });

    const faturas = cliente.faturas.map<PortalFaturaItem>((fatura) => ({
        ...fatura,
        valorTotal: Number(fatura.valorTotal),
        dataEmissao: fatura.dataEmissao.toISOString(),
        dataVencimento: fatura.dataVencimento.toISOString(),
        dataPagamento: fatura.dataPagamento?.toISOString() ?? null,
    }));

    const documentos = buildPortalDocumentList(documentosRaw);
    const comunicacao = buildPortalCommunicationSummary(conversasRaw);
    const agenda = buildPortalAgendaList(agendaRaw);
    const notificacoes = buildPortalNotificationTimeline({
        timeline: timelineRaw.eventos.map((evento) => ({
            id: evento.id,
            data: evento.data,
            tipo: evento.tipo,
            titulo: evento.titulo,
            descricao: evento.descricao,
            processoLabel: evento.processoLabel,
            traducao: evento.traducao
                ? {
                    resumoSimplificado: evento.traducao.resumoSimplificado,
                    resumoOriginal: evento.descricao,
                    tom: evento.traducao.tom,
                }
                : null,
            privado: evento.privado,
            entidadeTabela: evento.entidadeTabela,
        })),
        communicationThreads: comunicacao.threads,
        invoices: faturas,
        limit: 24,
        referenceDate: now,
    });

    const totalPago = faturas
        .filter((fatura) => fatura.status === "PAGA")
        .reduce((acc, fatura) => acc + fatura.valorTotal, 0);
    const totalPendente = faturas
        .filter((fatura) => fatura.status === "PENDENTE" || fatura.status === "ATRASADA")
        .reduce((acc, fatura) => acc + fatura.valorTotal, 0);

    const processosAtivos = processos.filter(
        (processo) => !["ENCERRADO", "ARQUIVADO"].includes(processo.status)
    ).length;
    const processosEncerrados = processos.filter((processo) =>
        ["ENCERRADO", "ARQUIVADO"].includes(processo.status)
    ).length;
    const proximosCompromissos = agenda.filter((item) => !item.isPast && item.status !== "CANCELADO").length;

    return {
        cliente: {
            id: cliente.id,
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.celular || cliente.telefone,
        },
        resumo: {
            totalProcessos: processos.length,
            processosAtivos,
            processosEncerrados,
            totalPago,
            totalPendente,
            faturasPendentes: faturas.filter((fatura) =>
                ["PENDENTE", "ATRASADA"].includes(fatura.status)
            ).length,
            documentosCompartilhados: documentos.length,
            proximosCompromissos,
            conversasNaoLidas: comunicacao.conversasNaoLidas,
            notificacoesRecentes: notificacoes.filter((item) => {
                const date = toDate(item.data);
                if (!date) return false;
                return now.getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
            }).length,
        },
        processos,
        faturas,
        documentos,
        agenda,
        comunicacao,
        notificacoes,
    };
}
