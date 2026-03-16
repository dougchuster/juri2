"use server";

import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { prazoSchema, updatePrazoSchema, audienciaSchema, compromissoSchema } from "@/lib/validators/agenda";
import type {
    PrazoFormData,
    UpdatePrazoFormData,
    AudienciaFormData,
    CompromissoFormData,
} from "@/lib/validators/agenda";
import { revalidatePath } from "next/cache";
import {
    removeAudienciaFromCalendars,
    removeCompromissoFromCalendars,
    removePrazoFromCalendars,
    syncAudienciaToCalendars,
    syncCompromissoToCalendars,
    syncPrazoToCalendars,
} from "@/lib/integrations/calendar-sync";
import {
    calcularDataCortesia,
    calcularDataFatalPublicacao,
    extrairPrazoPublicacao,
} from "@/lib/services/publicacoes-deadline-ai";
import {
    removeLegacyAgendamentoRef,
    syncAudienciaLegadaToAgendamento,
    syncCompromissoLegadoToAgendamento,
    syncPrazoLegadoToAgendamento,
} from "@/lib/services/agendamento-legacy-sync";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import { cancelMeetingAutomation, scheduleMeetingAutomation } from "@/lib/services/meeting-automation-service";
import { getSession } from "@/actions/auth";

function emptyToNull(val: unknown) {
    return val === "" ? null : val;
}

