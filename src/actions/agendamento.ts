"use server";

import { db } from "@/lib/db";
import { getSession } from "@/actions/auth";
import { hasAnyPermission } from "@/lib/rbac/check-permission";
import { revalidatePath } from "next/cache";
import type {
    TipoAgendamento,
    PrioridadeAgendamento,
    TipoContagem,
    TipoAudiencia,
    TipoCompromisso,
} from "@/generated/prisma";

// ============================================================
// HELPERS
// ============================================================

async function requireSession() {
    const session = await getSession();
    if (!session) throw new Error("Nao autenticado");
    return session;
}

async function canReviewAgenda(session: Awaited<ReturnType<typeof getSession>>) {
    if (!session) return false;
    if (["ADMIN", "SOCIO", "CONTROLADOR"].includes(session.role)) return true;

    return hasAnyPermission([
        "agenda:eventos:editar",
        "agenda:eventos:gerenciar",
        "admin:operacoes:editar",
    ]);
}

async function canDeleteFatalAgenda(session: Awaited<ReturnType<typeof getSession>>) {
    if (!session) return false;
    if (["ADMIN", "SOCIO"].includes(session.role)) return true;

    return hasAnyPermission([
        "agenda:eventos:excluir",
        "agenda:eventos:gerenciar",
        "admin:operacoes:editar",
    ]);
}

async function canDeleteAgendaComment(session: Awaited<ReturnType<typeof getSession>>) {
    if (!session) return false;
    if (session.role === "ADMIN") return true;

    return hasAnyPermission([
        "agenda:eventos:gerenciar",
        "admin:painel:gerenciar",
    ]);
}

async function logHistorico(
    agendamentoId: string,
    userId: string,
    acao: string,
    descricao: string,
    opts?: {
        campo?: string;
        valorAnterior?: string;
        valorNovo?: string;
        metadados?: Record<string, unknown>;
    }
) {
    await db.agendamentoHistorico.create({
        data: {
            agendamentoId,
            userId,
            acao,
            descricao,
            campo: opts?.campo,
            valorAnterior: opts?.valorAnterior,
            valorNovo: opts?.valorNovo,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadados: opts?.metadados as any,
        },
    });
}

// ============================================================
// CREATE
// ============================================================

export interface CreateAgendamentoInput {
    tipo: TipoAgendamento;
    titulo: string;
    descricao?: string;
    observacoes?: string;
    cor?: string;
    dataInicio: string; // ISO string
    dataFim?: string;
    dataFatal?: string;
    dataCortesia?: string;
    diaInteiro?: boolean;
    fatal?: boolean;
    tipoContagem?: TipoContagem;
    tipoAudiencia?: TipoAudiencia;
    local?: string;
    sala?: string;
    tipoCompromisso?: TipoCompromisso;
    prioridade?: PrioridadeAgendamento;
    responsavelId: string; // advogadoId
    processoId?: string;
    clienteId?: string;
    publicacaoOrigemId?: string;
    observadoresUserIds?: string[];
}

export async function createAgendamento(input: CreateAgendamentoInput) {
    const session = await requireSession();

    const agendamento = await db.agendamento.create({
        data: {
            tipo: input.tipo,
            titulo: input.titulo,
            descricao: input.descricao,
            observacoes: input.observacoes,
            cor: input.cor,
            dataInicio: new Date(input.dataInicio),
            dataFim: input.dataFim ? new Date(input.dataFim) : undefined,
            dataFatal: input.dataFatal ? new Date(input.dataFatal) : undefined,
            dataCortesia: input.dataCortesia ? new Date(input.dataCortesia) : undefined,
            diaInteiro: input.diaInteiro ?? false,
            fatal: input.fatal,
            tipoContagem: input.tipoContagem,
            tipoAudiencia: input.tipoAudiencia,
            local: input.local,
            sala: input.sala,
            tipoCompromisso: input.tipoCompromisso,
            prioridade: input.prioridade ?? "NORMAL",
            responsavelId: input.responsavelId,
            criadoPorId: session.id,
            processoId: input.processoId,
            clienteId: input.clienteId,
            publicacaoOrigemId: input.publicacaoOrigemId,
        },
    });

    // Adicionar observadores
    if (input.observadoresUserIds && input.observadoresUserIds.length > 0) {
        await db.agendamentoObservador.createMany({
            data: input.observadoresUserIds.map((uid) => ({
                agendamentoId: agendamento.id,
                userId: uid,
                adicionadoPorId: session.id,
            })),
            skipDuplicates: true,
        });
    }

    await logHistorico(agendamento.id, session.id, "CRIADO", `Agendamento criado: ${input.titulo}`);

    revalidatePath("/agenda");
    return { success: true, id: agendamento.id };
}

