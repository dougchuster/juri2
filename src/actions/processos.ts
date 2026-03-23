"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { getEscritorioId, tenantFilter } from "@/lib/tenant";
import {
    processoSchema, movimentacaoSchema,
    parteProcessoSchema, audienciaSchema,
    prazoSchema, documentoSchema,
} from "@/lib/validators/processo";
import { fireEvent } from "@/lib/services/event-triggers";
import { z } from "zod";
import { getSession } from "@/actions/auth";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import {
    DocumentoVersioningError,
    createDocumentoWithInitialVersion,
    deleteDocumentoWithPolicy,
} from "@/lib/services/documento-versioning";
import { importDocumentoToLibrary } from "@/actions/documentos";
import type {
    ProcessoFormData, MovimentacaoFormData,
    ParteProcessoFormData, AudienciaFormData,
    PrazoFormData, DocumentoFormData,
} from "@/lib/validators/processo";
import { revalidatePath } from "next/cache";
import {
    type DistributionCandidate,
    type DistributionProcess,
    suggestAdvogadoForProcess,
} from "@/lib/services/distribution-engine";
import {
    removeLegacyAgendamentoRef,
    syncAudienciaLegadaToAgendamento,
    syncPrazoLegadoToAgendamento,
} from "@/lib/services/agendamento-legacy-sync";
import { removePrazoFromCalendars, syncPrazoToCalendars } from "@/lib/integrations/calendar-sync";
import { calcularDataCortesia } from "@/lib/services/publicacoes-deadline-ai";
import { normalizeMojibake, normalizeNullableMojibake } from "@/lib/text-normalization";

function emptyToNull(val: unknown) {
    return val === "" ? null : val;
}

function safeRevalidate(path: string) {
    try {
        revalidatePath(path);
    } catch (error) {
        console.warn(`[revalidate] skipped for ${path}:`, error);
    }
}

function formatDateOnly(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

async function getAuditActorId() {
    const session = await getSession();
    return session?.id || null;
}

async function cleanupProcessoDeletionDependencies(tx: Prisma.TransactionClient, ids: string[]) {
    await tx.processoVinculado.deleteMany({
        where: { OR: [{ processoOrigemId: { in: ids } }, { processoDestinoId: { in: ids } }] },
    });

    await Promise.all([
        tx.publicacao.updateMany({ where: { processoId: { in: ids } }, data: { processoId: null } }),
        tx.conversation.updateMany({ where: { processoId: { in: ids } }, data: { processoId: null } }),
        tx.message.updateMany({ where: { processoId: { in: ids } }, data: { processoId: null } }),
        tx.tarefa.updateMany({ where: { processoId: { in: ids } }, data: { processoId: null } }),
        tx.contaPagar.updateMany({ where: { processoId: { in: ids } }, data: { processoId: null } }),
        tx.atendimento.updateMany({ where: { processoId: { in: ids } }, data: { processoId: null } }),
        tx.financeiroEscritorioLancamento.updateMany({
            where: { processoId: { in: ids } },
            data: { processoId: null },
        }),
    ]);

    await tx.fatura.updateMany({
        where: { honorario: { is: { processoId: { in: ids } } } },
        data: { honorarioId: null },
    });

    await tx.honorario.deleteMany({
        where: { processoId: { in: ids } },
    });
}

function getProcessoDeleteErrorMessage(error: unknown, bulk = false) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        return bulk
            ? "Existem registros vinculados que ainda impedem a exclusao em lote."
            : "Existem registros vinculados que ainda impedem a exclusao do processo.";
    }

    return bulk ? "Erro ao excluir processos em lote." : "Erro ao excluir processo.";
}

function getProcessoActionErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return "Ja existe um processo com esse numero CNJ.";
        }
        if (error.code === "P2003") {
            return "Nao foi possivel salvar o processo por causa de um vinculo invalido.";
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return `${fallback}: ${error.message}`;
    }

    return fallback;
}

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: unknown };

const sugestaoAdvogadoSchema = z.object({
    objeto: z.string().optional().or(z.literal("")),
    tipoAcaoId: z.string().optional().or(z.literal("")),
    advogadoAtualId: z.string().optional().or(z.literal("")),
});

