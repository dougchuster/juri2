import "server-only";
import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TipoEvento =
    | "ANDAMENTO_JUDICIAL"
    | "PUBLICACAO"
    | "DESPACHO"
    | "SENTENCA"
    | "DECISAO"
    | "JUNTADA"
    | "CONCLUSAO"
    | "PRAZO_CRIADO"
    | "PRAZO_VENCIDO"
    | "PRAZO_CONCLUIDO"
    | "AUDIENCIA_AGENDADA"
    | "AUDIENCIA_REALIZADA"
    | "DOCUMENTO_ANEXADO"
    | "DOCUMENTO_PUBLICADO"
    | "REUNIAO_CLIENTE"
    | "CONTATO_TELEFONICO"
    | "EMAIL_ENVIADO"
    | "ANOTACAO_INTERNA"
    | "HONORARIO_PAGO"
    | "MANUAL";

export type FonteEvento = "MANUAL" | "DATAJUD" | "DIARIO_OFICIAL" | "SISTEMA";

export interface EventoTimeline {
    id: string;
    processoId: string;
    data: Date;
    hora?: string;
    tipo: TipoEvento;
    titulo: string;
    descricao: string;
    fonte: FonteEvento;
    responsavel?: { id: string; nome: string; oab?: string };
    entidadeId: string;
    entidadeTabela: "movimentacao" | "prazo" | "audiencia" | "documento" | "honorario" | "agendamento";
    documentoUrl?: string;
    documentoNome?: string;
    privado?: boolean;
    metadata?: Record<string, unknown>;
    urgente?: boolean; // prazos vencendo em até 3 dias
}

export interface TimelineFiltros {
    tipos?: TipoEvento[];
    dataInicio?: Date;
    dataFim?: Date;
    busca?: string;
    pagina?: number;
    porPagina?: number;
    fontes?: FonteEvento[];
}