// ============================================================
// UPDATE
// ============================================================

export interface UpdateAgendamentoInput {
    id: string;
    titulo?: string;
    descricao?: string;
    observacoes?: string;
    cor?: string;
    dataInicio?: string;
    dataFim?: string;
    dataFatal?: string;
    dataCortesia?: string;
    diaInteiro?: boolean;
    fatal?: boolean;
    tipoContagem?: TipoContagem;
    tipoAudiencia?: TipoAudiencia;
    local?: string;
    sala?: string;
    tipoCompromisso?: TipoCompromisso;
    prioridade?: PrioridadeAgendamento;
    responsavelId?: string;
    processoId?: string;
    clienteId?: string;
}

export async function updateAgendamento(input: UpdateAgendamentoInput) {
    const session = await requireSession();

    const atual = await db.agendamento.findUniqueOrThrow({ where: { id: input.id } });

    const agendamento = await db.agendamento.update({
        where: { id: input.id },
        data: {
            titulo: input.titulo,
            descricao: input.descricao,
            observacoes: input.observacoes,
            cor: input.cor,
            dataInicio: input.dataInicio ? new Date(input.dataInicio) : undefined,
            dataFim: input.dataFim !== undefined ? (input.dataFim ? new Date(input.dataFim) : null) : undefined,
            dataFatal: input.dataFatal !== undefined ? (input.dataFatal ? new Date(input.dataFatal) : null) : undefined,
            dataCortesia: input.dataCortesia !== undefined ? (input.dataCortesia ? new Date(input.dataCortesia) : null) : undefined,
            diaInteiro: input.diaInteiro,
            fatal: input.fatal,
            tipoContagem: input.tipoContagem,
            tipoAudiencia: input.tipoAudiencia,
            local: input.local,
            sala: input.sala,
            tipoCompromisso: input.tipoCompromisso,
            prioridade: input.prioridade,
            responsavelId: input.responsavelId,
            processoId: input.processoId !== undefined ? input.processoId || null : undefined,
            clienteId: input.clienteId !== undefined ? input.clienteId || null : undefined,
        },
    });

    // Log das alteracoes
    if (input.responsavelId && input.responsavelId !== atual.responsavelId) {
        await logHistorico(input.id, session.id, "RESPONSAVEL_ALTERADO",
            "Responsavel alterado",
            { campo: "responsavelId", valorAnterior: atual.responsavelId, valorNovo: input.responsavelId }
        );
    }
    if (input.dataInicio && input.dataInicio !== atual.dataInicio.toISOString()) {
        await logHistorico(input.id, session.id, "DATA_ALTERADA",
            "Data de inicio alterada",
            { campo: "dataInicio", valorAnterior: atual.dataInicio.toISOString(), valorNovo: input.dataInicio }
        );
    }

    revalidatePath("/agenda");
    return { success: true, agendamento };
}

// ============================================================
// STATUS
// ============================================================