export async function sugerirAdvogadoParaNovoProcesso(
    payload: z.infer<typeof sugestaoAdvogadoSchema>
) {
    const parsed = sugestaoAdvogadoSchema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = parsed.data;

        const [tipoAcao, advogados, processosAtivosByAdvogado, prazosByAdvogado, tarefasByAdvogado] =
            await Promise.all([
                d.tipoAcaoId
                    ? db.tipoAcao.findUnique({ where: { id: d.tipoAcaoId }, select: { nome: true } })
                    : null,
                db.advogado.findMany({
                    where: { ativo: true, user: { isActive: true } },
                    select: { id: true, especialidades: true, user: { select: { name: true } } },
                }),
                db.processo.groupBy({
                    by: ["advogadoId"],
                    where: { status: { notIn: ["ENCERRADO", "ARQUIVADO"] } },
                    _count: { _all: true },
                }),
                db.prazo.groupBy({
                    by: ["advogadoId"],
                    where: { status: { in: ["PENDENTE", "VENCIDO"] }, dataFatal: { lt: today } },
                    _count: { _all: true },
                }),
                db.tarefa.groupBy({
                    by: ["advogadoId"],
                    where: { status: { in: ["A_FAZER", "EM_ANDAMENTO", "REVISAO"] } },
                    _count: { _all: true },
                }),
            ]);

        if (advogados.length === 0) {
            return { success: false, error: "Nenhum advogado ativo disponivel." };
        }

        const processosMap = new Map(processosAtivosByAdvogado.map((x) => [x.advogadoId, x._count._all]));
        const prazosMap = new Map(prazosByAdvogado.map((x) => [x.advogadoId, x._count._all]));
        const tarefasMap = new Map(tarefasByAdvogado.map((x) => [x.advogadoId, x._count._all]));

        const candidates: DistributionCandidate[] = advogados.map((advogado) => ({
            advogadoId: advogado.id,
            nome: advogado.user.name,
            especialidades: advogado.especialidades,
            processosAtivos: processosMap.get(advogado.id) || 0,
            prazosVencidos: prazosMap.get(advogado.id) || 0,
            tarefasAbertas: tarefasMap.get(advogado.id) || 0,
        }));

        const processInput: DistributionProcess = {
            processoId: "novo-processo",
            objeto: d.objeto || null,
            tipoAcaoNome: tipoAcao?.nome || null,
            advogadoAtualId: d.advogadoAtualId || "",
        };

        const suggestion = suggestAdvogadoForProcess(processInput, candidates);
        if (!suggestion) return { success: false, error: "Nao foi possivel sugerir advogado." };

        return {
            success: true,
            suggestion: {
                advogadoId: suggestion.advogadoId,
                nome: suggestion.nome,
                specialtyMatch: suggestion.specialtyMatch,
                score: suggestion.score,
            },
        };
    } catch (error) {
        console.error("Error suggesting lawyer for processo:", error);
        return { success: false, error: "Erro ao sugerir advogado." };
    }
}

// =============================================================
// PROCESSO CRUD
// =============================================================

export async function createProcesso(formData: ProcessoFormData) {
    const parsed = processoSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const actorUserId = await getAuditActorId();
        const escritorioId = await getEscritorioId();
        const processo = await db.processo.create({
            data: {
                tipo: d.tipo,
                status: d.status,
                resultado: d.resultado,
                numeroCnj: emptyToNull(d.numeroCnj) as string | null,
                tipoAcaoId: emptyToNull(d.tipoAcaoId) as string | null,
                faseProcessualId: emptyToNull(d.faseProcessualId) as string | null,
                tribunal: emptyToNull(d.tribunal) as string | null,
                vara: emptyToNull(d.vara) as string | null,
                comarca: emptyToNull(d.comarca) as string | null,
                foro: emptyToNull(d.foro) as string | null,
                objeto: emptyToNull(d.objeto) as string | null,
                valorCausa: d.valorCausa ? parseFloat(d.valorCausa) : null,
                valorContingencia: d.valorContingencia ? parseFloat(d.valorContingencia) : null,
                riscoContingencia: emptyToNull(d.riscoContingencia) as string | null,
                dataDistribuicao: d.dataDistribuicao ? new Date(d.dataDistribuicao) : null,
                dataEncerramento: d.dataEncerramento ? new Date(d.dataEncerramento) : null,
                advogadoId: d.advogadoId,
                clienteId: emptyToNull(d.clienteId || "") as string | null,
                observacoes: emptyToNull(d.observacoes) as string | null,
                escritorioId,
            },
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PROCESSO_CRIADO",
            entidade: "Processo",
            entidadeId: processo.id,
            dadosDepois: {
                numeroCnj: processo.numeroCnj,
                status: processo.status,
                tipo: processo.tipo,
                advogadoId: processo.advogadoId,
                clienteId: processo.clienteId,
            },
        });

        safeRevalidate("/processos");
        return { success: true, data: processo };
    } catch (error) {
        console.error("Error creating processo:", error);
        return {
            success: false,
            error: { _form: [getProcessoActionErrorMessage(error, "Erro ao criar processo")] },
        };
    }
}

