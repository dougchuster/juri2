"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";
import { registrarLogAuditoria } from "@/lib/services/audit-log";
import {
    normalizeCalculoResultado,
    type CalculoResultado,
    type CalculoTipo,
} from "@/lib/services/calculos";

export interface CalculoFormData {
    tipo: CalculoTipo;
    nome: string;
    parametros: Record<string, unknown>;
    resultado?: Record<string, unknown> | CalculoResultado;
    processoId?: string;
    clienteId?: string;
}

export async function saveCalculo(data: CalculoFormData) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        const resultadoNormalizado = data.resultado
            ? normalizeCalculoResultado(data.tipo, data.resultado)
            : undefined;

        const calculo = await db.calculo.create({
            data: {
                tipo: data.tipo,
                nome: data.nome,
                parametros: data.parametros as Prisma.InputJsonValue,
                resultado: resultadoNormalizado
                    ? (resultadoNormalizado as unknown as Prisma.InputJsonValue)
                    : Prisma.DbNull,
                processoId: data.processoId || null,
                clienteId: data.clienteId || null,
                criadoPorId: session.id,
            },
        });

        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "CALCULO_CRIADO",
            entidade: "Calculo",
            entidadeId: calculo.id,
            dadosDepois: { tipo: data.tipo, nome: data.nome },
        });

        revalidatePath("/calculos");
        return { success: true, id: calculo.id };
    } catch (error) {
        console.error("Error saving calculo:", error);
        return { success: false, error: "Erro ao salvar calculo." };
    }
}

export async function updateCalculoResultado(
    id: string,
    tipo: CalculoTipo,
    resultado: Record<string, unknown> | CalculoResultado
) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        const resultadoNormalizado = normalizeCalculoResultado(tipo, resultado);
        await db.calculo.update({
            where: { id },
            data: { resultado: resultadoNormalizado as unknown as Prisma.InputJsonValue },
        });
        revalidatePath("/calculos");
        return { success: true };
    } catch (error) {
        console.error("Error updating calculo resultado:", error);
        return { success: false, error: "Erro ao atualizar resultado." };
    }
}

export async function deleteCalculo(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: "Sessao expirada." };

    try {
        await db.calculo.delete({ where: { id } });
        await registrarLogAuditoria({
            actorUserId: session.id,
            acao: "CALCULO_EXCLUIDO",
            entidade: "Calculo",
            entidadeId: id,
            dadosAntes: {},
            dadosDepois: { removido: true },
        });
        revalidatePath("/calculos");
        return { success: true };
    } catch (error) {
        console.error("Error deleting calculo:", error);
        return { success: false, error: "Erro ao excluir calculo." };
    }
}
