"use server";

import { revalidatePath } from "next/cache";
import type { StatusOperacionalAtendimento } from "@/generated/prisma";
import { db } from "@/lib/db";
import { fireEvent } from "@/lib/services/event-triggers";
import { atendimentoHistoricoSchema, atendimentoSchema } from "@/lib/validators/atendimento";
import type { AtendimentoFormData, AtendimentoHistoricoFormData } from "@/lib/validators/atendimento";
import { ATENDIMENTO_STATUS_LABELS, mapOperationalToLegacyFields } from "@/lib/atendimentos-workflow";

function emptyToNull(value: unknown) {
    return value === "" ? null : value;
}

function parseOptionalDecimal(value: unknown) {
    if (value == null || value === "") return null;
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
}

function revalidateAttendanceViews() {
    revalidatePath("/atendimentos");
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
}

export async function createAtendimento(formData: AtendimentoFormData) {
    const parsed = atendimentoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const data = parsed.data;
        const legacy = mapOperationalToLegacyFields(data.statusOperacional);

        await db.atendimento.create({
            data: {
                clienteId: data.clienteId,
                advogadoId: data.advogadoId,
                status: legacy.status,
                tipoRegistro: legacy.tipoRegistro,
                cicloVida: legacy.cicloVida,
                statusOperacional: data.statusOperacional,
                prioridade: data.prioridade,
                canal: data.canal,
                viabilidade: "EM_ANALISE",
                situacaoDocumental: data.situacaoDocumental,
                statusReuniao: data.statusReuniao,
                assunto: data.assunto,
                resumo: emptyToNull(data.resumo) as string | null,
                areaJuridica: emptyToNull(data.areaJuridica) as string | null,
                origemAtendimento: emptyToNull(data.origemAtendimento) as string | null,
                proximaAcao: emptyToNull(data.proximaAcao) as string | null,
                dataRetorno: data.dataRetorno ? new Date(data.dataRetorno) : null,
                proximaAcaoAt: data.proximaAcaoAt ? new Date(data.proximaAcaoAt) : null,
                dataReuniao: data.dataReuniao ? new Date(data.dataReuniao) : null,
                valorEstimado: parseOptionalDecimal(data.valorEstimado),
                motivoPerda: emptyToNull(data.motivoPerda) as string | null,
                observacoesReuniao: emptyToNull(data.observacoesReuniao) as string | null,
            },
        });

        revalidateAttendanceViews();
        return { success: true };
    } catch (error) {
        console.error("Error creating atendimento:", error);
        return { success: false, error: { _form: ["Erro ao criar atendimento."] } };
    }
}

export async function updateAtendimento(id: string, formData: AtendimentoFormData) {
    const parsed = atendimentoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const current = await db.atendimento.findUnique({
            where: { id },
            select: { status: true, tipoRegistro: true },
        });
        const data = parsed.data;
        const legacy = mapOperationalToLegacyFields(data.statusOperacional, current || undefined);

        await db.atendimento.update({
            where: { id },
            data: {
                clienteId: data.clienteId,
                advogadoId: data.advogadoId,
                status: legacy.status,
                tipoRegistro: legacy.tipoRegistro,
                cicloVida: legacy.cicloVida,
                statusOperacional: data.statusOperacional,
                prioridade: data.prioridade,
                canal: data.canal,
                viabilidade: "EM_ANALISE",
                situacaoDocumental: data.situacaoDocumental,
                statusReuniao: data.statusReuniao,
                assunto: data.assunto,
                resumo: emptyToNull(data.resumo) as string | null,
                areaJuridica: emptyToNull(data.areaJuridica) as string | null,
                origemAtendimento: emptyToNull(data.origemAtendimento) as string | null,
                proximaAcao: emptyToNull(data.proximaAcao) as string | null,
                dataRetorno: data.dataRetorno ? new Date(data.dataRetorno) : null,
                proximaAcaoAt: data.proximaAcaoAt ? new Date(data.proximaAcaoAt) : null,
                dataReuniao: data.dataReuniao ? new Date(data.dataReuniao) : null,
                valorEstimado: parseOptionalDecimal(data.valorEstimado),
                motivoPerda: emptyToNull(data.motivoPerda) as string | null,
                observacoesReuniao: emptyToNull(data.observacoesReuniao) as string | null,
            },
        });

        revalidateAttendanceViews();
        return { success: true };
    } catch (error) {
        console.error("Error updating atendimento:", error);
        return { success: false, error: { _form: ["Erro ao atualizar atendimento."] } };
    }
}

export async function moveAtendimento(id: string, newStatus: StatusOperacionalAtendimento) {
    try {
        const current = await db.atendimento.findUnique({
            where: { id },
            select: {
                clienteId: true,
                status: true,
                tipoRegistro: true,
                statusOperacional: true,
            },
        });

        if (!current) {
            return { success: false, error: "Atendimento nao encontrado." };
        }

        const legacy = mapOperationalToLegacyFields(newStatus, current);

        await db.atendimento.update({
            where: { id },
            data: {
                status: legacy.status,
                tipoRegistro: legacy.tipoRegistro,
                cicloVida: legacy.cicloVida,
                statusOperacional: newStatus,
            },
        });

        if (current.statusOperacional !== newStatus) {
            fireEvent("PIPELINE_ETAPA_CHANGED", {
                clienteId: current.clienteId,
                variables: {
                    etapa_anterior: ATENDIMENTO_STATUS_LABELS[current.statusOperacional],
                    etapa_nova: ATENDIMENTO_STATUS_LABELS[newStatus],
                },
            });
        }

        revalidateAttendanceViews();
        return { success: true };
    } catch (error) {
        console.error("Error moving atendimento:", error);
        return { success: false, error: "Erro ao mover atendimento." };
    }
}

export async function deleteAtendimento(id: string) {
    try {
        await db.atendimento.delete({ where: { id } });
        revalidateAttendanceViews();
        return { success: true };
    } catch (error) {
        console.error("Error deleting atendimento:", error);
        return { success: false, error: "Erro ao excluir atendimento." };
    }
}

export async function addHistorico(atendimentoId: string, userId: string, formData: AtendimentoHistoricoFormData) {
    const parsed = atendimentoHistoricoSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const data = parsed.data;
        await db.atendimentoHistorico.create({
            data: {
                atendimentoId,
                canal: data.canal,
                descricao: data.descricao,
                userId,
            },
        });

        revalidateAttendanceViews();
        return { success: true };
    } catch (error) {
        console.error("Error adding historico:", error);
        return { success: false, error: { _form: ["Erro ao adicionar historico."] } };
    }
}