export async function updateProcesso(id: string, formData: ProcessoFormData) {
    const parsed = processoSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const actorUserId = await getAuditActorId();
        const filter = await tenantFilter();

        // Get old status for comparison — also verifies tenant ownership
        const oldProcesso = await db.processo.findFirst({
            where: { id, ...filter },
            select: {
                status: true,
                clienteId: true,
                numeroCnj: true,
                tipo: true,
                advogadoId: true,
                tipoAcaoId: true,
                faseProcessualId: true,
                valorCausa: true,
            },
        });

        const processo = await db.processo.update({
            where: { id },
            data: {
                tipo: d.tipo,
                status: d.status,
                resultado: d.resultado,
                numeroCnj: emptyToNull(d.numeroCnj) as string | null,
                tipoAcaoId: emptyToNull(d.tipoAcaoId) as string | null,
                faseProcessualId: emptyToNull(d.faseProcessualId) as string | null,
                tribunal: emptyToNull(d.tribunal) as string | null,
                vara: emptyToNull(d.vara) as string | null,
                comarca: emptyToNull(d.comarca) as string | null,
                foro: emptyToNull(d.foro) as string | null,
                objeto: emptyToNull(d.objeto) as string | null,
                valorCausa: d.valorCausa ? parseFloat(d.valorCausa) : null,
                valorContingencia: d.valorContingencia ? parseFloat(d.valorContingencia) : null,
                riscoContingencia: emptyToNull(d.riscoContingencia) as string | null,
                dataDistribuicao: d.dataDistribuicao ? new Date(d.dataDistribuicao) : null,
                dataEncerramento: d.dataEncerramento ? new Date(d.dataEncerramento) : null,
                advogadoId: d.advogadoId,
                clienteId: emptyToNull(d.clienteId || "") as string | null,
                observacoes: emptyToNull(d.observacoes) as string | null,
            },
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PROCESSO_ATUALIZADO",
            entidade: "Processo",
            entidadeId: id,
            dadosAntes: oldProcesso,
            dadosDepois: {
                status: processo.status,
                clienteId: processo.clienteId,
                numeroCnj: processo.numeroCnj,
                tipo: processo.tipo,
                advogadoId: processo.advogadoId,
                tipoAcaoId: processo.tipoAcaoId,
                faseProcessualId: processo.faseProcessualId,
                valorCausa: processo.valorCausa,
            },
        });

        // Fire communication event on status change
        if (oldProcesso && oldProcesso.status !== d.status && emptyToNull(d.clienteId || "")) {
            fireEvent("PROCESSO_STATUS_CHANGED", {
                clienteId: emptyToNull(d.clienteId || "") as string,
                processoId: id,
                variables: { status_novo: d.status, status_anterior: oldProcesso.status },
            });
        }

        safeRevalidate("/processos");
        safeRevalidate(`/processos/${id}`);
        return { success: true, data: processo };
    } catch (error) {
        console.error("Error updating processo:", error);
        return {
            success: false,
            error: { _form: [getProcessoActionErrorMessage(error, "Erro ao atualizar processo")] },
        };
    }
}

export async function deleteProcesso(id: string) {
    try {
        const actorUserId = await getAuditActorId();
        const filter = await tenantFilter();
        const processoAntes = await db.processo.findFirst({
            where: { id, ...filter },
            select: {
                numeroCnj: true,
                status: true,
                tipo: true,
                advogadoId: true,
                clienteId: true,
            },
        });
        if (!processoAntes) return { success: false, error: "Processo não encontrado ou sem permissão." };
        await db.$transaction(async (tx) => {
            await cleanupProcessoDeletionDependencies(tx, [id]);
            await tx.processo.delete({ where: { id } });
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PROCESSO_EXCLUIDO",
            entidade: "Processo",
            entidadeId: id,
            dadosAntes: processoAntes,
            dadosDepois: { removido: true },
        });
        safeRevalidate("/processos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting processo:", error);
        return { success: false, error: getProcessoDeleteErrorMessage(error) };
    }
}

// =============================================================
// MOVIMENTAÇÕES CRUD
// =============================================================

// =============================================================
// PROCESSO - ACOES EM MASSA
// =============================================================

function buildProcessoWhereFromSearchParams(params: Record<string, string>) {
    const where: Record<string, unknown> = {};
    const search = (params.search || "").trim();
    const status = (params.status || "").trim();
    const tipo = (params.tipo || "").trim();
    const triagem = (params.triagem || "").trim();

    if (search) {
        where.OR = [
            { numeroCnj: { contains: search } },
            { objeto: { contains: search, mode: "insensitive" } },
            { cliente: { nome: { contains: search, mode: "insensitive" } } },
            { tribunal: { contains: search, mode: "insensitive" } },
        ];
    }
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (triagem === "sem_cliente") where.clienteId = null;
    if (triagem === "com_cliente") where.clienteId = { not: null };

    return where;
}

export async function listarIdsProcessosFiltrados(params: Record<string, string>) {
    try {
        const filter = await tenantFilter();
        const where = { ...buildProcessoWhereFromSearchParams(params), ...filter };
        const rows = await db.processo.findMany({
            where,
            select: { id: true },
            orderBy: { updatedAt: "desc" },
            take: 10_000,
        });
        return { success: true, ids: rows.map((r) => r.id) };
    } catch (error) {
        console.error("Error listing processo ids:", error);
        return { success: false, error: "Erro ao listar processos filtrados." };
    }
}

const bulkIdsSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
});

