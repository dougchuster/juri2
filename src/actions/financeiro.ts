"use server";

import { db } from "@/lib/db";
import {
    honorarioSchema, faturaSchema, contaPagarSchema,
} from "@/lib/validators/financeiro";
import type { HonorarioFormData, FaturaFormData, ContaPagarFormData } from "@/lib/validators/financeiro";
import { revalidatePath } from "next/cache";
import { getSession } from "@/actions/auth";

function emptyToNull(val: unknown) {
    return val === "" ? null : val;
}

function isScopedAdvogado(user: Awaited<ReturnType<typeof getSession>>) {
    return user?.role === "ADVOGADO";
}

async function advogadoCanAccessProcesso(user: Awaited<ReturnType<typeof getSession>>, processoId: string) {
    if (!isScopedAdvogado(user)) return true;
    if (!user?.advogado?.id) return false;
    const found = await db.processo.findFirst({
        where: { id: processoId, advogadoId: user.advogado.id, ...(user.escritorioId ? { escritorioId: user.escritorioId } : {}) },
        select: { id: true },
    });
    return Boolean(found);
}

// =============================================================
// HONORÁRIOS
// =============================================================

export async function createHonorario(formData: HonorarioFormData) {
    const parsed = honorarioSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const session = await getSession();
        if (!session) return { success: false, error: { _form: ["Sessao expirada. Faca login novamente."] } };
        const d = parsed.data;
        const canAccessProcesso = await advogadoCanAccessProcesso(session, d.processoId);
        if (!canAccessProcesso) {
            return { success: false, error: { _form: ["Sem permissao para usar este processo no financeiro."] } };
        }
        await db.honorario.create({
            data: {
                processoId: d.processoId,
                clienteId: d.clienteId,
                tipo: d.tipo,
                status: d.status,
                valorTotal: parseFloat(d.valorTotal),
                percentualExito: d.percentualExito ? parseFloat(d.percentualExito) : null,
                valorHora: d.valorHora ? parseFloat(d.valorHora) : null,
                descricao: emptyToNull(d.descricao) as string | null,
                dataContrato: new Date(d.dataContrato),
            },
        });
        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error creating honorario:", error);
        return { success: false, error: { _form: ["Erro ao criar honorário."] } };
    }
}

export async function deleteHonorario(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        if (isScopedAdvogado(session)) {
            if (!session.advogado?.id) return { success: false, error: "Sem permissao para excluir honorario." };
            const found = await db.honorario.findFirst({
                where: {
                    id,
                    processo: { advogadoId: session.advogado.id },
                },
                select: { id: true },
            });
            if (!found) return { success: false, error: "Sem permissao para excluir este honorario." };
        }
        await db.honorario.delete({ where: { id } });
        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error deleting honorario:", error);
        return { success: false, error: "Erro ao excluir honorário." };
    }
}

// =============================================================
// FATURAS
// =============================================================

export async function createFatura(formData: FaturaFormData) {
    const parsed = faturaSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const session = await getSession();
        if (!session) return { success: false, error: { _form: ["Sessao expirada. Faca login novamente."] } };
        const d = parsed.data;
        const honorarioId = (emptyToNull(d.honorarioId) as string | null) || null;
        if (isScopedAdvogado(session)) {
            if (!session.advogado?.id) {
                return { success: false, error: { _form: ["Sem permissao para criar fatura."] } };
            }
            if (!honorarioId) {
                return { success: false, error: { _form: ["Advogado pode faturar apenas honorarios vinculados ao proprio processo."] } };
            }
            const honorario = await db.honorario.findFirst({
                where: {
                    id: honorarioId,
                    processo: { advogadoId: session.advogado.id },
                },
                select: { id: true },
            });
            if (!honorario) {
                return { success: false, error: { _form: ["Sem permissao para faturar este honorario."] } };
            }
        }
        const valorTotal = parseFloat(d.valorTotal);
        const parcelas = d.parcelas || 1;

        // Generate invoice number
        const count = await db.fatura.count();
        const numero = `FAT-${String(count + 1).padStart(6, "0")}`;

        const fatura = await db.fatura.create({
            data: {
                numero,
                honorarioId,
                clienteId: d.clienteId,
                valorTotal,
                dataEmissao: new Date(d.dataEmissao),
                dataVencimento: new Date(d.dataVencimento),
                descricao: emptyToNull(d.descricao) as string | null,
                recorrente: d.recorrente,
                centroCustoId: emptyToNull(d.centroCustoId) as string | null,
            },
        });

        // Create installments if parcelas > 1
        if (parcelas > 1) {
            const valorParcela = Math.round((valorTotal / parcelas) * 100) / 100;
            const baseDate = new Date(d.dataVencimento);

            for (let i = 0; i < parcelas; i++) {
                const vencimento = new Date(baseDate);
                vencimento.setMonth(vencimento.getMonth() + i);

                await db.faturaParcela.create({
                    data: {
                        faturaId: fatura.id,
                        numeroParcela: i + 1,
                        valor: i === parcelas - 1 ? valorTotal - valorParcela * (parcelas - 1) : valorParcela,
                        dataVencimento: vencimento,
                    },
                });
            }
        }

        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error creating fatura:", error);
        return { success: false, error: { _form: ["Erro ao criar fatura."] } };
    }
}