export async function concluirAgendamento(id: string, comoConcluido?: string) {
    const session = await requireSession();

    const atual = await db.agendamento.findUniqueOrThrow({ where: { id } });

    // Prazo fatal requer descricao de como foi concluido
    if ((atual.tipo === "PRAZO_FATAL" || atual.tipo === "PRAZO_IA") && !comoConcluido?.trim()) {
        return { success: false, error: "Informe como o prazo foi cumprido" };
    }

    await db.agendamento.update({
        where: { id },
        data: {
            status: "CONCLUIDO",
            concluidoEm: new Date(),
            concluidoPorId: session.id,
            comoConcluido: comoConcluido || null,
        },
    });

    await logHistorico(id, session.id, "STATUS_ALTERADO",
        `Status alterado de ${atual.status} para CONCLUIDO`,
        { campo: "status", valorAnterior: atual.status, valorNovo: "CONCLUIDO" }
    );

    revalidatePath("/agenda");
    return { success: true };
}

export async function conferirAgendamento(id: string) {
    const session = await requireSession();

    const papel = session.role;
    if (!(await canReviewAgenda(session))) {
        return { success: false, error: "Sem permissao para conferir" };
    }

    const atual = await db.agendamento.findUniqueOrThrow({ where: { id } });

    // Conferente nao pode ser o mesmo que concluiu (exceto ADMIN)
    if (papel !== "ADMIN" && atual.concluidoPorId === session.id) {
        return { success: false, error: "O conferente nao pode ser a mesma pessoa que concluiu" };
    }

    await db.agendamento.update({
        where: { id },
        data: {
            status: "CONFERIDO",
            conferido: true,
            conferidoPorId: session.id,
            conferidoEm: new Date(),
        },
    });

    await logHistorico(id, session.id, "CONFERIDO", "Agendamento conferido");

    revalidatePath("/agenda");
    return { success: true };
}

export async function rejeitarConferencia(id: string, motivo: string) {
    const session = await requireSession();

    if (!motivo?.trim()) {
        return { success: false, error: "Informe o motivo da rejeicao" };
    }

    if (!(await canReviewAgenda(session))) {
        return { success: false, error: "Sem permissao para rejeitar conferencia" };
    }

    await db.agendamento.update({
        where: { id },
        data: {
            status: "PENDENTE",
            concluidoEm: null,
            concluidoPorId: null,
            comoConcluido: null,
            motivoRejeicao: motivo,
        },
    });

    await logHistorico(id, session.id, "REJEITADO",
        `Conferencia rejeitada: ${motivo}`,
        { campo: "status", valorAnterior: "CONCLUIDO", valorNovo: "PENDENTE" }
    );

    revalidatePath("/agenda");
    return { success: true };
}

export async function cancelarAgendamento(id: string, motivo: string) {
    const session = await requireSession();

    if (!motivo?.trim()) {
        return { success: false, error: "Informe o motivo do cancelamento" };
    }

    const atual = await db.agendamento.findUniqueOrThrow({ where: { id } });

    // Prazo fatal: apenas ADMIN/SOCIO podem cancelar
    if ((atual.tipo === "PRAZO_FATAL" || atual.tipo === "PRAZO_IA") &&
        !(await canDeleteFatalAgenda(session))) {
        return { success: false, error: "Apenas ADMIN ou SOCIO podem cancelar prazos fatais" };
    }

    await db.agendamento.update({
        where: { id },
        data: {
            status: "CANCELADO",
            canceladoEm: new Date(),
            canceladoPorId: session.id,
            motivoCancelamento: motivo,
        },
    });

    await logHistorico(id, session.id, "CANCELADO",
        `Agendamento cancelado: ${motivo}`,
        { campo: "status", valorAnterior: atual.status, valorNovo: "CANCELADO" }
    );

    revalidatePath("/agenda");
    return { success: true };
}

export async function marcarVisualizado(id: string) {
    const session = await requireSession();

    const atual = await db.agendamento.findUnique({ where: { id } });
    if (!atual || atual.status !== "PENDENTE") return { success: true }; // ja visualizado ou nao existe

    await db.agendamento.update({
        where: { id },
        data: {
            status: "VISUALIZADO",
            visualizadoEm: new Date(),
            visualizadoPorId: session.id,
        },
    });

    revalidatePath("/agenda");
    return { success: true };
}