export async function excluirProcessosEmLote(data: z.infer<typeof bulkIdsSchema>) {
    const parsed = bulkIdsSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const actorUserId = await getAuditActorId();
        const filter = await tenantFilter();
        const ids = parsed.data.ids;
        const res = await db.$transaction(async (tx) => {
            await cleanupProcessoDeletionDependencies(tx, ids);
            return tx.processo.deleteMany({ where: { id: { in: ids }, ...filter } });
        });
        safeRevalidate("/processos");
        safeRevalidate("/prazos");
        safeRevalidate("/agenda");
        await registrarLogAuditoria({
            actorUserId,
            acao: "PROCESSO_EXCLUSAO_EM_LOTE",
            entidade: "ProcessoLote",
            entidadeId: `lote:${Date.now()}`,
            dadosAntes: { ids, quantidadeSolicitada: ids.length },
            dadosDepois: { deletados: res.count },
        });
        return { success: true, deletados: res.count };
    } catch (error) {
        console.error("Error bulk deleting processos:", error);
        return { success: false, error: getProcessoDeleteErrorMessage(error, true) };
    }
}

const bulkStatusSchema = bulkIdsSchema.extend({
    status: z.string().min(1),
});

export async function atualizarStatusProcessosEmLote(data: z.infer<typeof bulkStatusSchema>) {
    const parsed = bulkStatusSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const actorUserId = await getAuditActorId();
        const filter = await tenantFilter();
        const res = await db.processo.updateMany({
            where: { id: { in: parsed.data.ids }, ...filter },
            data: { status: parsed.data.status as never },
        });
        safeRevalidate("/processos");
        await registrarLogAuditoria({
            actorUserId,
            acao: "PROCESSO_STATUS_EM_LOTE",
            entidade: "ProcessoLote",
            entidadeId: `lote:${Date.now()}`,
            dadosAntes: { ids: parsed.data.ids },
            dadosDepois: { status: parsed.data.status, atualizados: res.count },
        });
        return { success: true, atualizados: res.count };
    } catch (error) {
        console.error("Error bulk updating status:", error);
        return { success: false, error: "Erro ao atualizar status em lote." };
    }
}

const bulkClienteSchema = bulkIdsSchema.extend({
    clienteId: z.string().optional().or(z.literal("")),
});

export async function atribuirClienteProcessosEmLote(data: z.infer<typeof bulkClienteSchema>) {
    const parsed = bulkClienteSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const actorUserId = await getAuditActorId();
        const filter = await tenantFilter();
        const clienteId = emptyToNull(parsed.data.clienteId || "") as string | null;
        const res = await db.processo.updateMany({
            where: { id: { in: parsed.data.ids }, ...filter },
            data: { clienteId },
        });
        safeRevalidate("/processos");
        await registrarLogAuditoria({
            actorUserId,
            acao: "PROCESSO_CLIENTE_EM_LOTE",
            entidade: "ProcessoLote",
            entidadeId: `lote:${Date.now()}`,
            dadosAntes: { ids: parsed.data.ids },
            dadosDepois: { clienteId, atualizados: res.count },
        });
        return { success: true, atualizados: res.count };
    } catch (error) {
        console.error("Error bulk assigning cliente:", error);
        return { success: false, error: "Erro ao atribuir cliente em lote." };
    }
}

const bulkAdvogadoSchema = bulkIdsSchema.extend({
    advogadoId: z.string().min(1),
});

export async function atribuirAdvogadoProcessosEmLote(data: z.infer<typeof bulkAdvogadoSchema>) {
    const parsed = bulkAdvogadoSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const actorUserId = await getAuditActorId();
        const filter = await tenantFilter();
        const res = await db.processo.updateMany({
            where: { id: { in: parsed.data.ids }, ...filter },
            data: { advogadoId: parsed.data.advogadoId },
        });
        safeRevalidate("/processos");
        await registrarLogAuditoria({
            actorUserId,
            acao: "PROCESSO_ADVOGADO_EM_LOTE",
            entidade: "ProcessoLote",
            entidadeId: `lote:${Date.now()}`,
            dadosAntes: { ids: parsed.data.ids },
            dadosDepois: { advogadoId: parsed.data.advogadoId, atualizados: res.count },
        });
        return { success: true, atualizados: res.count };
    } catch (error) {
        console.error("Error bulk assigning advogado:", error);
        return { success: false, error: "Erro ao atribuir advogado em lote." };
    }
}

// =============================================================
// TAXONOMIAS (TIPO DE ACAO / FASE PROCESSUAL)
// =============================================================

const tipoAcaoCreateSchema = z.object({
    nome: z.string().min(2, "Nome e obrigatorio"),
    grupo: z.string().optional().or(z.literal("")),
    descricao: z.string().optional().or(z.literal("")),
});

export async function createTipoAcao(
    formData: z.infer<typeof tipoAcaoCreateSchema>
): Promise<ActionResult<{ id: string; nome: string }>> {
    const parsed = tipoAcaoCreateSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const escritorioId = await getEscritorioId();
        const d = parsed.data;
        const nome = normalizeMojibake(d.nome).trim();
        const grupo = normalizeNullableMojibake(emptyToNull(d.grupo) as string | null);
        const descricao = normalizeNullableMojibake(emptyToNull(d.descricao) as string | null);
        const item = await db.tipoAcao.upsert({
            where: { nome_escritorioId: { nome, escritorioId } },
            update: {
                ativo: true,
                grupo,
                descricao,
            },
            create: {
                nome,
                grupo,
                descricao,
                ativo: true,
                escritorioId,
            },
            select: { id: true, nome: true },
        });

        safeRevalidate("/processos");
        return { success: true, data: item };
    } catch (error) {
        console.error("Error creating tipo acao:", error);
        return { success: false, error: { _form: ["Erro ao criar tipo de acao."] } };
    }
}