export async function marcarFaturaPaga(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        if (isScopedAdvogado(session)) {
            if (!session.advogado?.id) return { success: false, error: "Sem permissao para marcar esta fatura." };
            const found = await db.fatura.findFirst({
                where: {
                    id,
                    honorario: { is: { processo: { advogadoId: session.advogado.id } } },
                },
                select: { id: true },
            });
            if (!found) return { success: false, error: "Sem permissao para marcar esta fatura." };
        }
        await db.fatura.update({
            where: { id },
            data: { status: "PAGA", dataPagamento: new Date() },
        });
        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error marking fatura:", error);
        return { success: false, error: "Erro ao marcar fatura." };
    }
}

export async function deleteFatura(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        if (isScopedAdvogado(session)) {
            if (!session.advogado?.id) return { success: false, error: "Sem permissao para excluir esta fatura." };
            const found = await db.fatura.findFirst({
                where: {
                    id,
                    honorario: { is: { processo: { advogadoId: session.advogado.id } } },
                },
                select: { id: true },
            });
            if (!found) return { success: false, error: "Sem permissao para excluir esta fatura." };
        }
        await db.fatura.delete({ where: { id } });
        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error deleting fatura:", error);
        return { success: false, error: "Erro ao excluir fatura." };
    }
}

// =============================================================
// CONTAS A PAGAR
// =============================================================

export async function createContaPagar(formData: ContaPagarFormData) {
    const parsed = contaPagarSchema.safeParse(formData);
    if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

    try {
        const session = await getSession();
        if (!session) return { success: false, error: { _form: ["Sessao expirada. Faca login novamente."] } };
        const d = parsed.data;
        const processoId = (emptyToNull(d.processoId) as string | null) || null;
        if (isScopedAdvogado(session)) {
            if (!processoId) {
                return { success: false, error: { _form: ["Advogado pode lancar conta apenas vinculada ao proprio processo."] } };
            }
            const canAccessProcesso = await advogadoCanAccessProcesso(session, processoId);
            if (!canAccessProcesso) {
                return { success: false, error: { _form: ["Sem permissao para lancar conta neste processo."] } };
            }
        }
        await db.contaPagar.create({
            data: {
                descricao: d.descricao,
                tipo: d.tipo,
                valor: parseFloat(d.valor),
                dataVencimento: new Date(d.dataVencimento),
                processoId,
                centroCustoId: emptyToNull(d.centroCustoId) as string | null,
                contaBancariaId: emptyToNull(d.contaBancariaId) as string | null,
            },
        });
        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error creating conta:", error);
        return { success: false, error: { _form: ["Erro ao criar conta a pagar."] } };
    }
}

export async function marcarContaPaga(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        if (isScopedAdvogado(session)) {
            if (!session.advogado?.id) return { success: false, error: "Sem permissao para pagar esta conta." };
            const found = await db.contaPagar.findFirst({
                where: {
                    id,
                    processo: { is: { advogadoId: session.advogado.id } },
                },
                select: { id: true },
            });
            if (!found) return { success: false, error: "Sem permissao para pagar esta conta." };
        }
        await db.contaPagar.update({
            where: { id },
            data: { pago: true, dataPagamento: new Date() },
        });
        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error paying conta:", error);
        return { success: false, error: "Erro ao pagar conta." };
    }
}

export async function deleteContaPagar(id: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "Sessao expirada. Faca login novamente." };
        if (isScopedAdvogado(session)) {
            if (!session.advogado?.id) return { success: false, error: "Sem permissao para excluir esta conta." };
            const found = await db.contaPagar.findFirst({
                where: {
                    id,
                    processo: { is: { advogadoId: session.advogado.id } },
                },
                select: { id: true },
            });
            if (!found) return { success: false, error: "Sem permissao para excluir esta conta." };
        }
        await db.contaPagar.delete({ where: { id } });
        revalidatePath("/financeiro");
        return { success: true };
    } catch (error) {
        console.error("Error deleting conta:", error);
        return { success: false, error: "Erro ao excluir conta." };
    }
}