// ============================================================
// OBSERVADORES
// ============================================================

export async function addObservador(agendamentoId: string, userId: string) {
    const session = await requireSession();

    await db.agendamentoObservador.upsert({
        where: { agendamentoId_userId: { agendamentoId, userId } },
        create: { agendamentoId, userId, adicionadoPorId: session.id },
        update: {},
    });

    await logHistorico(agendamentoId, session.id, "OBSERVADOR_ADICIONADO",
        `Observador adicionado`
    );

    revalidatePath("/agenda");
    return { success: true };
}

export async function removeObservador(agendamentoId: string, userId: string) {
    const session = await requireSession();

    await db.agendamentoObservador.deleteMany({
        where: { agendamentoId, userId },
    });

    await logHistorico(agendamentoId, session.id, "OBSERVADOR_REMOVIDO",
        `Observador removido`
    );

    revalidatePath("/agenda");
    return { success: true };
}

// ============================================================
// COMENTARIOS
// ============================================================

export async function addComentario(agendamentoId: string, conteudo: string) {
    const session = await requireSession();

    if (!conteudo?.trim()) {
        return { success: false, error: "Comentario nao pode ser vazio" };
    }

    const comentario = await db.agendamentoComentario.create({
        data: {
            agendamentoId,
            userId: session.id,
            conteudo: conteudo.trim(),
        },
        include: { usuario: { select: { id: true, name: true, avatarUrl: true } } },
    });

    revalidatePath("/agenda");
    return { success: true, comentario };
}

export async function deleteComentario(comentarioId: string) {
    const session = await requireSession();

    const comentario = await db.agendamentoComentario.findUniqueOrThrow({
        where: { id: comentarioId },
    });

    // Somente o autor ou ADMIN pode deletar
    if (comentario.userId !== session.id && !(await canDeleteAgendaComment(session))) {
        return { success: false, error: "Sem permissao para deletar este comentario" };
    }

    await db.agendamentoComentario.delete({ where: { id: comentarioId } });

    revalidatePath("/agenda");
    return { success: true };
}

// ============================================================
// REABRIR
// ============================================================

export async function reabrirAgendamento(id: string) {
    const session = await requireSession();

    const atual = await db.agendamento.findUniqueOrThrow({ where: { id } });

    if (!["CONCLUIDO", "VENCIDO"].includes(atual.status)) {
        return { success: false, error: "Somente agendamentos concluidos ou vencidos podem ser reabertos" };
    }

    await db.agendamento.update({
        where: { id },
        data: {
            status: "PENDENTE",
            concluidoEm: null,
            concluidoPorId: null,
            comoConcluido: null,
            conferido: false,
            conferidoPorId: null,
            conferidoEm: null,
        },
    });

    await logHistorico(id, session.id, "REABERTO",
        `Agendamento reaberto`,
        { campo: "status", valorAnterior: atual.status, valorNovo: "PENDENTE" }
    );

    revalidatePath("/agenda");
    return { success: true };
}

// ============================================================
// DELETE
// ============================================================

export async function deleteAgendamento(id: string) {
    const session = await requireSession();

    const atual = await db.agendamento.findUniqueOrThrow({ where: { id } });

    // Prazo Fatal: apenas ADMIN/SOCIO
    if ((atual.tipo === "PRAZO_FATAL" || atual.tipo === "PRAZO_IA") &&
        !(await canDeleteFatalAgenda(session))) {
        return { success: false, error: "Sem permissao para excluir prazos fatais" };
    }

    await db.agendamento.delete({ where: { id } });

    revalidatePath("/agenda");
    return { success: true };
}

// ============================================================
// FILTROS SALVOS
// ============================================================