const faseProcessualCreateSchema = z.object({
    nome: z.string().min(2, "Nome e obrigatorio"),
    ordem: z.coerce.number().optional(),
    cor: z.string().optional().or(z.literal("")),
});

export async function createFaseProcessual(
    formData: z.infer<typeof faseProcessualCreateSchema>
): Promise<ActionResult<{ id: string; nome: string; cor: string | null }>> {
    const parsed = faseProcessualCreateSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const escritorioId = await getEscritorioId();
        const d = parsed.data;
        const nome = normalizeMojibake(d.nome).trim();

        const max = await db.faseProcessual.aggregate({
            where: { escritorioId },
            _max: { ordem: true },
        });
        const ordem =
            Number.isFinite(d.ordem) && typeof d.ordem === "number"
                ? d.ordem
                : (max._max.ordem ?? 0) + 10;

        const item = await db.faseProcessual.upsert({
            where: { nome_escritorioId: { nome, escritorioId } },
            update: {
                ativo: true,
                ordem,
                cor: emptyToNull(d.cor) as string | null,
            },
            create: {
                nome,
                ordem,
                cor: emptyToNull(d.cor) as string | null,
                ativo: true,
                escritorioId,
            },
            select: { id: true, nome: true, cor: true },
        });

        safeRevalidate("/processos");
        return { success: true, data: item };
    } catch (error) {
        console.error("Error creating fase processual:", error);
        return { success: false, error: { _form: ["Erro ao criar fase processual."] } };
    }
}

// =============================================================
// SUPPORT ACTIONS (CLIENT)
// =============================================================

export async function getProcessoEditData(id: string): Promise<ActionResult<Record<string, unknown>>> {
    try {
        const filter = await tenantFilter();
        const p = await db.processo.findFirst({
            where: { id, ...filter },
            select: {
                id: true,
                tipo: true,
                status: true,
                resultado: true,
                numeroCnj: true,
                tipoAcaoId: true,
                faseProcessualId: true,
                tribunal: true,
                vara: true,
                comarca: true,
                foro: true,
                objeto: true,
                valorCausa: true,
                valorContingencia: true,
                riscoContingencia: true,
                dataDistribuicao: true,
                dataEncerramento: true,
                advogadoId: true,
                clienteId: true,
                observacoes: true,
            },
        });
        if (!p) return { success: false, error: "Processo nao encontrado." };

        return {
            success: true,
            data: {
                id: p.id,
                tipo: p.tipo,
                status: p.status,
                resultado: p.resultado,
                numeroCnj: p.numeroCnj || "",
                tipoAcaoId: p.tipoAcaoId || "",
                faseProcessualId: p.faseProcessualId || "",
                tribunal: p.tribunal || "",
                vara: p.vara || "",
                comarca: p.comarca || "",
                foro: p.foro || "",
                objeto: p.objeto || "",
                valorCausa: p.valorCausa ? String(p.valorCausa) : "",
                valorContingencia: p.valorContingencia ? String(p.valorContingencia) : "",
                riscoContingencia: p.riscoContingencia || "",
                dataDistribuicao: p.dataDistribuicao ? p.dataDistribuicao.toISOString().slice(0, 10) : "",
                dataEncerramento: p.dataEncerramento ? p.dataEncerramento.toISOString().slice(0, 10) : "",
                advogadoId: p.advogadoId,
                clienteId: p.clienteId || "",
                observacoes: p.observacoes || "",
            },
        };
    } catch (error) {
        console.error("Error fetching processo edit data:", error);
        return { success: false, error: "Erro ao carregar dados do processo." };
    }
}