export interface TimelineResult {
    eventos: EventoTimeline[];
    total: number;
    totalPaginas: number;
    pagina: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tipoMovimentacao(tipo: string | null, fonte: string | null, subTipo: string | null): TipoEvento {
    if (subTipo === "REUNIAO") return "REUNIAO_CLIENTE";
    if (subTipo === "CONTATO_TELEFONICO") return "CONTATO_TELEFONICO";
    if (subTipo === "EMAIL") return "EMAIL_ENVIADO";
    if (subTipo === "ANOTACAO") return "ANOTACAO_INTERNA";
    if (fonte === "DATAJUD") return "ANDAMENTO_JUDICIAL";
    if (fonte === "PUBLICACAO") return "PUBLICACAO";
    const tipoUp = (tipo || "").toUpperCase();
    if (tipoUp.includes("SENTENÇA") || tipoUp.includes("SENTENCA")) return "SENTENCA";
    if (tipoUp.includes("DECISÃO") || tipoUp.includes("DECISAO")) return "DECISAO";
    if (tipoUp.includes("DESPACHO")) return "DESPACHO";
    if (tipoUp.includes("JUNTADA")) return "JUNTADA";
    if (tipoUp.includes("CONCLUSÃO") || tipoUp.includes("CONCLUSAO")) return "CONCLUSAO";
    if (tipoUp.includes("PUBLICAÇÃO") || tipoUp.includes("PUBLICACAO")) return "PUBLICACAO";
    return "MANUAL";
}

function tituloEvento(tipo: TipoEvento, dados?: string): string {
    const map: Record<TipoEvento, string> = {
        ANDAMENTO_JUDICIAL: "Andamento Judicial",
        PUBLICACAO: "Publicação no Diário Oficial",
        DESPACHO: "Despacho",
        SENTENCA: "Sentença",
        DECISAO: "Decisão",
        JUNTADA: "Juntada",
        CONCLUSAO: "Conclusão",
        PRAZO_CRIADO: dados ? `Prazo: ${dados}` : "Prazo cadastrado",
        PRAZO_VENCIDO: dados ? `Prazo vencido: ${dados}` : "Prazo vencido",
        PRAZO_CONCLUIDO: dados ? `Prazo concluído: ${dados}` : "Prazo concluído",
        AUDIENCIA_AGENDADA: dados ? `Audiência agendada: ${dados}` : "Audiência agendada",
        AUDIENCIA_REALIZADA: dados ? `Audiência realizada: ${dados}` : "Audiência realizada",
        DOCUMENTO_ANEXADO: dados ? `Documento: ${dados}` : "Documento anexado",
        DOCUMENTO_PUBLICADO: dados ? `Documento publicado: ${dados}` : "Documento publicado",
        REUNIAO_CLIENTE: "Reunião com cliente",
        CONTATO_TELEFONICO: "Contato telefônico",
        EMAIL_ENVIADO: "E-mail enviado",
        ANOTACAO_INTERNA: "Anotação interna",
        HONORARIO_PAGO: "Honorário pago",
        MANUAL: "Registro manual",
    };
    return map[tipo];
}

function fonteEvento(fonte: string | null): FonteEvento {
    if (fonte === "DATAJUD") return "DATAJUD";
    if (fonte === "PUBLICACAO") return "DIARIO_OFICIAL";
    if (fonte === "SISTEMA") return "SISTEMA";
    return "MANUAL";
}

const TIPO_AUDIENCIA: Record<string, string> = {
    CONCILIACAO: "Conciliação",
    INSTRUCAO: "Instrução",
    JULGAMENTO: "Julgamento",
    UNA: "Una",
    OUTRA: "Outra",
};

// ─── Main DAL Function ────────────────────────────────────────────────────────

export async function getTimelineProcesso(
    processoId: string,
    filtros: TimelineFiltros = {}
): Promise<TimelineResult> {
    const { pagina = 1, porPagina = 20, busca, tipos, dataInicio, dataFim, fontes } = filtros;
    const hoje = new Date();
    const tresLias = new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [movimentacoes, prazos, audiencias, documentos, honorarios] = await Promise.all([
        db.movimentacao.findMany({
            where: { processoId },
            include: { responsavel: { include: { user: { select: { name: true } } } } },
            orderBy: { data: "desc" },
            take: 500,
        }),
        db.prazo.findMany({
            where: { processoId },
            include: { advogado: { include: { user: { select: { name: true } } } } },
            orderBy: { dataFatal: "desc" },
            take: 200,
        }),
        db.audiencia.findMany({
            where: { processoId },
            include: { advogado: { include: { user: { select: { name: true } } } } },
            orderBy: { data: "desc" },
            take: 100,
        }),

        db.documento.findMany({
            where: { processoId },
            orderBy: { createdAt: "desc" },
            take: 200,
        }),
        db.honorario.findMany({
            where: { processoId },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
    ]);

    const eventos: EventoTimeline[] = [];

    // Movimentações
    for (const mov of movimentacoes) {
        const tipo = tipoMovimentacao(mov.tipo, mov.fonte, mov.subTipo ?? null);
        eventos.push({
            id: `mov_${mov.id}`,
            processoId,
            data: mov.data,
            hora: mov.hora ?? undefined,
            tipo,
            titulo: tituloEvento(tipo),
            descricao: mov.descricao,
            fonte: fonteEvento(mov.fonte ?? null),
            responsavel: mov.responsavel
                ? { id: mov.responsavel.id, nome: mov.responsavel.user.name ?? "—", oab: mov.responsavel.oab }
                : undefined,
            entidadeId: mov.id,
            entidadeTabela: "movimentacao",
            privado: mov.privado,
            metadata: (mov.metadata as Record<string, unknown>) ?? undefined,
        });
    }

    // Prazos
    for (const prazo of prazos) {
        let tipo: TipoEvento = "PRAZO_CRIADO";
        if (prazo.status === "VENCIDO") tipo = "PRAZO_VENCIDO";
        if (prazo.status === "CONCLUIDO") tipo = "PRAZO_CONCLUIDO";

        const urgente =
            prazo.status === "PENDENTE" &&
            prazo.dataFatal <= tresLias &&
            prazo.dataFatal >= hoje;

        eventos.push({
            id: `prazo_${prazo.id}`,
            processoId,
            data: prazo.dataFatal,
            tipo,
            titulo: tituloEvento(tipo, prazo.descricao),
            descricao: prazo.descricao + (prazo.observacoes ? ` — ${prazo.observacoes}` : ""),
            fonte: "SISTEMA",
            responsavel: prazo.advogado
                ? { id: prazo.advogado.id, nome: prazo.advogado.user.name ?? "—", oab: prazo.advogado.oab }
                : undefined,
            entidadeId: prazo.id,
            entidadeTabela: "prazo",
            urgente,
            metadata: { status: prazo.status, fatal: prazo.fatal, tipoContagem: prazo.tipoContagem },
        });
    }

    // Audiências
    for (const aud of audiencias) {
        const tipo: TipoEvento = aud.realizada ? "AUDIENCIA_REALIZADA" : "AUDIENCIA_AGENDADA";
        const tipoLabel = TIPO_AUDIENCIA[aud.tipo] ?? aud.tipo;

        eventos.push({
            id: `aud_${aud.id}`,
            processoId,
            data: aud.data,
            tipo,
            titulo: tituloEvento(tipo, tipoLabel),
            descricao: [
                tipoLabel,
                aud.local ? `Local: ${aud.local}` : null,
                aud.sala ? `Sala ${aud.sala}` : null,
                aud.observacoes ?? null,
                aud.resultadoResumo ? `Resultado: ${aud.resultadoResumo}` : null,
            ]
                .filter(Boolean)
                .join(" · "),
            fonte: "MANUAL",
            responsavel: aud.advogado
                ? { id: aud.advogado.id, nome: aud.advogado.user.name ?? "—", oab: aud.advogado.oab }
                : undefined,
            entidadeId: aud.id,
            entidadeTabela: "audiencia",
            metadata: { realizada: aud.realizada, local: aud.local, sala: aud.sala },
        });
    }

    // Documentos
    for (const doc of documentos) {
        const tipo: TipoEvento =
            doc.statusFluxo === "PUBLICADA" ? "DOCUMENTO_PUBLICADO" : "DOCUMENTO_ANEXADO";

        eventos.push({
            id: `doc_${doc.id}`,
            processoId,
            data: doc.createdAt,
            tipo,
            titulo: tituloEvento(tipo, doc.titulo),
            descricao: doc.titulo + (doc.arquivoNome ? ` (${doc.arquivoNome})` : ""),
            fonte: "SISTEMA",
            entidadeId: doc.id,
            entidadeTabela: "documento",
            documentoUrl: doc.arquivoUrl ?? undefined,
            documentoNome: doc.arquivoNome ?? undefined,
            metadata: { statusFluxo: doc.statusFluxo, versao: doc.versao, mimeType: doc.mimeType },
        });
    }

    // Honorários encerrados/pagos
    for (const hon of honorarios) {
        if (hon.status !== "ENCERRADO") continue;
        eventos.push({
            id: `hon_${hon.id}`,
            processoId,
            data: hon.updatedAt,
            tipo: "HONORARIO_PAGO",
            titulo: "Honorário pago",
            descricao: hon.descricao ?? `Honorário ${hon.tipo}`,
            fonte: "SISTEMA",
            entidadeId: hon.id,
            entidadeTabela: "honorario",
            metadata: { tipo: hon.tipo, valor: hon.valorTotal },
        });
    }

    // Aplicar filtros
    let filtrados = eventos;

    if (tipos && tipos.length > 0) {
        filtrados = filtrados.filter((e) => tipos.includes(e.tipo));
    }

    if (fontes && fontes.length > 0) {
        filtrados = filtrados.filter((e) => fontes.includes(e.fonte));
    }

    if (dataInicio) {
        filtrados = filtrados.filter((e) => e.data >= dataInicio);
    }

    if (dataFim) {
        filtrados = filtrados.filter((e) => e.data <= dataFim);
    }

    if (busca && busca.trim()) {
        const q = busca.toLowerCase().trim();
        filtrados = filtrados.filter(
            (e) =>
                e.titulo.toLowerCase().includes(q) ||
                e.descricao.toLowerCase().includes(q) ||
                e.responsavel?.nome.toLowerCase().includes(q)
        );
    }

    // Ordenar por data DESC (mais recente primeiro)
    filtrados.sort((a, b) => b.data.getTime() - a.data.getTime());

    const total = filtrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const offset = (pagina - 1) * porPagina;
    const paginados = filtrados.slice(offset, offset + porPagina);

    return { eventos: paginados, total, totalPaginas, pagina };
}

// ─── Timeline por Cliente (todos os processos) ───────────────────────────────

export interface EventoTimelineCliente extends EventoTimeline {
    processoId: string;
    processoLabel: string; // numeroCnj ou objeto resumido
}

export async function getTimelineCliente(
    clienteId: string,
    filtros: TimelineFiltros = {}
): Promise<{ eventos: EventoTimelineCliente[]; total: number; totalPaginas: number; pagina: number }> {
    const { pagina = 1, porPagina = 30, busca, tipos, dataInicio, dataFim } = filtros;

    // Buscar processos, dados do cliente e agendamentos em paralelo
    const [processos, cliente, agendamentos] = await Promise.all([
        db.processo.findMany({
            where: { clienteId },
            select: { id: true, numeroCnj: true, objeto: true },
            orderBy: { createdAt: "desc" },
            take: 50,
        }),
        db.cliente.findUnique({
            where: { id: clienteId },
            select: { observacoes: true },
        }),
        db.agendamento.findMany({
            where: { clienteId },
            select: {
                id: true,
                tipo: true,
                titulo: true,
                descricao: true,
                dataInicio: true,
                status: true,
                processoId: true,
                responsavel: { select: { id: true, user: { select: { name: true } } } },
            },
            orderBy: { dataInicio: "desc" },
            take: 200,
        }),
    ]);

    const processosMap = new Map(processos.map((p) => [
        p.id,
        p.numeroCnj ?? (p.objeto ? p.objeto.slice(0, 40) + (p.objeto.length > 40 ? "…" : "") : p.id),
    ]));

    let todos: EventoTimelineCliente[] = [];

    // ── 1. Eventos dos processos ─────────────────────────────────────────────
    if (processos.length > 0) {
        const resultados = await Promise.all(
            processos.map((proc) => getTimelineProcesso(proc.id, { porPagina: 999 }))
        );
        for (let i = 0; i < processos.length; i++) {
            const proc = processos[i];
            const label = processosMap.get(proc.id) ?? proc.id;
            for (const ev of resultados[i].eventos) {
                todos.push({ ...ev, processoId: proc.id, processoLabel: label });
            }
        }
    }

    // ── 2. Agendamentos vinculados ao cliente ────────────────────────────────
    const TIPO_AG_MAP: Record<string, TipoEvento> = {
        COMPROMISSO: "MANUAL",
        AUDIENCIA:   "AUDIENCIA_AGENDADA",
        PRAZO_FATAL: "PRAZO_CRIADO",
        TAREFA:      "MANUAL",
        REUNIAO:     "REUNIAO_CLIENTE",
        DILIGENCIA:  "MANUAL",
    };

    for (const ag of agendamentos) {
        const tipo: TipoEvento = TIPO_AG_MAP[ag.tipo] ?? "MANUAL";
        const processoId   = ag.processoId ?? "";
        const processoLabel = ag.processoId
            ? (processosMap.get(ag.processoId) ?? ag.processoId)
            : "Sem processo";

        todos.push({
            id:              `ag-${ag.id}`,
            processoId,
            processoLabel,
            data:            ag.dataInicio,
            tipo,
            titulo:          ag.titulo,
            descricao:       ag.descricao ?? "",
            fonte:           "SISTEMA",
            entidadeId:      ag.id,
            entidadeTabela:  "agendamento",
            responsavel:     ag.responsavel
                ? { id: ag.responsavel.id, nome: ag.responsavel.user.name ?? "Advogado" }
                : undefined,
        });
    }

    // ── 3. Anotações do cliente (campo observacoes) ──────────────────────────
    if (cliente?.observacoes) {
        const blocos = cliente.observacoes.split(/\n\n+/);
        for (const bloco of blocos) {
            const match = bloco.match(/^\[(\d{2}\/\d{2}\/\d{4}),?\s*(\d{2}:\d{2})\]\s*([\s\S]+)$/);
            if (!match) continue;
            const [, dataBR, hora, texto] = match;
            const [dia, mes, ano] = dataBR.split("/").map(Number);
            const data = new Date(ano, mes - 1, dia);
            if (isNaN(data.getTime())) continue;
            todos.push({
                id:             `nota-${clienteId}-${data.getTime()}-${texto.slice(0, 8)}`,
                processoId:     "",
                processoLabel:  "Anotação do cliente",
                data,
                hora,
                tipo:           "ANOTACAO_INTERNA",
                titulo:         "Anotação interna",
                descricao:      texto.trim(),
                fonte:          "MANUAL",
                entidadeId:     clienteId,
                entidadeTabela: "movimentacao",
            });
        }
    }

    // ── Filtros ──────────────────────────────────────────────────────────────
    if (tipos && tipos.length > 0) todos = todos.filter((e) => tipos.includes(e.tipo));
    if (dataInicio) todos = todos.filter((e) => e.data >= dataInicio);
    if (dataFim)    todos = todos.filter((e) => e.data <= dataFim);
    if (busca && busca.trim()) {
        const q = busca.toLowerCase();
        todos = todos.filter(
            (e) =>
                e.titulo.toLowerCase().includes(q) ||
                e.descricao.toLowerCase().includes(q) ||
                e.processoLabel.toLowerCase().includes(q) ||
                (e.responsavel?.nome ?? "").toLowerCase().includes(q)
        );
    }

    todos.sort((a, b) => b.data.getTime() - a.data.getTime());

    const total       = todos.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const offset      = (pagina - 1) * porPagina;

    return { eventos: todos.slice(offset, offset + porPagina), total, totalPaginas, pagina };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface TimelineStats {
    totalEventos: number;
    prazosPendentes: number;
    audienciasProximas: number;
    documentosAnexados: number;
    ultimaAtualizacao: Date | null;
}

export async function getTimelineStats(processoId: string): Promise<TimelineStats> {
    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalMov, prazos, audiencias, documentos] = await Promise.all([
        db.movimentacao.count({ where: { processoId } }),
        db.prazo.findMany({ where: { processoId, status: "PENDENTE" }, select: { dataFatal: true } }),
        db.audiencia.findMany({
            where: { processoId, realizada: false, data: { gte: hoje, lte: em30dias } },
            select: { id: true },
        }),
        db.documento.count({ where: { processoId } }),
    ]);

    const ultimaMov = await db.movimentacao.findFirst({
        where: { processoId },
        orderBy: { data: "desc" },
        select: { data: true },
    });

    return {
        totalEventos: totalMov,
        prazosPendentes: prazos.length,
        audienciasProximas: audiencias.length,
        documentosAnexados: documentos,
        ultimaAtualizacao: ultimaMov?.data ?? null,
    };
}