function normalizeDateOnly(dateLike: string | Date) {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
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

// Prazo
export async function createPrazo(formData: PrazoFormData) {
    const parsed = prazoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const actorUserId = await getAuditActorId();
        const prazo = await db.prazo.create({
            data: {
                processoId: d.processoId,
                advogadoId: d.advogadoId,
                descricao: d.descricao,
                dataFatal: new Date(d.dataFatal),
                dataCortesia: d.dataCortesia ? new Date(d.dataCortesia) : null,
                tipoContagem: d.tipoContagem,
                fatal: d.fatal,
                origem: "MANUAL",
                observacoes: emptyToNull(d.observacoes) as string | null,
            },
        });

        await syncPrazoToCalendars(prazo.id).catch((error) => {
            console.warn("[agenda] Falha ao sincronizar prazo no calendario:", error);
        });
        await syncPrazoLegadoToAgendamento(prazo.id).catch((error) => {
            console.warn("[agenda] Falha ao sincronizar prazo legado na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PRAZO_CRIADO",
            entidade: "Prazo",
            entidadeId: prazo.id,
            dadosDepois: {
                processoId: prazo.processoId,
                advogadoId: prazo.advogadoId,
                dataFatal: prazo.dataFatal,
                status: prazo.status,
                fatal: prazo.fatal,
            },
        });

        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error creating prazo:", error);
        return { success: false, error: { _form: ["Erro ao criar prazo."] } };
    }
}

export async function updatePrazo(formData: UpdatePrazoFormData) {
    const parsed = updatePrazoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const actorUserId = await getAuditActorId();
        const prazoAntes = await db.prazo.findUnique({
            where: { id: d.id },
            select: {
                id: true,
                processoId: true,
                advogadoId: true,
                descricao: true,
                dataFatal: true,
                dataCortesia: true,
                tipoContagem: true,
                fatal: true,
                status: true,
                origem: true,
                observacoes: true,
                origemDados: true,
            },
        });

        if (!prazoAntes) {
            return { success: false, error: "Prazo nao encontrado." };
        }

        const origemDadosAtualizados =
            prazoAntes.origem === "PUBLICACAO_IA"
                ? {
                      ...(typeof prazoAntes.origemDados === "object" && prazoAntes.origemDados
                          ? (prazoAntes.origemDados as Record<string, unknown>)
                          : {}),
                      ajustadoManualmenteEm: new Date().toISOString(),
                  }
                : prazoAntes.origemDados;

        const updateData: Prisma.PrazoUncheckedUpdateInput = {
            processoId: d.processoId,
            advogadoId: d.advogadoId,
            descricao: d.descricao,
            dataFatal: new Date(d.dataFatal),
            dataCortesia: d.dataCortesia ? new Date(d.dataCortesia) : null,
            tipoContagem: d.tipoContagem,
            fatal: d.fatal,
            observacoes: emptyToNull(d.observacoes) as string | null,
        };

        if (prazoAntes.origem === "PUBLICACAO_IA") {
            updateData.origemDados = origemDadosAtualizados as Prisma.InputJsonValue;
        }

        const prazoAtualizado = await db.prazo.update({
            where: { id: d.id },
            data: updateData,
            select: {
                id: true,
                processoId: true,
                advogadoId: true,
                descricao: true,
                dataFatal: true,
                dataCortesia: true,
                tipoContagem: true,
                fatal: true,
                status: true,
                origem: true,
                observacoes: true,
            },
        });

        if (prazoAtualizado.status === "CONCLUIDO") {
            await removePrazoFromCalendars(d.id).catch((error) => {
                console.warn("[agenda] Falha ao atualizar prazo concluido no calendario:", error);
            });
        } else {
            await syncPrazoToCalendars(d.id).catch((error) => {
                console.warn("[agenda] Falha ao sincronizar prazo atualizado no calendario:", error);
            });
        }
        await syncPrazoLegadoToAgendamento(d.id).catch((error) => {
            console.warn("[agenda] Falha ao atualizar prazo legado na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PRAZO_ATUALIZADO",
            entidade: "Prazo",
            entidadeId: d.id,
            dadosAntes: prazoAntes,
            dadosDepois: prazoAtualizado,
        });

        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error updating prazo:", error);
        return { success: false, error: { _form: ["Erro ao atualizar prazo."] } };
    }
}

export async function concluirPrazo(id: string) {
    try {
        const actorUserId = await getAuditActorId();
        const prazoAntes = await db.prazo.findUnique({
            where: { id },
            select: { status: true, concluidoEm: true },
        });
        const prazoAtualizado = await db.prazo.update({
            where: { id },
            data: { status: "CONCLUIDO", concluidoEm: new Date() },
            select: { id: true, status: true, concluidoEm: true },
        });

        await removePrazoFromCalendars(id).catch((error) => {
            console.warn("[agenda] Falha ao remover prazo do calendario:", error);
        });
        await syncPrazoLegadoToAgendamento(id).catch((error) => {
            console.warn("[agenda] Falha ao atualizar prazo legado na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PRAZO_CONCLUIDO",
            entidade: "Prazo",
            entidadeId: id,
            dadosAntes: prazoAntes,
            dadosDepois: prazoAtualizado,
        });

        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error concluding prazo:", error);
        return { success: false, error: "Erro ao concluir prazo." };
    }
}

export async function deletePrazo(id: string) {
    try {
        const actorUserId = await getAuditActorId();
        const prazoAntes = await db.prazo.findUnique({
            where: { id },
            select: {
                processoId: true,
                advogadoId: true,
                status: true,
                fatal: true,
            },
        });
        await removePrazoFromCalendars(id).catch((error) => {
            console.warn("[agenda] Falha ao remover prazo do calendario:", error);
        });

        await db.prazo.delete({ where: { id } });
        await removeLegacyAgendamentoRef("prazo", id).catch((error) => {
            console.warn("[agenda] Falha ao remover prazo legado da agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PRAZO_EXCLUIDO",
            entidade: "Prazo",
            entidadeId: id,
            dadosAntes: prazoAntes,
            dadosDepois: { removido: true },
        });

        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error deleting prazo:", error);
        return { success: false, error: "Erro ao excluir prazo." };
    }
}

export async function reprocessarPrazoIa(id: string) {
    if (!id) return { success: false, error: "Prazo invalido." };

    try {
        const actorUserId = await getAuditActorId();
        const prazo = await db.prazo.findUnique({
            where: { id },
            include: {
                publicacaoOrigem: {
                    select: {
                        id: true,
                        tribunal: true,
                        diario: true,
                        dataPublicacao: true,
                        conteudo: true,
                        processoNumero: true,
                    },
                },
            },
        });

        if (!prazo) return { success: false, error: "Prazo nao encontrado." };
        if (prazo.origem !== "PUBLICACAO_IA" || !prazo.publicacaoOrigem) {
            return { success: false, error: "Este prazo nao possui origem de publicacao IA." };
        }

        const analise = await extrairPrazoPublicacao({
            id: prazo.publicacaoOrigem.id,
            tribunal: prazo.publicacaoOrigem.tribunal,
            diario: prazo.publicacaoOrigem.diario,
            dataPublicacao: prazo.publicacaoOrigem.dataPublicacao,
            conteudo: prazo.publicacaoOrigem.conteudo,
            processoNumero: prazo.publicacaoOrigem.processoNumero,
        });
        const feriados = await db.feriado.findMany({ select: { data: true } });
        const feriadosIso = feriados.map((item) => formatDateOnly(item.data));

        if (!analise.temPrazo) {
            return {
                success: false,
                error: "IA nao identificou prazo objetivo nesta publicacao no reprocessamento.",
            };
        }

        let dataFatal = analise.dataFatal ? normalizeDateOnly(analise.dataFatal) : null;
        if (!dataFatal && analise.prazoDias && analise.prazoDias > 0) {
            dataFatal = calcularDataFatalPublicacao({
                dataPublicacao: prazo.publicacaoOrigem.dataPublicacao,
                prazoDias: analise.prazoDias,
                tipoContagem: analise.tipoContagem,
                feriadosIso,
            });
        }
        if (!dataFatal) {
            return { success: false, error: "Nao foi possivel recalcular data fatal." };
        }

        const dataCortesia = calcularDataCortesia({
            dataFatal,
            tipoContagem: analise.tipoContagem,
            feriadosIso,
        });

        await db.prazo.update({
            where: { id },
            data: {
                descricao: analise.descricao,
                dataFatal,
                dataCortesia,
                tipoContagem: analise.tipoContagem,
                origemConfianca: Math.round(analise.confianca * 100) / 100,
                origemDados: {
                    origemAnalise: analise.origemAnalise,
                    justificativa: analise.justificativa,
                    prazoDias: analise.prazoDias,
                    reprocessadoEm: new Date().toISOString(),
                    respostaBruta: analise.respostaBruta?.slice(0, 4000),
                },
                observacoes: `[Reprocessado por IA em ${new Date().toISOString()}] ${analise.justificativa}`,
            },
        });

        await syncPrazoToCalendars(id).catch((error) => {
            console.warn("[agenda] Falha ao sincronizar prazo apos reprocessamento IA:", error);
        });
        await syncPrazoLegadoToAgendamento(id).catch((error) => {
            console.warn("[agenda] Falha ao atualizar prazo reprocessado na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "PRAZO_REPROCESSADO_IA",
            entidade: "Prazo",
            entidadeId: id,
            dadosAntes: {
                dataFatal: prazo.dataFatal,
                tipoContagem: prazo.tipoContagem,
                origemConfianca: prazo.origemConfianca,
            },
            dadosDepois: {
                dataFatal,
                tipoContagem: analise.tipoContagem,
                confianca: analise.confianca,
                prazoDias: analise.prazoDias,
            },
        });

        revalidatePath("/prazos");
        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error reprocessing IA prazo:", error);
        return { success: false, error: "Erro ao reprocessar prazo via IA." };
    }
}

// Audiencia
export async function createAudiencia(formData: AudienciaFormData) {
    const parsed = audienciaSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const actorUserId = await getAuditActorId();
        const audiencia = await db.audiencia.create({
            data: {
                processoId: d.processoId,
                advogadoId: d.advogadoId,
                tipo: d.tipo,
                data: new Date(d.data),
                local: emptyToNull(d.local) as string | null,
                sala: emptyToNull(d.sala) as string | null,
                observacoes: emptyToNull(d.observacoes) as string | null,
            },
        });

        await syncAudienciaToCalendars(audiencia.id).catch((error) => {
            console.warn("[agenda] Falha ao sincronizar audiencia no calendario:", error);
        });
        await syncAudienciaLegadaToAgendamento(audiencia.id).catch((error) => {
            console.warn("[agenda] Falha ao sincronizar audiencia legada na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "AUDIENCIA_CRIADA",
            entidade: "Audiencia",
            entidadeId: audiencia.id,
            dadosDepois: {
                processoId: audiencia.processoId,
                advogadoId: audiencia.advogadoId,
                data: audiencia.data,
                tipo: audiencia.tipo,
            },
        });

        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error creating audiencia:", error);
        return { success: false, error: { _form: ["Erro ao criar audiencia."] } };
    }
}

export async function marcarRealizada(id: string, resultadoResumo?: string) {
    try {
        const actorUserId = await getAuditActorId();
        const audienciaAntes = await db.audiencia.findUnique({
            where: { id },
            select: { realizada: true, resultadoResumo: true },
        });
        const audienciaAtualizada = await db.audiencia.update({
            where: { id },
            data: { realizada: true, resultadoResumo: resultadoResumo || null },
            select: { id: true, realizada: true, resultadoResumo: true },
        });

        await removeAudienciaFromCalendars(id).catch((error) => {
            console.warn("[agenda] Falha ao remover audiencia concluida do calendario:", error);
        });
        await syncAudienciaLegadaToAgendamento(id).catch((error) => {
            console.warn("[agenda] Falha ao atualizar audiencia legada na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "AUDIENCIA_MARCADA_REALIZADA",
            entidade: "Audiencia",
            entidadeId: id,
            dadosAntes: audienciaAntes,
            dadosDepois: audienciaAtualizada,
        });

        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error marking audiencia:", error);
        return { success: false, error: "Erro ao marcar audiencia." };
    }
}

// Compromisso
export async function createCompromisso(formData: CompromissoFormData) {
    const parsed = compromissoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const d = parsed.data;
        const actorUserId = await getAuditActorId();
        const compromisso = await db.compromisso.create({
            data: {
                advogadoId: d.advogadoId,
                clienteId: emptyToNull(d.clienteId) as string | null,
                atendimentoId: emptyToNull(d.atendimentoId) as string | null,
                tipo: d.tipo,
                titulo: d.titulo,
                descricao: emptyToNull(d.descricao) as string | null,
                dataInicio: new Date(d.dataInicio),
                dataFim: d.dataFim ? new Date(d.dataFim) : null,
                local: emptyToNull(d.local) as string | null,
            },
        });

        await syncCompromissoToCalendars(compromisso.id).catch((error) => {
            console.warn("[agenda] Falha ao sincronizar compromisso no calendario:", error);
        });
        await syncCompromissoLegadoToAgendamento(compromisso.id).catch((error) => {
            console.warn("[agenda] Falha ao sincronizar compromisso legado na agenda central:", error);
        });
        if (compromisso.tipo === "REUNIAO") {
            await scheduleMeetingAutomation(compromisso.id).catch((error) => {
                console.warn("[agenda] Falha ao agendar automacoes da reuniao:", error);
            });
        }
        await registrarLogAuditoria({
            actorUserId,
            acao: "COMPROMISSO_CRIADO",
            entidade: "Compromisso",
            entidadeId: compromisso.id,
            dadosDepois: {
                advogadoId: compromisso.advogadoId,
                tipo: compromisso.tipo,
                dataInicio: compromisso.dataInicio,
                dataFim: compromisso.dataFim,
            },
        });

        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true, compromissoId: compromisso.id };
    } catch (error) {
        console.error("Error creating compromisso:", error);
        return { success: false, error: { _form: ["Erro ao criar compromisso."] } };
    }
}

export async function concluirCompromisso(id: string) {
    try {
        const actorUserId = await getAuditActorId();
        const compromissoAntes = await db.compromisso.findUnique({
            where: { id },
            select: { concluido: true },
        });
        const compromissoAtualizado = await db.compromisso.update({
            where: { id },
            data: { concluido: true },
            select: { id: true, concluido: true },
        });

        await removeCompromissoFromCalendars(id).catch((error) => {
            console.warn("[agenda] Falha ao remover compromisso concluido do calendario:", error);
        });
        await cancelMeetingAutomation(id, "Automacao cancelada porque o compromisso foi concluido.").catch((error) => {
            console.warn("[agenda] Falha ao cancelar automacoes do compromisso concluido:", error);
        });
        await syncCompromissoLegadoToAgendamento(id).catch((error) => {
            console.warn("[agenda] Falha ao atualizar compromisso legado na agenda central:", error);
        });
        await registrarLogAuditoria({
            actorUserId,
            acao: "COMPROMISSO_CONCLUIDO",
            entidade: "Compromisso",
            entidadeId: id,
            dadosAntes: compromissoAntes,
            dadosDepois: compromissoAtualizado,
        });

        revalidatePath("/agenda");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error concluding compromisso:", error);
        return { success: false, error: "Erro ao concluir compromisso." };
    }
}