export async function addMovimentacao(processoId: string, formData: MovimentacaoFormData) {
    const parsed = movimentacaoSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        await db.movimentacao.create({
            data: {
                processoId,
                data: new Date(d.data),
                descricao: d.descricao,
                tipo: emptyToNull(d.tipo) as string | null,
                fonte: emptyToNull(d.fonte) as string | null,
            },
        });

        const processo = await db.processo.update({
            where: { id: processoId },
            data: { dataUltimaMovimentacao: new Date() },
            select: { clienteId: true, numeroCnj: true },
        });

        // Fire communication event
        if (processo.clienteId) {
            fireEvent("PROCESSO_MOVIMENTACAO", {
                clienteId: processo.clienteId,
                processoId,
                variables: { descricao_movimentacao: d.descricao },
            });
        }

        safeRevalidate(`/processos/${processoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error adding movimentacao:", error);
        return { success: false, error: { _form: ["Erro ao adicionar movimentação."] } };
    }
}

const movimentacaoDocumentoSchema = movimentacaoSchema.extend({
    documentoExistenteId: z.string().optional().or(z.literal("")),
});

function buildMovimentacaoFonte(baseFonte: string | null, documentoTitulo?: string | null) {
    if (!documentoTitulo) return baseFonte;
    if (!baseFonte) return `Documento vinculado: ${documentoTitulo}`;
    return `${baseFonte} • Documento vinculado: ${documentoTitulo}`;
}

export async function addMovimentacaoComDocumento(processoId: string, formData: FormData) {
    const parsed = movimentacaoDocumentoSchema.safeParse({
        data: formData.get("data"),
        descricao: formData.get("descricao"),
        tipo: formData.get("tipo"),
        fonte: formData.get("fonte"),
        documentoExistenteId: formData.get("documentoExistenteId"),
    });

    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    const arquivo = formData.get("arquivo");
    const arquivoValido = arquivo instanceof File && arquivo.size > 0 ? arquivo : null;
    const documentoExistenteId = emptyToNull(parsed.data.documentoExistenteId) as string | null;

    if (arquivoValido && documentoExistenteId) {
        return { success: false, error: { _form: ["Escolha um documento existente ou envie um novo arquivo, nao ambos."] } };
    }

    try {
        const d = parsed.data;
        let documentoTitulo: string | null = null;

        if (documentoExistenteId) {
            const documentoExistente = await db.documento.findUnique({
                where: { id: documentoExistenteId },
                select: { id: true, titulo: true, processoId: true },
            });

            if (!documentoExistente) {
                return { success: false, error: { _form: ["Documento selecionado nao foi encontrado."] } };
            }

            if (documentoExistente.processoId && documentoExistente.processoId !== processoId) {
                return { success: false, error: { _form: ["Esse documento ja esta vinculado a outro processo."] } };
            }

            if (!documentoExistente.processoId) {
                await db.documento.update({
                    where: { id: documentoExistente.id },
                    data: { processoId },
                });
            }

            documentoTitulo = documentoExistente.titulo;
        }

        if (arquivoValido) {
            const importResult = await importDocumentoToLibrary({
                file: arquivoValido,
                processoId,
                skipMovimentacao: true,
            });

            if (!importResult.success) {
                return {
                    success: false,
                    error: {
                        _form: [
                            typeof importResult.error === "string"
                                ? importResult.error
                                : "Nao foi possivel anexar o novo arquivo ao andamento.",
                        ],
                    },
                };
            }

            documentoTitulo = importResult.titulo || arquivoValido.name;
        }

        await db.movimentacao.create({
            data: {
                processoId,
                data: new Date(d.data),
                descricao: d.descricao,
                tipo: (emptyToNull(d.tipo) as string | null) || (documentoTitulo ? "DOCUMENTO" : null),
                fonte: buildMovimentacaoFonte(emptyToNull(d.fonte) as string | null, documentoTitulo),
            },
        });

        const processo = await db.processo.update({
            where: { id: processoId },
            data: { dataUltimaMovimentacao: new Date() },
            select: { clienteId: true },
        });

        if (processo.clienteId) {
            fireEvent("PROCESSO_MOVIMENTACAO", {
                clienteId: processo.clienteId,
                processoId,
                variables: { descricao_movimentacao: d.descricao },
            });
        }

        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/documentos");
        return { success: true };
    } catch (error) {
        console.error("Error adding movimentacao with documento:", error);
        return { success: false, error: { _form: ["Erro ao adicionar andamento com anexo."] } };
    }
}

export async function deleteMovimentacao(processoId: string, movimentacaoId: string) {
    try {
        await db.movimentacao.delete({ where: { id: movimentacaoId } });
        safeRevalidate(`/processos/${processoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting movimentacao:", error);
        return { success: false, error: "Erro ao excluir movimentação." };
    }
}

// =============================================================
// EVENTO MANUAL NA TIMELINE
// =============================================================

export async function addEventoManual(
    processoId: string,
    dados: {
        subTipo: "REUNIAO" | "CONTATO_TELEFONICO" | "EMAIL" | "ANOTACAO" | "JUDICIAL" | "MANUAL";
        data: string;
        hora?: string;
        descricao: string;
        responsavelId?: string;
        privado?: boolean;
    }
) {
    if (!dados.descricao || dados.descricao.trim().length < 3) {
        return { success: false, error: "Descrição deve ter ao menos 3 caracteres." };
    }
    if (!dados.data) {
        return { success: false, error: "Data é obrigatória." };
    }

    const TIPO_MAP: Record<string, string> = {
        REUNIAO: "REUNIÃO",
        CONTATO_TELEFONICO: "CONTATO",
        EMAIL: "EMAIL",
        ANOTACAO: "ANOTAÇÃO",
        JUDICIAL: "OUTROS",
        MANUAL: "OUTROS",
    };

    try {
        await db.movimentacao.create({
            data: {
                processoId,
                data: new Date(dados.data),
                hora: dados.hora || null,
                descricao: dados.descricao.trim(),
                tipo: TIPO_MAP[dados.subTipo] ?? "OUTROS",
                subTipo: dados.subTipo,
                fonte: "MANUAL",
                responsavelId: dados.responsavelId || null,
                privado: dados.privado ?? false,
            },
        });

        await db.processo.update({
            where: { id: processoId },
            data: { dataUltimaMovimentacao: new Date() },
        });

        safeRevalidate(`/processos/${processoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error adding evento manual:", error);
        return { success: false, error: "Erro ao salvar evento." };
    }
}

// =============================================================
// PARTES DO PROCESSO CRUD
// =============================================================

export async function addParte(processoId: string, formData: ParteProcessoFormData) {
    const parsed = parteProcessoSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        await db.parteProcesso.create({
            data: {
                processoId,
                tipoParte: d.tipoParte,
                clienteId: emptyToNull(d.clienteId) as string | null,
                nome: emptyToNull(d.nome) as string | null,
                cpfCnpj: emptyToNull(d.cpfCnpj) as string | null,
                advogado: emptyToNull(d.advogado) as string | null,
            },
        });

        safeRevalidate(`/processos/${processoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error adding parte:", error);
        return { success: false, error: { _form: ["Erro ao adicionar parte."] } };
    }
}

export async function deleteParte(processoId: string, parteId: string) {
    try {
        await db.parteProcesso.delete({ where: { id: parteId } });
        safeRevalidate(`/processos/${processoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error deleting parte:", error);
        return { success: false, error: "Erro ao excluir parte." };
    }
}

// =============================================================
// AUDIÊNCIAS CRUD
// =============================================================

export async function addAudiencia(processoId: string, formData: AudienciaFormData) {
    const parsed = audienciaSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const audiencia = await db.audiencia.create({
            data: {
                processoId,
                advogadoId: d.advogadoId,
                tipo: d.tipo,
                data: new Date(d.data),
                local: emptyToNull(d.local) as string | null,
                sala: emptyToNull(d.sala) as string | null,
                observacoes: emptyToNull(d.observacoes) as string | null,
            },
        });
        await syncAudienciaLegadaToAgendamento(audiencia.id).catch((error) => {
            console.warn("[processos] Falha ao sincronizar audiencia legada na agenda central:", error);
        });

        // Auto-registro na timeline
        await db.movimentacao.create({
            data: {
                processoId,
                data: audiencia.data,
                descricao: [
                    `Audiência de ${d.tipo} agendada`,
                    d.local ? `Local: ${d.local}` : null,
                    d.sala ? `Sala ${d.sala}` : null,
                    d.observacoes ?? null,
                ].filter(Boolean).join(" — "),
                tipo: "AUDIÊNCIA",
                subTipo: "JUDICIAL",
                fonte: "SISTEMA",
                responsavelId: emptyToNull(d.advogadoId) as string | null,
            },
        }).catch(() => {});

        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error adding audiencia:", error);
        return { success: false, error: { _form: ["Erro ao adicionar audiência."] } };
    }
}

export async function toggleAudienciaRealizada(processoId: string, audienciaId: string, realizada: boolean) {
    try {
        await db.audiencia.update({
            where: { id: audienciaId },
            data: { realizada },
        });
        await syncAudienciaLegadaToAgendamento(audienciaId).catch((error) => {
            console.warn("[processos] Falha ao atualizar audiencia legada na agenda central:", error);
        });
        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error updating audiencia:", error);
        return { success: false, error: "Erro ao atualizar audiência." };
    }
}

export async function deleteAudiencia(processoId: string, audienciaId: string) {
    try {
        await db.audiencia.delete({ where: { id: audienciaId } });
        await removeLegacyAgendamentoRef("audiencia", audienciaId).catch((error) => {
            console.warn("[processos] Falha ao remover audiencia legada da agenda central:", error);
        });
        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error deleting audiencia:", error);
        return { success: false, error: "Erro ao excluir audiência." };
    }
}

// =============================================================
// PRAZOS CRUD
// =============================================================

export async function addPrazo(processoId: string, formData: PrazoFormData) {
    const parsed = prazoSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const dataFatal = new Date(d.dataFatal);
        const feriados = await db.feriado.findMany({ select: { data: true } });
        const feriadosIso = feriados.map((item) => formatDateOnly(item.data));
        const dataCortesia = calcularDataCortesia({
            dataFatal,
            tipoContagem: d.tipoContagem,
            feriadosIso,
        });

        const prazo = await db.prazo.create({
            data: {
                processoId,
                advogadoId: d.advogadoId,
                descricao: d.descricao,
                dataFatal,
                dataCortesia,
                tipoContagem: d.tipoContagem,
                fatal: d.fatal,
                origem: "MANUAL",
                observacoes: emptyToNull(d.observacoes) as string | null,
            },
        });
        await syncPrazoToCalendars(prazo.id).catch((error) => {
            console.warn("[processos] Falha ao sincronizar prazo no calendario:", error);
        });
        await syncPrazoLegadoToAgendamento(prazo.id).catch((error) => {
            console.warn("[processos] Falha ao sincronizar prazo legado na agenda central:", error);
        });

        // Auto-registro na timeline
        await db.movimentacao.create({
            data: {
                processoId,
                data: prazo.dataFatal,
                descricao: `Prazo cadastrado: ${d.descricao}${d.fatal ? " (fatal)" : ""}`,
                tipo: "PRAZO",
                subTipo: "JUDICIAL",
                fonte: "SISTEMA",
                responsavelId: emptyToNull(d.advogadoId) as string | null,
            },
        }).catch(() => {});


        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/prazos");
        safeRevalidate("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error adding prazo:", error);
        return { success: false, error: { _form: ["Erro ao adicionar prazo."] } };
    }
}

export async function concluirPrazo(processoId: string, prazoId: string) {
    try {
        await db.prazo.update({
            where: { id: prazoId },
            data: { status: "CONCLUIDO", concluidoEm: new Date() },
        });
        await removePrazoFromCalendars(prazoId).catch((error) => {
            console.warn("[processos] Falha ao remover prazo do calendario:", error);
        });
        await syncPrazoLegadoToAgendamento(prazoId).catch((error) => {
            console.warn("[processos] Falha ao atualizar prazo legado na agenda central:", error);
        });
        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/prazos");
        safeRevalidate("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error concluding prazo:", error);
        return { success: false, error: "Erro ao concluir prazo." };
    }
}

export async function deletePrazo(processoId: string, prazoId: string) {
    try {
        // Check if prazo is fatal — fatal prazos cannot be deleted
        const prazo = await db.prazo.findUnique({ where: { id: prazoId } });
        if (prazo?.fatal) {
            return { success: false, error: "Prazos fatais não podem ser excluídos, apenas concluídos." };
        }
        await removePrazoFromCalendars(prazoId).catch((error) => {
            console.warn("[processos] Falha ao remover prazo do calendario:", error);
        });
        await db.prazo.delete({ where: { id: prazoId } });
        await removeLegacyAgendamentoRef("prazo", prazoId).catch((error) => {
            console.warn("[processos] Falha ao remover prazo legado da agenda central:", error);
        });
        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/prazos");
        safeRevalidate("/agenda");
        return { success: true };
    } catch (error) {
        console.error("Error deleting prazo:", error);
        return { success: false, error: "Erro ao excluir prazo." };
    }
}

// =============================================================
// DOCUMENTOS CRUD
// =============================================================

export async function addDocumento(processoId: string, formData: DocumentoFormData) {
    const parsed = documentoSchema.safeParse(formData);
    if (!parsed.success) {
        return { success: false, error: parsed.error.flatten().fieldErrors };
    }

    try {
        const d = parsed.data;
        const actorUserId = await getAuditActorId();
        await db.$transaction(async (tx) => {
            const escritorio = await tx.escritorio.findFirst({
                orderBy: { createdAt: "asc" },
                select: { id: true },
            });

            const documento = await createDocumentoWithInitialVersion(tx, {
                processoId,
                escritorioId: escritorio?.id || null,
                titulo: d.titulo,
                categoriaId: emptyToNull(d.categoria) as string | null,
                arquivoNome: emptyToNull(d.arquivoNome) as string | null,
                arquivoUrl: emptyToNull(d.arquivoUrl) as string | null,
                origem: "ANEXO_PROCESSO",
                actor: { userId: actorUserId },
            });

            await registrarLogAuditoria({
                client: tx,
                actorUserId,
                acao: "PROCESSO_DOCUMENTO_ADICIONADO",
                entidade: "Documento",
                entidadeId: documento.id,
                dadosDepois: {
                    processoId,
                    titulo: documento.titulo,
                    versao: documento.versao,
                    categoriaId: documento.categoriaId,
                },
            });
        });

        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/documentos");
        return { success: true };
    } catch (error) {
        console.error("Error adding documento:", error);
        return { success: false, error: { _form: ["Erro ao adicionar documento."] } };
    }
}

export async function deleteDocumento(processoId: string, documentoId: string) {
    try {
        const actorUserId = await getAuditActorId();
        await db.$transaction(async (tx) => {
            const previous = await tx.documento.findUnique({
                where: { id: documentoId },
                select: {
                    id: true,
                    titulo: true,
                    statusFluxo: true,
                    versao: true,
                    categoriaId: true,
                    pastaId: true,
                    processoId: true,
                    versaoAtualId: true,
                    versaoPublicadaId: true,
                },
            });

            if (!previous) {
                throw new DocumentoVersioningError("Documento nao encontrado.");
            }

            await deleteDocumentoWithPolicy(tx, documentoId);
            await registrarLogAuditoria({
                client: tx,
                actorUserId,
                acao: "PROCESSO_DOCUMENTO_EXCLUIDO",
                entidade: "Documento",
                entidadeId: documentoId,
                dadosAntes: previous,
                dadosDepois: {
                    deletedAt: new Date().toISOString(),
                    processoId,
                },
            });
        });

        safeRevalidate(`/processos/${processoId}`);
        safeRevalidate("/documentos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting documento:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao excluir documento.",
        };
    }
}
