"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";
import { registrarLogAuditoria } from "@/lib/services/audit-log";

export interface ProtocoloFormData {
    dataEntrada: string;
    dataPrevistaSaida?: string;
    prazo?: number;
    tipo: string;
    status: string;
    codigoBarras?: string;
    remetente: string;
    destinatario: string;
    localizacao?: string;
    observacoes?: string;
    processoId?: string;
}

export async function createProtocolo(data: ProtocoloFormData) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        const protocolo = await db.protocolo.create({
            data: {
                dataEntrada: new Date(data.dataEntrada),
                dataPrevistaSaida: data.dataPrevistaSaida ? new Date(data.dataPrevistaSaida) : null,
                prazo: data.prazo || null,
                tipo: data.tipo,
                status: data.status,
                codigoBarras: data.codigoBarras || null,
                remetente: data.remetente,
                destinatario: data.destinatario,
                localizacao: data.localizacao || null,
                observacoes: data.observacoes || null,
                processoId: data.processoId || null,
                criadoPorId: session.id,
            },
        });

        await db.protocoloHistorico.create({
            data: {
                protocoloId: protocolo.id,
                status: data.status,
                observacao: "Protocolo criado",
                criadoPorId: session.id,
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "PROTOCOLO_CRIADO",
            entidade: "Protocolo",
            entidadeId: protocolo.id,
            dadosDepois: { remetente: data.remetente, destinatario: data.destinatario, tipo: data.tipo, status: data.status },
        });

        revalidatePath("/protocolos");
        return { success: true, id: protocolo.id };
    } catch (error) {
        console.error("Error creating protocolo:", error);
        return { success: false, error: "Erro ao criar protocolo." };
    }
}

export async function updateProtocoloStatus(id: string, status: string, observacao?: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        const before = await db.protocolo.findUnique({ where: { id }, select: { status: true } });

        await db.protocolo.update({ where: { id }, data: { status } });

        await db.protocoloHistorico.create({
            data: {
                protocoloId: id,
                status,
                observacao: observacao || `Status alterado para ${status}`,
                criadoPorId: session.id,
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "PROTOCOLO_STATUS_ATUALIZADO",
            entidade: "Protocolo",
            entidadeId: id,
            dadosAntes: before,
            dadosDepois: { status },
        });

        revalidatePath("/protocolos");
        return { success: true };
    } catch (error) {
        console.error("Error updating protocolo status:", error);
        return { success: false, error: "Erro ao atualizar protocolo." };
    }
}

export async function deleteProtocolo(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        const before = await db.protocolo.findUnique({
            where: { id },
            select: { remetente: true, destinatario: true, tipo: true },
        });

        await db.protocolo.delete({ where: { id } });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "PROTOCOLO_EXCLUIDO",
            entidade: "Protocolo",
            entidadeId: id,
            dadosAntes: before,
            dadosDepois: { removido: true },
        });

        revalidatePath("/protocolos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting protocolo:", error);
        return { success: false, error: "Erro ao excluir protocolo." };
    }
}