export async function saveFiltroAgenda(nome: string, filtros: Record<string, unknown>, padrao = false) {
    const session = await requireSession();

    if (padrao) {
        // Remove padrao anterior
        await db.agendamentoFiltroSalvo.updateMany({
            where: { userId: session.id, padrao: true },
            data: { padrao: false },
        });
    }

    const filtro = await db.agendamentoFiltroSalvo.create({
        data: {
            userId: session.id,
            nome,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filtros: filtros as any,
            padrao,
        },
    });

    revalidatePath("/agenda");
    return { success: true, filtro };
}

// ============================================================
// FETCH DETALHE (para drawer client-side)
// ============================================================

export async function fetchAgendamentoDetalhe(id: string) {
    await requireSession();

    const a = await db.agendamento.findUnique({
        where: { id },
        include: {
            responsavel: { include: { user: { select: { name: true, avatarUrl: true } } } },
            criadoPor: { select: { name: true } },
            conferidoPor: { select: { name: true } },
            concluidoPorUser: { select: { name: true } },
            processo: { select: { id: true, numeroCnj: true, cliente: { select: { nome: true } } } },
            cliente: { select: { id: true, nome: true } },
            observadores: {
                include: { usuario: { select: { name: true, avatarUrl: true } } },
            },
            comentarios: {
                include: { usuario: { select: { name: true, avatarUrl: true } } },
                orderBy: { createdAt: "asc" },
            },
            historicos: {
                include: { usuario: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
                take: 50,
            },
        },
    });

    if (!a) return null;

    // Serializar datas para JSON-safe
    return {
        id: a.id,
        tipo: a.tipo,
        status: a.status,
        prioridade: a.prioridade,
        titulo: a.titulo,
        descricao: a.descricao,
        observacoes: a.observacoes,
        dataInicio: a.dataInicio.toISOString(),
        dataFim: a.dataFim?.toISOString() ?? null,
        dataFatal: a.dataFatal?.toISOString() ?? null,
        dataCortesia: a.dataCortesia?.toISOString() ?? null,
        diaInteiro: a.diaInteiro,
        fatal: a.fatal,
        local: a.local,
        sala: a.sala,
        origemConfianca: a.origemConfianca,
        conferido: a.conferido,
        conferidoEm: a.conferidoEm?.toISOString() ?? null,
        concluidoEm: a.concluidoEm?.toISOString() ?? null,
        comoConcluido: a.comoConcluido,
        motivoRejeicao: a.motivoRejeicao,
        canceladoEm: a.canceladoEm?.toISOString() ?? null,
        motivoCancelamento: a.motivoCancelamento,
        processoId: a.processoId,
        clienteId: a.clienteId,
        processo: a.processo ?? null,
        cliente: a.cliente ?? null,
        responsavel: a.responsavel ? { user: { name: a.responsavel.user.name, avatarUrl: a.responsavel.user.avatarUrl ?? null } } : null,
        criadoPor: a.criadoPor ?? null,
        conferidoPor: a.conferidoPor ?? null,
        concluidoPorUser: a.concluidoPorUser ?? null,
        observadores: a.observadores.map((o) => ({
            id: o.id,
            userId: o.userId,
            usuario: { name: o.usuario.name, avatarUrl: o.usuario.avatarUrl ?? null },
        })),
        comentarios: a.comentarios.map((c) => ({
            id: c.id,
            conteudo: c.conteudo,
            createdAt: c.createdAt.toISOString(),
            userId: c.userId,
            usuario: { name: c.usuario.name, avatarUrl: c.usuario.avatarUrl ?? null },
        })),
        historicos: a.historicos.map((h) => ({
            id: h.id,
            acao: h.acao,
            descricao: h.descricao,
            createdAt: h.createdAt.toISOString(),
            usuario: { name: h.usuario.name },
        })),
    };
}

export async function deleteFiltroAgenda(id: string) {
    const session = await requireSession();

    await db.agendamentoFiltroSalvo.deleteMany({
        where: { id, userId: session.id },
    });

    revalidatePath("/agenda");
    return { success: true };
}
